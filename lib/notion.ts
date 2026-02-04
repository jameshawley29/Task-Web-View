import { Client } from '@notionhq/client'
import type { Task } from '@/types'

// Validate environment variables
function getEnvVar(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}. Please check your .env file or Vercel environment settings.`)
  }
  return value
}

// Retry wrapper for transient network errors
async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries = 3,
  delayMs = 1000
): Promise<T> {
  let lastError: Error | null = null

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))

      // Check if it's a retryable error (network issues)
      const isRetryable =
        lastError.message.includes('EAI_AGAIN') ||
        lastError.message.includes('ENOTFOUND') ||
        lastError.message.includes('ETIMEDOUT') ||
        lastError.message.includes('ECONNRESET') ||
        lastError.message.includes('fetch failed')

      if (!isRetryable || attempt === maxRetries - 1) {
        throw lastError
      }

      // Exponential backoff
      const delay = delayMs * Math.pow(2, attempt)
      console.log(`Notion API retry ${attempt + 1}/${maxRetries} after ${delay}ms...`)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  throw lastError || new Error('Operation failed after retries')
}

// Lazy initialization to allow proper env loading in Next.js
let notionClient: Client | null = null
let cachedDatabaseId: string | null = null

function getNotionClient(): Client {
  if (!notionClient) {
    const secret = getEnvVar('NOTION_SECRET')
    notionClient = new Client({
      auth: secret,
      timeoutMs: 30000, // 30 second timeout
    })
  }
  return notionClient
}

function getDatabaseId(): string {
  if (!cachedDatabaseId) {
    cachedDatabaseId = getEnvVar('NOTION_DATABASE_ID')
  }
  return cachedDatabaseId
}

export async function getTasks(): Promise<Task[]> {
  const notion = getNotionClient()
  const databaseId = getDatabaseId()

  const response = await withRetry(() =>
    notion.databases.query({
      database_id: databaseId,
      sorts: [
        {
          timestamp: 'created_time',
          direction: 'descending',
        },
      ],
    })
  )

  return response.results.map((page: any) => {
    const properties = page.properties

    // Extract task name
    let name = 'Untitled'
    if (properties.Name?.title?.length > 0) {
      name = properties.Name.title[0].plain_text
    } else if (properties.Task?.title?.length > 0) {
      name = properties.Task.title[0].plain_text
    }

    // Extract status
    let status = false
    let statusType: 'checkbox' | 'select' | 'status' = 'checkbox'
    if (properties.Status) {
      if (properties.Status.type === 'checkbox') {
        status = properties.Status.checkbox
        statusType = 'checkbox'
      } else if (properties.Status.type === 'select') {
        status = ['Done', 'Complete', 'Completed'].includes(properties.Status.select?.name || '')
        statusType = 'select'
      } else if (properties.Status.type === 'status') {
        status = ['Done', 'Complete', 'Completed'].includes(properties.Status.status?.name || '')
        statusType = 'status'
      }
    } else if (properties.Done?.type === 'checkbox') {
      status = properties.Done.checkbox
      statusType = 'checkbox'
    }

    // Extract due date
    let dueDate = null
    if (properties.Due?.date?.start) {
      dueDate = properties.Due.date.start
    } else if (properties['Due Date']?.date?.start) {
      dueDate = properties['Due Date'].date.start
    }

    // Extract priority
    let priority = null
    if (properties.Priority?.type === 'select') {
      priority = properties.Priority.select?.name || null
    } else if (properties.Priority?.type === 'multi_select') {
      priority = properties.Priority.multi_select?.[0]?.name || null
    }

    // Extract task type
    let taskType = null
    if (properties['Task Type']?.type === 'select') {
      taskType = properties['Task Type'].select?.name || null
    }

    return {
      id: page.id,
      name,
      status,
      statusType,
      dueDate,
      priority,
      taskType,
      createdTime: page.created_time,
      url: page.url,
    }
  })
}

export async function createTask(name: string, dueDate?: string, priority?: string) {
  const notion = getNotionClient()
  const databaseId = getDatabaseId()

  const dbInfo = await withRetry(() =>
    notion.databases.retrieve({ database_id: databaseId })
  )
  const properties: Record<string, any> = {}

  // Find title property
  for (const [key, value] of Object.entries(dbInfo.properties as Record<string, any>)) {
    if (value.type === 'title') {
      properties[key] = { title: [{ text: { content: name } }] }
      break
    }
  }

  // Add status
  const dbProps = dbInfo.properties as Record<string, any>
  if (dbProps.Status?.type === 'checkbox') {
    properties.Status = { checkbox: false }
  } else if (dbProps.Done?.type === 'checkbox') {
    properties.Done = { checkbox: false }
  }

  // Add due date
  if (dueDate) {
    if (dbProps.Due) {
      properties.Due = { date: { start: dueDate } }
    } else if (dbProps['Due Date']) {
      properties['Due Date'] = { date: { start: dueDate } }
    }
  }

  // Add priority
  if (priority && dbProps.Priority?.type === 'select') {
    properties.Priority = { select: { name: priority } }
  }

  const response = await withRetry(() =>
    notion.pages.create({
      parent: { database_id: databaseId },
      properties,
    })
  )

  return { id: response.id, url: (response as any).url }
}

export async function updateTaskStatus(id: string, status: boolean) {
  const notion = getNotionClient()
  const databaseId = getDatabaseId()

  const dbInfo = await withRetry(() =>
    notion.databases.retrieve({ database_id: databaseId })
  )
  const properties: Record<string, any> = {}
  const dbProps = dbInfo.properties as Record<string, any>

  if (dbProps.Status) {
    if (dbProps.Status.type === 'checkbox') {
      properties.Status = { checkbox: status }
    } else if (dbProps.Status.type === 'status') {
      const options = dbProps.Status.status?.options || []
      const doneOption = options.find((o: any) =>
        ['done', 'complete'].some(s => o.name.toLowerCase().includes(s))
      )
      const notDoneOption = options.find((o: any) =>
        ['not', 'todo', 'in progress'].some(s => o.name.toLowerCase().includes(s))
      ) || options[0]

      properties.Status = {
        status: { name: status ? (doneOption?.name || options[options.length - 1]?.name) : notDoneOption?.name }
      }
    }
  } else if (dbProps.Done) {
    properties.Done = { checkbox: status }
  }

  await withRetry(() =>
    notion.pages.update({ page_id: id, properties })
  )
}

export async function deleteTask(id: string) {
  const notion = getNotionClient()
  await withRetry(() =>
    notion.pages.update({ page_id: id, archived: true })
  )
}

// Export for testing
export { getNotionClient, getDatabaseId }
