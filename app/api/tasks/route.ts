import { NextRequest, NextResponse } from 'next/server'
import { getTasks, createTask } from '@/lib/notion'

export async function GET() {
  try {
    const tasks = await getTasks()
    return NextResponse.json(tasks)
  } catch (error: any) {
    console.error('Error fetching tasks:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, dueDate, priority } = body

    if (!name) {
      return NextResponse.json({ error: 'Task name is required' }, { status: 400 })
    }

    const result = await createTask(name, dueDate, priority)
    return NextResponse.json({ success: true, ...result })
  } catch (error: any) {
    console.error('Error creating task:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
