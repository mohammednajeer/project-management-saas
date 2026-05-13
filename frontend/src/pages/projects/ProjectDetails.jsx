import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  Calendar,
  Users,
  CheckCircle2,
  ChevronRight,
  Layers,
  Edit2,
  Trash2,
  Save,
  X,
  Plus,
  Clock,
  BarChart2,
  UserPlus,
} from "lucide-react";
import api from "../../services/api";
import "./ProjectDetails.css";
import CreateTaskModal from "./CreateTaskModal";

export default function ProjectDetails() {
  const { projectId } = useParams();
  const navigate = useNavigate();

  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [teamMembers, setTeamMembers] = useState([]);
  const [selectedMembers, setSelectedMembers] = useState([]);

  const fetchTasks = async () => {
    try {
      const tasksRes = await api.get(`/tasks/project/${projectId}/`);
      setTasks(tasksRes.data);
    } catch (err) {
      console.log(err);
    }
  };

  const fetchProject = async () => {
    try {
      const res = await api.get(`/projects/${projectId}/`);
      setProject(res.data);
      setName(res.data.name);
      setDescription(res.data.description || "");
      setStatus(res.data.status);
      setPriority(res.data.priority);
      await fetchTasks();
      const membersRes = await api.get("/organizations/team/");
      setTeamMembers(membersRes.data);
    } catch (err) {
      console.log(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProject(); }, [projectId]);

  const handleSave = async () => {
    try {
      await api.patch(`/projects/${projectId}/`, { name, description, status, priority });
      await fetchProject();
      setEditMode(false);
    } catch (err) {
      console.log(err);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this project?")) return;
    try {
      await api.delete(`/projects/${projectId}/`);
      navigate("/dashboard/projects");
    } catch (err) {
      console.log(err);
    }
  };

  const addMembers = async () => {
    try {
      await api.post(`/projects/${projectId}/members/`, { members: selectedMembers });
      await fetchProject();
      setSelectedMembers([]);
    } catch (err) {
      console.log(err);
    }
  };

  const removeMember = async (userId) => {
    try {
      await api.delete(`/projects/${projectId}/members/`, { data: { user_id: userId } });
      await fetchProject();
    } catch (err) {
      console.log(err);
    }
  };

  if (loading) {
    return (
      <div className="project-details-page">
        <div className="pd-loading">
          <div className="pd-loading-spinner" />
          <span>Loading project...</span>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="project-details-page">
        <div className="pd-loading">
          <Layers size={32} style={{ color: "var(--brand-light)" }} />
          <span>Project not found</span>
        </div>
      </div>
    );
  }

  const total    = project.total_tasks || 0;
  const done     = project.completed_tasks || 0;
  const progress = total ? Math.round((done / total) * 100) : 0;
  const isLocked = project.status === "archived" || project.status === "completed";

  return (
    <div className="project-details-page">

      {/* ── BREADCRUMB ── */}
      <div className="pd-breadcrumb">
        <Link to="/dashboard/projects">Projects</Link>
        <ChevronRight size={13} className="pd-breadcrumb-sep" />
        <span className="pd-breadcrumb-current">{project.name}</span>
      </div>

      {/* ── HEADER ── */}
      <div className="pd-header">
        <div className="pd-header-left">
          {editMode ? (
            <>
              <input
                className="pd-edit-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Project name"
              />
              <textarea
                className="pd-edit-textarea"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Project description..."
              />
            </>
          ) : (
            <>
              <h1 className="pd-project-name">{project.name}</h1>
              <p className="pd-project-desc">
                {project.description || "No description provided."}
              </p>
            </>
          )}
        </div>

        <div className="pd-actions">
          {editMode ? (
            <>
              <select
                className="pd-status-select"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="planning">Planning</option>
                <option value="active">Active</option>
                <option value="on_hold">On Hold</option>
                <option value="completed">Completed</option>
                <option value="archived">Archived</option>
              </select>
              <button className="pd-btn pd-btn--primary" onClick={handleSave}>
                <Save size={14} />
                Save
              </button>
              <button className="pd-btn" onClick={() => setEditMode(false)}>
                <X size={14} />
                Cancel
              </button>
            </>
          ) : (
            <>
              <span className="pd-status-badge">{project.status}</span>
              <button className="pd-btn" onClick={() => setEditMode(true)}>
                <Edit2 size={14} />
                Edit
              </button>
              <button className="pd-btn pd-btn--danger" onClick={handleDelete}>
                <Trash2 size={14} />
                Delete
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── BANNERS ── */}
      {project.status === "archived" && (
        <div className="pd-banner pd-banner--archived">
          <X size={16} />
          This project is archived. You can still edit and reopen it.
        </div>
      )}
      {project.status === "completed" && (
        <div className="pd-banner pd-banner--completed">
          <CheckCircle2 size={16} />
          This project has been completed. Great work!
        </div>
      )}

      {/* ── STATS ── */}
      <div className="pd-stats">
        <div className="pd-stat-card">
          <div className="pd-stat-icon"><CheckCircle2 size={20} /></div>
          <div>
            <h3>{done}/{total}</h3>
            <p>Tasks completed</p>
          </div>
        </div>
        <div className="pd-stat-card">
          <div className="pd-stat-icon"><Users size={20} /></div>
          <div>
            <h3>{project.members_data?.length || 0}</h3>
            <p>Team members</p>
          </div>
        </div>
        <div className="pd-stat-card">
          <div className="pd-stat-icon"><BarChart2 size={20} /></div>
          <div>
            <h3>{progress}%</h3>
            <p>Overall progress</p>
          </div>
        </div>
        <div className="pd-stat-card">
          <div className="pd-stat-icon"><Calendar size={20} /></div>
          <div>
            <h3 style={{ fontSize: project.due_date ? "16px" : "14px" }}>
              {project.due_date || "No date"}
            </h3>
            <p>Deadline</p>
          </div>
        </div>
      </div>

      {/* ── PROGRESS CARD ── */}
      <div className="pd-glass-card pd-progress-card">
        <div className="pd-progress-top">
          <div className="pd-card-title">
            <div className="pd-card-title-icon"><BarChart2 size={14} /></div>
            Project Progress
          </div>
          <span className="pd-progress-pct">{progress}%</span>
        </div>
        <div className="pd-progress-track">
          <div className="pd-progress-bar" style={{ width: `${progress}%` }} />
        </div>
        <div className="pd-progress-meta">
          <span>{done} tasks completed</span>
          <span>{total - done} remaining</span>
        </div>
      </div>

      {/* ── MEMBERS CARD ── */}
      <div className="pd-glass-card pd-members-card">
        <div className="pd-card-title">
          <div className="pd-card-title-icon"><Users size={14} /></div>
          Team Members
        </div>

        {project.members_data?.length === 0 ? (
          <p style={{ color: "var(--text-3)", fontSize: "14px" }}>No members yet.</p>
        ) : (
          <div className="pd-members-list">
            {project.members_data?.map((member) => (
              <div key={member.id} className="pd-member">
                <div className="pd-avatar">
                  {member.initials || member.name?.charAt(0) || "?"}
                </div>
                <span className="pd-member-name">{member.name}</span>
                <button
                  className="remove-member-btn"
                  onClick={() => removeMember(member.id)}
                  title="Remove member"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        {!isLocked && (
          <div className="pd-manage-members">
            <div className="pd-manage-title">
              <UserPlus size={12} style={{ display: "inline", marginRight: 5 }} />
              Add Members
            </div>
            <div className="pd-member-select-list">
              {teamMembers
                .filter((tm) => !project.members_data?.some((pm) => pm.id === tm.id))
                .map((member) => (
                  <button
                    type="button"
                    key={member.id}
                    className={`member-pill ${selectedMembers.includes(member.id) ? "active" : ""}`}
                    onClick={() => {
                      setSelectedMembers(
                        selectedMembers.includes(member.id)
                          ? selectedMembers.filter((id) => id !== member.id)
                          : [...selectedMembers, member.id]
                      );
                    }}
                  >
                    {member.name}
                  </button>
                ))}
            </div>
            {selectedMembers.length > 0 && (
              <button className="pd-add-members-btn" onClick={addMembers}>
                <UserPlus size={14} />
                Add {selectedMembers.length} Member{selectedMembers.length > 1 ? "s" : ""}
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── TASKS ── */}
      <div className="pd-tasks-section">
        <div className="pd-task-header">
          <div className="pd-task-header-left">
            <h2 className="pd-section-title">Project Tasks</h2>
            <p className="pd-section-sub">{tasks.length} task{tasks.length !== 1 ? "s" : ""} total</p>
          </div>
          {!isLocked && (
            <button
              className="pd-create-task-btn"
              onClick={() => setTaskModalOpen(true)}
            >
              <Plus size={15} />
              Create Task
            </button>
          )}
        </div>

        {tasks.length === 0 ? (
          <div className="pd-empty-tasks">
            <div className="pd-empty-tasks-icon">
              <Layers size={24} />
            </div>
            <h3>No tasks yet</h3>
            <p>Create your first task to start tracking progress</p>
          </div>
        ) : (
          <div className="pd-task-grid">
            {tasks.map((task) => {
              const tTotal    = task.subtask_count || 0;
              const tDone     = task.completed_subtasks || 0;
              const tProgress = tTotal ? Math.round((tDone / tTotal) * 100) : 0;

              return (
                <div key={task.id} className="pd-task-card">
                  <div className="pd-task-top">
                    <span className="pd-task-status">{task.status}</span>
                    <span className="pd-task-priority">{task.priority}</span>
                  </div>

                  <h3>{task.title}</h3>
                  <p>{task.description || "No description"}</p>

                  <div className="pd-task-progress-top">
                    <span>Subtasks</span>
                    <span className="pd-task-pct">{tProgress}%</span>
                  </div>
                  <div className="pd-task-progress-track">
                    <div
                      className="pd-task-progress-bar"
                      style={{ width: `${tProgress}%` }}
                    />
                  </div>

                  <div className="pd-task-footer">
                    <span className="pd-task-subtasks">{tDone}/{tTotal} subtasks</span>
                    <span className="pd-task-due">
                      {task.due_date ? (
                        <>
                          <Clock size={11} />
                          {task.due_date}
                        </>
                      ) : (
                        "No due date"
                      )}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <CreateTaskModal
        open={taskModalOpen}
        onClose={() => setTaskModalOpen(false)}
        onSuccess={fetchTasks}
        projectId={projectId}
      />
    </div>
  );
}