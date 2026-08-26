import { apiClient } from "./client";

export const promotionApi = {
  getActivePromotions: () => apiClient.get("/promotions/active").then((r) => r.data),

  getAllActivePromotions: () => apiClient.get("/promotions").then((r) => r.data),
};
