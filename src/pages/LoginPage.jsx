import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import ModeTabs from "../components/ModeTabs";
import FocusField from "../components/FocusField";
import PasswordField from "../components/PasswordField";
import GoogleButton from "../components/GoogleButton";
import FacebookButton from "../components/FacebookButton";
import Alert from "../components/Alert";
import ApertureMark from "../components/ApertureMark";
import { authApi } from "../api/authApi";
import { toApiError } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { validateEmail, validateRequired } from "../utils/validators";
import useDocumentTitle from "../hooks/useDocumentTitle";

const SHOW_GOOGLE_UI_MOCK = false;
const SHOW_FACEBOOK_UI_MOCK = false;

function destinationFor(authResponse) {
  return authResponse?.user?.role === "ADMIN" ? "/admin/products" : "/";
}

export default function LoginPage() {
  useDocumentTitle("Đăng nhập");
  const navigate = useNavigate();
  const { login } = useAuth();

  const [form, setForm] = useState({ email: "", password: "", rememberMe: false });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [providersResolved, setProvidersResolved] = useState(false);
  const [googleAvailable, setGoogleAvailable] = useState(SHOW_GOOGLE_UI_MOCK);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [facebookAvailable, setFacebookAvailable] = useState(SHOW_FACEBOOK_UI_MOCK);
  const [facebookLoading, setFacebookLoading] = useState(false);

  useEffect(() => {
    authApi
      .getProviders()
      .then((res) => {
        setGoogleAvailable(Boolean(res.googleEnabled) || SHOW_GOOGLE_UI_MOCK);
        setFacebookAvailable(Boolean(res.facebookEnabled) || SHOW_FACEBOOK_UI_MOCK);
      })
      .catch(() => {
        setGoogleAvailable(SHOW_GOOGLE_UI_MOCK);
        setFacebookAvailable(SHOW_FACEBOOK_UI_MOCK);
      })
      .finally(() => {
        setProvidersResolved(true);
      });
  }, []);

  const setField = (key) => (e) => {
    const value = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((er) => ({ ...er, [key]: null }));
  };

  const validate = () => {
    const next = {
      email: validateEmail(form.email),
      password: validateRequired(form.password, "Vui lòng nhập mật khẩu"),
    };
    setErrors(next);
    return Object.values(next).every((v) => !v);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError(null);
    if (!validate()) return;

    setLoading(true);
    try {
      const res = await authApi.login(form);
      login(res, form.rememberMe);
      navigate(destinationFor(res));
    } catch (err) {
      setServerError(toApiError(err).message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleCredential = async (idToken) => {
    setServerError(null);
    setGoogleLoading(true);
    try {
      const res = await authApi.loginWithGoogle(idToken);
      login(res, true);
      navigate(destinationFor(res));
    } catch (err) {
      setServerError(toApiError(err).message);
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleFacebookCredential = async (facebookData) => {
    setServerError(null);
    setFacebookLoading(true);
    try {
      const res = await authApi.loginWithFacebook(facebookData);
      login(res, true);
      navigate(destinationFor(res));
    } catch (err) {
      setServerError(toApiError(err).message);
    } finally {
      setFacebookLoading(false);
    }
  };

  return (
    <>
      <ModeTabs />
      <div className="auth-copy">
        <span className="auth-copy__eyebrow">DIGISHOP</span>
        <h2 className="form-heading">Đăng Nhập Tài Khoản</h2>
      </div>

      {serverError && (
        <Alert type="error">
          {serverError}
        </Alert>
      )}

      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        <FocusField
          label="Email"
          type="email"
          placeholder="ban@vidu.com"
          autoComplete="email"
          value={form.email}
          onChange={setField("email")}
          error={errors.email}
        />
        <PasswordField
          label="Mật khẩu"
          placeholder="Nhập mật khẩu"
          autoComplete="current-password"
          value={form.password}
          onChange={setField("password")}
          error={errors.password}
        />

        <div className="remember-row">
          <label>
            <input type="checkbox" checked={form.rememberMe} onChange={setField("rememberMe")} />
            Ghi nhớ đăng nhập
          </label>
          <Link to="/forgot-password">Quên mật khẩu?</Link>
        </div>

        <button className="btn btn-shutter btn-block" type="submit" disabled={loading}>
          {loading ? <ApertureMark size={18} spinning color="#1a1208" /> : null}
          {loading ? "Đang đăng nhập..." : "Đăng nhập"}
        </button>
      </form>

      {providersResolved && (googleAvailable || facebookAvailable) && (
        <>
          <div className="divider">hoặc</div>
          <div className="social-buttons social-buttons--icons">
            {googleAvailable && (
              <GoogleButton
                onCredential={handleGoogleCredential}
                onUnavailable={() => setGoogleAvailable(false)}
                disabled={googleLoading || facebookLoading}
                forceShow={SHOW_GOOGLE_UI_MOCK}
                iconOnly
              />
            )}
            {facebookAvailable && (
              <FacebookButton
                onSuccess={handleFacebookCredential}
                onError={(error) => setServerError(error)}
                disabled={googleLoading || facebookLoading}
                forceShow={SHOW_FACEBOOK_UI_MOCK}
                iconOnly
              />
            )}
          </div>
        </>
      )}

      <p className="form-footer">
        Chưa có tài khoản? <Link to="/register">Đăng ký ngay</Link>
      </p>
    </>
  );
}