'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card'
import { Button } from './ui/button'
import { Sparkles, RefreshCw, Target, Lightbulb, TrendingUp } from 'lucide-react'
import type { InsightResponse } from '@/types'
import { cn } from '@/lib/utils'

interface InsightsPanelProps {
  onFetch: () => Promise<InsightResponse | null>
}

export function InsightsPanel({ onFetch }: InsightsPanelProps) {
  const [insights, setInsights] = useState<InsightResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchInsights = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await onFetch()
      setInsights(data)
    } catch (e: any) {
      setError(e.message || 'Failed to get insights')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Insights
          </CardTitle>
          <CardDescription>Get personalized productivity feedback</CardDescription>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchInsights}
          disabled={loading}
        >
          {loading ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          <span className="ml-2">{insights ? 'Refresh' : 'Analyze'}</span>
        </Button>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="rounded-lg bg-destructive/10 p-4 text-sm text-destructive">
            {error}
          </div>
        )}

        {!insights && !loading && !error && (
          <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
            <Sparkles className="mb-4 h-12 w-12 opacity-50" />
            <p>Click "Analyze" to get AI-powered insights about your tasks</p>
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center justify-center py-8">
            <RefreshCw className="mb-4 h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Analyzing your tasks...</p>
          </div>
        )}

        {insights && !loading && (
          <div className="space-y-6">
            {/* Productivity Score */}
            <div className="flex items-center gap-4">
              <div
                className={cn(
                  'flex h-16 w-16 items-center justify-center rounded-full text-2xl font-bold',
                  insights.productivity_score >= 70
                    ? 'bg-green-500/20 text-green-500'
                    : insights.productivity_score >= 40
                    ? 'bg-amber-500/20 text-amber-500'
                    : 'bg-red-500/20 text-red-500'
                )}
              >
                {insights.productivity_score}
              </div>
              <div>
                <p className="font-medium">Productivity Score</p>
                <p className="text-sm text-muted-foreground">
                  {insights.productivity_score >= 70
                    ? 'Great job! Keep up the momentum.'
                    : insights.productivity_score >= 40
                    ? 'Room for improvement. Stay focused!'
                    : 'Needs attention. Let\'s get back on track.'}
                </p>
              </div>
            </div>

            {/* Summary */}
            <div>
              <h4 className="mb-2 flex items-center gap-2 font-medium">
                <TrendingUp className="h-4 w-4 text-primary" />
                Summary
              </h4>
              <p className="text-sm text-muted-foreground">{insights.summary}</p>
            </div>

            {/* Suggestions */}
            <div>
              <h4 className="mb-2 flex items-center gap-2 font-medium">
                <Lightbulb className="h-4 w-4 text-amber-500" />
                Suggestions
              </h4>
              <ul className="space-y-2">
                {insights.suggestions.map((suggestion, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary" />
                    {suggestion}
                  </li>
                ))}
              </ul>
            </div>

            {/* Focus Areas */}
            <div>
              <h4 className="mb-2 flex items-center gap-2 font-medium">
                <Target className="h-4 w-4 text-red-500" />
                Focus Areas
              </h4>
              <div className="flex flex-wrap gap-2">
                {insights.focus_areas.map((area, i) => (
                  <span
                    key={i}
                    className="rounded-full bg-secondary px-3 py-1 text-xs font-medium"
                  >
                    {area}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
