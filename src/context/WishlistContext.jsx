import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { wishlistApi } from "../api/wishlistApi";
import { useAuth } from "./AuthContext";

const WishlistContext = createContext(null);

export function WishlistProvider({ children }) {
  const { isAuthenticated } = useAuth();
  // Set các productId đang được thích — dùng Set để tra cứu O(1) khi render tim trên từng thẻ sản phẩm.
  const [likedIds, setLikedIds] = useState(new Set());
  const [loading, setLoading] = useState(false);

  const refreshWishlist = useCallback(async () => {
    if (!isAuthenticated) {
      setLikedIds(new Set());
      return;
    }
    setLoading(true);
    try {
      const ids = await wishlistApi.getLikedProductIds();
      setLikedIds(new Set(ids));
    } catch {
      setLikedIds(new Set());
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    refreshWishlist();
  }, [refreshWishlist]);

  const isLiked = useCallback((productId) => likedIds.has(productId), [likedIds]);

  /** Bật/tắt yêu thích 1 sản phẩm. Cập nhật UI ngay (optimistic), rollback nếu API lỗi. */
  const toggleLike = useCallback(
    async (productId) => {
      const wasLiked = likedIds.has(productId);
      setLikedIds((prev) => {
        const next = new Set(prev);
        if (wasLiked) next.delete(productId);
        else next.add(productId);
        return next;
      });
      try {
        const { liked } = await wishlistApi.toggleWishlist(productId);
        setLikedIds((prev) => {
          const next = new Set(prev);
          if (liked) next.add(productId);
          else next.delete(productId);
          return next;
        });
        return liked;
      } catch (err) {
        // Rollback nếu gọi API thất bại (vd hết hạn đăng nhập)
        setLikedIds((prev) => {
          const next = new Set(prev);
          if (wasLiked) next.add(productId);
          else next.delete(productId);
          return next;
        });
        throw err;
      }
    },
    [likedIds]
  );

  return (
    <WishlistContext.Provider value={{ likedIds, isLiked, toggleLike, loading, refreshWishlist }}>
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error("useWishlist phải được dùng bên trong <WishlistProvider>");
  return ctx;
}
