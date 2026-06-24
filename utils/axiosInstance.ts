import axios from "axios";
import Cookies from "js-cookie";

const axiosInstance = axios.create({
  // Relative baseURL keeps every request same-origin as the app, so the Supabase
  // sb-* session cookies stay first-party and no CORS handling is needed. A
  // hardcoded absolute URL breaks login on any other host (custom domain, www,
  // preview/canonical Vercel URLs) because the cookies land on the wrong domain.
  baseURL: "/api",
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true, // Ensure cookies are sent with requests
});

axiosInstance.interceptors.request.use((config) => {
  const token = Cookies.get("session_id");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default axiosInstance;
