import { NextRequest, NextResponse } from 'next/server'
import { updateTaskStatus, deleteTask } from '@/lib/notion'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    if (!id) {
      return NextResponse.json(
        { error: 'Task ID is required' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { status } = body

    if (typeof status !== 'boolean') {
      return NextResponse.json(
        { error: 'Status must be a boolean' },
        { status: 400 }
      )
    }

    await updateTaskStatus(id, status)
    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    console.error('Error updating task:', error)
    const message = error instanceof Error ? error.message : 'Unknown error occurred'
    return NextResponse.json(
      { error: message, details: 'Failed to update task status' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    if (!id) {
      return NextResponse.json(
        { error: 'Task ID is required' },
        { status: 400 }
      )
    }

    await deleteTask(id)
    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    console.error('Error deleting task:', error)
    const message = error instanceof Error ? error.message : 'Unknown error occurred'
    return NextResponse.json(
      { error: message, details: 'Failed to delete task' },
      { status: 500 }
    )
  }
}
