import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:8000/api",
  withCredentials: true,
});
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // 🔥 auto redirect if session expired
      window.location.href = "/signin";
    }
    return Promise.reject(error);
  }
);

export default api;
