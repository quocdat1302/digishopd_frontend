import { apiClient } from "./client";

export const productApi = {
  getAllProducts: () => apiClient.get("/products").then((r) => r.data),

  getHotProducts: () => apiClient.get("/products/hot").then((r) => r.data),

  getNewProducts: () => apiClient.get("/products/new").then((r) => r.data),

  getLatestProducts: () => apiClient.get("/products/latest").then((r) => r.data),

  getProductsByBrand: (brand) => apiClient.get(`/products/brand/${brand}`).then((r) => r.data),

  getProductsByType: (type) => apiClient.get(`/products/type/${type}`).then((r) => r.data),

  getProductById: (id) => apiClient.get(`/products/${id}`).then((r) => r.data),

  // ---- Admin (yêu cầu role ADMIN) ----
  getAllProductsForAdmin: () => apiClient.get("/products/admin/all").then((r) => r.data),

  createProduct: (payload) => apiClient.post("/products/admin", payload).then((r) => r.data),

  updateProduct: (id, payload) => apiClient.put(`/products/admin/${id}`, payload).then((r) => r.data),

  deleteProduct: (id) => apiClient.delete(`/products/admin/${id}`),

  reorderProducts: (orderedIds) =>
    apiClient.put("/products/admin/reorder", { orderedIds }).then((r) => r.data),

  uploadProductImage: (id, file) => {
    const formData = new FormData();
    formData.append("file", file);
    return apiClient
      .post(`/products/admin/${id}/images`, formData, { headers: { "Content-Type": "multipart/form-data" } })
      .then((r) => r.data);
  },

  // ---- Ảnh mẫu chụp bằng máy (feedback khách) ----
  getSamplePhotos: (id) => apiClient.get(`/products/${id}/sample-photos`).then((r) => r.data),

  addSamplePhoto: (id, payload) => apiClient.post(`/products/admin/${id}/sample-photos`, payload).then((r) => r.data),

  deleteSamplePhoto: (photoId) => apiClient.delete(`/products/admin/sample-photos/${photoId}`),

  // ---- Phụ kiện bổ sung khi thuê (đi kèm miễn phí hoặc trả thêm) ----
  getAddons: (id) => apiClient.get(`/products/${id}/addons`).then((r) => r.data),

  addAddon: (id, payload) => apiClient.post(`/products/admin/${id}/addons`, payload).then((r) => r.data),

  deleteAddon: (addonId) => apiClient.delete(`/products/admin/addons/${addonId}`),
};
