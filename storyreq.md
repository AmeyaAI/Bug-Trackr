# Bug-Trackr - Story Requirements

## Project Overview

**Product**: Bug-Trackr - A lightweight, developer-friendly bug tracking application
**Tech Stack**: Next.js 14, TypeScript, TailwindCSS, ShadCN UI, AppFlyte Collection DB
**Roles**: Admin, Developer, Tester

---

## Epic 1: User Management & Authentication

### Story 1.1: User Login & Role Selection
**As a** user, **I want to** log in and select my active role, **so that** I can access features relevant to my responsibilities.

**Acceptance Criteria:**
- User can authenticate and land on the authorized page
- User can switch between available roles (Admin, Developer, Tester) via the sidebar
- Selected role persists across the session
- Unauthorized users are redirected to the login screen

### Story 1.2: User Profile Display
**As a** user, **I want to** see my name, email, and current role in the sidebar, **so that** I know which account and role I'm operating under.

**Acceptance Criteria:**
- Sidebar displays user avatar, name, and active role
- User selector allows switching between registered users (for demo/dev purposes)

---

## Epic 2: Project Management

### Story 2.1: View All Projects
**As a** user, **I want to** see a list of all projects, **so that** I can navigate to the one I'm working on.

**Acceptance Criteria:**
- Projects are listed in the sidebar
- Each project shows its name and description
- Clicking a project navigates to its bug list

### Story 2.2: Create a New Project
**As an** Admin, **I want to** create a new project with a name and description, **so that** bugs can be organized under it.

**Acceptance Criteria:**
- Only Admins can create projects
- Project requires a name (mandatory) and description (optional)
- Newly created project appears in the sidebar immediately
- `createdBy` is automatically set to the current user

---

## Epic 3: Bug Tracking (Core)

### Story 3.1: Create a Bug
**As a** Tester or Developer, **I want to** report a new bug, **so that** the team is aware of issues that need fixing.

**Acceptance Criteria:**
- Form includes: title, description (markdown), priority, severity, type, tags, project
- Type options: `bug`, `epic`, `task`, `suggestion`
- Priority levels: Lowest, Low, Medium, High, Highest
- Severity adapts based on type (e.g., Minor/Major/Blocker for bugs; Nice to have/Must have/Strategic for suggestions)
- Multiple tags can be selected (e.g., `Bug:Frontend`, `Performance`, `Mobile`)
- Bug defaults to `Open` status
- `reportedBy` is set to the current user
- File attachments can be added as comma-separated URLs
- Bug is validated against required fields before submission

### Story 3.2: View Bug List
**As a** user, **I want to** see all bugs for a project, **so that** I can understand the current state of issues.

**Acceptance Criteria:**
- Bugs are displayed as cards showing title, status, priority, severity, type, and assignee
- Bugs can be filtered by status, priority, severity, type, and assignee
- Bugs display appropriate icons for priority, severity, and type
- Tag badges are shown on each bug card

### Story 3.3: View Bug Details
**As a** user, **I want to** click on a bug to see its full details, **so that** I can understand the issue completely.

**Acceptance Criteria:**
- Detail view shows all bug fields including full markdown description
- Comments section is displayed below the bug details
- Activity log is visible showing the bug's history
- Assigned user and reporter are displayed with avatars

### Story 3.4: Update Bug Status
**As a** Developer or Admin, **I want to** change a bug's status, **so that** the team knows the current progress.

**Acceptance Criteria:**
- Status transitions: Open -> In Progress -> In Review -> Resolved -> Closed
- Status change is recorded in the activity log
- Only authorized roles can change status

### Story 3.5: Assign Bug to User
**As an** Admin or Developer, **I want to** assign a bug to a team member, **so that** there is clear ownership.

**Acceptance Criteria:**
- Assignee can be selected from a dropdown of project users
- Assignment change is recorded in the activity log
- Bug can be unassigned (set to null)

### Story 3.6: Edit Bug Details
**As a** Developer or Admin, **I want to** update bug fields (title, description, priority, severity, tags), **so that** the bug stays accurate as more information is discovered.

**Acceptance Criteria:**
- All editable fields can be modified
- Changes are recorded in the activity log
- Validation is enforced on required fields

### Story 3.7: Validate Bug
**As a** Tester, **I want to** mark a bug as validated, **so that** the team knows the issue has been confirmed/reproduced.

**Acceptance Criteria:**
- Tester can toggle the `validated` boolean on a bug
- Validation status is visible on the bug card and detail view
- Validation dialog confirms the action before applying

---

## Epic 4: Sprint Management

### Story 4.1: Create a Sprint
**As an** Admin, **I want to** create a sprint with a name, start date, and end date, **so that** bugs can be organized into iterations.

**Acceptance Criteria:**
- Sprint creation form includes name, start date, and end date
- Sprint is associated with a project
- Sprint appears in the sprint management view

### Story 4.2: Assign Bugs to Sprints
**As a** Developer or Admin, **I want to** assign bugs to a sprint, **so that** work is planned for specific iterations.

**Acceptance Criteria:**
- Bug can be linked to a sprint via the `sprintId` field
- Bug can be moved between sprints or unassigned from a sprint
- Sprint view shows all bugs assigned to it

---

## Epic 5: Collaboration

### Story 5.1: Add Comments to a Bug
**As a** user, **I want to** comment on a bug, **so that** I can share context, ask questions, or provide updates.

**Acceptance Criteria:**
- Comment supports markdown text
- Comments are displayed in chronological order under the bug
- Each comment shows the author and timestamp
- Comments are fetched via `GET /api/comments?bugId=[id]`

### Story 5.2: View Activity Log
**As a** user, **I want to** see a history of all actions taken on a bug, **so that** I have a full audit trail.

**Acceptance Criteria:**
- Activity log shows status changes, assignments, edits, and comments
- Each entry shows the user, action, and timestamp
- Global activity log page shows recent activity across all bugs
- Activities can be filtered by bug or viewed globally with a limit

---

## Epic 6: UI/UX

### Story 6.1: Dark Mode Toggle
**As a** user, **I want to** switch between light and dark mode, **so that** I can use the app comfortably in different lighting.

**Acceptance Criteria:**
- Theme toggle is accessible from the sidebar
- Preference persists across sessions
- All components render correctly in both themes

### Story 6.2: Responsive Layout
**As a** user, **I want to** use Bug-Trackr on mobile and desktop, **so that** I can track bugs from any device.

**Acceptance Criteria:**
- Sidebar collapses on smaller screens
- Bug cards and forms are usable on mobile viewports
- No horizontal scrolling on standard screen sizes

### Story 6.3: Welcome Screen
**As a** new user, **I want to** see a welcome/onboarding screen, **so that** I understand how to get started.

**Acceptance Criteria:**
- Welcome screen is shown when no project is selected
- Provides quick actions to create a project or view existing ones

### Story 6.4: Kanban Board View
**As a** user, **I want to** see bugs organized in a Kanban board by status, **so that** I can visually track progress.

**Acceptance Criteria:**
- Columns for each status: Open, In Progress, In Review, Resolved, Closed
- Bug cards can be viewed within their status column
- Board updates in real-time when status changes

---

## Epic 7: Chatbot Integration

### Story 7.1: AI-Powered Bug Assistant
**As a** user, **I want to** interact with a chatbot, **so that** I can get quick answers about bugs, create issues via natural language, or get suggestions.

**Acceptance Criteria:**
- Chatbot is accessible from the UI
- Can answer questions about existing bugs and project status
- Provides contextual help within the application

---

## Non-Functional Requirements

| Requirement       | Target                                                  |
|--------------------|---------------------------------------------------------|
| Performance        | Page load < 2s, API response < 500ms                   |
| Browser Support    | Chrome, Firefox, Safari, Edge (latest 2 versions)       |
| Accessibility      | WCAG 2.1 AA compliance                                  |
| Error Handling     | Graceful error boundaries with user-friendly fallbacks   |
| Data Validation    | Client-side and server-side validation on all inputs     |
| Caching            | Cache service for frequently accessed data               |
| Logging            | Structured logging with PII masking for emails/names     |
