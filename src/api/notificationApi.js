import { apiClient } from "./client";

export const notificationApi = {
  getMyNotifications: () => apiClient.get("/notifications").then((r) => r.data),

  getUnreadCount: () => apiClient.get("/notifications/unread-count").then((r) => r.data.count),

  markRead: (id) => apiClient.put(`/notifications/${id}/read`).then((r) => r.data),

  markAllRead: () => apiClient.put("/notifications/read-all"),

  // ---- Admin ----
  sendFromAdmin: (targetUserId, title, message) =>
    apiClient.post("/admin/notifications", { targetUserId, title, message }).then((r) => r.data),
};