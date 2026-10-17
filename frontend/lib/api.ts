import axios from "axios";
import { trackStart, trackEnd } from "@/components/ui/global-loader";

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080",
});

api.interceptors.request.use((cfg) => {
  if (typeof window !== "undefined") {
    const t = localStorage.getItem("token");
    if (t) cfg.headers.Authorization = `Bearer ${t}`;
  }
  // Don't show the global indicator for background polls.
  if (!(cfg as any).silent) trackStart();
  return cfg;
});

api.interceptors.response.use(
  (r) => {
    if (!(r.config as any).silent) trackEnd();
    return r;
  },
  (err) => {
    if (!(err?.config as any)?.silent) trackEnd();
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
