import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
});

export const customerApi = {
  getAll: (params) => api.get("/customers", { params }),
  getById: (id) => api.get(`/customers/${id}`),
  create: (data) => api.post("/customers", data),
  update: (id, data) => api.put(`/customers/${id}`, data),
  updateStatus: (id, data) => api.patch(`/customers/${id}/status`, data),
  delete: (id) => api.delete(`/customers/${id}`),
};

export const dashboardApi = {
  summary: () => api.get("/dashboard/summary"),
  byStatus: () => api.get("/dashboard/by-status"),
  byService: () => api.get("/dashboard/by-service"),
  byProvince: () => api.get("/dashboard/by-province"),
};