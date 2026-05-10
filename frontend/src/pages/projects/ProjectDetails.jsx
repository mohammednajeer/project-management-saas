import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  Calendar,
  Users,
  CheckCircle2,
} from "lucide-react";

import api from "../../services/api";
import "./ProjectDetails.css";
import CreateTaskModal from "./CreateTaskModal";
import { useNavigate } from "react-router-dom";

export default function ProjectDetails() {

  const { projectId } = useParams();
  const navigate = useNavigate();

  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [taskModalOpen, setTaskModalOpen] =
    useState(false);

  const [loading, setLoading] =
    useState(true);

  const [editMode, setEditMode] =
    useState(false);

  const [name, setName] =
    useState("");

  const [description, setDescription] =
    useState("");

  const [status, setStatus] =
    useState("");

  const [priority, setPriority] =
    useState("");

  const [teamMembers, setTeamMembers] =
    useState([]);

  const [selectedMembers,
    setSelectedMembers] =
    useState([]);

  const fetchTasks = async () => {

    try {

      const tasksRes =
        await api.get(
          `/tasks/project/${projectId}/`
        );

      setTasks(tasksRes.data);

    } catch (err) {

      console.log(err);
    }
  };

  const fetchProject = async () => {

    try {

      const res =
        await api.get(
          `/projects/${projectId}/`
        );

      setProject(res.data);

      setName(res.data.name);

      setDescription(
        res.data.description || ""
      );

      setStatus(
        res.data.status
      );

      setPriority(
        res.data.priority
      );

      await fetchTasks();

      const membersRes =
        await api.get(
          "/organizations/team/"
        );

      setTeamMembers(
        membersRes.data
      );

    } catch (err) {

      console.log(err);

    } finally {

      setLoading(false);
    }
  };

  useEffect(() => {

    fetchProject();

  }, [projectId]);

  const handleSave = async () => {

    try {

      await api.patch(
        `/projects/${projectId}/`,
        {
          name,
          description,
          status,
          priority,
        }
      );

      await fetchProject();

      setEditMode(false);

    } catch (err) {

      console.log(err);
    }
  };

  const handleDelete =
    async () => {

      const confirmed =
        window.confirm(
          "Delete this project?"
        );

      if (!confirmed)
        return;

      try {

        await api.delete(
          `/projects/${projectId}/`
        );

        navigate(
          "/dashboard/projects"
        );

      } catch (err) {

        console.log(err);
      }
    };

  const addMembers =
    async () => {

      try {

        await api.post(
          `/projects/${projectId}/members/`,
          {
            members:
              selectedMembers,
          }
        );

        await fetchProject();

        setSelectedMembers([]);

      } catch (err) {

        console.log(err);
      }
    };

  const removeMember =
    async (userId) => {

      try {

        await api.delete(
          `/projects/${projectId}/members/`,
          {
            data: {
              user_id: userId,
            },
          }
        );

        await fetchProject();

      } catch (err) {

        console.log(err);
      }
    };

  if (loading) {

    return (
      <div className="project-details-page">
        Loading project...
      </div>
    );
  }

  if (!project) {

    return (
      <div className="project-details-page">
        Project not found
      </div>
    );
  }

  const total =
    project.total_tasks || 0;

  const done =
    project.completed_tasks || 0;

  const progress =
    total
      ? Math.round((done / total) * 100)
      : 0;

  return (

    <div className="project-details-page">

      <div className="pd-header">

        <div>

          {editMode ? (

            <input
              className="pd-edit-input"
              value={name}
              onChange={(e) =>
                setName(e.target.value)
              }
            />

          ) : (

            <h1>{project.name}</h1>

          )}

          {editMode ? (

            <textarea
              className="pd-edit-textarea"
              value={description}
              onChange={(e) =>
                setDescription(
                  e.target.value
                )
              }
            />

          ) : (

            <p>
              {project.description ||
                "No description"}
            </p>

          )}

        </div>

        <div className="project-actions">

          {editMode ? (

            <select
              value={status}
              onChange={(e) =>
                setStatus(
                  e.target.value
                )
              }
            >

              <option value="planning">
                Planning
              </option>

              <option value="active">
                Active
              </option>

              <option value="on_hold">
                On Hold
              </option>

              <option value="completed">
                Completed
              </option>

              <option value="archived">
                Archived
              </option>

            </select>

          ) : (

            <span className="pd-priority">
              {project.status}
            </span>

          )}

          <button
            onClick={() =>
              setEditMode(!editMode)
            }
          >
            {editMode
              ? "Cancel"
              : "Edit"}
          </button>

          {editMode && (

            <button
              onClick={handleSave}
            >
              Save
            </button>

          )}

          <button
            onClick={handleDelete}
            className="delete-btn"
          >
            Delete
          </button>

        </div>

      </div>

      <div className="pd-stats">

        <div className="pd-stat-card">

          <CheckCircle2 size={20} />

          <div>
            <h3>{done}/{total}</h3>
            <p>Tasks completed</p>
          </div>

        </div>

        <div className="pd-stat-card">

          <Users size={20} />

          <div>
            <h3>
              {project.members_data?.length || 0}
            </h3>

            <p>Members</p>
          </div>

        </div>

        <div className="pd-stat-card">

          <Calendar size={20} />

          <div>
            <h3>
              {project.due_date ||
                "No due date"}
            </h3>

            <p>Deadline</p>
          </div>

        </div>

      </div>

      <div className="pd-progress-card">

        <div className="pd-progress-top">

          <span>Project Progress</span>

          <span>{progress}%</span>

        </div>

        <div className="pd-progress-track">

          <div
            className="pd-progress-bar"
            style={{
              width: `${progress}%`
            }}
          />

        </div>

      </div>

      <div className="pd-members-card">

        <h2>Team Members</h2>

        <div className="pd-members-list">

          {project.members_data?.map(
            (member) => (

              <div
                key={member.id}
                className="pd-member"
              >

                <div className="pd-avatar">
                  {member.initials}
                </div>

                <div className="pd-member-info">

                  <span>
                    {member.name}
                  </span>

                  <button
                    className="remove-member-btn"
                    onClick={() =>
                      removeMember(member.id)
                    }
                  >
                    ✕
                  </button>

                </div>

              </div>
            )
          )}

        </div>

      </div>

      <div className="pd-manage-members">

        <h2>Manage Members</h2>

        <div className="pd-member-select-list">

          {teamMembers
            .filter(
              (teamMember) =>
                !project.members_data?.some(
                  (projectMember) =>
                    projectMember.id ===
                    teamMember.id
                )
            )
            .map((member) => (

              <button
                type="button"
                key={member.id}
                className={
                  selectedMembers.includes(
                    member.id
                  )
                    ? "member-pill active"
                    : "member-pill"
                }
                onClick={() => {

                  if (
                    selectedMembers.includes(
                      member.id
                    )
                  ) {

                    setSelectedMembers(
                      selectedMembers.filter(
                        (id) =>
                          id !== member.id
                      )
                    );

                  } else {

                    setSelectedMembers([
                      ...selectedMembers,
                      member.id,
                    ]);
                  }
                }}
              >

                {member.name}

              </button>
            ))}

        </div>

        <button
          className="pd-add-members-btn"
          onClick={addMembers}
        >
          Add Members
        </button>

      </div>

      <div className="pd-tasks-section">

        <div className="pd-task-header">

          <h2>Project Tasks</h2>

          <button
            className="pd-create-task-btn"
            onClick={() =>
              setTaskModalOpen(true)
            }
          >
            + Create Task
          </button>

        </div>

        {tasks.length === 0 ? (

          <div className="pd-empty-tasks">

            <h3>No tasks yet</h3>

            <p>
              Create your first feature/module
            </p>

          </div>

        ) : (

          <div className="pd-task-grid">

            {tasks.map((task) => {

              const total =
                task.subtask_count || 0;

              const done =
                task.completed_subtasks || 0;

              const progress =
                total
                  ? Math.round(
                    (done / total) * 100
                  )
                  : 0;

              return (

                <div
                  key={task.id}
                  className="pd-task-card"
                >

                  <div className="pd-task-top">

                    <span className="pd-task-status">
                      {task.status}
                    </span>

                    <span className="pd-task-priority">
                      {task.priority}
                    </span>

                  </div>

                  <h3>{task.title}</h3>

                  <p>
                    {task.description ||
                      "No description"}
                  </p>

                  <div className="pd-task-progress-top">

                    <span>Progress</span>

                    <span>{progress}%</span>

                  </div>

                  <div className="pd-progress-track">

                    <div
                      className="pd-progress-bar"
                      style={{
                        width: `${progress}%`
                      }}
                    />

                  </div>

                  <div className="pd-task-footer">

                    <span>
                      {done}/{total} subtasks
                    </span>

                    <span>
                      {task.due_date ||
                        "No due date"}
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
        onClose={() =>
          setTaskModalOpen(false)
        }
        onSuccess={fetchTasks}
        projectId={projectId}
      />

    </div>
  );
}