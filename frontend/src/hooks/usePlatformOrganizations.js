import { useState, useEffect, useMemo } from "react";
import api from "../services/api";

export function usePlatformOrganizations() {
  const [orgs, setOrgs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [togglingId, setTogglingId] = useState(null);
  const [updatingTierId, setUpdatingTierId] = useState(null);
  const [actionMessage, setActionMessage] = useState(null);

  // Workspace details drawer state
  const [selectedOrgId, setSelectedOrgId] = useState(null);
  const [selectedOrgDetails, setSelectedOrgDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [detailsTab, setDetailsTab] = useState("info");

  const fetchOrgs = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get("/platform/organizations/");
      setOrgs(response.data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load organizations.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrgs();
  }, []);

  const fetchOrgDetails = async (orgId) => {
    setLoadingDetails(true);
    try {
      const response = await api.get(`/platform/organizations/${orgId}/`);
      setSelectedOrgDetails(response.data);
    } catch (err) {
      console.error("Failed to load organization details:", err);
      setActionMessage({
        type: "error",
        text: err.response?.data?.message || "Failed to load workspace details."
      });
      setTimeout(() => setActionMessage(null), 5000);
      setSelectedOrgId(null);
    } finally {
      setLoadingDetails(false);
    }
  };

  useEffect(() => {
    if (selectedOrgId) {
      fetchOrgDetails(selectedOrgId);
      setDetailsTab("info");
    } else {
      setSelectedOrgDetails(null);
    }
  }, [selectedOrgId]);

  const handleToggleStatus = async (orgId, currentStatus, orgName) => {
    setTogglingId(orgId);
    setActionMessage(null);
    try {
      const response = await api.post(`/platform/organizations/${orgId}/toggle/`);
      const updatedOrg = response.data;
      
      // Update local state
      setOrgs(prevOrgs => 
        prevOrgs.map(org => 
          org.id === orgId ? { ...org, is_active: updatedOrg.is_active } : org
        )
      );

      setActionMessage({
        type: "success",
        text: `Workspace "${orgName}" has been successfully ${updatedOrg.is_active ? "activated" : "deactivated"}.`
      });

      // Clear action message after 4 seconds
      setTimeout(() => setActionMessage(null), 4000);
    } catch (err) {
      setActionMessage({
        type: "error",
        text: err.response?.data?.message || `Failed to toggle status for ${orgName}.`
      });
      setTimeout(() => setActionMessage(null), 5000);
    } finally {
      setTogglingId(null);
    }
  };

  const handleUpdateTier = async (orgId, nextTier, orgName) => {
    setUpdatingTierId(orgId);
    setActionMessage(null);
    try {
      await api.post(`/platform/organizations/${orgId}/tier/`, { tier: nextTier });
      
      // Update local state
      setOrgs(prevOrgs => 
        prevOrgs.map(org => 
          org.id === orgId ? { ...org, subscription_tier: nextTier } : org
        )
      );

      setActionMessage({
        type: "success",
        text: `Workspace "${orgName}" subscription tier updated to ${nextTier.toUpperCase()}`
      });

      setTimeout(() => setActionMessage(null), 4000);
    } catch (err) {
      setActionMessage({
        type: "error",
        text: err.response?.data?.message || `Failed to change subscription tier for ${orgName}.`
      });
      setTimeout(() => setActionMessage(null), 5000);
    } finally {
      setUpdatingTierId(null);
    }
  };

  // Filter organizations using useMemo
  const filteredOrgs = useMemo(() => {
    return orgs.filter(org => {
      const matchesSearch = 
        org.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        org.company_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (org.email && org.email.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStatus = 
        statusFilter === "all" ? true :
        statusFilter === "active" ? org.is_active === true :
        org.is_active === false;

      return matchesSearch && matchesStatus;
    });
  }, [orgs, searchQuery, statusFilter]);

  return {
    orgs,
    loading,
    error,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    togglingId,
    updatingTierId,
    actionMessage,
    setActionMessage,
    selectedOrgId,
    setSelectedOrgId,
    selectedOrgDetails,
    loadingDetails,
    detailsTab,
    setDetailsTab,
    fetchOrgs,
    handleToggleStatus,
    handleUpdateTier,
    filteredOrgs
  };
}
