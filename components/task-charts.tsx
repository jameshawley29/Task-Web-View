'use client'

import { useMemo } from 'react'
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import type { Task } from '@/types'

interface TaskChartsProps {
  tasks: Task[]
}

const COLORS = {
  completed: '#22c55e',
  pending: '#3b82f6',
  overdue: '#ef4444',
  high: '#ef4444',
  medium: '#f59e0b',
  low: '#3b82f6',
  work: '#a855f7',
  uva: '#3b82f6',
  life: '#22c55e',
}

export function TaskCharts({ tasks }: TaskChartsProps) {
  const stats = useMemo(() => {
    const now = new Date()
    now.setHours(0, 0, 0, 0)

    const completed = tasks.filter(t => t.status).length
    const pending = tasks.filter(t => !t.status).length
    const overdue = tasks.filter(t => {
      if (!t.dueDate || t.status) return false
      const due = new Date(t.dueDate)
      due.setHours(0, 0, 0, 0)
      return due < now
    }).length

    // Priority breakdown (pending tasks only)
    const byPriority = tasks
      .filter(t => !t.status && t.priority)
      .reduce((acc, t) => {
        const p = t.priority!.toLowerCase()
        acc[p] = (acc[p] || 0) + 1
        return acc
      }, {} as Record<string, number>)

    // Type breakdown
    const byType = tasks
      .filter(t => t.taskType)
      .reduce((acc, t) => {
        const type = t.taskType!.toLowerCase()
        acc[type] = (acc[type] || 0) + 1
        return acc
      }, {} as Record<string, number>)

    // Weekly trend (last 7 days)
    const weeklyTrend = []
    for (let i = 6; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      date.setHours(0, 0, 0, 0)
      const dateStr = date.toISOString().split('T')[0]

      const created = tasks.filter(t => {
        const created = new Date(t.createdTime)
        created.setHours(0, 0, 0, 0)
        return created.getTime() === date.getTime()
      }).length

      const completedOnDay = tasks.filter(t => {
        if (!t.status) return false
        // Approximate: we don't have completion date, so use created date for completed tasks
        const taskDate = new Date(t.createdTime)
        taskDate.setHours(0, 0, 0, 0)
        return taskDate.getTime() === date.getTime()
      }).length

      weeklyTrend.push({
        date: date.toLocaleDateString('en-US', { weekday: 'short' }),
        created,
        completed: completedOnDay,
      })
    }

    return { completed, pending, overdue, byPriority, byType, weeklyTrend }
  }, [tasks])

  const statusData = [
    { name: 'Completed', value: stats.completed, color: COLORS.completed },
    { name: 'Pending', value: stats.pending - stats.overdue, color: COLORS.pending },
    { name: 'Overdue', value: stats.overdue, color: COLORS.overdue },
  ].filter(d => d.value > 0)

  const priorityData = Object.entries(stats.byPriority).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value,
    color: COLORS[name as keyof typeof COLORS] || '#94a3b8',
  }))

  const typeData = Object.entries(stats.byType).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value,
    color: COLORS[name as keyof typeof COLORS] || '#94a3b8',
  }))

  if (tasks.length === 0) {
    return null
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {/* Status Pie Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Task Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Priority Distribution */}
      {priorityData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pending by Priority</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={priorityData} layout="vertical">
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="name" width={60} tick={{ fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {priorityData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Type Distribution */}
      {typeData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Tasks by Type</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={typeData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {typeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Weekly Activity */}
      <Card className="md:col-span-2 lg:col-span-3">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Weekly Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.weeklyTrend}>
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Legend />
                <Bar dataKey="created" name="Created" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="completed" name="Completed" fill="#22c55e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
