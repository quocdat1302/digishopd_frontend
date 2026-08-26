import { Outlet } from "react-router-dom";

/**
 * Layout gọn cho trang Đăng ký — không có panel video bên trái (khác AuthLayout).
 * Form đăng ký dài hơn nhiều so với đăng nhập (thêm field SĐT, xác nhận mật khẩu, điều khoản...),
 * nếu dùng chung AuthLayout thì panel video (cao cố định 100vh) sẽ bị "trôi" khỏi màn hình khi
 * cuộn form dài xuống, nhìn như lỗi hiển thị. Nên đăng ký dùng layout riêng: form căn giữa trang.
 */
export default function SimpleAuthLayout() {
  return (
    <div className="simple-auth-shell">
      <div className="form-panel">
        <div className="form-card auth-card">
          <Outlet />
        </div>
      </div>
    </div>
  );
}