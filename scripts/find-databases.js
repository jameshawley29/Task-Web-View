// Script to find Notion databases accessible by the integration
const { Client } = require('@notionhq/client');
require('dotenv').config();

const notion = new Client({
  auth: process.env.NOTION_SECRET
});

async function findDatabases() {
  try {
    console.log('Searching for accessible databases...\n');

    const response = await notion.search({
      filter: {
        property: 'object',
        value: 'database'
      }
    });

    if (response.results.length === 0) {
      console.log('No databases found. Make sure your integration has access to at least one database.');
      console.log('\nTo grant access:');
      console.log('1. Open your Notion database');
      console.log('2. Click "..." in the top-right corner');
      console.log('3. Click "Add connections"');
      console.log('4. Find and select your integration');
      return;
    }

    console.log(`Found ${response.results.length} database(s):\n`);

    response.results.forEach((db, index) => {
      const title = db.title?.[0]?.plain_text || 'Untitled';
      console.log(`${index + 1}. ${title}`);
      console.log(`   ID: ${db.id}`);
      console.log(`   URL: ${db.url}`);

      // Show properties
      const props = Object.keys(db.properties);
      console.log(`   Properties: ${props.join(', ')}`);
      console.log('');
    });

    // Suggest the first database
    if (response.results.length > 0) {
      const firstDb = response.results[0];
      const title = firstDb.title?.[0]?.plain_text || 'Untitled';
      console.log(`\nSuggested: Add this to your .env file:`);
      console.log(`NOTION_DATABASE_ID=${firstDb.id}`);
    }

  } catch (error) {
    if (error.code === 'unauthorized') {
      console.error('Error: Invalid Notion API token');
      console.error('Please check your NOTION_SECRET in .env');
    } else {
      console.error('Error:', error.message);
    }
  }
}

findDatabases();
