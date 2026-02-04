import { NextRequest, NextResponse } from 'next/server'
import { updateTaskStatus, deleteTask } from '@/lib/notion'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { status } = body

    await updateTaskStatus(id, status)
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error updating task:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await deleteTask(id)
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting task:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
