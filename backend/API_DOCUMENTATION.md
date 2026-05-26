# Backend API Documentation

> This document covers all publicly routed backend API endpoints, including `api/auth/`.

## Authorization

- Most endpoints require an authenticated user.
- The backend uses cookie-based JWT auth in `access_token` / `refresh_token` cookies.
- Publicly accessible endpoints include `POST /api/organizations/register/`, `POST /api/auth/login/`, `POST /api/auth/refresh/`, and `POST /api/auth/invite-register/`.

---

## Accounts / Authentication

### POST /api/auth/login/

Authenticate with email and password.

Response example:

```json
{
  "message": "Login successful",
  "user": {
    "id": "uuid-user-1",
    "email": "alice@example.com",
    "name": "Alice",
    "role": "manager",
    "organization": "uuid-org-1",
    "profile_picture": null,
    "bio": "",
    "designation": "Product Manager",
    "department": "Product",
    "phone_number": "123-456-7890",
    "work_status": "active",
    "joined_at": "2026-05-01T12:00:00Z"
  },
  "access": "eyJ...",
  "refresh": "eyJ..."
}
```

The response also sets `access_token` and `refresh_token` cookies.

### POST /api/auth/refresh/

Refresh the access token using the refresh cookie.

Response example:

```json
{
  "message": "Access token refreshed",
  "access": "eyJ..."
}
```

This endpoint sets a new `access_token` cookie.

### GET /api/auth/me/

Return the authenticated user profile.

Response example:

```json
{
  "id": "uuid-user-1",
  "email": "alice@example.com",
  "name": "Alice",
  "role": "manager",
  "organization": "uuid-org-1",
  "profile_picture": null,
  "bio": "",
  "designation": "Product Manager",
  "department": "Product",
  "phone_number": "123-456-7890",
  "work_status": "active",
  "joined_at": "2026-05-01T12:00:00Z"
}
```

### POST /api/auth/logout/

Clear authentication cookies.

Response example:

```json
{
  "message": "Logged out"
}
```

### POST /api/auth/invite-register/

Create an account from an invitation token.

Request body must include `token`, `name`, and `password`.

Response example:

```json
{
  "message": "Account created via invite"
}
```

This endpoint also sets `access_token` and `refresh_token` cookies.

### PATCH /api/auth/profile/

Update profile fields.

Request body may include any of:
- `name`
- `bio`
- `designation`
- `department`
- `phone_number`
- `work_status`
- `profile_picture` (multipart file)

Response example:

```json
{
  "id": "uuid-user-1",
  "email": "alice@example.com",
  "name": "Alice Updated",
  "role": "manager",
  "organization": "uuid-org-1",
  "profile_picture": null,
  "bio": "Updated bio",
  "designation": "Product Manager",
  "department": "Product",
  "phone_number": "123-456-7890",
  "work_status": "active",
  "joined_at": "2026-05-01T12:00:00Z"
}
```

---

---

## Organizations

### POST /api/organizations/register/

Registers a new organization and creates an admin user.

Response example:

```json
{
  "message": "Organization registered successfully",
  "user": {
    "email": "admin@example.com",
    "name": "Admin Name",
    "role": "admin",
    "organization": "Acme Corp"
  }
}
```

### GET /api/organizations/team/

Returns all organization members plus pending invitation entries.

Response example:

```json
[
  {
    "id": "uuid-of-user-1",
    "name": "Alice",
    "email": "alice@example.com",
    "role": "manager",
    "status": "active",
    "created_at": "2026-05-24T10:00:00Z",
    "joined_at": "2026-05-24T10:00:00Z"
  },
  {
    "id": "uuid-of-invite-1",
    "name": null,
    "email": "invitee@example.com",
    "role": "employee",
    "status": "invited",
    "created_at": "2026-05-24T10:10:00Z",
    "joined_at": null
  }
]
```

---

## Invitations

### POST /api/invitations/create/

Send a single invitation. Requires `admin` role.

Response example:

```json
{
  "message": "Invitation sent successfully",
  "token": "uuid-token-value"
}
```

### GET /api/invitations/validate/?token=... 

Validate an invitation token.

Response example:

```json
{
  "valid": true,
  "email": "invitee@example.com",
  "role": "employee"
}
```

### POST /api/invitations/bulk/

Upload a CSV file of invitations.

Response example:

```json
{
  "message": "Bulk invite processed",
  "success": 3,
  "errors": [],
  "invite_links": [
    {
      "email": "user1@example.com",
      "link": "http://localhost:5173/signup?token=..."
    }
  ]
}
```

### GET /api/invitations/team/

Lists active users and pending invites for the organization.

Response example: same shape as `GET /api/organizations/team/`.

### POST /api/invitations/resend/{invitation_id}/

Resend an invitation email.

Response example:

```json
{
  "message": "Invitation resent successfully"
}
```

### DELETE /api/invitations/cancel/{invitation_id}/

Cancel a pending invitation.

Response example:

```json
{
  "message": "Invitation cancelled"
}
```

### DELETE /api/invitations/remove-member/{user_id}/

Remove a user from the organization.

Response example:

```json
{
  "message": "User removed successfully"
}
```

### POST /api/invitations/change-role/{user_id}/

Change organization member role.

Response example:

```json
{
  "message": "User role changed successfully"
}
```

---

## Projects

### GET /api/projects/

List all projects for the authenticated user’s organization.

Response example:

```json
[
  {
    "id": "uuid-project-1",
    "name": "Website Redesign",
    "description": "Redesign the marketing website",
    "organization": "uuid-org",
    "created_by": "uuid-user",
    "status": "active",
    "priority": "medium",
    "due_date": "2026-06-30",
    "created_at": "2026-05-01T12:00:00Z",
    "members": ["uuid-user", "uuid-user-2"]
  }
]
```

### POST /api/projects/

Create a new project.

Response example: same as `GET /api/projects/` entry.

### GET /api/projects/{project_id}/

Return a single project.

Response example: same as `GET /api/projects/` entry.

### PATCH /api/projects/{project_id}/

Update project fields.

Response example: updated project object.

### DELETE /api/projects/{project_id}/

Delete a project.

Response example:

```json
{
  "message": "Project deleted"
}
```

### POST /api/projects/{project_id}/members/

Add members to a project.

Response example: project object after update.

### DELETE /api/projects/{project_id}/members/

Remove a member from a project.

Response example: project object after update.

---

## Tasks

### GET /api/tasks/project/{project_id}/

List tasks in a project.

Response example:

```json
[
  {
    "id": "uuid-task-1",
    "title": "Design homepage",
    "description": "Create homepage layout",
    "project": "uuid-project-1",
    "created_by": "uuid-user",
    "status": "todo",
    "priority": "high",
    "due_date": "2026-06-01",
    "created_at": "2026-05-10T08:00:00Z",
    "subtask_count": 2,
    "completed_subtasks": 0,
    "progress": 0,
    "assigned_to": ["uuid-user"],
    "assigned_users": [
      {"id": "uuid-user", "name": "Alice", "email": "alice@example.com"}
    ]
  }
]
```

### POST /api/tasks/project/{project_id}/

Create a task.

Response example: same shape as task object above.

### GET /api/tasks/subtasks/{task_id}/

List subtasks of a task.

Response example:

```json
[
  {
    "id": "uuid-subtask-1",
    "task": "uuid-task-1",
    "title": "Mockup layout",
    "description": "Design mockup",
    "assigned_to": ["uuid-user"],
    "assigned_users": [
      {"id": "uuid-user", "name": "Alice", "email": "alice@example.com"}
    ],
    "status": "todo",
    "priority": "medium",
    "due_date": "2026-05-20",
    "created_at": "2026-05-10T09:00:00Z"
  }
]
```

### POST /api/tasks/subtasks/{task_id}/

Create a subtask.

Response example: same shape as subtask object above.

### PATCH /api/tasks/subtask/{subtask_id}/

Update a subtask.

Response example: updated subtask object.

### DELETE /api/tasks/subtask/{subtask_id}/

Delete a subtask.

Response example:

```json
{
  "message": "Subtask deleted"
}
```

### PATCH /api/tasks/task/{task_id}/

Update a task.

Response example: updated task object.

### GET /api/tasks/task-detail/{task_id}/

Fetch task details. This endpoint behaves like `PATCH` on the same route, but returns task details.

Response example: task object.

### GET /api/tasks/comments/{task_id}/

List comments for a task.

Response example:

```json
[
  {
    "id": "uuid-comment-1",
    "task": "uuid-task-1",
    "subtask": null,
    "subtask_data": null,
    "user": "uuid-user",
    "user_data": {
      "id": "uuid-user",
      "name": "Alice",
      "email": "alice@example.com"
    },
    "message": "Please update the wireframe.",
    "created_at": "2026-05-10T10:00:00Z"
  }
]
```

### POST /api/tasks/comments/{task_id}/

Add a task or subtask comment.

Response example: created comment object.

### GET /api/tasks/{task_id}/attachments/

List attachments for a task.

Response example:

```json
[
  {
    "id": "uuid-attach-1",
    "file": "/media/uploads/file.pdf",
    "original_name": "file.pdf",
    "file_size": 123456,
    "uploaded_at": "2026-05-10T11:00:00Z",
    "uploaded_by_data": {
      "id": "uuid-user",
      "name": "Alice",
      "role": "manager"
    }
  }
]
```

### POST /api/tasks/{task_id}/attachments/upload/

Upload a task attachment.

Response example: created attachment object.

### DELETE /api/tasks/attachments/{attachment_id}/delete/

Delete a task attachment.

Response example:

```json
{
  "message": "Attachment deleted successfully"
}
```

### GET /api/tasks/subtasks/{subtask_id}/attachments/

List subtask attachments.

Response example: same shape as task attachments.

### POST /api/tasks/subtasks/{subtask_id}/attachments/upload/

Upload a subtask attachment.

Response example: created subtask attachment object.

### DELETE /api/tasks/subtasks/attachments/{attachment_id}/delete/

Delete a subtask attachment.

Response example:

```json
{
  "message": "Attachment deleted successfully"
}
```

---

## Notifications

### GET /api/notifications/

Get current user notifications in descending `created_at` order.

Response example:

```json
[
  {
    "id": "uuid-notification-1",
    "user": "uuid-user",
    "title": "New Comment",
    "message": "Alice commented on Design task",
    "type": "comment_added",
    "is_read": false,
    "created_at": "2026-05-20T14:00:00Z"
  }
]
```

### PATCH /api/notifications/{notification_id}/read/

Mark a notification as read.

Response example:

```json
{
  "message": "Notification marked as read"
}
```

---

## Workspace endpoints

### GET /api/workspace/tasks/

List tasks assigned to the current employee.

Response example: task list in `TaskSerializer` shape.

### GET /api/workspace/subtasks/

List subtasks assigned to the current employee.

Response example: subtask list in `SubTaskSerializer` shape.

### GET /api/workspace/dashboard/

Workspace dashboard summary for the current employee.

Response example:

```json
{
  "assigned_tasks": 10,
  "assigned_subtasks": 24,
  "completed_subtasks": 12,
  "pending_subtasks": 8,
  "review_subtasks": 4,
  "overdue_subtasks": 2,
  "completion_rate": 50,
  "high_priority_subtasks": 3,
  "critical_subtasks": 1,
  "recent_subtasks": [/* SubTaskSerializer objects */],
  "upcoming_deadlines": [/* SubTaskSerializer objects */]
}
```

### GET /api/workspace/subtasks/{subtask_id}/

Get a single subtask workspace view, including comments, activity, issues, siblings, and task attachments.

Response example:

```json
{
  "id": "uuid-subtask-1",
  "task": "uuid-task-1",
  "title": "Mockup layout",
  "description": "Design mockup",
  "assigned_to": ["uuid-user"],
  "assigned_users": [/* user objects */],
  "status": "todo",
  "priority": "medium",
  "due_date": "2026-05-20",
  "created_at": "2026-05-10T09:00:00Z",
  "comments": [/* TaskCommentSerializer objects */],
  "activities": [/* ActivitySerializer objects */],
  "issues": [
    {
      "id": "uuid-issue-1",
      "title": "Issue title",
      "description": "Issue details",
      "status": "open",
      "priority": "medium"
    }
  ],
  "sibling_subtasks": [/* SubTaskSerializer objects */],
  "task_attachments": [/* TaskAttachmentSerializer objects */]
}
```

### PATCH /api/workspace/subtasks/{subtask_id}/

Update only the status of a subtask.

Response example: updated `SubTaskSerializer` object.

### GET /api/workspace/activity-feed/?limit=... 

Get activity feed for the current employee.

Response example: list of `ActivitySerializer` objects.

### GET /api/workspace/my-tasks/

List lightweight task cards for assigned subtasks.

Response example:

```json
[
  {
    "id": "uuid-subtask-1",
    "title": "Mockup layout",
    "status": "todo",
    "priority": "medium",
    "due_date": "2026-05-20",
    "task": {
      "id": "uuid-task-1",
      "title": "Design homepage"
    },
    "project": {
      "id": "uuid-project-1",
      "title": "Website Redesign"
    }
  }
]
```

### GET /api/workspace/task/{task_id}/

Get the employee task workspace view with task, subtasks, comments, attachments, activities, issues, team, insights, and permissions.

Response example: large object containing:

- `task`: `TaskSerializer` object plus `project_data`, `created_by_data`, counts
- `subtasks`: list of `SubTaskSerializer` objects with added `is_assigned_to_me`, `comments_count`, `attachments_count`, `attachments`
- `comments`: `TaskCommentSerializer` objects
- `attachments`: `TaskAttachmentSerializer` objects
- `activities`: `ActivitySerializer` objects
- `issues`: list of issue objects with details and attachments
- `team`: list of team member objects
- `insights`: status summary counts
- `permissions`: update allowed actions and editable subtask IDs

---

## Dashboard / Analytics

### GET /api/dashboard/overview/

Organization dashboard summary.

Response example:

```json
{
  "total_projects": 5,
  "total_tasks": 120,
  "pending_tasks": 30,
  "completed_tasks": 70,
  "overdue_tasks": 5,
  "team_members": 12,
  "recent_tasks": [
    {
      "id": "uuid-task-1",
      "title": "Design homepage",
      "project": "Website Redesign",
      "priority": "high",
      "status": "todo",
      "due_date": "2026-06-01",
      "assigned_users": [/* user objects */]
    }
  ],
  "weekly_task_activity": [
    {"day": "Mon", "tasks": 2}
  ],
  "task_status_distribution": [
    {"status": "todo", "count": 10}
  ],
  "team_workload": [
    {"name": "Alice", "tasks": 12}
  ]
}
```

---

## Activities

### GET /api/activities/

List recent organization activities.

Response example:

```json
[
  {
    "id": "uuid-activity-1",
    "action": "task_created",
    "message": "Created task 'Design homepage'",
    "created_at": "2026-05-10T12:00:00Z",
    "user_data": {"id": "uuid-user", "name": "Alice", "email": "alice@example.com", "role": "manager"},
    "project_data": {"id": "uuid-project-1", "name": "Website Redesign"},
    "task_data": {"id": "uuid-task-1", "title": "Design homepage"},
    "subtask_data": null
  }
]
```

### GET /api/activities/task/{task_id}/

List activities for a specific task.

Response example: same shape as `/api/activities/` entries.

---

## Issues

### GET /api/issues/

List issues filtered by organization and role.

Response example:

```json
[
  {
    "id": "uuid-issue-1",
    "title": "Broken link on page",
    "description": "The contact page link 404s",
    "project": "uuid-project-1",
    "project_data": {"id": "uuid-project-1", "name": "Website Redesign"},
    "task": "uuid-task-1",
    "task_data": {"id": "uuid-task-1", "title": "Design homepage"},
    "subtask": null,
    "subtask_data": null,
    "raised_by": "uuid-user",
    "raised_by_data": {"id": "uuid-user", "name": "Alice", "email": "alice@example.com", "role": "manager"},
    "assigned_to": "uuid-user-2",
    "assigned_to_data": {"id": "uuid-user-2", "name": "Bob", "email": "bob@example.com", "role": "employee"},
    "status": "open",
    "priority": "medium",
    "attachments": [/* IssueAttachmentSerializer objects */],
    "created_at": "2026-05-20T15:00:00Z",
    "updated_at": "2026-05-20T15:00:00Z"
  }
]
```

### POST /api/issues/

Create an issue. Attachments can be sent as multipart files in `attachments` or `attachment`.

Response example: created issue object.

### PATCH /api/issues/{issue_id}/

Update issue fields like `status`, `priority`, or `assigned_to`.

Response example: updated issue object.

---

## Chat

### GET /api/chat/

List conversations for the authenticated user.

Response example:

```json
[
  {
    "id": "uuid-conversation-1",
    "other_user": {
      "id": "uuid-user-2",
      "name": "Bob",
      "email": "bob@example.com",
      "role": "employee",
      "profile_picture": null
    },
    "last_message": {
      "id": "uuid-message-1",
      "content": "Hey, are you free?",
      "sender_name": "Bob",
      "created_at": "2026-05-20T16:00:00Z"
    },
    "updated_at": "2026-05-20T16:00:00Z"
  }
]
```

### POST /api/chat/start/

Start a conversation with another user.

Response example: conversation object.

### GET /api/chat/{conversation_id}/messages/

List messages in a conversation.

Response example:

```json
[
  {
    "id": "uuid-message-1",
    "conversation": "uuid-conversation-1",
    "sender": "uuid-user",
    "sender_data": {"id": "uuid-user","name": "Alice","email": "alice@example.com","role": "manager","profile_picture": null},
    "content": "Hello!",
    "is_seen": false,
    "created_at": "2026-05-20T16:05:00Z",
    "is_mine": true
  }
]
```

### POST /api/chat/{conversation_id}/send/

Send a message in a conversation.

Response example: created message object.

### GET /api/chat/users/

List available chat users in the organization.

Response example:

```json
[
  {
    "id": "uuid-user-2",
    "name": "Bob",
    "email": "bob@example.com",
    "role": "employee",
    "profile_picture": null
  }
]
```

---

## WebSocket endpoint

### `ws://<host>/ws/notifications/`

- Used by the frontend notification provider.
- Sends realtime notification payloads after `Notification` objects are created.

Response example: single notification object in the same shape as `GET /api/notifications/` entries.
