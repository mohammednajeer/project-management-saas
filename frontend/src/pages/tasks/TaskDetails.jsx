import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import {
  Calendar,
  Flag,
  CheckCircle2,
  User2,
} from "lucide-react";

import api from "../../services/api";

import "./TaskDetails.css";

export default function TaskDetails() {

  const { taskId } = useParams();

  const [task, setTask] =
    useState(null);

  const [subtasks, setSubtasks] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [subtaskTitle, setSubtaskTitle] =
    useState("");

  useEffect(() => {

    fetchTask();

  }, [taskId]);

  const fetchTask = async () => {

    try {

      const projectsRes =
        await api.get("/projects/");

      let foundTask = null;

      for (const project of projectsRes.data) {

        const tasksRes =
          await api.get(
            `/tasks/project/${project.id}/`
          );

        const taskMatch =
          tasksRes.data.find(
            (t) => t.id === taskId
          );

        if (taskMatch) {

          foundTask = {
            ...taskMatch,
            project_name:
              project.name,
          };

          break;
        }
      }

      if (foundTask) {

        setTask(foundTask);

        const subtasksRes =
          await api.get(
            `/tasks/subtasks/${taskId}/`
          );

        setSubtasks(
          subtasksRes.data
        );
      }

    } catch (err) {

      console.log(err);

    } finally {

      setLoading(false);
    }
  };

  const handleCreateSubtask =
    async (e) => {

      e.preventDefault();

      if (!subtaskTitle.trim())
        return;

      try {

        await api.post(
          `/tasks/subtasks/${taskId}/`,
          {
            title: subtaskTitle,
          }
        );

        setSubtaskTitle("");

        fetchTask();

      } catch (err) {

        console.log(err);
      }
    };

  if (loading) {
    return (
      <div className="task-details-page">
        Loading task...
      </div>
    );
  }

  if (!task) {
    return (
      <div className="task-details-page">
        Task not found
      </div>
    );
  }

  return (

    <div className="task-details-page">

      <div className="task-top">

        <div>

          <h1>
            {task.title}
          </h1>

          <p>
            {task.description ||
              "No description"}
          </p>

        </div>

        <div className="task-status-badge">
          {task.status}
        </div>

      </div>

      <div className="task-info-grid">

        <div className="task-info-card">

          <Flag size={18} />

          <div>
            <span>Priority</span>
            <strong>
              {task.priority}
            </strong>
          </div>

        </div>

        <div className="task-info-card">

          <Calendar size={18} />

          <div>
            <span>Due Date</span>
            <strong>
              {task.due_date ||
                "No due date"}
            </strong>
          </div>

        </div>

        <div className="task-info-card">

          <CheckCircle2 size={18} />

          <div>
            <span>Progress</span>

            <strong>
              {
                task.completed_subtasks
              }
              /
              {
                task.subtask_count
              }
              {" "}
              completed
            </strong>

          </div>

        </div>

        <div className="task-info-card">

          <User2 size={18} />

          <div>
            <span>Project</span>
            <strong>
              {task.project_name}
            </strong>
          </div>

        </div>

      </div>

      <div className="subtasks-wrapper">

        <div className="subtasks-header">

          <h2>
            Subtasks
          </h2>

          <span>
            {subtasks.length}
          </span>

        </div>

        <form
          className="subtask-create-form"
          onSubmit={
            handleCreateSubtask
          }
        >

          <input
            type="text"
            placeholder="Create subtask..."
            value={subtaskTitle}
            onChange={(e) =>
              setSubtaskTitle(
                e.target.value
              )
            }
          />

          <button type="submit">
            Add
          </button>

        </form>

        <div className="subtasks-list">

          {subtasks.map(
            (subtask) => (

              <div
                key={subtask.id}
                className="subtask-card"
              >

                <div>

                  <h3>
                    {subtask.title}
                  </h3>

                  <p>
                    {
                      subtask.assigned_user
                        ?.name ||
                      "Unassigned"
                    }
                  </p>

                </div>

                <div className="subtask-status">
                  {subtask.status}
                </div>

              </div>
            )
          )}

        </div>

      </div>

    </div>
  );
}