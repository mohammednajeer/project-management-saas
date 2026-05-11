import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import api from "../services/api";
import NotificationContext from "./notificationContext";

export default function NotificationProvider({
  children,
}) {
  const [notifications,
    setNotifications
  ] = useState([]);

  const [loading,
    setLoading
  ] = useState(true);

  const fetchNotifications =
    useCallback(async () => {
      
      try {

        const res =
          await api.get(
            "/notifications/"
          );

        setNotifications(
          res.data
        );

      } catch (err) {

        console.log(err);

      } finally {

        setLoading(false);
      }
    }, []);

  const markAsRead =
    useCallback(
      async (notificationId) => {

        setNotifications((prev) =>
          prev.map((item) =>
            item.id === notificationId
              ? {
                  ...item,
                  is_read: true,
                }
              : item
          )
        );

        try {

          await api.patch(
            `/notifications/${notificationId}/read/`
          );

        } catch (err) {

          console.log(err);
          fetchNotifications();
        }
      },
      [fetchNotifications]
    );

  useEffect(() => {

    const timeoutId =
      window.setTimeout(
        fetchNotifications,
        0
      );

    const intervalId =
      window.setInterval(
        fetchNotifications,
        10000
      );

    return () => {

      window.clearTimeout(
        timeoutId
      );

      window.clearInterval(
        intervalId
      );
    };

  }, [fetchNotifications]);

  const unreadCount =
    useMemo(
      () =>
        notifications.filter(
          (notification) =>
            !notification.is_read
        ).length,
      [notifications]
    );

  const value =
    useMemo(
      () => ({
        notifications,
        loading,
        unreadCount,
        fetchNotifications,
        markAsRead,
      }),
      [
        fetchNotifications,
        loading,
        markAsRead,
        notifications,
        unreadCount,
      ]
    );

  return (
    <NotificationContext.Provider
      value={value}
    >
      {children}
    </NotificationContext.Provider>
  );
}
