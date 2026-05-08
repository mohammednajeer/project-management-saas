import { useState } from "react";
import { createPortal } from "react-dom";

import api from "../../services/api";

import "./CreateTaskModal.css";

export default function CreateTaskModal({
  open,
  onClose,
  onSuccess,
  projectId,
}) {

  const [title, setTitle] =
    useState("");

  const [description, setDescription] =
    useState("");

  const [priority, setPriority] =
    useState("medium");

  const [dueDate, setDueDate] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  if (!open) return null;

  const handleCreate = async (e) => {

    e.preventDefault();

    setLoading(true);
    setError("");

    try {

      await api.post(
        `/tasks/project/${projectId}/`,
        {
          title,
          description,
          priority,
          due_date:
            dueDate || null,
        }
      );

      await onSuccess();

      setTitle("");
      setDescription("");
      setPriority("medium");
      setDueDate("");

      onClose();

    } catch (err) {

      setError(
        err.response?.data?.message ||
        "Failed to create task"
      );

    } finally {

      setLoading(false);
    }
  };

  return createPortal(

    <div
      className="ct-overlay"
      onClick={onClose}
    >

      <div
        className="ct-modal"
        onClick={(e) =>
          e.stopPropagation()
        }
      >

        <div className="ct-header">

          <h2>Create Task</h2>

          <button onClick={onClose}>
            ✕
          </button>

        </div>

        <form
          onSubmit={handleCreate}
          className="ct-form"
        >

          <div className="ct-field">

            <label>Task Title</label>

            <input
              type="text"
              value={title}
              onChange={(e) =>
                setTitle(e.target.value)
              }
              required
            />

          </div>

          <div className="ct-field">

            <label>Description</label>

            <textarea
              rows="4"
              value={description}
              onChange={(e) =>
                setDescription(
                  e.target.value
                )
              }
            />

          </div>

          <div className="ct-row">

            <div className="ct-field">

              <label>Priority</label>

              <select
                value={priority}
                onChange={(e) =>
                  setPriority(
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

            </div>

            <div className="ct-field">

              <label>Due Date</label>

              <input
                type="date"
                value={dueDate}
                onChange={(e) =>
                  setDueDate(
                    e.target.value
                  )
                }
              />

            </div>

          </div>

          {error && (
            <p className="ct-error">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="ct-submit"
            disabled={loading}
          >

            {loading
              ? "Creating..."
              : "Create Task"}

          </button>

        </form>

      </div>

    </div>,
    document.body
  );
}