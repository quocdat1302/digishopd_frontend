import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import FocusField from "../components/FocusField";
import PasswordField from "../components/PasswordField";
import OtpInput from "../components/OtpInput";
import Alert from "../components/Alert";
import ApertureMark from "../components/ApertureMark";
import { authApi } from "../api/authApi";
import { toApiError } from "../api/client";
import { useCountdown } from "../hooks/useCountdown";
import { validateEmail, validatePassword, validateConfirmPassword } from "../utils/validators";
import useDocumentTitle from "../hooks/useDocumentTitle";

const RESEND_COOLDOWN = 60;

export default function ForgotPasswordPage() {
  useDocumentTitle("Quên mật khẩu");
  const navigate = useNavigate();
  const [step, setStep] = useState("email"); // "email" | "otp" | "reset"
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [resetToken, setResetToken] = useState(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState(null);
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(false);

  const cooldown = useCountdown(0);

  // Bước 1: gửi OTP tới email
  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setServerError(null);
    const emailError = validateEmail(email);
    setErrors({ email: emailError });
    if (emailError) return;

    setLoading(true);
    try {
      const res = await authApi.forgotPassword(email);
      setInfo(res.message);
      setStep("otp");
      cooldown.restart(RESEND_COOLDOWN);
    } catch (err) {
      setServerError(toApiError(err).message);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setServerError(null);
    setLoading(true);
    try {
      const res = await authApi.forgotPassword(email);
      setInfo(res.message);
      cooldown.restart(RESEND_COOLDOWN);
    } catch (err) {
      setServerError(toApiError(err).message);
    } finally {
      setLoading(false);
    }
  };

  // Bước 2: xác nhận mã OTP -> nhận resetToken tạm, chưa đổi mật khẩu
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setServerError(null);
    if (otp.length !== 6) {
      setErrors({ otp: "Vui lòng nhập đủ 6 chữ số OTP" });
      return;
    }

    setLoading(true);
    try {
      const res = await authApi.verifyResetOtp({ email, otp });
      setResetToken(res.details?.resetToken);
      setInfo(null);
      setErrors({});
      setStep("reset");
    } catch (err) {
      setServerError(toApiError(err).message);
    } finally {
      setLoading(false);
    }
  };

  // Bước 3: đặt mật khẩu mới bằng resetToken (không cần OTP nữa)
  const handleReset = async (e) => {
    e.preventDefault();
    setServerError(null);
    const next = {
      newPassword: validatePassword(newPassword),
      confirmPassword: validateConfirmPassword(newPassword, confirmPassword),
    };
    setErrors(next);
    if (Object.values(next).some(Boolean)) return;

    setLoading(true);
    try {
      const res = await authApi.resetPassword({ resetToken, newPassword });
      setInfo(res.message);
      setTimeout(() => navigate("/login"), 1200);
    } catch (err) {
      setServerError(toApiError(err).message);
    } finally {
      setLoading(false);
    }
  };

  if (step === "email") {
    return (
      <>
        <div className="back-row">
          <Link to="/login">
            <BackIcon /> Quay lại đăng nhập
          </Link>
        </div>

        <h2 className="form-heading">Quên mật khẩu?</h2>
        <p className="form-subheading">Nhập email đã đăng ký, DigiShop sẽ gửi mã OTP để đặt lại mật khẩu.</p>

        {serverError && <Alert type="error">{serverError}</Alert>}

        <form className="auth-form" onSubmit={handleRequestOtp} noValidate>
          <FocusField
            label="Email"
            type="email"
            placeholder="ban@vidu.com"
            autoComplete="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setErrors({});
            }}
            error={errors.email}
          />
          <button className="btn btn-shutter btn-block" type="submit" disabled={loading}>
            {loading ? <ApertureMark size={18} spinning color="#1a1208" /> : null}
            {loading ? "Đang gửi..." : "Gửi mã OTP"}
          </button>
        </form>
      </>
    );
  }

  if (step === "otp") {
    return (
      <>
        <div className="back-row">
          <button type="button" onClick={() => setStep("email")}>
            <BackIcon /> Đổi email
          </button>
        </div>

        <h2 className="form-heading">Xác nhận mã OTP</h2>
        <p className="form-subheading">
          Nhập mã OTP đã gửi tới <span className="masked-email">{email}</span>.
        </p>

        {serverError && <Alert type="error">{serverError}</Alert>}
        {info && !serverError && <Alert type="success">{info}</Alert>}

        <form className="auth-form" onSubmit={handleVerifyOtp} noValidate>
          <div className="field">
            <span className="field__label">Mã OTP</span>
            <OtpInput value={otp} onChange={setOtp} disabled={loading} />
            {errors.otp && <p className="field__error">{errors.otp}</p>}
          </div>

          <button className="btn btn-shutter btn-block" type="submit" disabled={loading}>
            {loading ? <ApertureMark size={18} spinning color="#1a1208" /> : null}
            {loading ? "Đang xác nhận..." : "Xác nhận OTP"}
          </button>

          <button type="button" className="btn btn-ghost btn-block" onClick={handleResend} disabled={loading || !cooldown.isDone}>
            {cooldown.isDone ? "Gửi lại mã OTP" : `Gửi lại sau ${cooldown.formatted}`}
          </button>
        </form>
      </>
    );
  }

  // step === "reset"
  return (
    <>
      <div className="back-row">
        <button type="button" onClick={() => setStep("otp")}>
          <BackIcon /> Nhập lại OTP
        </button>
      </div>

      <h2 className="form-heading">Đặt lại mật khẩu</h2>
      <p className="form-subheading">OTP đã xác nhận thành công. Nhập mật khẩu mới cho tài khoản của bạn.</p>

      {serverError && <Alert type="error">{serverError}</Alert>}
      {info && !serverError && <Alert type="success">{info}</Alert>}

      <form className="auth-form" onSubmit={handleReset} noValidate>
        <PasswordField
          label="Mật khẩu mới"
          placeholder="Tối thiểu 8 ký tự"
          autoComplete="new-password"
          value={newPassword}
          onChange={(e) => {
            setNewPassword(e.target.value);
            setErrors((er) => ({ ...er, newPassword: null }));
          }}
          error={errors.newPassword}
          hint={!errors.newPassword ? "Cần ít nhất 1 chữ hoa, 1 số và 1 ký tự đặc biệt" : null}
        />
        <PasswordField
          label="Nhập lại mật khẩu mới"
          placeholder="Nhập lại mật khẩu mới"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => {
            setConfirmPassword(e.target.value);
            setErrors((er) => ({ ...er, confirmPassword: null }));
          }}
          error={errors.confirmPassword}
        />

        <button className="btn btn-shutter btn-block" type="submit" disabled={loading}>
          {loading ? <ApertureMark size={18} spinning color="#1a1208" /> : null}
          {loading ? "Đang cập nhật..." : "Đặt lại mật khẩu"}
        </button>
      </form>
    </>
  );
}

function BackIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}