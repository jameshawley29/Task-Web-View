'use client'

import { useCallback, useEffect, useState } from 'react'
import { ThemeToggle } from '@/components/theme-toggle'
import { AddTaskForm } from '@/components/add-task-form'
import { TaskItem } from '@/components/task-item'
import { TaskCharts } from '@/components/task-charts'
import { InsightsPanel } from '@/components/insights-panel'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle2, Circle, AlertCircle, BarChart3, ListTodo, RefreshCw } from 'lucide-react'
import type { Task, InsightResponse } from '@/types'

type ViewMode = 'tasks' | 'analytics'

// Helper to fetch with retry logic for transient network errors
async function fetchWithRetry(url: string, options?: RequestInit, retries = 3): Promise<Response> {
  let lastError: Error | null = null

  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, options)
      return res
    } catch (err) {
      lastError = err instanceof Error ? err : new Error('Network error')
      // Wait before retry (exponential backoff)
      if (i < retries - 1) {
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000))
      }
    }
  }

  throw lastError || new Error('Network error after retries')
}

// Helper to parse API errors
async function parseApiError(res: Response): Promise<string> {
  try {
    const data = await res.json()
    return data.error || data.message || `HTTP ${res.status}: ${res.statusText}`
  } catch {
    return `HTTP ${res.status}: ${res.statusText}`
  }
}

export default function Home() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('tasks')

  const fetchTasks = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetchWithRetry('/api/tasks')

      if (!res.ok) {
        const errorMsg = await parseApiError(res)
        throw new Error(errorMsg)
      }

      const data = await res.json()

      // Validate response is an array
      if (!Array.isArray(data)) {
        throw new Error('Invalid response: expected array of tasks')
      }

      setTasks(data)
      setError(null)
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Unknown error occurred'
      setError(message)
      console.error('Failed to fetch tasks:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTasks()
  }, [fetchTasks])

  const handleAddTask = async (name: string, dueDate?: string) => {
    try {
      const res = await fetchWithRetry('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, dueDate }),
      })

      if (!res.ok) {
        const errorMsg = await parseApiError(res)
        throw new Error(errorMsg)
      }

      fetchTasks()
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to create task'
      setError(message)
    }
  }

  const handleToggleTask = async (id: string, status: boolean) => {
    // Optimistic update
    setTasks(prev => prev.map(t => (t.id === id ? { ...t, status } : t)))

    try {
      const res = await fetchWithRetry(`/api/tasks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })

      if (!res.ok) {
        const errorMsg = await parseApiError(res)
        throw new Error(errorMsg)
      }
    } catch (e) {
      // Revert on error
      setTasks(prev => prev.map(t => (t.id === id ? { ...t, status: !status } : t)))
      const message = e instanceof Error ? e.message : 'Failed to update task'
      setError(message)
    }
  }

  const handleDeleteTask = async (id: string) => {
    const task = tasks.find(t => t.id === id)
    setTasks(prev => prev.filter(t => t.id !== id))

    try {
      const res = await fetchWithRetry(`/api/tasks/${id}`, { method: 'DELETE' })

      if (!res.ok) {
        const errorMsg = await parseApiError(res)
        throw new Error(errorMsg)
      }
    } catch (e) {
      // Revert on error
      if (task) setTasks(prev => [...prev, task])
      const message = e instanceof Error ? e.message : 'Failed to delete task'
      setError(message)
    }
  }

  const fetchInsights = async (): Promise<InsightResponse | null> => {
    const res = await fetchWithRetry('/api/insights')

    if (!res.ok) {
      const errorMsg = await parseApiError(res)
      throw new Error(errorMsg)
    }

    return res.json()
  }

  // Sort tasks: incomplete first, then by due date
  const sortedTasks = [...tasks].sort((a, b) => {
    if (a.status !== b.status) return a.status ? 1 : -1
    if (a.dueDate && !b.dueDate) return -1
    if (!a.dueDate && b.dueDate) return 1
    if (a.dueDate && b.dueDate) {
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
    }
    return 0
  })

  // Stats
  const completed = tasks.filter(t => t.status).length
  const pending = tasks.filter(t => !t.status).length
  const overdue = tasks.filter(t => {
    if (!t.dueDate || t.status) return false
    return new Date(t.dueDate) < new Date()
  }).length

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <header className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Tasks</h1>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border bg-secondary/50 p-1">
            <Button
              variant={viewMode === 'tasks' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('tasks')}
              className="gap-2"
            >
              <ListTodo className="h-4 w-4" />
              <span className="hidden sm:inline">Tasks</span>
            </Button>
            <Button
              variant={viewMode === 'analytics' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('analytics')}
              className="gap-2"
            >
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Analytics</span>
            </Button>
          </div>
          <ThemeToggle />
        </div>
      </header>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-3 gap-4">
        <Card className="bg-secondary/30">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-full bg-blue-500/20 p-2">
              <Circle className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{pending}</p>
              <p className="text-xs text-muted-foreground">Pending</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-secondary/30">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-full bg-green-500/20 p-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{completed}</p>
              <p className="text-xs text-muted-foreground">Completed</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-secondary/30">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-full bg-red-500/20 p-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{overdue}</p>
              <p className="text-xs text-muted-foreground">Overdue</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {viewMode === 'tasks' ? (
        <>
          {/* Add Task Form */}
          <div className="mb-6">
            <AddTaskForm onAdd={handleAddTask} />
          </div>

          {/* Error State */}
          {error && (
            <Card className="mb-6 border-destructive bg-destructive/10">
              <CardContent className="flex items-center justify-between gap-4 p-4">
                <div className="flex-1">
                  <p className="text-sm font-medium text-destructive">Error</p>
                  <p className="text-sm text-destructive/80">{error}</p>
                </div>
                <Button variant="outline" size="sm" onClick={fetchTasks}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Retry
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Loading State */}
          {loading && !error && (
            <div className="flex flex-col items-center justify-center py-16">
              <RefreshCw className="mb-4 h-8 w-8 animate-spin text-primary" />
              <p className="text-muted-foreground">Loading tasks...</p>
            </div>
          )}

          {/* Empty State */}
          {!loading && !error && tasks.length === 0 && (
            <Card className="py-16 text-center">
              <CardContent>
                <CheckCircle2 className="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
                <p className="font-medium">No tasks yet</p>
                <p className="text-sm text-muted-foreground">Add your first task above</p>
              </CardContent>
            </Card>
          )}

          {/* Task List */}
          {!loading && tasks.length > 0 && (
            <div className="space-y-2">
              {sortedTasks.map(task => (
                <TaskItem
                  key={task.id}
                  task={task}
                  onToggle={handleToggleTask}
                  onDelete={handleDeleteTask}
                />
              ))}
            </div>
          )}
        </>
      ) : (
        /* Analytics View */
        <div className="space-y-6">
          <TaskCharts tasks={tasks} />
          <InsightsPanel onFetch={fetchInsights} />
        </div>
      )}
    </main>
  )
}
