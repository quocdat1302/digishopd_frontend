import { apiClient } from "./client";

// Khớp 1-1 với com.khoaluan.digishop.controller.AuthController

export const authApi = {
  getProviders: () => apiClient.get("/auth/providers").then((r) => r.data),

  register: (payload) => apiClient.post("/auth/register", payload).then((r) => r.data),

  login: (payload) => apiClient.post("/auth/login", payload).then((r) => r.data),

  loginWithGoogle: (idToken) => apiClient.post("/auth/google", { idToken }).then((r) => r.data),

  loginWithFacebook: (facebookData) => apiClient.post("/auth/facebook", facebookData).then((r) => r.data),

  verifyOtp: ({ email, otp, purpose }) =>
    apiClient.post("/auth/verify-otp", { email, otp, purpose }).then((r) => r.data),

  resendOtp: ({ email, purpose }) =>
    apiClient.post("/auth/resend-otp", { email, purpose }).then((r) => r.data),

  forgotPassword: (email) => apiClient.post("/auth/forgot-password", { email }).then((r) => r.data),

  // Bước 1/2: xác thực OTP đặt lại mật khẩu -> trả về resetToken tạm (10 phút) trong details.
  verifyResetOtp: ({ email, otp }) =>
    apiClient.post("/auth/verify-reset-otp", { email, otp }).then((r) => r.data),

  // Bước 2/2: đặt mật khẩu mới bằng resetToken lấy từ verifyResetOtp (không cần OTP/email nữa).
  resetPassword: ({ resetToken, newPassword }) =>
    apiClient.post("/auth/reset-password", { resetToken, newPassword }).then((r) => r.data),

  refresh: (refreshToken) => apiClient.post("/auth/refresh", { refreshToken }).then((r) => r.data),

  logout: (refreshToken) => apiClient.post("/auth/logout", { refreshToken }),
};