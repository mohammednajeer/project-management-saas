import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useRef,
} from "react";

import api from "../services/api";
import NotificationContext from "./notificationContext";

export default function NotificationProvider({  children,}) {
  const [notifications, setNotifications] = useState([]);

  const [loading, setLoading] = useState(true);
  const socketRef = useRef(null);

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

    fetchNotifications();

    if (socketRef.current) {
      return;
    }

    const protocol =
      window.location.protocol === "https:"
        ? "wss"
        : "ws";

    const socket = new WebSocket(
      `${protocol}://localhost:8000/ws/notifications/`
    );

    socketRef.current = socket;

    socket.onopen = () => {

      console.log(
        "WebSocket connected"
      );
    };

    socket.onmessage = (event) => {

      const data = JSON.parse(
        event.data
      );

      setNotifications((prev) => [

        data,

        ...prev.filter(
          (item) =>
            item.id !== data.id
        ),
      ]);
    };

    socket.onerror = (error) => {

      console.log(
        "WebSocket error:",
        error
      );
    };

    socket.onclose = () => {

      console.log(
        "WebSocket disconnected"
      );

      socketRef.current = null;
    };

    return () => {

      socket.close();
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
