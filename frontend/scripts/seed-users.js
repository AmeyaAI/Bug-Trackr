const axios = require('axios');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

// Base URL usually ends with .../dpdo_bug_tracker
let BASE_COLLECTION_URL = process.env.APPFLYTE_COLLECTION_BASE_URL || 'https://appflyte-backend.ameya.ai/0aee6bd7-ed42-4184-9bac-ce0466737ada/api/collection/0aee6bd7-ed42-4184-9bac-ce0466737ada/user/public/cm/0/dpdo_bug_tracker';

// Remove trailing slash if present
if (BASE_COLLECTION_URL.endsWith('/')) {
    BASE_COLLECTION_URL = BASE_COLLECTION_URL.slice(0, -1);
}

// Clean up URL if it points to a specific collection
const collectionsToRemove = ['/bug_tracking_activities', '/bug_tracking_bugs', '/users'];
for (const collection of collectionsToRemove) {
    if (BASE_COLLECTION_URL.endsWith(collection)) {
        BASE_COLLECTION_URL = BASE_COLLECTION_URL.replace(collection, '');
    }
}

const USERS_URL = `${BASE_COLLECTION_URL}/users`;

const TOKEN = process.env.APPFLYTE_COLLECTION_API_KEY ? `Bearer ${process.env.APPFLYTE_COLLECTION_API_KEY}` : process.env.AUTH_TOKEN;

if (!TOKEN) {
  console.error('Error: No authentication token found. Please set APPFLYTE_COLLECTION_API_KEY in .env.local or AUTH_TOKEN env var.');
  process.exit(1);
}

const headers = {
  'Authorization': TOKEN,
  'Content-Type': 'application/json'
};

const usersToSeed = [
  {
    userId: 'admin-user',
    name: 'Admin User',
    email: 'admin@example.com',
    role: 'admin',
    phoneNumber: '1234567890'
  },
  {
    userId: 'dev-user',
    name: 'Developer User',
    email: 'dev@example.com',
    role: 'developer',
    phoneNumber: '1234567891'
  },
  {
    userId: 'tester-user',
    name: 'Tester User',
    email: 'tester@example.com',
    role: 'tester',
    phoneNumber: '1234567892'
  }
];

// Helper to convert camelCase to snake_case (simple version for this script)
function toSnakeCase(obj) {
    const newObj = {};
    for (const key in obj) {
        const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        newObj[snakeKey] = obj[key];
    }
    return newObj;
}

async function seedUsers() {
  try {
    console.log(`Checking existing users at: ${USERS_URL}`);
    
    // 1. Fetch existing users to avoid duplicates
    let existingUsers = [];
    try {
        const response = await axios.get(USERS_URL, { headers });
        
        // Handle different response structures
        const uuidKey = Object.keys(response.data).find(key => key.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/));
        
        if (Array.isArray(response.data)) {
            existingUsers = response.data;
        } else if (Array.isArray(response.data.items)) {
            existingUsers = response.data.items;
        } else if (uuidKey && Array.isArray(response.data[uuidKey])) {
            existingUsers = response.data[uuidKey];
        } else if (response.data.Collection && Array.isArray(response.data.Collection)) {
            existingUsers = response.data.Collection;
        }
    } catch (error) {
        if (error.response && error.response.status === 404) {
            console.log('Users collection might be empty or not created yet.');
        } else {
            throw error;
        }
    }

    console.log(`Found ${existingUsers.length} existing users.`);

    for (const user of usersToSeed) {
      // Check if user with email already exists
      const exists = existingUsers.some(existing => {
          const payload = existing.payload || existing;
          return payload.email === user.email;
      });

      if (exists) {
        console.log(`User ${user.email} already exists. Skipping.`);
        continue;
      }

      console.log(`Creating user ${user.email}...`);
      
      const now = new Date().toISOString();
      const userPayload = {
          ...user,
          created_at: now,
          updated_at: now
      };

      const snakeCasePayload = toSnakeCase(userPayload);
      
      // Wrap in collection_item as required by API
      const body = {
          collection_item: snakeCasePayload
      };

      try {
        const createResponse = await axios.post(USERS_URL, body, { headers });
        console.log(`Successfully created user ${user.email}. ID: ${createResponse.data.__auto_id__}`);
      } catch (error) {
        console.error(`Failed to create user ${user.email}:`, error.message);
        if (error.response) {
            console.error('Response:', error.response.status, error.response.data);
        }
      }
    }

    console.log('Finished seeding users.');
  } catch (error) {
    console.error('Error seeding users:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

seedUsers();
