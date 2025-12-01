/* eslint-disable @typescript-eslint/no-require-imports */
const axios = require('axios');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

// Base URL usually ends with .../dpdo_bug_tracker
// We need to handle if the env var already includes the collection name or not.
let BASE_COLLECTION_URL = process.env.APPFLYTE_COLLECTION_BASE_URL || 'https://appflyte-backend.ameya.ai/0aee6bd7-ed42-4184-9bac-ce0466737ada/api/collection/0aee6bd7-ed42-4184-9bac-ce0466737ada/user/public/cm/0/dpdo_bug_tracker';

// Remove trailing slash if present
if (BASE_COLLECTION_URL.endsWith('/')) {
    BASE_COLLECTION_URL = BASE_COLLECTION_URL.slice(0, -1);
}

// If the env var included bug_tracking_project, strip it to get the real base
if (BASE_COLLECTION_URL.endsWith('/bug_tracking_project')) {
    BASE_COLLECTION_URL = BASE_COLLECTION_URL.replace('/bug_tracking_project', '');
}

// Also handle if it ended with bug_tracking_projects (plural) just in case
if (BASE_COLLECTION_URL.endsWith('/bug_tracking_projects')) {
    BASE_COLLECTION_URL = BASE_COLLECTION_URL.replace('/bug_tracking_projects', '');
}

const FETCH_URL = `${BASE_COLLECTION_URL}/bug_tracking_projects`;
const DELETE_URL_PREFIX = `${BASE_COLLECTION_URL}/bug_tracking_project`;

const TOKEN = process.env.APPFLYTE_COLLECTION_API_KEY ? `Bearer ${process.env.APPFLYTE_COLLECTION_API_KEY}` : process.env.AUTH_TOKEN;

if (!TOKEN) {
  console.error('Error: No authentication token found. Please set APPFLYTE_COLLECTION_API_KEY in .env.local or AUTH_TOKEN env var.');
  process.exit(1);
}

const headers = {
  'Authorization': TOKEN,
  'Content-Type': 'application/json'
};

async function deleteProjects() {
  try {
    console.log(`Fetching projects from: ${FETCH_URL}`);
    const response = await axios.get(FETCH_URL, { headers });
    
    // Check the UUID-like key
    const uuidKey = Object.keys(response.data).find(key => key.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/));
    
    // Adjust this based on the actual response structure
    let items = [];
    if (Array.isArray(response.data)) {
        items = response.data;
    } else if (Array.isArray(response.data.items)) {
        items = response.data.items;
    } else if (uuidKey && Array.isArray(response.data[uuidKey])) {
        items = response.data[uuidKey];
    } else if (response.data.Collection && Array.isArray(response.data.Collection)) {
        items = response.data.Collection;
    }
    
    console.log(`Found ${items.length} projects.`);

    if (items.length === 0) {
      console.log('No projects to delete.');
      return;
    }

    for (const item of items) {
      // Try to find the ID field.
      // Based on logs, the ID is in item.payload.__auto_id__
      const itemId = item.payload?.__auto_id__ || item.__auto_id__ || item._id || item.id; 
      
      if (!itemId) {
        console.warn('Item has no ID:', JSON.stringify(item).substring(0, 100) + '...');
        continue;
      }

      console.log(`Processing project ${itemId}...`);

      // Step 1: Update RelativeFields to remove relationships
      try {
        console.log(`  - Removing relative fields for ${itemId}...`);
        const updatePayload = {
            "id": itemId,
            "fields": [
                {
                    "path": "$.bug_tracking_sprintss",
                    "value": []
                },
                {
                    "path": "$.bug_tracking_bugss",
                    "value": []
                },
                {
                    "path": "$.created_by",
                    "value": []
                }
            ]
        };
        
        await axios.put(`${DELETE_URL_PREFIX}/${itemId}`, updatePayload, { headers });
        console.log(`  - Relative fields removed.`);
      } catch (error) {
         console.error(`  - Failed to update project ${itemId}:`, error.message);
         if (error.response) {
             console.error('    Response:', error.response.status, error.response.data);
         }
         // We continue to try deleting even if update failed, though it might fail too.
      }

      // Step 2: Delete the project
      try {
        console.log(`  - Deleting project ${itemId}...`);
        await axios.delete(`${DELETE_URL_PREFIX}/${itemId}`, { headers });
        console.log(`  - Successfully deleted project ${itemId}`);
      } catch (error) {
        console.error(`  - Failed to delete project ${itemId}:`, error.message);
        if (error.response) {
            console.error('    Response:', error.response.status, error.response.data);
        }
      }
    }

    console.log('Finished deleting projects.');
  } catch (error) {
    console.error('Error fetching projects:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

deleteProjects();
