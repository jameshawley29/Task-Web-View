'use client'

import { cn, formatDate, isOverdue } from '@/lib/utils'
import type { Task } from '@/types'
import { Calendar, Trash2 } from 'lucide-react'
import { useState } from 'react'

interface TaskItemProps {
  task: Task
  onToggle: (id: string, status: boolean) => void
  onDelete: (id: string) => void
}

const priorityColors: Record<string, string> = {
  high: 'bg-red-500/15 text-red-500 dark:bg-red-500/20',
  medium: 'bg-amber-500/15 text-amber-500 dark:bg-amber-500/20',
  low: 'bg-blue-500/15 text-blue-500 dark:bg-blue-500/20',
}

const typeColors: Record<string, string> = {
  work: 'bg-purple-500/15 text-purple-500 dark:bg-purple-500/20',
  uva: 'bg-blue-500/15 text-blue-500 dark:bg-blue-500/20',
  life: 'bg-green-500/15 text-green-500 dark:bg-green-500/20',
}

export function TaskItem({ task, onToggle, onDelete }: TaskItemProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const overdue = task.dueDate && isOverdue(task.dueDate) && !task.status

  const handleDelete = () => {
    setIsDeleting(true)
    setTimeout(() => onDelete(task.id), 200)
  }

  return (
    <div
      className={cn(
        'group flex items-center gap-3 rounded-lg bg-secondary/50 p-4 transition-all',
        'hover:bg-secondary',
        task.status && 'opacity-60',
        isDeleting && 'translate-x-4 opacity-0'
      )}
    >
      {/* Checkbox */}
      <button
        onClick={() => onToggle(task.id, !task.status)}
        className={cn(
          'flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md border-2 transition-all',
          task.status
            ? 'border-green-500 bg-green-500 text-white'
            : 'border-muted-foreground/30 hover:border-primary'
        )}
      >
        {task.status && (
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </button>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <span
          className={cn(
            'block text-sm font-medium',
            task.status && 'text-muted-foreground line-through'
          )}
        >
          {task.name}
        </span>

        {/* Meta */}
        {(task.dueDate || task.taskType || task.priority) && (
          <div className="mt-1 flex flex-wrap items-center gap-2">
            {task.dueDate && (
              <span
                className={cn(
                  'flex items-center gap-1 text-xs',
                  overdue ? 'text-red-500' : 'text-muted-foreground'
                )}
              >
                <Calendar className="h-3 w-3" />
                {formatDate(task.dueDate)}
              </span>
            )}
            {task.taskType && (
              <span
                className={cn(
                  'rounded px-2 py-0.5 text-xs font-medium',
                  typeColors[task.taskType.toLowerCase()] || 'bg-secondary text-secondary-foreground'
                )}
              >
                {task.taskType}
              </span>
            )}
            {task.priority && (
              <span
                className={cn(
                  'rounded px-2 py-0.5 text-xs font-medium uppercase',
                  priorityColors[task.priority.toLowerCase()] || 'bg-secondary text-secondary-foreground'
                )}
              >
                {task.priority}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Delete button */}
      <button
        onClick={handleDelete}
        className="flex-shrink-0 rounded p-1.5 text-muted-foreground opacity-0 transition-all hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
        aria-label="Delete task"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  )
}
