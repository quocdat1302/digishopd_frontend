import { apiClient } from "./client";

export const reviewApi = {
  getReviews: (productId) => apiClient.get(`/products/${productId}/reviews`).then((r) => r.data),

  createReview: (productId, payload) =>
    apiClient.post(`/products/${productId}/reviews`, payload).then((r) => r.data),

  // ---- Admin: "Quản lý đánh giá" — xem tất cả đánh giá (cả mua lẫn thuê) kèm ảnh khách gửi ----
  getAllReviewsForAdmin: () => apiClient.get("/admin/reviews").then((r) => r.data),

  deleteReview: (id) => apiClient.delete(`/admin/reviews/${id}`),
};