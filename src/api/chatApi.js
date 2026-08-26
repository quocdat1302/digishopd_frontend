import { apiClient } from "./client";

export const chatApi = {
  getMyMessages: () => apiClient.get("/chat/my-messages").then((r) => r.data),

  getConversations: () => apiClient.get("/chat/admin/conversations").then((r) => r.data),

  getConversationWithCustomer: (customerId) =>
    apiClient.get(`/chat/admin/conversations/${customerId}`).then((r) => r.data),
};