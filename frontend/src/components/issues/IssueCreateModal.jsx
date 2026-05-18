import { useEffect, useState } from "react";
import { AlertCircle, Loader2, Plus, X } from "lucide-react";
import useIssues from "../../context/issues/useIssues";
import { ISSUE_PRIORITIES, formatIssueLabel, getErrorMessage } from "./issueUtils";

const initialForm = {
  title: "",
  description: "",
  priority: "medium",
  project: "",
  task: "",
  subtask: "",
};

export default function IssueCreateModal({ open, onClose }) {
  const { projects, createIssue, fetchProjectTasks, fetchTaskSubtasks } = useIssues();
  const [form, setForm] = useState(initialForm);
  const [tasks, setTasks] = useState([]);
  const [subtasks, setSubtasks] = useState([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [loadingSubtasks, setLoadingSubtasks] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const resetForm = () => {
    setForm(initialForm);
    setTasks([]);
    setSubtasks([]);
    setError("");
  };

  const closeModal = () => {
    resetForm();
    onClose();
  };

  useEffect(() => {
    if (!form.project) {
      return;
    }

    let active = true;

    const loadTasks = async () => {
      try {
        setLoadingTasks(true);
        const items = await fetchProjectTasks(form.project);
        if (active) setTasks(items);
      } catch (err) {
        console.log(err);
        if (active) setError("Unable to load project tasks.");
      } finally {
        if (active) setLoadingTasks(false);
      }
    };

    loadTasks();
    return () => {
      active = false;
    };
  }, [fetchProjectTasks, form.project]);

  useEffect(() => {
    if (!form.task) {
      return;
    }

    let active = true;

    const loadSubtasks = async () => {
      try {
        setLoadingSubtasks(true);
        const items = await fetchTaskSubtasks(form.task);
        if (active) setSubtasks(items);
      } catch (err) {
        console.log(err);
        if (active) setError("Unable to load task subtasks.");
      } finally {
        if (active) setLoadingSubtasks(false);
      }
    };

    loadSubtasks();
    return () => {
      active = false;
    };
  }, [fetchTaskSubtasks, form.task]);

  if (!open) return null;

  const update = (key, value) => {
    if (key === "project") {
      setTasks([]);
      setSubtasks([]);
    }

    if (key === "task") {
      setSubtasks([]);
    }

    setForm((current) => ({
      ...current,
      [key]: value,
      ...(key === "project" ? { task: "", subtask: "" } : {}),
      ...(key === "task" ? { subtask: "" } : {}),
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.title.trim() || !form.description.trim() || !form.project) {
      setError("Title, description, and project are required.");
      return;
    }

    try {
      setSubmitting(true);
      setError("");

      await createIssue({
        title: form.title.trim(),
        description: form.description.trim(),
        priority: form.priority,
        project: form.project,
        task: form.task || null,
        subtask: form.subtask || null,
      });

      closeModal();
    } catch (err) {
      console.log(err);
      setError(getErrorMessage(err, "Issue could not be created."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="issue-modal-backdrop" onClick={closeModal}>
      <section className="issue-modal issue-create-modal" onClick={(event) => event.stopPropagation()}>
        <header className="issue-modal-header">
          <div>
            <span>Create issue</span>
            <h2>Raise a blocker</h2>
          </div>
          <button type="button" className="issue-icon-button" onClick={closeModal} aria-label="Close create issue">
            <X size={18} />
          </button>
        </header>

        {error && (
          <div className="issue-alert" role="alert">
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        <form className="issue-form" onSubmit={handleSubmit}>
          <label>
            <span>Title</span>
            <input value={form.title} onChange={(event) => update("title", event.target.value)} />
          </label>

          <label>
            <span>Description</span>
            <textarea value={form.description} onChange={(event) => update("description", event.target.value)} />
          </label>

          <div className="issue-form-grid">
            <label>
              <span>Priority</span>
              <select value={form.priority} onChange={(event) => update("priority", event.target.value)}>
                {ISSUE_PRIORITIES.map((priority) => (
                  <option key={priority} value={priority}>
                    {formatIssueLabel(priority)}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>Project</span>
              <select value={form.project} onChange={(event) => update("project", event.target.value)}>
                <option value="">Select project</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="issue-form-grid">
            <label>
              <span>Task optional</span>
              <select
                value={form.task}
                disabled={!form.project || loadingTasks}
                onChange={(event) => update("task", event.target.value)}
              >
                <option value="">{loadingTasks ? "Loading tasks..." : "No task"}</option>
                {tasks.map((task) => (
                  <option key={task.id} value={task.id}>
                    {task.title}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>Subtask optional</span>
              <select
                value={form.subtask}
                disabled={!form.task || loadingSubtasks}
                onChange={(event) => update("subtask", event.target.value)}
              >
                <option value="">{loadingSubtasks ? "Loading subtasks..." : "No subtask"}</option>
                {subtasks.map((subtask) => (
                  <option key={subtask.id} value={subtask.id}>
                    {subtask.title}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="issue-modal-footer">
            <button type="button" className="issue-secondary-button" onClick={closeModal}>
              Cancel
            </button>
            <button type="submit" className="issue-primary-button" disabled={submitting}>
              {submitting ? <Loader2 size={16} className="issue-spin" /> : <Plus size={16} />}
              {submitting ? "Creating" : "Create Issue"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
