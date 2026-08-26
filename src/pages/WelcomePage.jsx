import { useNavigate } from "react-router-dom";
import ApertureMark from "../components/ApertureMark";
import { useAuth } from "../context/AuthContext";

const STATUS_LABEL = {
  ACTIVE: "Đã kích hoạt",
  PENDING_VERIFICATION: "Chờ xác minh",
  BLOCKED: "Đã khóa",
  PENDING_PROFILE: "Chờ hoàn tất hồ sơ",
};

const PROVIDER_LABEL = {
  LOCAL: "Email & mật khẩu",
  GOOGLE: "Google",
  FACEBOOK: "Facebook",
};

export default function WelcomePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  if (!user) return null;

  return (
    <div className="welcome-shell">
      <div className="welcome-card">
        {user.avatarUrl ? (
          <img className="welcome-avatar" src={user.avatarUrl} alt={user.name} />
        ) : (
          <div className="welcome-avatar--fallback">{user.name?.[0]?.toUpperCase() || "?"}</div>
        )}

        <h1 className="welcome-name">Chào, {user.name} 👋</h1>
        <p className="welcome-email">{user.email}</p>

        <div className="welcome-meta">
          <span className={`pill ${user.status === "ACTIVE" ? "pill--active" : ""}`}>
            {STATUS_LABEL[user.status] || user.status}
          </span>
          <span className="pill">{PROVIDER_LABEL[user.authProvider] || user.authProvider}</span>
          {user.identityVerified && <span className="pill pill--active">Đã định danh</span>}
        </div>

        <button className="btn btn-ghost btn-block" onClick={handleLogout}>
          <ApertureMark size={16} />
          Đăng xuất
        </button>
      </div>
    </div>
  );
}
