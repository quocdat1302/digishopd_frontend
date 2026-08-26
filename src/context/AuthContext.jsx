import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { authApi } from "../api/authApi";
import { clearAuth, getStoredAuth, saveAuth, saveUser } from "./authStorage";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => getStoredAuth()?.user || null);

  // apiClient tự xoá phiên (clearAuth) khi refresh token thất bại — việc đó xảy ra ngoài React,
  // nên phải lắng nghe sự kiện để đồng bộ lại state ở đây, nếu không `user` vẫn còn cũ, các trang
  // vẫn tưởng đang đăng nhập và tiếp tục gọi API với token rỗng, lặp lại 401 vô tận (kể cả chat WS).
  useEffect(() => {
    function handleAuthCleared() {
      setUser(null);
    }
    window.addEventListener("digishop:auth-cleared", handleAuthCleared);
    return () => window.removeEventListener("digishop:auth-cleared", handleAuthCleared);
  }, []);

  // Nhận thẳng AuthResponse từ backend (login / register-verify / google) rồi lưu lại.
  const login = useCallback((authResponse, rememberMe = false) => {
    saveAuth(authResponse, rememberMe);
    setUser(authResponse.user);
  }, []);

  const logout = useCallback(async () => {
    const auth = getStoredAuth();
    try {
      if (auth?.refreshToken) {
        await authApi.logout(auth.refreshToken);
      }
    } catch {
      // Kể cả khi gọi API logout lỗi, vẫn xoá phiên cục bộ.
    } finally {
      clearAuth();
      setUser(null);
    }
  }, []);

  // Đồng bộ lại user (vd sau khi sửa hồ sơ / nộp CCCD) mà không cần đăng nhập lại.
  const updateUser = useCallback((updatedUser) => {
    saveUser(updatedUser);
    setUser(updatedUser);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isAdmin: user?.role === "ADMIN",
        isStaff: user?.role === "STAFF",
        isAdminOrStaff: user?.role === "ADMIN" || user?.role === "STAFF",
        login,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth phải được dùng bên trong <AuthProvider>");
  return ctx;
}