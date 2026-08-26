import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { categoryApi } from "../api/categoryApi";
import NotificationBell from "./NotificationBell";
import MiniCartPopover from "./MiniCartPopover";
import { resolveImageUrl } from "../utils/formatters";
import "../mini-cart-popover.css";

export default function NavBar() {
  const { user, isAdmin, isAdminOrStaff, logout } = useAuth();
  const { itemCount, miniCartOpen, closeMiniCart } = useCart();
  const navigate = useNavigate();
  const [keyword, setKeyword] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const catalogRef = useRef(null);
  const cartRef = useRef(null);
  const [brands, setBrands] = useState([]);
  const [types, setTypes] = useState([]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
      if (catalogRef.current && !catalogRef.current.contains(e.target)) setCatalogOpen(false);
      if (cartRef.current && !cartRef.current.contains(e.target)) closeMiniCart();
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [closeMiniCart]);

  useEffect(() => {
    categoryApi.getBrands().then(setBrands).catch(() => {});
    categoryApi.getProductTypes().then(setTypes).catch(() => {});
  }, []);

  const handleLogout = async () => {
    setMenuOpen(false);
    await logout();
    navigate("/login");
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const query = keyword.trim();
    navigate(query ? `/products?keyword=${encodeURIComponent(query)}` : "/products");
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-brand">
          <img src="/assets/logoo.png" alt="DigiShop" className="navbar-brand__logo" />
        </Link>

        <div className="navbar-menu">
          <Link to="/" className="navbar-link">Cửa hàng</Link>
          <Link to="/products?transactionType=rent" className="navbar-link">Thuê máy</Link>
          <Link to="/products?transactionType=buy" className="navbar-link">Mua máy</Link>

          <div className="navbar-dropdown" ref={catalogRef}>
            <button
              type="button"
              className="navbar-link navbar-dropdown__trigger"
              onClick={() => setCatalogOpen((v) => !v)}
            >
              Bộ sưu tập <span aria-hidden="true">{catalogOpen ? "▲" : "▼"}</span>
            </button>
            {catalogOpen && (
              <div className="navbar-dropdown__panel">
                <div className="navbar-dropdown__col">
                  <span className="navbar-dropdown__heading">Theo hãng</span>
                  {brands.map((b) => (
                    <Link key={b.id} to={`/products?brand=${encodeURIComponent(b.name)}`} onClick={() => setCatalogOpen(false)}>
                      {b.name} <em>({b.productCount})</em>
                    </Link>
                  ))}
                </div>
                <div className="navbar-dropdown__col">
                  <span className="navbar-dropdown__heading">Theo loại máy</span>
                  {types.map((t) => (
                    <Link key={t.id} to={`/products?type=${encodeURIComponent(t.name)}`} onClick={() => setCatalogOpen(false)}>
                      {t.name} <em>({t.productCount})</em>
                    </Link>
                  ))}
                </div>
                <div className="navbar-dropdown__col">
                  <Link to="/products" className="navbar-dropdown__all" onClick={() => setCatalogOpen(false)}>
                    Xem tất cả sản phẩm →
                  </Link>
                </div>
              </div>
            )}
          </div>

          <Link to="/feedback" className="navbar-link">Kỷ niệm</Link>
          <Link to="/quy-trinh" className="navbar-link">Quy trình</Link>
        </div>

        <form className="navbar-search" onSubmit={handleSearchSubmit}>
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="Tìm máy ảnh, ống kính..."
            aria-label="Tìm kiếm sản phẩm"
          />
          <button type="submit" className="navbar-icon-btn" aria-label="Tìm kiếm">
            ⌕
          </button>
        </form>

        <div className="navbar-actions">
          {user ? (
            <>
              <NotificationBell />
              <div className="user-menu" ref={menuRef}>
                <button type="button" className="navbar-link navbar-user" onClick={() => setMenuOpen((v) => !v)}>
                  <span className="user-avatar">
                    {user.avatarUrl ? (
                      <img src={resolveImageUrl(user.avatarUrl)} alt={user.name} />
                    ) : (
                      <span>{user.name?.[0]?.toUpperCase() || "?"}</span>
                    )}
                  </span>
                  <span className="user-name">{user.name}</span>
                  <span className="user-menu__caret" aria-hidden="true">{menuOpen ? "▲" : "▼"}</span>
                </button>
                {menuOpen && (
                  <div className="user-menu__panel">
                    <Link to="/profile" onClick={() => setMenuOpen(false)}>👤 Hồ sơ của tôi</Link>
                    <Link to="/orders" onClick={() => setMenuOpen(false)}>📦 Đơn hàng của tôi</Link>
                    {isAdminOrStaff && (
                      <Link to={isAdmin ? "/admin/dashboard" : "/admin/orders"} onClick={() => setMenuOpen(false)}>
                        {isAdmin ? "📊 Bảng điều khiển Admin" : "📦 Khu vực Nhân viên"}
                      </Link>
                    )}
                    <button type="button" onClick={handleLogout}>🚪 Đăng xuất</button>
                  </div>
                )}
              </div>
              <div className="navbar-cart" ref={cartRef}>
                <Link
                  to="/cart"
                  id="navbar-cart-icon"
                  className="navbar-icon-btn navbar-icon-btn--ghost"
                  aria-label="Giỏ hàng"
                >
                  👜
                  {itemCount > 0 && <span className="navbar-cart__badge">{itemCount}</span>}
                </Link>
                {miniCartOpen && <MiniCartPopover onClose={closeMiniCart} />}
              </div>
            </>
          ) : (
            <>
              <Link to="/login" className="navbar-btn navbar-btn-login">
                Đăng nhập
              </Link>
              <Link to="/register" className="navbar-btn navbar-btn-register">
                Đăng ký
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}