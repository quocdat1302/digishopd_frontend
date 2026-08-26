import { apiClient } from "./client";

export const categoryApi = {
  getAllCategories: () => apiClient.get("/categories").then((r) => r.data),

  getBrands: () => apiClient.get("/categories/brands").then((r) => r.data),

  getProductTypes: () => apiClient.get("/categories/types").then((r) => r.data),

  // ---- Admin (yêu cầu role ADMIN) ----
  createCategory: (payload) => apiClient.post("/categories/admin", payload).then((r) => r.data),

  updateCategory: (id, payload) => apiClient.put(`/categories/admin/${id}`, payload).then((r) => r.data),

  deleteCategory: (id) => apiClient.delete(`/categories/admin/${id}`),
};