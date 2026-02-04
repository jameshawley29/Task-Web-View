import { NextResponse } from 'next/server'
import { getTasks } from '@/lib/notion'
import { getTaskInsights } from '@/lib/claude'

export async function GET() {
  try {
    const tasks = await getTasks()
    const insights = await getTaskInsights(tasks)
    return NextResponse.json(insights)
  } catch (error: any) {
    console.error('Error getting insights:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
