import { NextRequest, NextResponse } from 'next/server'
import { getTasks, createTask } from '@/lib/notion'

export async function GET() {
  try {
    const tasks = await getTasks()
    return NextResponse.json(tasks)
  } catch (error: unknown) {
    console.error('Error fetching tasks:', error)
    const message = error instanceof Error ? error.message : 'Unknown error occurred'
    return NextResponse.json(
      { error: message, details: 'Failed to fetch tasks from Notion' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, dueDate, priority } = body

    if (!name || typeof name !== 'string' || name.trim() === '') {
      return NextResponse.json(
        { error: 'Task name is required and must be a non-empty string' },
        { status: 400 }
      )
    }

    const result = await createTask(name.trim(), dueDate, priority)
    return NextResponse.json({ success: true, ...result })
  } catch (error: unknown) {
    console.error('Error creating task:', error)
    const message = error instanceof Error ? error.message : 'Unknown error occurred'
    return NextResponse.json(
      { error: message, details: 'Failed to create task in Notion' },
      { status: 500 }
    )
  }
}
