export interface Task {
  id: string
  name: string
  status: boolean
  statusType: 'checkbox' | 'select' | 'status'
  dueDate: string | null
  priority: string | null
  taskType: string | null
  createdTime: string
  url: string
}

export interface TaskStats {
  total: number
  completed: number
  pending: number
  overdue: number
  byPriority: {
    high: number
    medium: number
    low: number
  }
  byType: Record<string, number>
  completionRate: number
  weeklyTrend: {
    date: string
    completed: number
    created: number
  }[]
}

export interface InsightResponse {
  summary: string
  suggestions: string[]
  productivity_score: number
  focus_areas: string[]
}
