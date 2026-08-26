export const STATUS_LABEL = {
  PENDING: "Chờ xác nhận",
  CONFIRMED: "Đã xác nhận",
  DELIVERING: "Đang giao (mua)",
  COMPLETED: "Hoàn tất",
  CANCELLED: "Đã huỷ",
  RETURN_REQUESTED: "Chờ duyệt đổi trả",
  RENTAL_RETURN_REQUESTED: "Chờ duyệt trả máy",
  RETURNED: "Đã đổi trả",
  // ---- Vòng đời đơn thuê ----
  DEPOSIT_PAID: "Đã đóng cọc",
  DELIVERED: "Đang trong thời gian thuê",
  RENTAL_RETURNED: "Đã trả máy, chờ kiểm tra",
  INSPECTED: "Đã kiểm tra",
  DISPUTED: "Tranh chấp (trừ cọc)",
};

export const STATUS_CLASS = {
  PENDING: "order-status--pending",
  CONFIRMED: "order-status--confirmed",
  DELIVERING: "order-status--delivering",
  COMPLETED: "order-status--completed",
  CANCELLED: "order-status--cancelled",
  RETURN_REQUESTED: "order-status--return",
  RENTAL_RETURN_REQUESTED: "order-status--return",
  RETURNED: "order-status--returned",
  DEPOSIT_PAID: "order-status--deposit",
  DELIVERED: "order-status--delivering",
  RENTAL_RETURNED: "order-status--return",
  INSPECTED: "order-status--confirmed",
  DISPUTED: "order-status--disputed",
};

export const TYPE_LABEL = { PURCHASE: "Mua hàng", RENTAL: "Cho thuê" };

// Màu đặc (không nhạt như badge) dùng cho biểu đồ/thanh lịch — dashboard chart & rental calendar.
export const STATUS_COLOR = {
  PENDING: "#e0a300",
  CONFIRMED: "#2b6cb0",
  DELIVERING: "#792b4a",
  COMPLETED: "#2e7d32",
  CANCELLED: "#b23a2f",
  RETURN_REQUESTED: "#e0a300",
  RENTAL_RETURN_REQUESTED: "#e0a300",
  RETURNED: "#827470",
  DEPOSIT_PAID: "#6b4fa0",
  DELIVERED: "#792b4a",
  RENTAL_RETURNED: "#e0a300",
  INSPECTED: "#2b6cb0",
  DISPUTED: "#b23a2f",
};

/** Các trạng thái thuê còn "chiếm dụng" thiết bị — khớp với ACTIVE_RENTAL_STATUSES phía backend. */
export const ACTIVE_RENTAL_STATUSES = ["PENDING", "CONFIRMED", "DEPOSIT_PAID", "DELIVERED", "RENTAL_RETURN_REQUESTED"];

/**
 * Trạng thái kế tiếp hợp lệ qua API chung PATCH /orders/admin/{id}/status.
 * Khớp với luật ở OrderService#updateOrderStatus phía backend:
 * - Đơn MUA: PENDING -> CONFIRMED -> DELIVERING -> COMPLETED (huỷ được ở 3 bước đầu).
 * - Đơn THUÊ: API chung chỉ cho phép chuyển sang CONFIRMED hoặc CANCELLED; các bước tiếp theo
 *   (cọc, giao máy, trả máy, kiểm tra) phải dùng các API riêng cho quy trình thuê.
 */
export function getGenericNextActions(order) {
  if (order.orderType === "RENTAL") {
    if (order.status === "PENDING") {
      return [
        { value: "CONFIRMED", label: "Xác nhận đơn" },
        { value: "CANCELLED", label: "Huỷ đơn" },
      ];
    }
    if (order.status === "CONFIRMED") {
      return [{ value: "CANCELLED", label: "Huỷ đơn" }];
    }
    return [];
  }

  // Đơn mua
  const map = {
    PENDING: [
      { value: "CONFIRMED", label: "Xác nhận đơn" },
      { value: "CANCELLED", label: "Huỷ đơn" },
    ],
    CONFIRMED: [
      { value: "DELIVERING", label: "Bắt đầu giao hàng" },
      { value: "CANCELLED", label: "Huỷ đơn" },
    ],
    DELIVERING: [
      { value: "COMPLETED", label: "Đánh dấu hoàn tất" },
      { value: "CANCELLED", label: "Huỷ đơn" },
    ],
  };
  return map[order.status] || [];
}