import axios from "axios";
import { getStoredAuth, saveTokens, clearAuth } from "../context/authStorage";

const baseURL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api";

export const apiClient = axios.create({ baseURL });

/**
 * Upload 1 file ảnh chung, không cần entity đã có ID (dùng khi đang tạo mới sản phẩm/danh mục,
 * chưa lưu). Trả về URL public để gắn vào form trước khi submit.
 */
export async function uploadImage(file) {
  const formData = new FormData();
  formData.append("file", file);
  const res = await apiClient.post("/uploads/image", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data.url;
}

// Gắn access token vào mọi request (trừ các endpoint auth công khai, không hại gì khi vẫn gắn).
apiClient.interceptors.request.use((config) => {
  const auth = getStoredAuth();
  if (auth?.accessToken) {
    config.headers.Authorization = `Bearer ${auth.accessToken}`;
  }
  return config;
});

let refreshPromise = null;

// Tự động làm mới access token khi gặp 401, dùng refreshToken đã lưu (rotate token).
apiClient.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    const status = error.response?.status;
    const isAuthEndpoint = original?.url?.includes("/auth/login") || original?.url?.includes("/auth/refresh");

    if (status === 401 && !original._retry && !isAuthEndpoint) {
      original._retry = true;
      const auth = getStoredAuth();
      if (!auth?.refreshToken) {
        clearAuth();
        return Promise.reject(error);
      }
      try {
        if (!refreshPromise) {
          refreshPromise = axios
            .post(`${baseURL}/auth/refresh`, { refreshToken: auth.refreshToken })
            .then((res) => res.data)
            .finally(() => {
              refreshPromise = null;
            });
        }
        const data = await refreshPromise;
        saveTokens(data, auth.rememberMe);
        original.headers.Authorization = `Bearer ${data.accessToken}`;
        return apiClient(original);
      } catch (refreshError) {
        clearAuth();
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

/**
 * Chuẩn hoá lỗi trả về từ GlobalExceptionHandler (ApiErrorResponse) thành
 * một object dễ dùng ở UI: { code, message, details }.
 */
export function toApiError(error) {
  if (error.response?.data) {
    const { code, message, details } = error.response.data;
    return { code: code || "UNKNOWN", message: message || "Đã có lỗi xảy ra.", details: details || null };
  }
  if (error.request) {
    return { code: "NETWORK_ERROR", message: "Không thể kết nối tới máy chủ. Kiểm tra lại backend đang chạy chưa.", details: null };
  }
  return { code: "UNKNOWN", message: error.message || "Đã có lỗi xảy ra.", details: null };
}