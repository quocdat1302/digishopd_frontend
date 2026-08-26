const KEY = "digishop_auth";

/**
 * "Ghi nhớ đăng nhập" -> lưu ở localStorage (còn sau khi đóng trình duyệt).
 * Không tick -> lưu ở sessionStorage (mất khi đóng tab), an toàn hơn trên máy dùng chung.
 */
export function saveAuth({ accessToken, refreshToken, user }, rememberMe) {
  const payload = JSON.stringify({ accessToken, refreshToken, user, rememberMe });
  if (rememberMe) {
    localStorage.setItem(KEY, payload);
    sessionStorage.removeItem(KEY);
  } else {
    sessionStorage.setItem(KEY, payload);
    localStorage.removeItem(KEY);
  }
}

export function saveTokens({ accessToken, refreshToken }, rememberMe) {
  const current = getStoredAuth();
  saveAuth({ accessToken, refreshToken, user: current?.user }, rememberMe ?? current?.rememberMe ?? false);
}

/** Cập nhật lại object user đã lưu (vd sau khi sửa hồ sơ) mà không đụng tới token. */
export function saveUser(user) {
  const current = getStoredAuth();
  if (!current) return;
  saveAuth({ accessToken: current.accessToken, refreshToken: current.refreshToken, user }, current.rememberMe ?? false);
}

export function getStoredAuth() {
  const raw = localStorage.getItem(KEY) || sessionStorage.getItem(KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function clearAuth() {
  localStorage.removeItem(KEY);
  sessionStorage.removeItem(KEY);
  // apiClient (client.js) gọi clearAuth() từ response interceptor khi refresh token thất bại —
  // chỗ đó nằm NGOÀI cây React nên không tự cập nhật được state `user` trong AuthContext.
  // Không phát sự kiện này thì AuthContext vẫn tưởng đang đăng nhập (user cũ còn trong state),
  // khiến các request tiếp theo cứ gửi token rỗng/hỏng, lặp lại 401 vô tận (kể cả STOMP chat).
  window.dispatchEvent(new Event("digishop:auth-cleared"));
}