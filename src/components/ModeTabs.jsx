import { NavLink } from "react-router-dom";

export default function ModeTabs() {
  return (
    <div className="mode-tabs">
      <NavLink to="/login" className={({ isActive }) => (isActive ? "is-active" : "")}>
        Đăng nhập
      </NavLink>
      <NavLink to="/register" className={({ isActive }) => (isActive ? "is-active" : "")}>
        Đăng ký
      </NavLink>
    </div>
  );
}
