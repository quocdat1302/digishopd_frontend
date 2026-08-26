import { Outlet } from "react-router-dom";
import BrandPanel from "./BrandPanel";

export default function AuthLayout() {
  return (
    <div className="auth-shell">
      <div className="auth-shell__visual">
        <BrandPanel />
      </div>
      <div className="auth-shell__content">
        <div className="form-panel">
          <div className="form-card auth-card">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
}
