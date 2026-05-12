import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:8000/api",
  withCredentials: true,
});

const refreshClient = axios.create({
  baseURL: "http://localhost:8000/api",
  withCredentials: true,
});

let refreshRequest = null;

const isProtectedAppPath = () =>
  window.location.pathname.startsWith(
    "/dashboard"
  ) ||
  window.location.pathname.startsWith(
    "/workspace"
  );

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
      !requestUrl.includes("/auth/logout/");

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
