import { useState } from "react";
import { createPortal } from "react-dom";
import api from "../../services/api";
import "./CreateProjectModal.css";

export default function CreateProjectModal({
  open,
  onClose,
  onSuccess,
}) {

  const [name, setName] = useState("");
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

      await api.post("/projects/", {
        name,
        description,
        priority,
        due_date: dueDate || null,
      });

      await onSuccess();

      setName("");
      setDescription("");
      setPriority("medium");
      setDueDate("");

      onClose();

    } catch (err) {

      setError(
        err.response?.data?.message ||
        "Failed to create project"
      );

    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div
      className="cp-overlay"
      onClick={onClose}
    >

      <div
        className="cp-modal"
        onClick={(e) => e.stopPropagation()}
      >

        <div className="cp-header">
          <h2>Create Project</h2>

          <button onClick={onClose}>
            ✕
          </button>
        </div>

        <form
          onSubmit={handleCreate}
          className="cp-form"
        >

          <div className="cp-field">
            <label>Project Name</label>

            <input
              type="text"
              value={name}
              onChange={(e) =>
                setName(e.target.value)
              }
              required
            />
          </div>

          <div className="cp-field">
            <label>Description</label>

            <textarea
              rows="4"
              value={description}
              onChange={(e) =>
                setDescription(e.target.value)
              }
            />
          </div>

          <div className="cp-row">

            <div className="cp-field">
              <label>Priority</label>

              <select
                value={priority}
                onChange={(e) =>
                  setPriority(e.target.value)
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

            <div className="cp-field">
              <label>Due Date</label>

              <input
                type="date"
                value={dueDate}
                onChange={(e) =>
                  setDueDate(e.target.value)
                }
              />
            </div>

          </div>

          {error && (
            <p className="cp-error">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="cp-submit"
            disabled={loading}
          >
            {loading
              ? "Creating..."
              : "Create Project"}
          </button>

        </form>

      </div>

    </div>,
    document.body
  );
}