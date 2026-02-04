/**
 * API Integration Tests
 * Run with: npx tsx __tests__/api.test.ts
 */

import { config } from 'dotenv'
import { resolve } from 'path'

// Load environment variables
config({ path: resolve(__dirname, '../.env') })

// Test results tracking
interface TestResult {
  name: string
  passed: boolean
  error?: string
  data?: any
}

const results: TestResult[] = []

function logTest(name: string, passed: boolean, error?: string, data?: any) {
  results.push({ name, passed, error, data })
  const status = passed ? '✓' : '✗'
  console.log(`${status} ${name}`)
  if (error) console.log(`  Error: ${error}`)
  if (data && !passed) console.log(`  Data: ${JSON.stringify(data, null, 2)}`)
}

async function testEnvVariables() {
  const notionSecret = process.env.NOTION_SECRET
  const databaseId = process.env.NOTION_DATABASE_ID
  const claudeKey = process.env.CLAUDE_API_KEY

  if (!notionSecret) {
    logTest('ENV: NOTION_SECRET exists', false, 'NOTION_SECRET is not set')
    return false
  }
  logTest('ENV: NOTION_SECRET exists', true)

  if (!databaseId) {
    logTest('ENV: NOTION_DATABASE_ID exists', false, 'NOTION_DATABASE_ID is not set')
    return false
  }
  logTest('ENV: NOTION_DATABASE_ID exists', true)

  if (!claudeKey) {
    logTest('ENV: CLAUDE_API_KEY exists', false, 'CLAUDE_API_KEY is not set')
    return false
  }
  logTest('ENV: CLAUDE_API_KEY exists', true)

  return true
}

async function testNotionConnection() {
  const { Client } = await import('@notionhq/client')

  try {
    const notion = new Client({ auth: process.env.NOTION_SECRET })
    const databaseId = process.env.NOTION_DATABASE_ID!

    // Test database query
    const response = await notion.databases.query({
      database_id: databaseId,
      page_size: 1,
    })

    logTest('Notion: Database query', true, undefined, {
      resultsCount: response.results.length,
      hasMore: response.has_more
    })
    return true
  } catch (error: any) {
    logTest('Notion: Database query', false, error.message)
    return false
  }
}

async function testGetTasks() {
  try {
    // Import after env is loaded
    const { getTasks } = await import('../lib/notion')

    const tasks = await getTasks()

    if (!Array.isArray(tasks)) {
      logTest('getTasks: Returns array', false, 'Result is not an array')
      return null
    }
    logTest('getTasks: Returns array', true)

    if (tasks.length > 0) {
      const task = tasks[0]
      const requiredFields = ['id', 'name', 'status', 'statusType', 'createdTime', 'url']
      const missingFields = requiredFields.filter(f => !(f in task))

      if (missingFields.length > 0) {
        logTest('getTasks: Task has required fields', false, `Missing: ${missingFields.join(', ')}`)
      } else {
        logTest('getTasks: Task has required fields', true, undefined, {
          taskName: task.name,
          taskStatus: task.status
        })
      }
    } else {
      logTest('getTasks: Has tasks', true, 'No tasks in database (empty is valid)')
    }

    return tasks
  } catch (error: any) {
    logTest('getTasks: Execution', false, error.message)
    return null
  }
}

async function testCreateTask() {
  try {
    const { createTask } = await import('../lib/notion')

    const testTaskName = `Test Task ${Date.now()}`
    const result = await createTask(testTaskName)

    if (!result.id) {
      logTest('createTask: Returns task ID', false, 'No ID returned')
      return null
    }
    logTest('createTask: Returns task ID', true, undefined, { id: result.id })

    return result.id
  } catch (error: any) {
    logTest('createTask: Execution', false, error.message)
    return null
  }
}

async function testUpdateTaskStatus(taskId: string) {
  try {
    const { updateTaskStatus } = await import('../lib/notion')

    // Mark as complete
    await updateTaskStatus(taskId, true)
    logTest('updateTaskStatus: Mark complete', true)

    // Mark as incomplete
    await updateTaskStatus(taskId, false)
    logTest('updateTaskStatus: Mark incomplete', true)

    return true
  } catch (error: any) {
    logTest('updateTaskStatus: Execution', false, error.message)
    return false
  }
}

async function testDeleteTask(taskId: string) {
  try {
    const { deleteTask } = await import('../lib/notion')

    await deleteTask(taskId)
    logTest('deleteTask: Archive task', true)

    return true
  } catch (error: any) {
    logTest('deleteTask: Execution', false, error.message)
    return false
  }
}

async function testClaudeAPI() {
  try {
    const Anthropic = (await import('@anthropic-ai/sdk')).default

    const client = new Anthropic({
      apiKey: process.env.CLAUDE_API_KEY,
    })

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 100,
      messages: [{ role: 'user', content: 'Say "API test successful" and nothing else.' }],
    })

    const content = message.content[0]
    if (content.type === 'text' && content.text.includes('successful')) {
      logTest('Claude: API connection', true)
      return true
    } else {
      logTest('Claude: API connection', false, 'Unexpected response')
      return false
    }
  } catch (error: any) {
    logTest('Claude: API connection', false, error.message)
    return false
  }
}

async function runAllTests() {
  console.log('\n========================================')
  console.log('  Task Web View - API Integration Tests')
  console.log('========================================\n')

  // Test environment
  console.log('--- Environment Variables ---')
  const envOk = await testEnvVariables()
  if (!envOk) {
    console.log('\n⚠️  Environment variables not set. Skipping API tests.\n')
    return
  }

  // Test Notion connection
  console.log('\n--- Notion API ---')
  const notionOk = await testNotionConnection()
  if (!notionOk) {
    console.log('\n⚠️  Notion connection failed. Skipping Notion function tests.\n')
  } else {
    // Test getTasks
    await testGetTasks()

    // Test create, update, delete cycle
    console.log('\n--- Task CRUD Operations ---')
    const createdTaskId = await testCreateTask()
    if (createdTaskId) {
      await testUpdateTaskStatus(createdTaskId)
      await testDeleteTask(createdTaskId)
    }
  }

  // Test Claude API
  console.log('\n--- Claude API ---')
  await testClaudeAPI()

  // Summary
  console.log('\n========================================')
  console.log('  Test Summary')
  console.log('========================================')
  const passed = results.filter(r => r.passed).length
  const failed = results.filter(r => !r.passed).length
  console.log(`  Passed: ${passed}`)
  console.log(`  Failed: ${failed}`)
  console.log(`  Total:  ${results.length}`)
  console.log('========================================\n')

  if (failed > 0) {
    console.log('Failed tests:')
    results.filter(r => !r.passed).forEach(r => {
      console.log(`  - ${r.name}: ${r.error}`)
    })
    process.exit(1)
  }
}

runAllTests().catch(console.error)
