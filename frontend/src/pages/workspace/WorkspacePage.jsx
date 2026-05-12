import { useEffect, useState } from "react";

import api from "../../services/api";

import "./WorkspacePage.css";

export default function WorkspacePage() {

  const [tasks,
    setTasks
  ] = useState([]);

  const [subtasks,
    setSubtasks
  ] = useState([]);

  const [loading,
    setLoading
  ] = useState(true);

  useEffect(() => {

    fetchWorkspace();

  }, []);

  const fetchWorkspace =
    async () => {

      try {

        const tasksRes =
          await api.get(
            "/workspace/tasks/"
          );

        const subtasksRes =
          await api.get(
            "/workspace/subtasks/"
          );

        setTasks(
          tasksRes.data
        );

        setSubtasks(
          subtasksRes.data
        );

      } catch (err) {

        console.log(err);

      } finally {

        setLoading(false);
      }
    };

  if (loading) {

    return (

      <div className="workspace-page">

        Loading workspace...

      </div>
    );
  }

  return (

    <div className="workspace-page">

      <div className="workspace-header">

        <h1>
          My Workspace
        </h1>

        <p>
          Manage your assigned work
        </p>

      </div>

      {/* Tasks */}

      <div className="workspace-section">

        <h2>
          Assigned Tasks
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
                  Status:
                  {" "}
                  {task.status}
                </span>

              </div>
            ))}

          </div>
        )}

      </div>

      {/* Subtasks */}

      <div className="workspace-section">

        <h2>
          Assigned Subtasks
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
                  Status:
                  {" "}
                  {subtask.status}
                </span>

              </div>
            ))}

          </div>
        )}

      </div>

    </div>
  );
}