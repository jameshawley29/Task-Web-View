const express = require('express');
const { Client } = require('@notionhq/client');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Initialize Notion client
const notion = new Client({
  auth: process.env.NOTION_SECRET
});

const databaseId = process.env.NOTION_DATABASE_ID;

// Get all tasks
app.get('/api/tasks', async (req, res) => {
  try {
    const response = await notion.databases.query({
      database_id: databaseId,
      sorts: [
        {
          timestamp: 'created_time',
          direction: 'descending'
        }
      ]
    });

    const tasks = response.results.map(page => {
      const properties = page.properties;

      // Extract task name - handle different property types
      let name = 'Untitled';
      if (properties.Name) {
        if (properties.Name.title && properties.Name.title.length > 0) {
          name = properties.Name.title[0].plain_text;
        }
      } else if (properties.Task) {
        if (properties.Task.title && properties.Task.title.length > 0) {
          name = properties.Task.title[0].plain_text;
        }
      }

      // Extract status - handle checkbox or select types
      let status = false;
      let statusType = 'checkbox';
      if (properties.Status) {
        if (properties.Status.type === 'checkbox') {
          status = properties.Status.checkbox;
          statusType = 'checkbox';
        } else if (properties.Status.type === 'select') {
          status = properties.Status.select?.name === 'Done' ||
                   properties.Status.select?.name === 'Complete' ||
                   properties.Status.select?.name === 'Completed';
          statusType = 'select';
        } else if (properties.Status.type === 'status') {
          status = properties.Status.status?.name === 'Done' ||
                   properties.Status.status?.name === 'Complete' ||
                   properties.Status.status?.name === 'Completed';
          statusType = 'status';
        }
      } else if (properties.Done) {
        if (properties.Done.type === 'checkbox') {
          status = properties.Done.checkbox;
          statusType = 'checkbox';
        }
      }

      // Extract due date if available
      let dueDate = null;
      if (properties.Due) {
        dueDate = properties.Due.date?.start || null;
      } else if (properties['Due Date']) {
        dueDate = properties['Due Date'].date?.start || null;
      }

      // Extract priority if available
      let priority = null;
      if (properties.Priority) {
        if (properties.Priority.type === 'select') {
          priority = properties.Priority.select?.name || null;
        } else if (properties.Priority.type === 'multi_select') {
          priority = properties.Priority.multi_select?.[0]?.name || null;
        }
      }

      // Extract task type if available
      let taskType = null;
      if (properties['Task Type']) {
        if (properties['Task Type'].type === 'select') {
          taskType = properties['Task Type'].select?.name || null;
        }
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
        url: page.url
      };
    });

    res.json(tasks);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get database schema (to understand available properties)
app.get('/api/schema', async (req, res) => {
  try {
    const response = await notion.databases.retrieve({
      database_id: databaseId
    });
    res.json(response.properties);
  } catch (error) {
    console.error('Error fetching schema:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create a new task
app.post('/api/tasks', async (req, res) => {
  try {
    const { name, dueDate, priority } = req.body;

    // Get database schema first to understand properties
    const dbInfo = await notion.databases.retrieve({
      database_id: databaseId
    });

    const properties = {};

    // Find the title property
    for (const [key, value] of Object.entries(dbInfo.properties)) {
      if (value.type === 'title') {
        properties[key] = {
          title: [{ text: { content: name } }]
        };
        break;
      }
    }

    // Add status if it exists
    if (dbInfo.properties.Status) {
      if (dbInfo.properties.Status.type === 'checkbox') {
        properties.Status = { checkbox: false };
      } else if (dbInfo.properties.Status.type === 'status') {
        // Get the first status option (usually "Not started" or similar)
        const statusOptions = dbInfo.properties.Status.status?.options;
        if (statusOptions && statusOptions.length > 0) {
          properties.Status = { status: { name: statusOptions[0].name } };
        }
      }
    } else if (dbInfo.properties.Done) {
      properties.Done = { checkbox: false };
    }

    // Add due date if provided
    if (dueDate) {
      if (dbInfo.properties.Due) {
        properties.Due = { date: { start: dueDate } };
      } else if (dbInfo.properties['Due Date']) {
        properties['Due Date'] = { date: { start: dueDate } };
      }
    }

    // Add priority if provided and property exists
    if (priority && dbInfo.properties.Priority) {
      if (dbInfo.properties.Priority.type === 'select') {
        properties.Priority = { select: { name: priority } };
      }
    }

    const response = await notion.pages.create({
      parent: { database_id: databaseId },
      properties
    });

    res.json({
      success: true,
      id: response.id,
      url: response.url
    });
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update a task (mark complete/incomplete)
app.patch('/api/tasks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, statusType } = req.body;

    // Get database schema to find correct property
    const dbInfo = await notion.databases.retrieve({
      database_id: databaseId
    });

    const properties = {};

    if (dbInfo.properties.Status) {
      if (dbInfo.properties.Status.type === 'checkbox') {
        properties.Status = { checkbox: status };
      } else if (dbInfo.properties.Status.type === 'status') {
        const statusOptions = dbInfo.properties.Status.status?.options || [];
        // Find "Done" or first completed-like status
        const doneOption = statusOptions.find(opt =>
          opt.name.toLowerCase().includes('done') ||
          opt.name.toLowerCase().includes('complete')
        );
        const notDoneOption = statusOptions.find(opt =>
          opt.name.toLowerCase().includes('not') ||
          opt.name.toLowerCase().includes('todo') ||
          opt.name.toLowerCase().includes('in progress')
        ) || statusOptions[0];

        properties.Status = {
          status: { name: status ? (doneOption?.name || statusOptions[statusOptions.length - 1]?.name) : notDoneOption?.name }
        };
      } else if (dbInfo.properties.Status.type === 'select') {
        const selectOptions = dbInfo.properties.Status.select?.options || [];
        const doneOption = selectOptions.find(opt =>
          opt.name.toLowerCase().includes('done') ||
          opt.name.toLowerCase().includes('complete')
        );
        const notDoneOption = selectOptions.find(opt =>
          opt.name.toLowerCase().includes('not') ||
          opt.name.toLowerCase().includes('todo')
        ) || selectOptions[0];

        properties.Status = {
          select: { name: status ? (doneOption?.name || 'Done') : notDoneOption?.name }
        };
      }
    } else if (dbInfo.properties.Done) {
      properties.Done = { checkbox: status };
    }

    const response = await notion.pages.update({
      page_id: id,
      properties
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete a task (archive the page)
app.delete('/api/tasks/:id', async (req, res) => {
  try {
    const { id } = req.params;

    await notion.pages.update({
      page_id: id,
      archived: true
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({ error: error.message });
  }
});

// Serve the main HTML file
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
