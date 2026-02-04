import { Client } from '@notionhq/client'
import type { Task } from '@/types'

const notion = new Client({
  auth: process.env.NOTION_SECRET,
})

const databaseId = process.env.NOTION_DATABASE_ID!

export async function getTasks(): Promise<Task[]> {
  const response = await notion.databases.query({
    database_id: databaseId,
    sorts: [
      {
        timestamp: 'created_time',
        direction: 'descending',
      },
    ],
  })

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
  const dbInfo = await notion.databases.retrieve({ database_id: databaseId })
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

  const response = await notion.pages.create({
    parent: { database_id: databaseId },
    properties,
  })

  return { id: response.id, url: (response as any).url }
}

export async function updateTaskStatus(id: string, status: boolean) {
  const dbInfo = await notion.databases.retrieve({ database_id: databaseId })
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

  await notion.pages.update({ page_id: id, properties })
}

export async function deleteTask(id: string) {
  await notion.pages.update({ page_id: id, archived: true })
}
