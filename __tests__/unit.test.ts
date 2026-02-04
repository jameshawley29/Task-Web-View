/**
 * Unit Tests - No network required
 * Run with: npx tsx __tests__/unit.test.ts
 */

import { config } from 'dotenv'
import { resolve } from 'path'

// Load environment variables
config({ path: resolve(__dirname, '../.env') })

interface TestResult {
  name: string
  passed: boolean
  error?: string
}

const results: TestResult[] = []

function logTest(name: string, passed: boolean, error?: string) {
  results.push({ name, passed, error })
  const status = passed ? '✓' : '✗'
  console.log(`${status} ${name}`)
  if (error) console.log(`  Error: ${error}`)
}

// Test utility functions
async function testUtils() {
  const { cn, formatDate, isOverdue } = await import('../lib/utils')

  // Test cn (class merging)
  try {
    const result = cn('foo', 'bar', { baz: true, qux: false })
    if (result.includes('foo') && result.includes('bar') && result.includes('baz') && !result.includes('qux')) {
      logTest('utils: cn merges classes correctly', true)
    } else {
      logTest('utils: cn merges classes correctly', false, `Got: ${result}`)
    }
  } catch (e: any) {
    logTest('utils: cn merges classes correctly', false, e.message)
  }

  // Test formatDate
  try {
    const today = new Date().toISOString().split('T')[0]
    const result = formatDate(today)
    if (result === 'Today') {
      logTest('utils: formatDate returns Today', true)
    } else {
      logTest('utils: formatDate returns Today', false, `Got: ${result}`)
    }
  } catch (e: any) {
    logTest('utils: formatDate returns Today', false, e.message)
  }

  // Test isOverdue
  try {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const result = isOverdue(yesterday.toISOString().split('T')[0])
    if (result === true) {
      logTest('utils: isOverdue detects past dates', true)
    } else {
      logTest('utils: isOverdue detects past dates', false, `Got: ${result}`)
    }
  } catch (e: any) {
    logTest('utils: isOverdue detects past dates', false, e.message)
  }
}

// Test types
async function testTypes() {
  try {
    const types = await import('../types')
    const taskKeys = ['id', 'name', 'status', 'statusType', 'dueDate', 'priority', 'taskType', 'createdTime', 'url']
    // Types are compile-time only, just verify import works
    logTest('types: Task type exports correctly', true)
  } catch (e: any) {
    logTest('types: Task type exports correctly', false, e.message)
  }
}

// Test component imports (no rendering)
async function testComponentImports() {
  const components = [
    ['ThemeProvider', '../components/theme-provider'],
    ['TaskItem', '../components/task-item'],
    ['AddTaskForm', '../components/add-task-form'],
    ['TaskCharts', '../components/task-charts'],
    ['InsightsPanel', '../components/insights-panel'],
    ['Button', '../components/ui/button'],
    ['Card', '../components/ui/card'],
    ['Input', '../components/ui/input'],
  ]

  for (const [name, path] of components) {
    try {
      await import(path)
      logTest(`component: ${name} imports without error`, true)
    } catch (e: any) {
      logTest(`component: ${name} imports without error`, false, e.message)
    }
  }
}

// Test lib imports
async function testLibImports() {
  try {
    const notion = await import('../lib/notion')
    if (notion.getTasks && notion.createTask && notion.updateTaskStatus && notion.deleteTask) {
      logTest('lib: notion exports all functions', true)
    } else {
      logTest('lib: notion exports all functions', false, 'Missing exports')
    }
  } catch (e: any) {
    logTest('lib: notion exports all functions', false, e.message)
  }

  try {
    const claude = await import('../lib/claude')
    if (claude.getTaskInsights) {
      logTest('lib: claude exports getTaskInsights', true)
    } else {
      logTest('lib: claude exports getTaskInsights', false, 'Missing export')
    }
  } catch (e: any) {
    logTest('lib: claude exports getTaskInsights', false, e.message)
  }
}

async function runAllTests() {
  console.log('\n========================================')
  console.log('  Task Web View - Unit Tests')
  console.log('========================================\n')

  console.log('--- Utility Functions ---')
  await testUtils()

  console.log('\n--- Type Definitions ---')
  await testTypes()

  console.log('\n--- Component Imports ---')
  await testComponentImports()

  console.log('\n--- Library Imports ---')
  await testLibImports()

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
