# BugTrackr

A lightweight, developer-friendly bug tracking application built with Next.js and AppFlyte Collection Database.

## Architecture

BugTrackr is a unified Next.js application that combines both frontend UI and backend API routes in a single codebase. The application uses AppFlyte Collection Database for data persistence with a relational schema across five specialized collections.

## Project Structure

```
bugtrackr-app/
├── frontend/
│   ├── pages/
│   │   ├── api/                    # API Routes (Backend Logic)
│   │   │   ├── bugs/               # Bug management endpoints
│   │   │   ├── projects/           # Project endpoints
│   │   │   ├── users/              # User endpoints
│   │   │   ├── comments/           # Comment endpoints
│   │   │   ├── activities/         # Activity log endpoints
│   │   │   └── health.ts           # Health check endpoint
│   │   ├── bugs/                   # Bug pages
│   │   ├── projects/               # Project pages
│   │   └── index.tsx               # Home page
│   ├── components/                 # React UI components
│   ├── lib/                        # Core business logic
│   │   ├── services/               # Collection DB service & container
│   │   ├── repositories/           # Data access layer
│   │   ├── models/                 # TypeScript types & interfaces
│   │   └── utils/                  # Utilities & validation
│   ├── styles/                     # Global styles
│   ├── package.json
│   └── .env.local.example
└── README.md
```

## Technology Stack

- **Framework**: Next.js 14 with TypeScript
- **UI Library**: React with TailwindCSS and ShadCN UI
- **Database**: AppFlyte Collection Database (relational schema)
- **Testing**: Playwright for E2E and integration tests
- **Styling**: TailwindCSS with dark mode support

## Data Architecture

The application uses a relational data model with five collections:

1. **users** - User accounts and authentication
2. **bug_tracking_projects** - Project management
3. **bug_tracking_bugss** - Bug tracking with relations to projects and users
4. **bug_tracking_commentss** - Comments on bugs
5. **bug_tracking_activitiess** - Activity logs for audit trail

## Setup Instructions

### Prerequisites

- Node.js 18+ and npm
- AppFlyte Collection Database account and API key

### Installation

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables:
   ```bash
   cp .env.local.example .env.local
   ```

4. Edit `.env.local` and set your AppFlyte credentials:
   ```bash
   APPFLYTE_COLLECTION_BASE_URL=https://appflyte-backend.ameya.ai/[your-workspace-id]/api/collection/[your-workspace-id]/user/public/cm/0/dpdo_bug_tracker
   APPFLYTE_COLLECTION_API_KEY=your_api_key_here
   DEBUG=false
   ```

### Development

Run the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:3000`

### Production Build

Build the application for production:
```bash
npm run build
```

Start the production server:
```bash
npm start
```

## API Endpoints

All API endpoints are available under `/api/*`:

### Bug Management
- `GET /api/bugs` - List all bugs
- `POST /api/bugs` - Create a new bug
- `GET /api/bugs/[id]` - Get bug details with comments
- `PATCH /api/bugs/[id]/status` - Update bug status
- `PATCH /api/bugs/[id]/assign` - Assign bug to user

### Project Management
- `GET /api/projects` - List all projects
- `GET /api/projects/[id]` - Get project details

### User Management
- `GET /api/users` - List all users
- `GET /api/users/[id]` - Get user details

### Comments
- `GET /api/comments?bugId=[id]` - Get comments for a bug
- `POST /api/comments` - Create a new comment

### Activity Logs
- `GET /api/activities?bugId=[id]` - Get activities for a bug
- `GET /api/activities?limit=[n]` - Get recent activities

### Health Check
- `GET /api/health` - Check application and database health

## Testing

Run Playwright tests:
```bash
npm run test
```

Run tests in UI mode:
```bash
npm run test:ui
```

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import the project in Vercel
3. Set the root directory to `frontend`
4. Add environment variables in Vercel dashboard
5. Deploy

### Netlify

1. Connect your Git repository
2. Set build command: `npm run build`
3. Set publish directory: `frontend/.next`
4. Add environment variables
5. Deploy

### Self-Hosted

1. Build the application: `npm run build`
2. Use a process manager like PM2: `pm2 start npm --name "bugtrackr" -- start`
3. Set up Nginx as reverse proxy
4. Configure SSL certificate

## Features

- **Bug Tracking**: Create, update, assign, and track bugs
- **Project Management**: Organize bugs by projects
- **Role-Based Access**: Admin, Developer, and Tester roles with different permissions
- **Activity Logging**: Complete audit trail of all bug operations
- **Comments**: Collaborate on bugs with threaded comments
- **Responsive Design**: Works on desktop and mobile devices
- **Dark Mode**: Built-in dark mode support

## Architecture Benefits

- **Unified Deployment**: Single build artifact, no separate backend server
- **No CORS Issues**: Frontend and API share the same origin
- **Type Safety**: TypeScript types shared across frontend and API
- **Better Performance**: No network hop between frontend and backend
- **Simplified Development**: Single dev server and codebase
- **Optimized Queries**: Filter queries at database level for better performance

## License

MIT
