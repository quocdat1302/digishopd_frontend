import { apiClient } from "./client";

export const userApi = {
  getMyProfile: () => apiClient.get("/users/me").then((r) => r.data),

  updateMyProfile: (payload) => apiClient.put("/users/me", payload).then((r) => r.data),

  verifyId: (payload) => apiClient.post("/users/me/verify-id", payload).then((r) => r.data),

  // ---- Admin ----
  listUsers: ({ role, status, keyword, page = 0, size = 20 } = {}) =>
    apiClient
      .get("/admin/users", { params: { role: role || undefined, status: status || undefined, keyword: keyword || undefined, page, size } })
      .then((r) => r.data),

  updateUserRole: (userId, role) => apiClient.put(`/admin/users/${userId}/role`, { role }).then((r) => r.data),
};