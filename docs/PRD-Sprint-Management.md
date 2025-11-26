# Product Requirements Document: Sprint Management, Kanban 2.0 & Server-Side Filtering

## 1. Executive Summary  
This initiative introduces a formal **Sprint** workflow to `BugTrackr`, enabling teams to organize work into time-boxed iterations.  
It establishes a strict hierarchy of:

**Project > Sprint > Items**

It also introduces:
- A redesigned **Kanban Board 2.0**
- **Cursor-based pagination**
- **100% server-side GitHub-style filtering**
- **Strict performance guarantees**
- **URL-persisted filter state**

This PRD is written for **direct AI-driven implementation**.

---

## 2. Data Model Changes

### 2.1 New Entity: `Sprint`
A new collection `bug_tracking_sprints` is created.

```ts
plural id: bug_tracking_sprintss  // fetch all sprints  
singular id: bug_tracking_sprints // fetch sprint by id  

interface Sprint {
  id: string;
  projectId: string;      // Foreign Key to Project 
  name: string;           // e.g., "Sprint 24"
  startDate: string;      // ISO Date
  endDate: string;        // ISO Date
  goal?: string;          // Optional description
  status: 'planned' | 'active' | 'completed';
  createdAt: string;
  updatedAt: string;
}
```

---

### 2.2 Updated Entity: `Bug` (Work Item)

```ts
interface Bug {
  // existing fields...
  sprintId?: string | null; // If null → Project Backlog
  type: 'bug' | 'epic' | 'task' | 'suggestion';
}
```

---

## 3. Feature Specifications

---

### 3.1 Sprint Creation Widget

**Location:** Inside Project View
**Trigger:** "Create Sprint" Button

**Fields:**

1. Sprint Name (required)
2. Start Date (required)
3. End Date (required)
4. Sprint Goal (optional)

**Validation Rules:**

* End Date must be after Start Date

---

### 3.2 Bug Creation Flow (Dynamic Context)

1. User selects a **Project**
2. UI fetches **only sprints belonging to that project**
3. Sprint dropdown becomes active
4. If Project changes → Sprint resets

Rules:

* Only **one sprint per bug**
* Backlog bugs have `sprintId: null`

---

### 3.3 Kanban Board 2.0 (Strict Scoped Loading)

Kanban Board fetches **scoped datasets only**.
It does **NOT** use pagination.
The **Table View uses pagination**.

---

#### 3.3.1 Filter Dependency Chain

1. **Project (Mandatory)**
2. **Sprint Scope**

   * Current Sprint (default)
   * Backlog
   * All Active Sprints
   * Historical Sprint
3. **Type Selector**

   * Bug
   * Epic
   * Task
   * Suggestion

---

#### 3.3.2 View Logic

* Initial State: Empty board with prompt
* Fetch starts only after mandatory filters applied
* Example fetch:

  * Project X
  * Sprint Y
  * Type = Task only

---

## 4. Server-Side Filtering System (MANDATORY)

All filtering MUST be handled using **AppFlyte CM server-side filters**.
**Frontend nested loops are strictly forbidden.**

### 4.1 Filter Contract

Filters are passed as an **encoded JSON array** using the `filter` query param.

```ts
filter = encodeURIComponent(JSON.stringify([
  {
    field_name: "payload.priority",
    field_value: "High",
    operator: "eq"
  }
]))
```

---

### 4.2 Supported Fields

| UI Filter   | Backend Field         |
| ----------- | --------------------- |
| Project     | `payload.project_id`  |
| Sprint      | `payload.sprintId`    |
| Priority    | `payload.priority`    |
| Severity    | `payload.severity`    |
| Status      | `payload.status`      |
| Type        | `payload.type`        |
| Reported By | `payload.reported_by` |
| Assigned To | `payload.assigned_to` |
| Validated   | `payload.validated`   |

---

### 4.3 Multi-Filter Logic (AND)

Multiple filters use strict logical AND.

```json
[
  { "field_name": "payload.priority", "field_value": "High", "operator": "eq" },
  { "field_name": "payload.status", "field_value": "Open", "operator": "eq" }
]
```

---

### 4.4 Pagination + Filtering (MANDATORY COUPLING)

Every paginated request MUST include:

* `page_size`
* `filter`
* `last_evaluated_key`

```http
?page_size=10
&filter=<encoded_filter>
&last_evaluated_key=<encoded_cursor>
```

If filters are omitted on subsequent pages → **data corruption is considered a critical bug.**

---

### 4.5 Table View Rules

* Always paginated
* Always server-filtered
* Default page size: `10`
* Cursor-based only (no offset/page numbers)

---

### 4.6 Kanban View Rules

* No pagination
* Always requires:

  * Project
  * Sprint Scope
  * Type
* Always filtered server-side

---

### 4.7 URL Persistent Filter State

All filter state must be stored in URL:

```txt
?project=123
&sprint=active
&type=task
&priority=high
```

Benefits:

* Shareable views
* Refresh-safe UI
* Debug-friendly state

---

## 5. Pagination System

* Cursor-based pagination using:

  * `page_size`
  * `last_evaluated_key`

* Cursor must be:

  * JSON stringified
  * URL encoded

* Pagination continues until:

  ```json
  "last_evaluated_key": null
  ```

* Client must:

  * Track cursor history for Previous Page
  * Apply duplicate protection using unique bug IDs

---

## 6. Technical Constraints & Performance

* ✅ No nested frontend filtering loops
* ✅ No full-dataset fetch for filters
* ✅ Always filter + paginate at backend
* ✅ Filters MUST travel with cursor
* ✅ Deduplication required on frontend
* ✅ URL must persist filter state
* ✅ Kanban must never fetch unscoped data

---

## 7. User Stories

1. As a Manager, I want to create sprints for projects.
2. As a Developer, I want to assign bugs directly to sprints.
3. As a Team Lead, I want to view only Epics in the current sprint.
4. As a QA Engineer, I want to filter bugs by priority.
5. As a Product Manager, I want multi-filter dashboard views.
6. As a Developer, I want GitHub-style filtering performance.

---

## 8. Acceptance Criteria

* ✅ All filtering is server-side
* ✅ Pagination is cursor-based only
* ✅ Filters persist in URL
* ✅ Kanban respects strict scoping
* ✅ Table view never loads full data
* ✅ No client-side nested filtering loops
* ✅ Multi-filter AND logic is supported
* ✅ Duplicate prevention exists in UI

---

## 9. Definition of Done

* Sprint creation fully functional
* Bug-to-sprint linkage operational
* Kanban Board loads scoped data only
* Server-side GitHub-style filtering live
* Cursor pagination stable
* URL filter persistence working
* Performance remains stable under 50k+ records
* No duplicate rows across pagination
* No nested frontend filtering loops

