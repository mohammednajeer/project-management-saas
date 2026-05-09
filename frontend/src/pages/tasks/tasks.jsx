import { useEffect, useState } from "react";
import {
  Calendar,
  MessageSquare,
  Paperclip,
} from "lucide-react";

import api from "../../services/api";
import "./Tasks.css";
import { useNavigate } from "react-router-dom";
const COLUMNS = [
  {
    key: "todo",
    title: "Backlog",
  },
  {
    key: "in_progress",
    title: "In Progress",
  },
  {
    key: "review",
    title: "Review",
  },
  {
    key: "done",
    title: "Done",
  },
];

export default function Tasks() {
  const navigate = useNavigate();

  const [tasks, setTasks] = useState([]);;
  const [loading, setLoading] =
    useState(true);

  useEffect(() => {

    const fetchTasks = async () => {

      try {

        const projectsRes =
          await api.get("/projects/");

        let allTasks = [];

        for (const project of projectsRes.data) {

          const res = await api.get(
            `/tasks/project/${project.id}/`
          );

          const tasksWithProject =
            res.data.map((task) => ({
              ...task,
              project_name: project.name,
            }));

          allTasks = [
            ...allTasks,
            ...tasksWithProject,
          ];
        }

        setTasks(allTasks);

      } catch (err) {

        console.log(err);

      } finally {

        setLoading(false);
      }
    };

    fetchTasks();

  }, []);

  if (loading) {
    return (
      <div className="tasks-page">
        Loading board...
      </div>
    );
  }

  return (
    <div className="tasks-page">

      <div className="tasks-header">

        <div>

          <h1>Kanban Board</h1>

          <p>
            {tasks.length} tasks across all stages
          </p>

        </div>

      </div>

      <div className="kanban-board">

        {COLUMNS.map((column) => {

          const columnTasks =
            tasks.filter(
              (task) =>
                task.status === column.key
            );

          return (

            <div
              key={column.key}
              className="kanban-column"
            >

              <div className="kanban-column-header">

                <h3>
                  {column.title}
                </h3>

                <span>
                  {columnTasks.length}
                </span>

              </div>

              <div className="kanban-tasks">

                {columnTasks.map((task) => (

                  <div
                      key={task.id}
                      className="task-card"
                      onClick={() => {
                        navigate(
                          `/dashboard/tasks/${task.id}`
                        );
                      }}
                    >
                      

                    <div className="task-priority">
                      {task.priority}
                    </div>

                    <h4>
                      {task.title}
                    </h4>

                    <p>
                      {task.project_name}
                    </p>

                    <div className="task-progress">

                      <span>
                        {task.completed_subtasks}/
                        {task.subtask_count}
                        {" "}
                        subtasks
                      </span>

                    </div>

                    <div className="task-footer">

                      <div className="task-date">

                        <Calendar size={14} />

                        <span>
                          {task.due_date ||
                            "No due"}
                        </span>

                      </div>

                      <div className="task-icons">

                        <div>
                          <MessageSquare
                            size={14}
                          />
                        </div>

                        <div>
                          <Paperclip
                            size={14}
                          />
                        </div>

                      </div>

                    </div>

                  </div>
                ))}

              </div>

            </div>
          );
        })}

      </div>
      
    </div>
  );
}