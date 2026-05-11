import useNotifications from "../../context/useNotifications";

import "./Notifications.css";

export default function Notifications() {

  const {
    notifications,
    loading,
    markAsRead,
  } = useNotifications();

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
                  !notification.is_read &&
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
