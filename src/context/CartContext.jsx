import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { cartApi } from "../api/cartApi";
import { toApiError } from "../api/client";
import { useAuth } from "./AuthContext";

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(false);
  const [miniCartOpen, setMiniCartOpen] = useState(false);

  const openMiniCart = useCallback(() => setMiniCartOpen(true), []);
  const closeMiniCart = useCallback(() => setMiniCartOpen(false), []);

  const refreshCart = useCallback(async () => {
    if (!isAuthenticated) {
      setCart(null);
      return null;
    }
    setLoading(true);
    try {
      const data = await cartApi.getCart();
      setCart(data);
      return data;
    } catch (err) {
      // Người dùng chưa đăng nhập / lỗi mạng: không chặn UI, chỉ để badge = 0.
      setCart(null);
      throw toApiError(err);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      refreshCart().catch(() => {});
    } else {
      setCart(null);
    }
  }, [isAuthenticated, refreshCart]);

  const addToCart = useCallback(
    async (payload) => {
      const data = await cartApi.addToCart(payload);
      setCart(data);
      return data;
    },
    []
  );

  const updateCartItem = useCallback(async (itemId, payload) => {
    const data = await cartApi.updateCartItem(itemId, payload);
    setCart(data);
    return data;
  }, []);

  const removeCartItem = useCallback(async (itemId) => {
    const data = await cartApi.removeCartItem(itemId);
    setCart(data);
    return data;
  }, []);

  const clearCart = useCallback(async () => {
    await cartApi.clearCart();
    setCart(null);
  }, []);

  const itemCount = cart?.totalItems ?? 0;

  return (
    <CartContext.Provider
      value={{
        cart,
        itemCount,
        loading,
        refreshCart,
        addToCart,
        updateCartItem,
        removeCartItem,
        clearCart,
        miniCartOpen,
        openMiniCart,
        closeMiniCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart phải được dùng bên trong <CartProvider>");
  return ctx;
}