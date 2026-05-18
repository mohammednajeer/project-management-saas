import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Calendar, Flag, CheckCircle2, FolderOpen, ArrowLeft } from "lucide-react";
import api from "../../services/api";
import TaskAttachmentsSection from "../../components/tasks/TaskAttachmentsSection";
import "./TaskDetails.css";

/* ─── helpers ─── */
function StatusBadge({ status }) {
  const label = status?.replace("_", " ") || "todo";
  return (
    <span className={`task-status-badge ${status || "todo"}`}>
      {label}
    </span>
  );
}

function PriorityBadge({ priority }) {
  return (
    <span className={`priority-badge ${priority || "medium"}`}>
      {priority || "medium"}
    </span>
  );
}

const ACTIVITY_COLOR_CLASSES = {
  task_created: "task-created",
  task_updated: "task-updated",
  subtask_created: "subtask-created",
  subtask_updated: "subtask-updated",
  comment_added: "comment-added",
};

function getActivityColor(action) {
  return ACTIVITY_COLOR_CLASSES[action] || "default";
}

function formatRelativeTime(value) {
  if (!value) return "Just now";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Just now";

  const diffMs = Date.now() - date.getTime();
  const diffSeconds = Math.max(0, Math.floor(diffMs / 1000));
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes} min${diffMinutes === 1 ? "" : "s"} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: date.getFullYear() === new Date().getFullYear() ? undefined : "numeric",
  });
}

function formatRole(role) {
  if (!role) return "Member";
  return String(role)
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getActivityMessage(activity) {
  if (activity.message) return activity.message;
  return String(activity.action || "Activity recorded").replace(/_/g, " ");
}

function getActivityContextLabels(activity) {
  const labels = [];

  if (activity.project_data?.name) labels.push(`Project: ${activity.project_data.name}`);
  if (activity.task_data?.title) labels.push(`Task: ${activity.task_data.title}`);
  if (activity.subtask_data?.title) labels.push(`Subtask: ${activity.subtask_data.title}`);

  return labels;
}

export default function TaskDetails() {
  const { taskId } = useParams();
  const navigate = useNavigate();

  const [task, setTask] = useState(null);
  const [subtasks, setSubtasks] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  /* form state */
  const [subtaskTitle, setSubtaskTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assignedTo, setAssignedTo] = useState([]);
  const [priority, setPriority] = useState("medium");
  const [status, setStatus] = useState("todo");
  const [dueDate, setDueDate] = useState("");
  const [editMode, setEditMode] =useState(false);

    const [title, setTitle] =
    useState("");

  const [taskDescription,
    setTaskDescription
    ] = useState("");

    const [taskPriority,
    setTaskPriority
    ] = useState("medium");
    const [editingSubtask,
    setEditingSubtask
    ] = useState(null);

    const [editingTitle,setEditingTitle] = useState("");
    const [taskAssignedTo,setTaskAssignedTo] = useState([]);
    const [taskDueDate,setTaskDueDate] = useState("");
    const [comments, setComments] = useState([]);
    const [commentMessage, setCommentMessage] = useState("");
    const [commentSubtask,setCommentSubtask] = useState("");
    const [selectedSubtask, setSelectedSubtask] = useState(null);
    const [activities, setActivities] = useState([]);
    const [activitiesLoading, setActivitiesLoading] = useState(true);
    const [activitiesError, setActivitiesError] = useState("");


  useEffect(() => { fetchTask(); }, [taskId]);
  useEffect(() => { fetchActivities(); }, [taskId]);

  const fetchActivities = async () => {
    try {
      setActivitiesLoading(true);
      setActivitiesError("");

      const activitiesRes = await api.get(
        `/activities/task/${taskId}/`
      );

      setActivities(
        Array.isArray(activitiesRes.data)
          ? activitiesRes.data
          : []
      );
    } catch (err) {
      console.log(err);
      setActivitiesError(
        "Unable to load activity history."
      );
    } finally {
      setActivitiesLoading(false);
    }
  };

  const fetchTask = async () => {
    try {
      const projectsRes = await api.get("/projects/");
      let foundTask = null;

      for (const project of projectsRes.data) {
        const tasksRes = await api.get(`/tasks/project/${project.id}/`);
        const taskMatch = tasksRes.data.find((t) => t.id === taskId);
        if (taskMatch) {
          foundTask = { ...taskMatch, project_name: project.name };
          break;
        }
      }

      if (foundTask) {

        setTask(foundTask);

        setTitle(foundTask.title);

        setTaskDescription(
        foundTask.description || ""
        );

        setTaskPriority(
        foundTask.priority
        );

        setTaskDueDate(
          foundTask.due_date || ""
        );

        setTaskAssignedTo(

          foundTask.assigned_users?.map(
            (user) => user.id
          ) || []

        );
        const projectRes =
            await api.get(
            `/projects/${foundTask.project}/`
            );
        setMembers(projectRes.data.members_data || []);
        const subtasksRes = await api.get(`/tasks/subtasks/${taskId}/`);
        setSubtasks(subtasksRes.data);

        const commentsRes = await api.get(
          `/tasks/comments/${taskId}/`
        );

        setComments(commentsRes.data);
      }
    } catch (err) {
      console.log(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSubtask = async (e) => {
    e.preventDefault();
    if (!subtaskTitle.trim()) return;
    try {
      await api.post(`/tasks/subtasks/${taskId}/`, {
        title: subtaskTitle,
        description,
        assigned_to: assignedTo || null,
        priority,
        status,
        
      });
      setSubtaskTitle("");
      setDescription("");
      setAssignedTo([]);
      setPriority("medium");
      setStatus("todo");
      setDueDate("");
      await fetchTask();
      await fetchActivities();
    } catch (err) {
      console.log(err);
    }
  };

  const handleCreateComment = async (e) => {

      e.preventDefault();

      if (!commentMessage.trim()) return;

      try {

        await api.post(
          `/tasks/comments/${taskId}/`,
          {
            message: commentMessage,
            subtask:commentSubtask || null,
          }
        );

        setCommentMessage("");

        await fetchTask();
        await fetchActivities();

      } catch (err) {

        console.log(err);
      }
    };


  const updateSubtask = async (subtaskId, data) => {
    try {
      await api.patch(`/tasks/subtask/${subtaskId}/`, data);
      await fetchTask();
      await fetchActivities();
    } catch (err) {
      console.log(err);
    }
  };

  const deleteSubtask =
        async (subtaskId) => {

            const confirmed =
            window.confirm(
                "Delete subtask?"
            );

            if (!confirmed)
            return;

            try {

            await api.delete(
                `/tasks/subtask/${subtaskId}/`
            );

            await fetchTask();
            await fetchActivities();

            } catch (err) {

            console.log(err);
            }
        };

        const startEditSubtask =
            (subtask) => {

                setEditingSubtask(
                subtask.id
                );

                setEditingTitle(
                subtask.title
                );
            };

    const saveSubtaskEdit =
        async (subtaskId) => {

            try {

            await api.patch(
                `/tasks/subtask/${subtaskId}/`,
                {
                title:
                    editingTitle,
                }
            );

            setEditingSubtask(
                null
            );

            await fetchTask();
            await fetchActivities();

            } catch (err) {

            console.log(err);
            }
        };

  const handleSave = async () => {

        try {

            const res = await api.patch(
            `/tasks/task-detail/${taskId}/`,
            {
                title,
                description: taskDescription,
                priority: taskPriority,
                assigned_to:taskAssignedTo,
                due_date: taskDueDate || null,
            }
            );
            await fetchTask();
            await fetchActivities();

            setEditMode(false);

        } catch (err) {

            console.log(err);
        }
        };

    const handleDelete = async () => {

  const confirmed =
    window.confirm(
      "Delete this task?"
    );

  if (!confirmed) return;

  try {

    await api.delete(
      `/tasks/task-detail/${taskId}/`
    );

    navigate("/dashboard/tasks");

  } catch (err) {

    console.log(err);
  }
};
  

  if (loading) {
    return (
      <div className="task-details-page">
        <div className="task-loading">Loading task…</div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="task-details-page">
        <div className="task-loading">Task not found</div>
      </div>
    );
  }

  const completedCount = task.completed_subtasks ?? 0;
  const totalCount = task.subtask_count ?? subtasks.length;
  const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const activeSubtask = selectedSubtask
    ? subtasks.find((item) => item.id === selectedSubtask.id) || selectedSubtask
    : null;

  return (
    <div className="task-details-page">

      {/* Back */}
      <button className="task-back-btn" onClick={() => navigate(-1)}>
        <ArrowLeft size={14} />
        Back to board
      </button>

      {/* Top */}
      <div className="task-top">
        <div className="task-top-left">
          {editMode ? (

            <input
                className="task-edit-title"
                value={title}
                onChange={(e) =>
                setTitle(e.target.value)
                }
            />

            ) : (

            <h1>{task.title}</h1>

            )}
          {editMode ? (

            <textarea
                className="task-edit-description"
                value={taskDescription}
                onChange={(e) =>
                setTaskDescription(
                    e.target.value
                )
                }
            />

            ) : (

            <p>
                {task.description ||
                "No description provided."}
            </p>

            )}
<div className="task-assignees-section">

  <span>
    Task Assignees
  </span>

  {editMode ? (

    <div className="assign-members">

      {members.map((member) => {

        const selected =
          taskAssignedTo.includes(
            member.id
          );

        return (

          <button
            type="button"
            key={member.id}
            className={
              selected
                ? "member-pill active"
                : "member-pill"
            }
            onClick={() => {

              if (selected) {

                setTaskAssignedTo(
                  taskAssignedTo.filter(
                    (id) =>
                      id !== member.id
                  )
                );

              } else {

                setTaskAssignedTo([
                  ...taskAssignedTo,
                  member.id,
                ]);
              }
            }}
          >

            {member.name}

          </button>
        );
      })}

    </div>

  ) : (

    <div className="assigned-users">

      {task.assigned_users?.length ? (

        task.assigned_users.map(
          (user) => (

            <div
              key={user.id}
              className="assigned-user-pill"
            >

              <div className="assigned-avatar">

                {user.name
                  ?.slice(0, 2)
                  .toUpperCase()}

              </div>

              {user.name}

            </div>
          )
        )

      ) : (

        <span className="unassigned-text">
          No assignees
        </span>

      )}

    </div>

  )}

</div>
        </div>
        <div className="task-top-right">
         <div className="task-actions">

            <StatusBadge status={task.status} />

            <button
                className="task-edit-btn"
                onClick={() =>
                setEditMode(!editMode)
                }
            >
                {editMode
                ? "Cancel"
                : "Edit"}
            </button>

            <button
                className="task-delete-btn"
                onClick={handleDelete}
            >
                Delete
            </button>

            </div>
        </div>
      </div>
      {editMode && (

  <button
    className="task-save-btn"
    onClick={handleSave}
  >
    Save Changes
  </button>

)}

      {/* Info grid */}
      <div className="task-info-grid">

        <div className="task-info-card">
          <div className="task-info-card-icon"><Flag size={16} /></div>
          <div className="task-info-card-text">
            <span>Priority</span>
            {editMode ? (

                <select
                value={taskPriority}
                onChange={(e) =>
                    setTaskPriority(
                    e.target.value
                    )
                }
                >

                <option value="low">
                    Low
                </option>

                <option value="medium">
                    Medium
                </option>

                <option value="high">
                    High
                </option>

                <option value="critical">
                    Critical
                </option>

                </select>

                ) : (

                <PriorityBadge
                    priority={task.priority}
                />

                )}
          </div>
        </div>

        <div className="task-info-card">
          <div className="task-info-card-icon"><Calendar size={16} /></div>
          <div className="task-info-card-text">
            <span>Due Date</span>
            {editMode ? (
                <input
                  type="date"
                  value={taskDueDate}
                  onChange={(e) =>
                    setTaskDueDate(
                      e.target.value
                    )
                  }
                />

              ) : (

                <strong>
                  {task.due_date ||
                  "No due date"}
                </strong>

              )}
          </div>
        </div>

        <div className="task-info-card">
          <div className="task-info-card-icon"><CheckCircle2 size={16} /></div>
          <div className="task-info-card-text">
            <span>Progress</span>
            <strong>{completedCount} / {totalCount} subtasks</strong>
            <div className="progress-bar-wrap">
              <div className="progress-bar-fill" style={{ width: `${progressPct}%` }} />
            </div>
          </div>
        </div>

        <div className="task-info-card">
          <div className="task-info-card-icon"><FolderOpen size={16} /></div>
          <div className="task-info-card-text">
            <span>Project</span>
            <strong>{task.project_name}</strong>
          </div>
        </div>

      </div>

      {/* Subtasks panel */}
      <div className="subtasks-wrapper">

        <div className="subtasks-header">
          <h2>Subtasks</h2>
          <span className="subtask-count-badge">{subtasks.length}</span>
        </div>

        {/* Create form */}
        <form className="subtask-create-form" onSubmit={handleCreateSubtask}>

          <input
            type="text"
            placeholder="Subtask title"
            value={subtaskTitle}
            onChange={(e) => setSubtaskTitle(e.target.value)}
          />

          <textarea
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          {members.length > 0 && (
            <div className="assign-members">
              {members.map((member) => {
                const selected = assignedTo.includes(member.id);
                return (
                  <button
                    type="button"
                    key={member.id}
                    className={selected ? "member-pill active" : "member-pill"}
                    onClick={() =>
                      selected
                        ? setAssignedTo(assignedTo.filter((id) => id !== member.id))
                        : setAssignedTo([...assignedTo, member.id])
                    }
                  >
                    {member.name}
                  </button>
                );
              })}
            </div>
          )}

          <div className="subtask-grid">
            <select value={priority} onChange={(e) => setPriority(e.target.value)}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>

            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="todo">Todo</option>
              <option value="in_progress">In Progress</option>
              <option value="review">Review</option>
              <option value="done">Done</option>
            </select>

            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>

          <button type="submit" className="subtask-submit-btn">
            + Create Subtask
          </button>

        </form>

        {/* List */}
        {subtasks.length === 0 ? (
          <div className="subtasks-empty">No subtasks yet. Create one above.</div>
        ) : (
          <div className="subtasks-list">
            {subtasks.map((subtask) => (
              <div
                key={subtask.id}
                className="subtask-card"
                onClick={() =>
                  setSelectedSubtask(subtask)
                }
              >

                <div className="subtask-card-left">
                  {editingSubtask ===
                    subtask.id ? (

                    <input
                    value={editingTitle}
                    onChange={(e) =>
                        setEditingTitle(
                        e.target.value
                        )
                    }
                    onClick={(e) =>
                      e.stopPropagation()
                    }
                    />

                    ) : (

                    <h3>
                    {subtask.title}
                    </h3>

                    )}
                  <div className="assigned-users">
                    {subtask.assigned_users?.length ? (
                      subtask.assigned_users.map((user) => (
                        <div key={user.id} className="assigned-user-pill">
                          <div className="assigned-avatar">
                            {user.name?.slice(0, 2).toUpperCase()}
                          </div>
                          {user.name}
                        </div>
                      ))
                    ) : (
                      <span className="unassigned-text">Unassigned</span>
                    )}
                  </div>
                </div>

                <div
                  className="subtask-card-controls"
                  onClick={(e) =>
                    e.stopPropagation()
                  }
                >
                    <div className="subtask-actions">

                        {editingSubtask ===
                        subtask.id ? (

                            <button
                            onClick={() =>
                                saveSubtaskEdit(
                                subtask.id
                                )
                            }
                            >
                            Save
                            </button>

                        ) : (

                            <button
                            onClick={() =>
                                startEditSubtask(
                                subtask
                                )
                            }
                            >
                            Edit
                            </button>

                        )}

                        <button
                            onClick={() =>
                            deleteSubtask(
                                subtask.id
                            )
                            }
                        >
                            Delete
                        </button>

                        </div>
                  <select
                    className="subtask-priority-select"
                    value={subtask.priority}
                    onChange={(e) => updateSubtask(subtask.id, { priority: e.target.value })}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>

                  <select
                    className="subtask-status-select"
                    value={subtask.status}
                    onChange={(e) => updateSubtask(subtask.id, { status: e.target.value })}
                  >
                    <option value="todo">Todo</option>
                    <option value="in_progress">In Progress</option>
                    <option value="review">Review</option>
                    <option value="done">Done</option>
                  </select>
                </div>

              </div>
            ))}
          </div>
        )}

      </div>
      <div className="task-comments-wrapper">

  <div className="task-comments-header">

    <h2>Comments</h2>

    <span>
      {comments.length}
    </span>

  </div>

  <form
    className="task-comment-form"
    onSubmit={handleCreateComment}
  >

    <textarea
      placeholder="Write a comment..."
      value={commentMessage}
      onChange={(e) =>
        setCommentMessage(
          e.target.value
        )
      }
    />
    <select
  value={commentSubtask}
  onChange={(e) =>
    setCommentSubtask(
      e.target.value
    )
  }
>

  <option value="">
    General Task Comment
  </option>

  {subtasks.map((subtask) => (

    <option
      key={subtask.id}
      value={subtask.id}
    >

      {subtask.title}

    </option>
  ))}

</select>

    <button type="submit">

      Add Comment

    </button>

  </form>

  <div className="task-comments-list">

    {comments.length === 0 ? (

      <div className="comments-empty">

        No comments yet.

      </div>

    ) : (

      comments.map((comment) => (

        <div
          key={comment.id}
          className="comment-card"
        >

          <div className="comment-top">

            <div className="comment-user">

              <div className="comment-avatar">

                {comment.user_data?.name
                  ?.slice(0, 2)
                  .toUpperCase()}

              </div>

              <div>

                <strong>
                  {comment.user_data?.name}
                </strong>

                <p>
                  {new Date(
                    comment.created_at
                  ).toLocaleString()}
                </p>

              </div>

            </div>

          </div>
          {comment.subtask_data && (

          <div className="comment-subtask-tag">

            Subtask:
            {" "}
            {comment.subtask_data.title}

          </div>

        )}

          <div className="comment-message">

            {comment.message}

          </div>

        </div>
      ))
    )}

  </div>

</div>
<div className="task-activity-wrapper">

  <div className="task-activity-header">

    <div>
      <h2>Activity Timeline</h2>
      <p>Recent task history and team updates</p>
    </div>

    <span>
      {activities.length}
    </span>

  </div>

  <div className="task-activity-list">

    {activitiesLoading ? (

      <div className="activity-state-card">
        Loading activity history...
      </div>

    ) : activitiesError ? (

      <div className="activity-state-card activity-state-card--error">
        {activitiesError}
      </div>

    ) : activities.length === 0 ? (

      <div className="activity-state-card">
        No activity history yet
      </div>

    ) : (

      activities.map((activity) => {
        const userName =
          activity.user_data?.name ||
          "Someone";

        const userRole =
          formatRole(
            activity.user_data?.role
          );

        const colorClass =
          getActivityColor(
            activity.action
          );

        const contextLabels =
          getActivityContextLabels(
            activity
          );

        return (

          <article
            key={activity.id}
            className="activity-timeline-item"
          >

            <span
              className={`activity-timeline-dot activity-timeline-dot--${colorClass}`}
            />

            <div className="activity-timeline-card">

              <div className="activity-timeline-top">

                <div className="activity-user-block">
                  <strong>{userName}</strong>
                  <span className="activity-role-badge">
                    {userRole}
                  </span>
                </div>

                <time className="activity-time">
                  {formatRelativeTime(
                    activity.created_at
                  )}
                </time>

              </div>

              <p className="activity-message">
                {getActivityMessage(activity)}
              </p>

              {contextLabels.length > 0 && (
                <div className="activity-context-list">
                  {contextLabels.map((label) => (
                    <span
                      key={label}
                      className="activity-context-pill"
                    >
                      {label}
                    </span>
                  ))}
                </div>
              )}

            </div>

          </article>
        );
      })
    )}

  </div>

</div>
<TaskAttachmentsSection taskId={taskId} />
{activeSubtask && (
  <div
    className="subtask-modal-overlay"
    onClick={() =>
      setSelectedSubtask(null)
    }
  >
    <div
      className="subtask-modal"
      onClick={(e) =>
        e.stopPropagation()
      }
    >
      <div className="subtask-modal-header">
        <div>
          <span className="subtask-modal-eyebrow">
            Subtask Details
          </span>
          <h2>{activeSubtask.title}</h2>
        </div>
        <button
          type="button"
          className="subtask-modal-close"
          onClick={() =>
            setSelectedSubtask(null)
          }
        >
          x
        </button>
      </div>

      <p className="subtask-modal-description">
        {activeSubtask.description ||
          "No description provided."}
      </p>

      <div className="subtask-modal-grid">
        <div className="subtask-modal-field">
          <span>Status</span>
          <strong>
            {activeSubtask.status?.replace("_", " ") || "todo"}
          </strong>
        </div>
        <div className="subtask-modal-field">
          <span>Priority</span>
          <strong>
            {activeSubtask.priority || "medium"}
          </strong>
        </div>
        <div className="subtask-modal-field">
          <span>Due Date</span>
          <strong>
            {activeSubtask.due_date || "No due date"}
          </strong>
        </div>
      </div>

      <div className="subtask-modal-section">
        <span>Assigned Members</span>
        <div className="assigned-users">
          {activeSubtask.assigned_users?.length ? (
            activeSubtask.assigned_users.map((user) => (
              <div
                key={user.id}
                className="assigned-user-pill"
              >
                <div className="assigned-avatar">
                  {user.name?.slice(0, 2).toUpperCase()}
                </div>
                {user.name}
              </div>
            ))
          ) : (
            <span className="unassigned-text">
              Unassigned
            </span>
          )}
        </div>
      </div>

      <div className="subtask-modal-actions">
        <button
          type="button"
          onClick={() => {
            startEditSubtask(activeSubtask);
            setSelectedSubtask(null);
          }}
        >
          Edit Subtask
        </button>
        <button
          type="button"
          className="danger"
          onClick={() => {
            setSelectedSubtask(null);
            deleteSubtask(activeSubtask.id);
          }}
        >
          Delete Subtask
        </button>
      </div>
    </div>
  </div>
)}
    </div>
  );
}
