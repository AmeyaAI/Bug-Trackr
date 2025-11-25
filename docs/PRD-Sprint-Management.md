# Product Requirements Document: Sprint Management & Kanban 2.0

## 1. Executive Summary
This initiative introduces a formal **Sprint** workflow to `BugTrackr`, enabling teams to organize work into time-boxed iterations. It establishes a strict hierarchy of **Project > Sprint > Items** and overhauls the Kanban board to support comprehensive, performance-conscious filtering.

## 2. Data Model Changes

### 2.1 New Entity: `Sprint`
A new collection `sprints` will be created.
```typescript
interface Sprint {
  id: string;
  projectId: string;      // Foreign Key to Project
  name: string;           // e.g., "Sprint 24"
  startDate: string;      // ISO Date
  endDate: string;        // ISO Date
  goal?: string;          // Optional description of focus
  status: 'planned' | 'active' | 'completed';
  createdAt: string;
  updatedAt: string;
}
```

### 2.2 Updated Entity: `Bug` (Work Item)
The existing `Bug` model will be enhanced to support the new hierarchy and explicit typing.
```typescript
interface Bug {
  // ... existing fields
  sprintId?: string | null; // If null, item is in the Project Backlog
  type: 'bug' | 'epic' | 'task' | 'suggestion'; // Replaces loose "Tags" for categorization
}
```

## 3. Feature Specifications

### 3.1 Sprint Creation Widget
*   **Location**: Inside the Project Details view.
*   **Trigger**: "Create Sprint" button.
*   **Input Fields**:
    1.  **Sprint Name** (Required): Text input.
    2.  **Start Date** (Required): Date picker.
    3.  **End Date** (Required): Date picker.
    4.  **Sprint Goal** (Optional): Text area for context.
*   **Validation**: End Date must be after Start Date.

### 3.2 Bug Creation Flow (Dynamic Context)
*   **Behavior**: The "Sprint" selection must be context-aware.
*   **Logic**:
    1.  User selects a **Project** from the dropdown.
    2.  UI asynchronously fetches active/planned Sprints for *only* that project.
    3.  **Sprint Dropdown** becomes active, populated with valid sprints.
    4.  If the user changes the Project, the Sprint selection is cleared and re-fetched.
*   **UI**: A dedicated "Sprint" dropdown field (separate from generic Tags) to ensure an item belongs to only **one** sprint at a time.

### 3.3 Kanban Board 2.0 (Strict Filtering)
The Kanban board will no longer attempt to load "everything." It requires specific context to render.

#### 3.3.1 Filter Hierarchy
The board will have a control bar with the following dependency chain:
1.  **Project Selector** (Mandatory):
    *   User *must* select a project to see any data.
2.  **Sprint Selector** (Dependent on Project):
    *   Options: "Current Sprint" (Default), "Backlog", "All Active Sprints", or specific historical sprints.
3.  **Type Selector** (Strict Segmentation):
    *   Options: "Bug", "Epic", "Task", "Suggestion".
    *   **Behavior**: Users can view *only* Epics to see high-level roadmaps, or *only* Tasks for daily execution. This prevents board clutter.

#### 3.3.2 View Logic
*   **Initial State**: Empty board with a prompt: "Select a Project to view the board."
*   **Data Fetching**: Fetching triggers only when the mandatory filters (Project + Sprint/Backlog context) are set.
*   **Performance**: This ensures we never fetch 5,000 mixed items at once. We only fetch e.g., "Tasks in Sprint 1 of Project X".

## 4. Technical Constraints & Performance
*   **No Complex Joins**: We will not perform deep nested queries (Project -> Sprint -> Epic -> Task) in a single DB call.
*   **Pagination**: The "Backlog" view (items with `sprintId: null`) must be paginated or virtualized if the item count exceeds 100.
*   **State Management**: The Kanban board state (selected filters) should ideally persist in the URL query params (e.g., `?project=123&sprint=456&type=task`) so views are shareable.

## 5. User Stories
1.  **As a Manager**, I want to create a "Sprint 5" for the "Mobile App" project so I can assign specific tickets to it.
2.  **As a Developer**, I want to create a bug and immediately assign it to "Sprint 5" so it appears on the board.
3.  **As a Team Lead**, I want to filter the board to show only "Epics" in the "Current Sprint" to review our high-level progress without seeing every small sub-task.
