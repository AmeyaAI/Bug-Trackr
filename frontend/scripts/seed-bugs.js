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
const collectionsToRemove = ['/bug_tracking_activities', '/bug_tracking_bugs', '/users', '/bug_tracking_projects'];
for (const collection of collectionsToRemove) {
    if (BASE_COLLECTION_URL.endsWith(collection)) {
        BASE_COLLECTION_URL = BASE_COLLECTION_URL.replace(collection, '');
    }
}

const BUGS_URL = `${BASE_COLLECTION_URL}/bug_tracking_bugss`;
const PROJECTS_URL = `${BASE_COLLECTION_URL}/bug_tracking_projects`;
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

// Enums
const BugStatus = {
  OPEN: 'Open',
  IN_PROGRESS: 'In Progress',
  IN_REVIEW: 'In Review',
  RESOLVED: 'Resolved',
  CLOSED: 'Closed',
};

const BugPriority = {
  LOWEST: 'Lowest',
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  HIGHEST: 'Highest',
};

const BugSeverity = {
  MINOR: 'Minor',
  MAJOR: 'Major',
  BLOCKER: 'Blocker',
};

const BugTag = {
  EPIC: 'Epic',
  TASK: 'Task',
  SUGGESTION: 'Suggestion',
  BUG_FRONTEND: 'Bug:Frontend',
  BUG_BACKEND: 'Bug:Backend',
  BUG_TEST: 'Bug:Test',
  UI: 'UI',
  MOBILE: 'Mobile',
  BACKEND: 'Backend',
  PAYMENT: 'Payment',
  BROWSER: 'Browser',
  PERFORMANCE: 'Performance',
  DATABASE: 'Database',
};

const ALL_BUG_TAGS = Object.values(BugTag);

// Helper to convert camelCase to snake_case
function toSnakeCase(obj) {
    const newObj = {};
    for (const key in obj) {
        const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        newObj[snakeKey] = obj[key];
    }
    return newObj;
}

// Helper to get random item from array
function getRandomItem(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

// Helper to get random subset of array
function getRandomSubset(arr, max = 3) {
    const shuffled = arr.sort(() => 0.5 - Math.random());
    return shuffled.slice(0, Math.floor(Math.random() * max) + 1);
}

async function fetchItems(url) {
    try {
        const response = await axios.get(url, { headers });
        
        // Handle different response structures
        const uuidKey = Object.keys(response.data).find(key => key.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/));
        
        if (Array.isArray(response.data)) {
            return response.data;
        } else if (Array.isArray(response.data.items)) {
            return response.data.items;
        } else if (uuidKey && Array.isArray(response.data[uuidKey])) {
            return response.data[uuidKey];
        } else if (response.data.Collection && Array.isArray(response.data.Collection)) {
            return response.data.Collection;
        }
        return [];
    } catch (error) {
        if (error.response && error.response.status === 404) {
            return [];
        }
        throw error;
    }
}

async function seedBugs() {
  try {
    console.log('Fetching users and projects...');
    const users = await fetchItems(USERS_URL);
    const projects = await fetchItems(PROJECTS_URL);

    if (users.length === 0) {
        console.error('No users found. Please run seed-users.js first.');
        return;
    }

    if (projects.length === 0) {
        console.log('No projects found. Creating a default project...');
        const projectPayload = {
            name: 'Default Project',
            description: 'Auto-generated project for seeding bugs',
            created_by: [users[0].__auto_id__ || users[0].id]
        };
        try {
            const projectRes = await axios.post(PROJECTS_URL, { collection_item: projectPayload }, { headers });
            projects.push(projectRes.data);
            console.log('Default project created.');
        } catch (err) {
            console.error('Failed to create default project:', err.message);
            return;
        }
    }

    console.log(`Found ${users.length} users and ${projects.length} projects.`);

    const bugsToCreate = [];
    for (let i = 0; i < 15; i++) {
        const project = getRandomItem(projects);
        const reporter = getRandomItem(users);
        const assignee = Math.random() > 0.3 ? getRandomItem(users) : null;
        
        const type = getRandomItem([BugTag.EPIC, BugTag.TASK, BugTag.SUGGESTION, BugTag.BUG_FRONTEND, BugTag.BUG_BACKEND]);
        const otherTags = getRandomSubset(ALL_BUG_TAGS.filter(t => t !== type), 2);
        const tags = [type, ...otherTags];

        const bug = {
            title: `Random Bug ${i + 1}: ${type} - ${new Date().getTime().toString().slice(-4)}`,
            description: `This is a randomly generated bug description for bug ${i + 1}.\n\n## Steps to Reproduce\n1. Do something\n2. See error\n\n**Expected Behavior**\nShould work.\n\n**Actual Behavior**\nFailed.`,
            status: getRandomItem(Object.values(BugStatus)),
            priority: getRandomItem(Object.values(BugPriority)),
            severity: getRandomItem(Object.values(BugSeverity)),
            projectId: [project.__auto_id__ || project.id],
            reportedBy: [reporter.__auto_id__ || reporter.id],
            assignedTo: assignee ? [assignee.__auto_id__ || assignee.id] : [],
            tags: tags.join(','),
            validated: Math.random() > 0.5,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        bugsToCreate.push(bug);
    }

    console.log(`Generating ${bugsToCreate.length} bugs...`);

    for (const bug of bugsToCreate) {
        const snakeCasePayload = toSnakeCase(bug);
        
        const body = {
            collection_item: snakeCasePayload
        };

        try {
            const createResponse = await axios.post(BUGS_URL, body, { headers });
            console.log(`Created bug: ${bug.title}`);
        } catch (error) {
            console.error(`Failed to create bug ${bug.title}:`, error.message);
             if (error.response) {
                console.error('Response:', error.response.status, error.response.data);
            }
        }
    }

    console.log('Finished seeding bugs.');

  } catch (error) {
    console.error('Error seeding bugs:', error);
  }
}

seedBugs();
