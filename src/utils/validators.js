// Các quy tắc này phản chiếu đúng validation phía backend (RegisterRequest, ResetPasswordRequest)
// để báo lỗi ngay trên client trước khi gọi API, giảm round-trip không cần thiết.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_RE = /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/;

export function validateEmail(email) {
  if (!email) return "Vui lòng nhập email";
  if (!EMAIL_RE.test(email)) return "Email không hợp lệ";
  return null;
}

export function validatePassword(password) {
  if (!password) return "Vui lòng nhập mật khẩu";
  if (password.length < 8) return "Mật khẩu tối thiểu 8 ký tự";
  if (!PASSWORD_RE.test(password)) return "Mật khẩu cần chữ hoa, số và ký tự đặc biệt";
  return null;
}

export function validateConfirmPassword(password, confirmPassword) {
  if (!confirmPassword) return "Vui lòng nhập lại mật khẩu";
  if (password !== confirmPassword) return "Mật khẩu xác nhận không khớp";
  return null;
}

export function validateRequired(value, message) {
  if (!value || !String(value).trim()) return message;
  return null;
}
