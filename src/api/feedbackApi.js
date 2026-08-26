import { apiClient } from "./client";

export const feedbackApi = {
  getTopFeedbacks: () => apiClient.get("/feedbacks").then((r) => r.data),

  getProductFeedbacks: (productId) => apiClient.get(`/feedbacks/products/${productId}`).then((r) => r.data),

  likeFeedback: (id) => apiClient.post(`/feedbacks/${id}/like`),

  unlikeFeedback: (id) => apiClient.delete(`/feedbacks/${id}/like`),

  // ---- Admin: đăng/quản lý feedback ----
  getAllFeedbacksForAdmin: () => apiClient.get("/feedbacks/admin").then((r) => r.data),

  createFeedback: (payload) => apiClient.post("/feedbacks/admin", payload).then((r) => r.data),

  // Đăng 1 đánh giá khách đã gửi (kèm ảnh, xem reviewApi.getAllReviewsForAdmin) lên trang Feedback công khai.
  // payload có thể để trống {} nếu muốn giữ nguyên nội dung khách đã viết.
  publishFromReview: (reviewId, payload = {}) =>
    apiClient.post(`/feedbacks/admin/from-review/${reviewId}`, payload).then((r) => r.data),

  updateFeedbackStatus: (id, status) =>
    apiClient.patch(`/feedbacks/admin/${id}/status`, { status }).then((r) => r.data),

  deleteFeedback: (id) => apiClient.delete(`/feedbacks/admin/${id}`),
};