import axios from "axios";

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080",
});

api.interceptors.request.use((cfg) => {
  if (typeof window !== "undefined") {
    const t = localStorage.getItem("token");
    if (t) cfg.headers.Authorization = `Bearer ${t}`;
  }
  return cfg;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err?.response?.status === 401 && typeof window !== "undefined") {
      localStorage.clear();
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

export type Me = {
  id: number; email: string; fullName: string;
  role: "OWNER" | "TENANT" | "MANAGER" | "ACCOUNTANT";
  orgId: number; apartmentId: number; googleConnected: boolean;
};

export const getMe = (): Me | null => {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem("me");
  return raw ? JSON.parse(raw) : null;
};
