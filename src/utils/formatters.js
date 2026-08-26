export function formatPrice(price) {
  const safePrice = Number(price || 0);
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(safePrice);
}

export function formatCompactDate(dateLike) {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
  }).format(new Date(dateLike));
}

export function formatDateTime(dateLike) {
  if (!dateLike) return "—";
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dateLike));
}

export function formatDate(dateLike) {
  if (!dateLike) return "—";
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(dateLike));
}

/**
 * Ảnh do backend lưu cục bộ trả về đường dẫn tương đối (vd "/uploads/products/x.jpg"), khác
 * origin với dev server của frontend (localhost:5173 vs backend localhost:8080) nên phải ghép
 * full URL thủ công. Ảnh dán URL ngoài (http/https) thì giữ nguyên.
 */
export function resolveImageUrl(url) {
  if (!url) return url;
  if (/^https?:\/\//i.test(url)) return url;
  const apiBase = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api";
  const origin = apiBase.replace(/\/api\/?$/, "");
  return origin + url;
}

/**
 * Định dạng 1 Date thành "yyyy-MM-dd" theo GIỜ ĐỊA PHƯƠNG của trình duyệt.
 * KHÔNG dùng date.toISOString().slice(0,10) — hàm đó quy đổi sang UTC trước, nên với múi giờ
 * UTC+7 (VN), nửa đêm giờ VN sẽ bị lùi thành 17h chiều hôm trước theo UTC → ngày bị lùi 1 hôm.
 * Đây là nguyên nhân bug đặt thuê/lọc theo ngày bị sai lệch 1 ngày so với ngày người dùng chọn.
 */
export function toLocalIsoDate(date) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Đọc ngược 1 chuỗi "yyyy-MM-dd" thành Date ở NỬA ĐÊM GIỜ ĐỊA PHƯƠNG.
 * KHÔNG dùng new Date("yyyy-MM-dd") trực tiếp — JS coi chuỗi date-only đó là UTC midnight,
 * nên ở múi giờ UTC+7 khi đọc lại bằng getDate()/getMonth() sẽ lệch sang NGÀY HÔM SAU.
 */
export function parseLocalIsoDate(isoString) {
  const [year, month, day] = isoString.split("-").map(Number);
  return new Date(year, month - 1, day);
}