import { apiClient } from "./client";

export const wishlistApi = {
  getLikedProductIds: () => apiClient.get("/wishlist/product-ids").then((r) => r.data),

  getWishlist: () => apiClient.get("/wishlist").then((r) => r.data),

  addToWishlist: (productId) => apiClient.post(`/wishlist/${productId}`),

  removeFromWishlist: (productId) => apiClient.delete(`/wishlist/${productId}`),

  toggleWishlist: (productId) => apiClient.post(`/wishlist/${productId}/toggle`).then((r) => r.data),
};
