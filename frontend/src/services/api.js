import axios from "axios";

// Helper to retrieve cookie by name
function getCookie(name) {
  let cookieValue = null;
  if (document.cookie && document.cookie !== "") {
    const cookies = document.cookie.split(";");
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim();
      if (cookie.substring(0, name.length + 1) === name + "=") {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
        break;
      }
    }
  }
  return cookieValue;
}

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  withCredentials: true,
});

const refreshClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  withCredentials: true,
});

// Request interceptors to attach CSRF token
api.interceptors.request.use(
  (config) => {
    const csrfToken = getCookie("csrftoken");
    if (csrfToken) {
      config.headers["X-CSRFToken"] = csrfToken;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

refreshClient.interceptors.request.use(
  (config) => {
    const csrfToken = getCookie("csrftoken");
    if (csrfToken) {
      config.headers["X-CSRFToken"] = csrfToken;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

let refreshRequest = null;

const isProtectedAppPath = () =>
  window.location.pathname.startsWith("/dashboard") ||
  window.location.pathname.startsWith("/workspace") ||
  window.location.pathname.startsWith("/platform");

const refreshAccessToken = () => {
  if (!refreshRequest) {
    refreshRequest = refreshClient
      .post("/auth/refresh/")
      .finally(() => {
        refreshRequest = null;
      });
  }

  return refreshRequest;
};

const shouldRefreshRequest = (requestUrl) =>
  !requestUrl.includes("/auth/me/") ||
  isProtectedAppPath();

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error.response?.status;
    const originalRequest = error.config;
    const requestUrl = originalRequest?.url || "";
    const canRefresh =
      (status === 401 || status === 403) &&
      originalRequest &&
      !originalRequest._retry &&
      !requestUrl.includes("/auth/login/") &&
      !requestUrl.includes("/auth/refresh/") &&
      !requestUrl.includes("/auth/logout/") &&
      shouldRefreshRequest(requestUrl);

    if (canRefresh) {
      originalRequest._retry = true;

      try {
        await refreshAccessToken();
        return api(originalRequest);
      } catch (refreshError) {
        if (isProtectedAppPath()) {
          window.location.href = "/signin";
        }

        return Promise.reject(refreshError);
      }
    }

    if (
      (status === 401 || status === 403) &&
      isProtectedAppPath()
    ) {
      window.location.href = "/signin";
    }

    return Promise.reject(error);
  }
);

export default api;
