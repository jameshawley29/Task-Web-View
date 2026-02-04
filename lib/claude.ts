import Anthropic from '@anthropic-ai/sdk'
import type { Task, InsightResponse } from '@/types'

const anthropic = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY,
})

export async function getTaskInsights(tasks: Task[]): Promise<InsightResponse> {
  const completed = tasks.filter(t => t.status).length
  const pending = tasks.filter(t => !t.status).length
  const overdue = tasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && !t.status).length

  const highPriority = tasks.filter(t => t.priority?.toLowerCase() === 'high' && !t.status).length
  const tasksByType = tasks.reduce((acc, t) => {
    if (t.taskType) {
      acc[t.taskType] = (acc[t.taskType] || 0) + 1
    }
    return acc
  }, {} as Record<string, number>)

  const taskSummary = `
Task Overview:
- Total tasks: ${tasks.length}
- Completed: ${completed}
- Pending: ${pending}
- Overdue: ${overdue}
- High priority pending: ${highPriority}
- Task types: ${Object.entries(tasksByType).map(([k, v]) => `${k}: ${v}`).join(', ') || 'None specified'}

Recent tasks:
${tasks.slice(0, 10).map(t => `- ${t.name} (${t.status ? 'Done' : 'Pending'}${t.dueDate ? `, Due: ${t.dueDate}` : ''}${t.priority ? `, Priority: ${t.priority}` : ''})`).join('\n')}
`

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: `You are a productivity assistant analyzing a user's task list. Based on the following task data, provide insights and suggestions.

${taskSummary}

Respond with a JSON object (no markdown, just raw JSON) containing:
1. "summary": A brief 2-3 sentence analysis of their productivity
2. "suggestions": An array of 3-4 actionable suggestions for improving task management
3. "productivity_score": A number from 0-100 based on completion rate, overdue tasks, and task organization
4. "focus_areas": An array of 2-3 areas they should focus on

Be encouraging but honest. If they have overdue tasks or many high-priority items pending, address that constructively.`
      }
    ]
  })

  try {
    const content = message.content[0]
    if (content.type === 'text') {
      return JSON.parse(content.text) as InsightResponse
    }
  } catch (e) {
    console.error('Failed to parse Claude response:', e)
  }

  // Fallback response
  const completionRate = tasks.length > 0 ? (completed / tasks.length) * 100 : 0
  return {
    summary: `You have ${pending} pending tasks out of ${tasks.length} total. ${overdue > 0 ? `${overdue} tasks are overdue and need attention.` : 'Great job staying on top of deadlines!'}`,
    suggestions: [
      'Review and prioritize your pending tasks at the start of each day',
      'Break larger tasks into smaller, manageable subtasks',
      'Set realistic due dates to avoid overdue tasks',
    ],
    productivity_score: Math.round(Math.max(0, Math.min(100, completionRate - (overdue * 5)))),
    focus_areas: overdue > 0 ? ['Overdue tasks', 'Time management'] : ['Maintaining momentum', 'Task prioritization'],
  }
}
