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
        if (
          window.location.pathname.startsWith(
            "/dashboard"
          )
        ) {
          window.location.href = "/signin";
        }

        return Promise.reject(refreshError);
      }
    }

    if (
      (status === 401 || status === 403) &&
      window.location.pathname.startsWith(
        "/dashboard"
      )
    ) {
      window.location.href = "/signin";
    }

    return Promise.reject(error);
  }
);

export default api;
