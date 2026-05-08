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



export default function ProjectDetails() {

  const { projectId } = useParams();

  const [project, setProject] =useState(null);
  const [tasks, setTasks] = useState([]);
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [loading, setLoading] =useState(true);

  const fetchTasks = async () => {

    try {

        const tasksRes = await api.get(
        `/tasks/project/${projectId}/`
        );

        setTasks(tasksRes.data);

    } catch (err) {

        console.log(err);
    }
    };


  useEffect(() => {

    const fetchProject = async () => {

      try {

        const res = await api.get(
          `/projects/${projectId}/`
        );

        setProject(res.data);
        await fetchTasks();

            

      } catch (err) {

        console.log(err);

      } finally {
        setLoading(false);
      }
    };

    fetchProject();

  }, [projectId]);

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

      {/* Header */}
      <div className="pd-header">

        <div>

          <h1>{project.name}</h1>

          <p>
            {project.description ||
              "No description"}
          </p>

        </div>

        <span className="pd-priority">
          {project.priority}
        </span>

      </div>

      {/* Stats */}
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
              {project.due_date || "No due date"}
            </h3>

            <p>Deadline</p>
          </div>
        </div>

      </div>

      {/* Progress */}
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

      {/* Members */}
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

                <span>
                  {member.name}
                </span>

              </div>
            )
          )}

        </div>

      </div>

      {/* Empty Tasks */}
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
                    ? Math.round((done / total) * 100)
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