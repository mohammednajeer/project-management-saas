import { useState, useEffect, useCallback } from "react";
import api from "../services/api";

export function usePlatformUsers() {
  const [usersList, setUsersList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  
  // Pagination states
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  
  // Modal states for selected user details
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedOrgDetails, setSelectedOrgDetails] = useState(null);
  const [loadingOrg, setLoadingOrg] = useState(false);
  const [showColleagues, setShowColleagues] = useState(false);

  // Reset page to 1 when filters or search change
  useEffect(() => {
    setPage(1);
  }, [searchQuery, roleFilter]);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get("/platform/users/", {
        params: {
          search: searchQuery,
          role: roleFilter,
          page: page
        }
      });
      
      const data = response.data;
      if (data && data.results !== undefined) {
        setUsersList(data.results);
        setTotalCount(data.count);
        setTotalPages(Math.ceil(data.count / 10));
      } else {
        setUsersList(data);
        setTotalCount(data.length);
        setTotalPages(1);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to retrieve users directory.");
    } finally {
      setLoading(false);
    }
  }, [searchQuery, roleFilter, page]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Fetch organization profile details when user is selected
  const handleSelectUser = async (user) => {
    setSelectedUser(user);
    setShowColleagues(false);
    if (!user.organization_id) {
      setSelectedOrgDetails(null);
      return;
    }

    setLoadingOrg(true);
    try {
      const response = await api.get(`/platform/organizations/${user.organization_id}/`);
      setSelectedOrgDetails(response.data);
    } catch (err) {
      console.error("Failed to load organization profile for user:", err);
      setSelectedOrgDetails(null);
    } finally {
      setLoadingOrg(false);
    }
  };

  const getRoleLabel = (role) => {
    switch (role) {
      case "platform_admin": return "Platform Administrator";
      case "admin": return "Workspace Owner";
      case "manager": return "Manager";
      case "employee": return "Employee";
      default: return role;
    }
  };

  return {
    usersList,
    loading,
    error,
    searchQuery,
    setSearchQuery,
    roleFilter,
    setRoleFilter,
    page,
    setPage,
    totalCount,
    totalPages,
    selectedUser,
    setSelectedUser,
    selectedOrgDetails,
    loadingOrg,
    showColleagues,
    setShowColleagues,
    fetchUsers,
    handleSelectUser,
    getRoleLabel
  };
}

