import {
  useEffect,
  useState,
} from "react";

import api from "../../services/api";

import "./Notifications.css";

export default function Notifications() {

  const [notifications,
    setNotifications
  ] = useState([]);

  const [loading,
    setLoading
  ] = useState(true);

  useEffect(() => {

    fetchNotifications();

  }, []);

  const fetchNotifications =
    async () => {

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
    };

  const markAsRead =
    async (notificationId) => {

      try {

        await api.patch(
          `/notifications/${notificationId}/read/`
        );

        setNotifications((prev) =>
          prev.map(
            (notification) => {

              if (
                notification.id ===
                notificationId
              ) {

                return {
                  ...notification,
                  is_read: true,
                };
              }

              return notification;
            }
          )
        );

        window.dispatchEvent(
          new Event(
            "notificationsUpdated"
          )
        );

      } catch (err) {

        console.log(err);
      }
    };

  if (loading) {

    return (

      <div className="notifications-page">

        Loading notifications...

      </div>
    );
  }

  return (

    <div className="notifications-page">

      <div className="notifications-header">

        <h1>
          Notifications
        </h1>

        <p>
          Stay updated with
          project activity
        </p>

      </div>

      <div className="notifications-list">

        {notifications.length === 0 ? (

          <div className="notifications-empty">

            No notifications yet.

          </div>

        ) : (

          notifications.map(
            (notification) => (

              <div
                key={notification.id}
                onClick={() =>
                  markAsRead(
                    notification.id
                  )
                }
                className={`notification-card ${
                  notification.is_read
                    ? ""
                    : "unread"
                }`}
              >

                <div className="notification-top">

                  <h3>
                    {notification.title}
                  </h3>

                  {!notification.is_read && (

                    <span className="notification-dot" />

                  )}

                </div>

                <p>
                  {notification.message}
                </p>

                <span className="notification-time">

                  {new Date(
                    notification.created_at
                  ).toLocaleString()}

                </span>

              </div>
            )
          )
        )}

      </div>

    </div>
  );
}