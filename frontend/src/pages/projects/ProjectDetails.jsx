import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  Calendar,
  Users,
  CheckCircle2,
} from "lucide-react";

import api from "../../services/api";
import "./ProjectDetails.css";

export default function ProjectDetails() {

  const { projectId } = useParams();

  const [project, setProject] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {

    const fetchProject = async () => {

      try {

        const res = await api.get(
          `/projects/${projectId}/`
        );

        setProject(res.data);

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
      <div className="pd-empty-tasks">

        <h2>No tasks yet</h2>

        <p>
          Start creating tasks for this project
        </p>

      </div>

    </div>
  );
}