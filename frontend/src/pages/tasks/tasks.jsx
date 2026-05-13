import { useEffect, useState } from "react";
import {
  Calendar,
  MessageSquare,
  Paperclip,
  Plus,
} from "lucide-react";

import api from "../../services/api";
import "./Tasks.css";
import CreateTaskModal from "../projects/CreateTaskModal";

import { useNavigate } from "react-router-dom";

import {
  DragDropContext,
  Droppable,
  Draggable,
} from "@hello-pangea/dnd";

const COLUMNS = [
  {
    key: "todo",
    title: "Backlog",
    accent: "#94a3b8",
  },
  {
    key: "in_progress",
    title: "In Progress",
    accent: "#3b82f6",
  },
  {
    key: "review",
    title: "Review",
    accent: "#8b5cf6",
  },
  {
    key: "done",
    title: "Done",
    accent: "#22c55e",
  },
];

const PRIORITY_CONFIG = {
  critical: {
    color: "#ef4444",
    label: "Critical",
  },

  high: {
    color: "#f59e0b",
    label: "High",
  },

  medium: {
    color: "#3b82f6",
    label: "Medium",
  },

  low: {
    color: "#94a3b8",
    label: "Low",
  },
};

const AVATAR_COLORS = [
  "#4f6df5",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#06b6d4",
];

function avatarColor(name = "") {
  let hash = 0;

  for (let i = 0; i < name.length; i++) {
    hash =
      name.charCodeAt(i) +
      ((hash << 5) - hash);
  }

  return AVATAR_COLORS[
    Math.abs(hash) %
      AVATAR_COLORS.length
  ];
}

function Avatar({
  name,
  size = 28,
}) {

  const initials = name
    ? name
        .split(" ")
        .map((w) => w[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "?";

  return (
    <div
      className="task-avatar"
      style={{
        width: size,
        height: size,
        background:
          avatarColor(name),

        fontSize:
          size * 0.38,
      }}
      title={name}
    >
      {initials}
    </div>
  );
}

function PriorityBadge({
  priority,
}) {

  const cfg =
    PRIORITY_CONFIG[
      priority?.toLowerCase()
    ] || PRIORITY_CONFIG.medium;

  return (
    <div className="task-priority-badge">

      <span
        className="priority-dot"
        style={{
          background:
            cfg.color,
        }}
      />

      <span
        className="priority-label"
        style={{
          color: cfg.color,
        }}
      >
        {cfg.label}
      </span>

    </div>
  );
}

function TagPill({ label }) {
  return (
    <span className="task-tag">
      {label}
    </span>
  );
}

export default function Tasks() {

  const navigate = useNavigate();

  const [tasks, setTasks] =
    useState([]);

  const [projects, setProjects] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [filterProject,
    setFilterProject
  ] = useState("all");

  const [taskModalOpen, setTaskModalOpen] =
    useState(false);

  const [modalProjectId, setModalProjectId] =
    useState("");

  const fetchTasks = async () => {

      try {

        const projectsRes =
          await api.get("/projects/");

        setProjects(
          projectsRes.data
        );

        let allTasks = [];

        for (
          const project
          of projectsRes.data
        ) {

          const res =
            await api.get(
              `/tasks/project/${project.id}/`
            );

          const tasksWithProject =
            res.data.map(
              (task) => ({
                ...task,
                project_name:
                  project.name,

                project_id:
                  project.id,
              })
            );

          allTasks = [
            ...allTasks,
            ...tasksWithProject,
          ];
        }

        setTasks(allTasks);

      } catch (err) {

        console.log(err);

      } finally {

        setLoading(false);
      }
    };

  useEffect(() => {

    fetchTasks();

  }, []);

  const openCreateTaskModal = (projectId = "") => {
    setModalProjectId(
      projectId ||
      (filterProject !== "all"
        ? filterProject
        : "")
    );
    setTaskModalOpen(true);
  };

  const handleDragEnd =
    async (result) => {

      if (!result.destination)
        return;

      const taskId =
        result.draggableId;

      const newStatus =
        result.destination
          .droppableId;

      try {

        await api.patch(
          `/tasks/task/${taskId}/`,
          {
            status:
              newStatus,
          }
        );

        setTasks((prev) =>
          prev.map((task) =>
            task.id === taskId
              ? {
                  ...task,
                  status:
                    newStatus,
                }
              : task
          )
        );

      } catch (err) {

        console.log(err);
      }
    };

  const visibleTasks =
    filterProject === "all"
      ? tasks
      : tasks.filter(
          (t) =>
            t.project_id ===
            filterProject
        );

  if (loading) {

    return (
      <div className="tasks-page">

        <div className="tasks-loading">
          Loading board…
        </div>

      </div>
    );
  }

  return (
    <div className="tasks-page">

      {/* Header */}
      <div className="tasks-header">

        <div className="tasks-header-left">

          <h1>
            Kanban Board
          </h1>

          <p>
            {
              visibleTasks.length
            }{" "}
            tasks across all
            stages
          </p>

        </div>

        <div className="tasks-header-right">

          <select
            className="project-filter-select"
            value={
              filterProject
            }
            onChange={(e) =>
              setFilterProject(
                e.target.value
              )
            }
          >

            <option value="all">
              All Projects
            </option>

            {projects.map(
              (p) => (
                <option
                  key={p.id}
                  value={p.id}
                >
                  {p.name}
                </option>
              )
            )}

          </select>

          <button
            type="button"
            className="add-task-btn"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              openCreateTaskModal();
            }}
          >

            <Plus size={16} />

            Add Task

          </button>

        </div>

      </div>

      <DragDropContext
        onDragEnd={
          handleDragEnd
        }
      >

        <div className="kanban-board">

          {COLUMNS.map(
            (column) => {

              const columnTasks =
                visibleTasks.filter(
                  (t) =>
                    t.status ===
                    column.key
                );

              return (

                <Droppable
                  droppableId={
                    column.key
                  }
                  key={column.key}
                >

                  {(provided) => (

                    <div
                      className="kanban-column"
                      ref={
                        provided.innerRef
                      }
                      {...provided.droppableProps}
                    >

                      <div
                        className="column-accent"
                        style={{
                          "--column-accent":
                            column.accent,
                        }}
                      />

                      <div className="kanban-column-header">

                        <div className="column-header-left">

                          <h3>
                            {
                              column.title
                            }
                          </h3>

                          <span
                            className="column-count"
                            style={{
                              color:
                                column.accent,

                              background:
                                `${column.accent}18`,
                            }}
                          >
                            {
                              columnTasks.length
                            }
                          </span>

                        </div>

                        <button
                          className="column-add-btn"
                        >
                          <Plus
                            size={15}
                          />
                        </button>

                      </div>

                      <div className="kanban-tasks">

                        {columnTasks.map(
                          (
                            task,
                            index
                          ) => {

                            const assignedUser =
                              task.assigned_users?.[0];

                            const tags =
                              task.tags ||
                              [];

                            return (

                              <Draggable
                                draggableId={
                                  task.id
                                }
                                index={
                                  index
                                }
                                key={
                                  task.id
                                }
                              >

                                {(provided, snapshot) => (

                                  <div
                                    className="task-card"
                                    ref={
                                      provided.innerRef
                                    }
                                    {...provided.draggableProps}
                                    {...provided.dragHandleProps}
                                    style={{
                                      ...provided.draggableProps.style,
                                      zIndex: snapshot.isDragging ? 9999 : "auto",
                                      opacity: snapshot.isDragging ? 0.98 : 1,
                                      pointerEvents: snapshot.isDragging ? "none" : "auto",
                                    }}
                                    onClick={() =>
                                      navigate(
                                        `/dashboard/tasks/${task.id}`
                                      )
                                    }
                                  >

                                    <PriorityBadge
                                      priority={
                                        task.priority
                                      }
                                    />

                                    <h4 className="task-card-title">
                                      {
                                        task.title
                                      }
                                    </h4>

                                   <p className="task-card-project">
                                    {
                                      task.project_name
                                    }
                                  </p>

                                  <div className="task-progress">

                                    <div className="task-progress-top">

                                      <span>
                                        {task.completed_subtasks}/
                                        {task.subtask_count}
                                        {" "}subtasks
                                      </span>

                                      <span>
                                        {task.progress || 0}%
                                      </span>

                                    </div>

                                    <div className="task-progress-bar">

                                      <div
                                        className="task-progress-fill"
                                        style={{
                                          width: `${task.progress || 0}%`
                                        }}
                                      />

                                    </div>

                                  </div>

                                  {tags.length >
                                    0 && (
                                      <div className="task-tags">

                                        {tags.map(
                                          (
                                            tag,
                                            i
                                          ) => (
                                            <TagPill
                                              key={
                                                i
                                              }
                                              label={
                                                typeof tag ===
                                                "string"
                                                  ? tag
                                                  : tag.name
                                              }
                                            />
                                          )
                                        )}

                                      </div>
                                    )}

                                    <div className="task-card-footer">

                                      <div className="task-footer-left">

                                        {assignedUser ? (
                                          <Avatar
                                            name={
                                              assignedUser.name
                                            }
                                          />
                                        ) : (
                                          <div className="task-avatar-placeholder" />
                                        )}

                                        <div className="task-date">

                                          <Calendar
                                            size={
                                              13
                                            }
                                          />

                                          <span>

                                            {task.due_date
                                              ? formatDate(
                                                  task.due_date
                                                )
                                              : "No due"}

                                          </span>

                                        </div>

                                      </div>

                                      <div className="task-footer-right">

                                        {task.comment_count >
                                          0 && (
                                          <div className="task-meta-item">

                                            <MessageSquare
                                              size={
                                                13
                                              }
                                            />

                                            <span>
                                              {
                                                task.comment_count
                                              }
                                            </span>

                                          </div>
                                        )}

                                        {task.attachment_count >
                                          0 && (
                                          <div className="task-meta-item">

                                            <Paperclip
                                              size={
                                                13
                                              }
                                            />

                                            <span>
                                              {
                                                task.attachment_count
                                              }
                                            </span>

                                          </div>
                                        )}

                                      </div>

                                    </div>

                                  </div>

                                )}

                              </Draggable>
                            );
                          }
                        )}

                        {
                          provided.placeholder
                        }

                      </div>

                      <button
                        type="button"
                        className="column-add-task-btn"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          openCreateTaskModal();
                        }}
                      >

                        <Plus size={14} />

                        Add task

                      </button>

                    </div>

                  )}

                </Droppable>
              );
            }
          )}

        </div>

      </DragDropContext>

      {/* Footer */}
      <div className="kanban-footer">

        {COLUMNS.map(
          (col) => {

            const count =
              visibleTasks.filter(
                (t) =>
                  t.status ===
                  col.key
              ).length;

            return (

              <div
                key={col.key}
                className="kanban-footer-item"
              >

                <span
                  className="footer-dot"
                  style={{
                    background:
                      col.accent,
                  }}
                />

                <span className="footer-count">
                  {count}
                </span>

                <span className="footer-label">
                  {col.title}
                </span>

              </div>
            );
          }
        )}

        <span className="footer-updated">
          ⊙ Last updated:
          just now
        </span>

      </div>

      <CreateTaskModal
        open={taskModalOpen}
        onClose={() =>
          setTaskModalOpen(false)
        }
        onSuccess={fetchTasks}
        projects={projects}
        initialProjectId={modalProjectId}
      />

    </div>
  );
}

function formatDate(dateStr) {

  if (!dateStr)
    return "";

  const d =
    new Date(dateStr);

  return d.toLocaleDateString(
    "en-US",
    {
      month: "short",
      day: "numeric",
    }
  );
}
