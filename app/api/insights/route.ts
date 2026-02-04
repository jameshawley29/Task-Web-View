import { NextResponse } from 'next/server'
import { getTasks } from '@/lib/notion'
import { getTaskInsights } from '@/lib/claude'

export async function GET() {
  try {
    const tasks = await getTasks()
    const insights = await getTaskInsights(tasks)
    return NextResponse.json(insights)
  } catch (error: unknown) {
    console.error('Error getting insights:', error)
    const message = error instanceof Error ? error.message : 'Unknown error occurred'
    return NextResponse.json(
      { error: message, details: 'Failed to generate insights' },
      { status: 500 }
    )
  }
}
