import { useCallback, useEffect, useMemo, useState } from "react";
import api from "../../services/api";
import { useAuth } from "../AuthContext";
import { getErrorMessage, isManagerRole } from "../../components/issues/issueUtils";
import { IssueContext } from "./IssueContextCore";

function uniqueById(items) {
  const map = new Map();
  items.filter(Boolean).forEach((item) => map.set(String(item.id), item));
  return Array.from(map.values());
}

export function IssueProvider({ children }) {
  const { user } = useAuth();
  const canManageIssues = isManagerRole(user?.role);
  const [issues, setIssues] = useState([]);
  const [projects, setProjects] = useState([]);
  const [workspaceTasks, setWorkspaceTasks] = useState([]);
  const [workspaceSubtasks, setWorkspaceSubtasks] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchSupportingData = useCallback(async () => {
    if (canManageIssues) {
      const [projectsRes, teamRes] = await Promise.all([
        api.get("/projects/?pagination=false"),
        api.get("/organizations/team/"),
      ]);

      setProjects(projectsRes.data || []);
      setTeamMembers(teamRes.data || []);
      return;
    }

    const [tasksRes, subtasksRes] = await Promise.all([
      api.get("/workspace/tasks/"),
      api.get("/workspace/subtasks/"),
    ]);

    const tasks = tasksRes.data || [];
    const subtasks = subtasksRes.data || [];

    setWorkspaceTasks(tasks);
    setWorkspaceSubtasks(subtasks);
    setProjects(
      uniqueById(
        tasks.map((task) => ({
          id: task.project,
          name: task.project_name || `Project ${String(task.project).slice(0, 8)}`,
        }))
      )
    );
  }, [canManageIssues]);

  const fetchIssues = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const [issuesRes] = await Promise.all([
        api.get("/issues/"),
        fetchSupportingData(),
      ]);

      setIssues(Array.isArray(issuesRes.data) ? issuesRes.data : []);
    } catch (err) {
      console.log(err);
      setError(getErrorMessage(err, "Unable to load issues."));
    } finally {
      setLoading(false);
    }
  }, [fetchSupportingData]);

  useEffect(() => {
    Promise.resolve().then(fetchIssues);
  }, [fetchIssues]);

  const createIssue = useCallback(async (payload) => {
    const response = await api.post("/issues/", payload);
    setIssues((items) => [response.data, ...items]);
    return response.data;
  }, []);

  const updateIssue = useCallback(async (issueId, payload) => {
    const response = await api.patch(`/issues/${issueId}/`, payload);
    setIssues((items) => items.map((issue) => (issue.id === issueId ? response.data : issue)));
    return response.data;
  }, []);

  const fetchProjectTasks = useCallback(async (projectId) => {
    if (!projectId) return [];

    if (!canManageIssues) {
      return workspaceTasks.filter((task) => String(task.project) === String(projectId));
    }

    const response = await api.get(`/tasks/project/${projectId}/?pagination=false`);
    return response.data || [];
  }, [canManageIssues, workspaceTasks]);

  const fetchTaskSubtasks = useCallback(async (taskId) => {
    if (!taskId) return [];

    if (!canManageIssues) {
      return workspaceSubtasks.filter((subtask) => String(subtask.task) === String(taskId));
    }

    const response = await api.get(`/tasks/subtasks/${taskId}/`);
    return response.data || [];
  }, [canManageIssues, workspaceSubtasks]);

  const value = useMemo(
    () => ({
      issues,
      projects,
      teamMembers,
      workspaceTasks,
      workspaceSubtasks,
      loading,
      error,
      canManageIssues,
      createIssue,
      updateIssue,
      fetchIssues,
      fetchProjectTasks,
      fetchTaskSubtasks,
    }),
    [
      canManageIssues,
      error,
      issues,
      loading,
      projects,
      teamMembers,
      workspaceSubtasks,
      workspaceTasks,
      fetchIssues,
      createIssue,
      updateIssue,
      fetchProjectTasks,
      fetchTaskSubtasks,
    ]
  );

  return <IssueContext.Provider value={value}>{children}</IssueContext.Provider>;
}
