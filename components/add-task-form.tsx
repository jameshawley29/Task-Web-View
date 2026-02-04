'use client'

import { useState } from 'react'
import { Input } from './ui/input'
import { Button } from './ui/button'
import { Plus } from 'lucide-react'

interface AddTaskFormProps {
  onAdd: (name: string, dueDate?: string) => void
}

export function AddTaskForm({ onAdd }: AddTaskFormProps) {
  const [name, setName] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || isSubmitting) return

    setIsSubmitting(true)
    try {
      await onAdd(name.trim(), dueDate || undefined)
      setName('')
      setDueDate('')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <Input
        type="text"
        placeholder="Add a new task..."
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="flex-1"
        disabled={isSubmitting}
      />
      <Input
        type="date"
        value={dueDate}
        onChange={(e) => setDueDate(e.target.value)}
        className="w-auto"
        disabled={isSubmitting}
      />
      <Button type="submit" size="icon" disabled={isSubmitting || !name.trim()}>
        <Plus className="h-5 w-5" />
      </Button>
    </form>
  )
}
