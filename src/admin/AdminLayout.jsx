import { useState } from "react";
import { NavLink, Outlet, Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import NotificationBell from "../components/NotificationBell";
import useDocumentTitle from "../hooks/useDocumentTitle";
import {
  IconDashboard,
  IconCamera,
  IconTag,
  IconOrders,
  IconCalendar,
  IconInventory,
  IconWarning,
  IconPin,
  IconReport,
  IconSupport,
  IconFeedback,
  IconStar,
  IconUser,
} from "./AdminIcons";

const NAV_ITEMS = [
  { to: "/admin/dashboard", label: "Bảng điều khiển", Icon: IconDashboard, adminOnly: true },
  { to: "/admin/products", label: "Sản phẩm", Icon: IconCamera },
  { to: "/admin/categories", label: "Danh mục", Icon: IconTag, adminOnly: true },
  { to: "/admin/orders", label: "Đơn hàng", Icon: IconOrders },
  { to: "/admin/rental-calendar", label: "Lịch thuê", Icon: IconCalendar },
  { to: "/admin/rental-inventory", label: "Tồn kho thuê", Icon: IconInventory },
  { to: "/admin/overdue-rentals", label: "Lịch trễ hạn", Icon: IconWarning },
  { to: "/admin/pickup-locations", label: "Địa điểm nhận máy", Icon: IconPin, adminOnly: true },
  { to: "/admin/reports", label: "Báo cáo", Icon: IconReport, adminOnly: true },
  { to: "/admin/support", label: "Hỗ trợ", Icon: IconSupport, adminOnly: true },
  { to: "/admin/feedback", label: "Feedback", Icon: IconFeedback, adminOnly: true },
  { to: "/admin/reviews", label: "Quản lý đánh giá", Icon: IconStar, adminOnly: true },
  { to: "/admin/users", label: "Người dùng", Icon: IconUser, adminOnly: true },
];

export default function AdminLayout() {
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchTerm, setSearchTerm] = useState("");

  // Nhân viên (STAFF) chỉ thấy Sản phẩm/Đơn hàng/Lịch thuê — không có quyền quản lý người dùng, báo cáo, v.v.
  const visibleNavItems = NAV_ITEMS.filter((item) => isAdmin || !item.adminOnly);

  // Tiêu đề tab theo đúng mục admin đang mở — khớp bằng tiền tố đường dẫn dài nhất
  // (vd "/admin/products/123" vẫn khớp mục "Sản phẩm").
  const activeNavItem = [...NAV_ITEMS].sort((a, b) => b.to.length - a.to.length).find((item) => location.pathname.startsWith(item.to));
  useDocumentTitle(activeNavItem ? `DigiShop Admin — ${activeNavItem.label}` : "DigiShop Admin");

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const q = searchTerm.trim();
    navigate(q ? `/admin/products?q=${encodeURIComponent(q)}` : "/admin/products");
  };

  return (
    <div className="admin2-page">
      <header className="admin2-header">
        <div className="admin2-header__inner">
          <Link to="/admin/dashboard" className="admin2-header__brand">
            <img src="/assets/logoo.png" alt="DigiShop" className="admin2-header__logo" />
            Admin
          </Link>

          <div className="admin2-header__right">
            <form className="admin2-header__search" onSubmit={handleSearchSubmit}>
              <input
                placeholder="Tìm kỷ vật theo tên..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <button type="submit" aria-label="Tìm kiếm">🔍</button>
            </form>
            <NotificationBell orderLinkTo="/admin/orders" />
            <span className="admin2-header__avatar">{user?.name?.[0]?.toUpperCase() || "A"}</span>
          </div>
        </div>
      </header>

      <div className="admin2-body">
        <aside className="admin2-sidebar">
          <nav>
            {visibleNavItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => `admin2-tab ${isActive ? "is-active" : ""}`}
              >
                <item.Icon className="admin2-tab__icon" aria-hidden="true" />
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="admin2-sticky-note">
            <span className="washi-tape tape--rose admin2-sticky-note__tape" aria-hidden="true" />
            <p>"Máy ảnh là công cụ dạy con người cách nhìn thế giới mà không cần máy ảnh."</p>
          </div>

          <Link to="/" className="admin2-sidebar__back">← Về trang chính</Link>
          <button type="button" className="admin2-sidebar__logout" onClick={logout}>
            Đăng xuất
          </button>
        </aside>

        <main className="admin2-canvas">
          <Outlet />
        </main>
      </div>
    </div>
  );
}