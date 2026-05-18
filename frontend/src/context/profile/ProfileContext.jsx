import { useCallback, useMemo, useState } from "react";
import api from "../../services/api";
import { useAuth } from "../AuthContext";
import { ProfileContext } from "./ProfileContextCore";

export function ProfileProvider({ children }) {
  const { user, loading, refreshUser, updateUser } = useAuth();
  const [saving, setSaving] = useState(false);

  const refreshProfile = useCallback(async () => {
    const profile = await refreshUser();
    return profile;
  }, [refreshUser]);

  const updateProfile = useCallback(
    async (formData, onUploadProgress) => {
      setSaving(true);

      try {
        const response = await api.patch("/auth/profile/", formData, {
          headers: { "Content-Type": "multipart/form-data" },
          onUploadProgress,
        });

        updateUser(response.data);
        return response.data;
      } finally {
        setSaving(false);
      }
    },
    [updateUser]
  );

  const value = useMemo(
    () => ({
      profile: user,
      loading,
      saving,
      refreshProfile,
      updateProfile,
    }),
    [loading, refreshProfile, saving, updateProfile, user]
  );

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}
