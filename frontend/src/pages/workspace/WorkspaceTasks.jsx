import { useEffect, useState } from "react";
import { Paperclip, X } from "lucide-react";

import api from "../../services/api";
import SubTaskAttachmentsSection from "../../components/tasks/SubTaskAttachmentsSection";

import "./WorkspacePage.css";

const statusOptions = [
  {
    value: "todo",
    label: "Todo",
  },
  {
    value: "in_progress",
    label: "In Progress",
  },
  {
    value: "review",
    label: "Review",
  },
  {
    value: "done",
    label: "Done",
  },
];

export default function WorkspaceTasks() {
  const [tasks, setTasks] = useState([]);
  const [subtasks, setSubtasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingSubtaskId, setUpdatingSubtaskId] =
    useState(null);
  const [selectedSubtask, setSelectedSubtask] =
    useState(null);
  const [statusMessage, setStatusMessage] =
    useState("");
  const [statusError, setStatusError] =
    useState("");

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const [tasksRes, subtasksRes] =
          await Promise.all([
            api.get("/workspace/tasks/"),
            api.get("/workspace/subtasks/"),
          ]);

        setTasks(tasksRes.data);
        setSubtasks(subtasksRes.data);
      } catch (err) {
        console.log(err);
      } finally {
        setLoading(false);
      }
    };

    fetchTasks();
  }, []);

  const handleSubtaskStatusChange = async (
    subtaskId,
    nextStatus
  ) => {
    const currentSubtask = subtasks.find(
      (subtask) => subtask.id === subtaskId
    );

    if (
      !currentSubtask ||
      currentSubtask.status === nextStatus
    ) {
      return;
    }

    const previousStatus = currentSubtask.status;

    setStatusError("");
    setStatusMessage("");
    setUpdatingSubtaskId(subtaskId);

    setSubtasks((items) =>
      items.map((subtask) =>
        subtask.id === subtaskId
          ? {
              ...subtask,
              status: nextStatus,
            }
          : subtask
      )
    );

    try {
      const response = await api.patch(
        `/workspace/subtasks/${subtaskId}/`,
        {
          status: nextStatus,
        }
      );

      setSubtasks((items) =>
        items.map((subtask) =>
          subtask.id === subtaskId
            ? response.data
            : subtask
        )
      );

      setStatusMessage(
        "Subtask status updated."
      );
    } catch (err) {
      setSubtasks((items) =>
        items.map((subtask) =>
          subtask.id === subtaskId
            ? {
                ...subtask,
                status: previousStatus,
              }
            : subtask
        )
      );

      setStatusError(
        err.response?.data?.message ||
          "Could not update subtask status."
      );
    } finally {
      setUpdatingSubtaskId(null);
    }
  };

  if (loading) {
    return (
      <div className="workspace-page">
        Loading tasks...
      </div>
    );
  }

  return (
    <div className="workspace-page">
      <div className="workspace-header">
        <h1>
          My Tasks
        </h1>
        <p>
          Your assigned tasks and subtasks
        </p>
      </div>

      {(statusMessage || statusError) && (
        <div
          className={`workspace-feedback ${
            statusError
              ? "workspace-feedback--error"
              : "workspace-feedback--success"
          }`}
        >
          {statusError || statusMessage}
        </div>
      )}

      <div className="workspace-section">
        <h2>
          Tasks
        </h2>

        {tasks.length === 0 ? (
          <div className="workspace-empty">
            No assigned tasks
          </div>
        ) : (
          <div className="workspace-grid">
            {tasks.map((task) => (
              <div
                key={task.id}
                className="workspace-card"
              >
                <h3>
                  {task.title}
                </h3>
                <p>
                  {task.description}
                </p>
                <span>
                  Status: {task.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="workspace-section">
        <h2>
          Subtasks
        </h2>

        {subtasks.length === 0 ? (
          <div className="workspace-empty">
            No assigned subtasks
          </div>
        ) : (
          <div className="workspace-grid">
            {subtasks.map((subtask) => (
              <div
                key={subtask.id}
                className="workspace-card"
              >
                <h3>
                  {subtask.title}
                </h3>
                <p>
                  {subtask.description}
                </p>
                <span>
                  Status: {subtask.status}
                </span>
                <button
                  type="button"
                  className="workspace-attachment-open"
                  onClick={() => setSelectedSubtask(subtask)}
                >
                  <Paperclip size={15} />
                  Work Attachments
                </button>
                <label className="workspace-status-field">
                  <span>
                    Update status
                  </span>
                  <select
                    value={subtask.status}
                    disabled={
                      updatingSubtaskId === subtask.id
                    }
                    onChange={(event) =>
                      handleSubtaskStatusChange(
                        subtask.id,
                        event.target.value
                      )
                    }
                  >
                    {statusOptions.map((option) => (
                      <option
                        key={option.value}
                        value={option.value}
                      >
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                {updatingSubtaskId === subtask.id && (
                  <p className="workspace-status-loading">
                    Updating status...
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedSubtask && (
        <div
          className="workspace-modal-overlay"
          onClick={() => setSelectedSubtask(null)}
        >
          <div
            className="workspace-subtask-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="workspace-subtask-modal-header">
              <div>
                <span>Subtask Work</span>
                <h2>{selectedSubtask.title}</h2>
                <p>{selectedSubtask.description || "No description provided."}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSubtask(null)}
                aria-label="Close subtask attachments"
                title="Close"
              >
                <X size={18} />
              </button>
            </div>

            <SubTaskAttachmentsSection subtaskId={selectedSubtask.id} />
          </div>
        </div>
      )}
    </div>
  );
}
