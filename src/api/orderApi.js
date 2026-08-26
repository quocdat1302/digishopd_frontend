import { apiClient } from "./client";

export const orderApi = {
  checkoutPurchase: (payload) => apiClient.post("/orders/purchase", payload).then((r) => r.data),

  checkoutRental: (payload) => apiClient.post("/orders/rental", payload).then((r) => r.data),

  getMyOrders: (type) => apiClient.get("/orders", { params: type ? { type } : {} }).then((r) => r.data),

  getMyOrder: (orderId) => apiClient.get(`/orders/${orderId}`).then((r) => r.data),

  cancelMyOrder: (orderId) => apiClient.patch(`/orders/${orderId}/cancel`).then((r) => r.data),

  extendRental: (orderId, newEndDate) => apiClient.put(`/orders/${orderId}/extend`, { newEndDate }).then((r) => r.data),

  downloadMyInvoice: (orderId) =>
    apiClient.get(`/orders/${orderId}/invoice`, { responseType: "blob" }).then((r) => r.data),

  // ---- Admin (yêu cầu role ADMIN) ----
  getAllOrdersForAdmin: (type) => apiClient.get("/orders/admin/all", { params: type ? { type } : {} }).then((r) => r.data),

  updateOrderStatus: (orderId, status) => apiClient.patch(`/orders/admin/${orderId}/status`, { status }).then((r) => r.data),

  approveReturn: (orderId) => apiClient.patch(`/orders/admin/${orderId}/return/approve`).then((r) => r.data),

  /** Khách yêu cầu đổi trả — kèm ảnh bằng chứng (hư hỏng/trầy xước...), tuỳ chọn. */
  requestReturn: (orderId, reason, imageUrls) =>
    apiClient.patch(`/orders/${orderId}/return`, { reason, imageUrls }).then((r) => r.data),

  rejectReturn: (orderId, reason) => apiClient.patch(`/orders/admin/${orderId}/return/reject`, { reason }).then((r) => r.data),

  downloadInvoiceAsAdmin: (orderId) =>
    apiClient.get(`/orders/admin/${orderId}/invoice`, { responseType: "blob" }).then((r) => r.data),

  // ---- Quy trình thuê (rental lifecycle): cọc -> giao máy -> trả máy -> kiểm tra -> hoàn/trừ cọc ----
  markDepositPaid: (orderId) => apiClient.patch(`/orders/admin/${orderId}/rental/deposit-paid`).then((r) => r.data),

  markDelivered: (orderId, conditionNote) =>
    apiClient.patch(`/orders/admin/${orderId}/rental/delivered`, { conditionNote }).then((r) => r.data),

  markRentalReturned: (orderId) => apiClient.patch(`/orders/admin/${orderId}/rental/returned`).then((r) => r.data),

  /** Chỉ ghi nhận tình trạng máy (RENTAL_RETURNED -> INSPECTED). Quyết định hoàn/trừ cọc dùng 2 hàm bên dưới. */
  inspectRentalReturn: (orderId, inspectionNote) =>
    apiClient.patch(`/orders/admin/${orderId}/rental/inspect`, { inspectionNote }).then((r) => r.data),

  refundDeposit: (orderId) => apiClient.put(`/orders/admin/${orderId}/rental/deposit/refund`).then((r) => r.data),

  deductDeposit: (orderId, damageAmount, disputeReason) =>
    apiClient.put(`/orders/admin/${orderId}/rental/deposit/deduct`, { damageAmount, disputeReason }).then((r) => r.data),

  getRentalCalendar: (from, to) =>
    apiClient.get("/orders/admin/rental-calendar", { params: { from, to } }).then((r) => r.data),

  /** Tách tồn kho từng sản phẩm: tổng kho / đang giữ chỗ cho thuê tương lai / có thể bán ngay. */
  getStockBreakdown: () => apiClient.get("/orders/admin/stock-breakdown").then((r) => r.data),

  /** Tồn kho thuê tại 1 ngày cụ thể, cho mọi sản phẩm: tổng kho / đang thuê / còn trống / buổi đã đặt. */
  getRentalInventory: (date) => apiClient.get("/orders/admin/rental-inventory", { params: { date } }).then((r) => r.data),


  // ---- Hợp đồng thuê điện tử ----
  getContractPreview: (orderId) => apiClient.get(`/orders/${orderId}/rental-contract/preview`).then((r) => r.data),

  signRentalContract: (orderId, signatureDataUrl) =>
    apiClient.post(`/orders/${orderId}/rental-contract/sign`, { signatureDataUrl }).then((r) => r.data),

  getRentalContract: (orderId) => apiClient.get(`/orders/${orderId}/rental-contract`).then((r) => r.data),

  getRentalContractAsAdmin: (orderId) => apiClient.get(`/orders/admin/${orderId}/rental-contract`).then((r) => r.data),

  /** Lịch trống công khai của 1 sản phẩm — mỗi ngày còn bao nhiêu máy + buổi nào đã bị đặt. */
  getProductAvailability: (productId, from, to) =>
    apiClient.get(`/orders/products/${productId}/availability`, { params: { from, to } }).then((r) => r.data),
};