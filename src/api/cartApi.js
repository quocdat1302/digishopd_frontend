import { apiClient } from "./client";

export const cartApi = {
  getCart: () => apiClient.get("/cart").then((r) => r.data),

  addToCart: ({ productId, orderType, quantity = 1, rentalStartDate, rentalEndDate }) =>
    apiClient
      .post("/cart/items", {
        productId,
        orderType,
        quantity,
        rentalStartDate: rentalStartDate || null,
        rentalEndDate: rentalEndDate || null,
      })
      .then((r) => r.data),

  updateCartItem: (itemId, { quantity, rentalStartDate, rentalEndDate }) =>
    apiClient
      .put(`/cart/items/${itemId}`, {
        quantity: quantity ?? null,
        rentalStartDate: rentalStartDate || null,
        rentalEndDate: rentalEndDate || null,
      })
      .then((r) => r.data),

  removeCartItem: (itemId) => apiClient.delete(`/cart/items/${itemId}`).then((r) => r.data),

  clearCart: () => apiClient.delete("/cart"),
};