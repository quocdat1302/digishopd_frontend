import { useState, useEffect } from "react";
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
import {
  validateEmail,
  validatePassword,
  validateConfirmPassword,
  validateRequired,
} from "../utils/validators";
import useDocumentTitle from "../hooks/useDocumentTitle";
import SimpleModal from "../components/SimpleModal";
import { TERMS_SECTIONS, PRIVACY_SECTIONS } from "../data/legalContent";

const SHOW_GOOGLE_UI_MOCK = false;
const SHOW_FACEBOOK_UI_MOCK = false;

const EMPTY_FORM = {
  name: "",
  email: "",
  phone: "",
  password: "",
  confirmPassword: "",
  acceptTerms: false,
};

export default function RegisterPage() {
  useDocumentTitle("Đăng ký");
  const [openLegal, setOpenLegal] = useState(null); // "terms" | "privacy" | null
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm] = useState(EMPTY_FORM);
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
      name: validateRequired(form.name, "Vui lòng nhập họ tên"),
      email: validateEmail(form.email),
      phone: validateRequired(form.phone, "Vui lòng nhập số điện thoại"),
      password: validatePassword(form.password),
      confirmPassword: validateConfirmPassword(form.password, form.confirmPassword),
      acceptTerms: form.acceptTerms ? null : "Bạn cần đồng ý điều khoản sử dụng",
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
      const res = await authApi.register(form);
      if (res.requiresVerification) {
        navigate("/verify-otp", {
          state: {
            email: form.email,
            maskedEmail: res.maskedEmail,
            purpose: "REGISTER",
            otpExpiresIn: res.otpExpiresIn,
            devOtpCode: res.otpCode,
          },
        });
        return;
      }

      login(res, false);
      navigate("/");
    } catch (err) {
      const apiErr = toApiError(err);
      if (apiErr.details) setErrors((er) => ({ ...er, ...apiErr.details }));
      setServerError(apiErr.message);
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
      navigate("/");
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
      navigate("/");
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
        <span className="auth-copy__eyebrow">Tạo tài khoản mới</span>
        <h2 className="form-heading">Bắt đầu với DigiShop</h2>
        <p className="form-subheading">Tạo tài khoản để mua, thuê thiết bị và theo dõi toàn bộ lịch sử giao dịch của bạn.</p>
      </div>

      {serverError && <Alert type="error">{serverError}</Alert>}

      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        <FocusField
          label="Họ và tên"
          placeholder="Nguyễn Văn A"
          autoComplete="name"
          value={form.name}
          onChange={setField("name")}
          error={errors.name}
        />
        <FocusField
          label="Email"
          type="email"
          placeholder="ban@vidu.com"
          autoComplete="email"
          value={form.email}
          onChange={setField("email")}
          error={errors.email}
        />
        <FocusField
          label="Số điện thoại"
          type="tel"
          placeholder="09xxxxxxxx"
          autoComplete="tel"
          value={form.phone}
          onChange={setField("phone")}
          error={errors.phone}
        />
        <PasswordField
          label="Mật khẩu"
          placeholder="Tối thiểu 8 ký tự"
          autoComplete="new-password"
          value={form.password}
          onChange={setField("password")}
          error={errors.password}
          hint={!errors.password ? "Cần ít nhất 1 chữ hoa, 1 số và 1 ký tự đặc biệt" : null}
        />
        <PasswordField
          label="Nhập lại mật khẩu"
          placeholder="Nhập lại mật khẩu"
          autoComplete="new-password"
          value={form.confirmPassword}
          onChange={setField("confirmPassword")}
          error={errors.confirmPassword}
        />

        <label className="checkbox-row">
          <input type="checkbox" checked={form.acceptTerms} onChange={setField("acceptTerms")} />
          <span>
            Tôi đồng ý với{" "}
            <button type="button" className="link-button" onClick={() => setOpenLegal("terms")}>
              Điều khoản sử dụng
            </button>{" "}
            và{" "}
            <button type="button" className="link-button" onClick={() => setOpenLegal("privacy")}>
              Chính sách bảo mật
            </button>{" "}
            của DigiShop.
          </span>
        </label>
        {errors.acceptTerms && <p className="field__error">{errors.acceptTerms}</p>}

        <button className="btn btn-shutter btn-block" type="submit" disabled={loading}>
          {loading ? <ApertureMark size={18} spinning color="#1a1208" /> : null}
          {loading ? "Đang tạo tài khoản..." : "Tạo tài khoản"}
        </button>
      </form>

      <div className="auth-helper-row">
        <span>Kích hoạt nhanh bằng Google</span>
        <span>Quản lý mua và thuê tập trung</span>
      </div>

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
        Đã có tài khoản? <Link to="/login">Đăng nhập</Link>
      </p>

      {openLegal && (
        <SimpleModal
          title={openLegal === "terms" ? "Điều khoản sử dụng" : "Chính sách bảo mật"}
          onClose={() => setOpenLegal(null)}
        >
          {(openLegal === "terms" ? TERMS_SECTIONS : PRIVACY_SECTIONS).map((section) => (
            <section key={section.title} className="legal-modal__section">
              <h3>{section.title}</h3>
              {section.body.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </section>
          ))}
        </SimpleModal>
      )}
    </>
  );
}