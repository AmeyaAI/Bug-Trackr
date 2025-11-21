const axios = require('axios');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

// Base URL usually ends with .../dpdo_bug_tracker
// We need to handle if the env var already includes the collection name or not.
// Based on .env.local it ends with dpdo_bug_tracker.
let BASE_COLLECTION_URL = process.env.APPFLYTE_COLLECTION_BASE_URL || 'https://appflyte-backend.ameya.ai/0aee6bd7-ed42-4184-9bac-ce0466737ada/api/collection/0aee6bd7-ed42-4184-9bac-ce0466737ada/user/public/cm/0/dpdo_bug_tracker';

// Remove trailing slash if present
if (BASE_COLLECTION_URL.endsWith('/')) {
    BASE_COLLECTION_URL = BASE_COLLECTION_URL.slice(0, -1);
}

// If the env var included bug_tracking_bugs, strip it to get the real base
if (BASE_COLLECTION_URL.endsWith('/bug_tracking_activities')) {
    BASE_COLLECTION_URL = BASE_COLLECTION_URL.replace('/bug_tracking_activities', '');
}

const FETCH_URL = `${BASE_COLLECTION_URL}/bug_tracking_activitiess`;
const DELETE_URL_PREFIX = `${BASE_COLLECTION_URL}/bug_tracking_activities`;

const TOKEN = process.env.APPFLYTE_COLLECTION_API_KEY ? `Bearer ${process.env.APPFLYTE_COLLECTION_API_KEY}` : process.env.AUTH_TOKEN;

if (!TOKEN) {
  console.error('Error: No authentication token found. Please set APPFLYTE_COLLECTION_API_KEY in .env.local or AUTH_TOKEN env var.');
  process.exit(1);
}

const headers = {
  'Authorization': TOKEN
};

async function deleteActivities() {
  try {
    console.log(`Fetching activities from: ${FETCH_URL}`);
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
    
    console.log(`Found ${items.length} activities.`);

    if (items.length === 0) {
      console.log('No activities to delete.');
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

      console.log(`Deleting activity ${itemId}...`);
      try {
        await axios.delete(`${DELETE_URL_PREFIX}/${itemId}`, { headers });
        console.log(`Successfully deleted activity ${itemId}`);
      } catch (error) {
        console.error(`Failed to delete activity ${itemId}:`, error.message);
        if (error.response) {
            console.error('Response:', error.response.status, error.response.data);
        }
      }
    }

    console.log('Finished deleting activities.');
  } catch (error) {
    console.error('Error fetching activities:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

deleteActivities();
