import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import OtpInput from "../components/OtpInput";
import Alert from "../components/Alert";
import ApertureMark from "../components/ApertureMark";
import { authApi } from "../api/authApi";
import { toApiError } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useCountdown } from "../hooks/useCountdown";
import useDocumentTitle from "../hooks/useDocumentTitle";

const RESEND_COOLDOWN = 60;

export default function VerifyOtpPage() {
  useDocumentTitle("Xác thực OTP");
  const location = useLocation();
  const navigate = useNavigate();
  const { login } = useAuth();
  const state = location.state;

  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState(null);
  const [info, setInfo] = useState(null);

  const expiry = useCountdown(state?.otpExpiresIn || 300);
  const cooldown = useCountdown(RESEND_COOLDOWN);

  useEffect(() => {
    if (!state?.email || !state?.purpose) {
      navigate("/register", { replace: true });
    }
    if (state?.devOtpCode) {
      setInfo(`Mã dev OTP: ${state.devOtpCode}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!state?.email) return null;

  const handleVerify = async (e) => {
    e.preventDefault();
    setError(null);
    if (otp.length !== 6) {
      setError("Vui lòng nhập đủ 6 chữ số OTP");
      return;
    }
    setLoading(true);
    try {
      const res = await authApi.verifyOtp({ email: state.email, otp, purpose: state.purpose });
      login(res, true);
      navigate("/", { replace: true });
    } catch (err) {
      setError(toApiError(err).message);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError(null);
    setInfo(null);
    setResending(true);
    try {
      const res = await authApi.resendOtp({ email: state.email, purpose: state.purpose });
      expiry.restart(res.details?.otpExpiresIn || 300);
      cooldown.restart(res.details?.cooldownSeconds || RESEND_COOLDOWN);
      setOtp("");
      setInfo(res.message || "Đã gửi lại mã OTP.");
    } catch (err) {
      setError(toApiError(err).message);
    } finally {
      setResending(false);
    }
  };

  return (
    <>
      <div className="back-row">
        <button type="button" onClick={() => navigate(-1)}>
          <BackIcon /> Quay lại
        </button>
      </div>

      <h2 className="form-heading">Xác thực OTP</h2>
      <p className="form-subheading">
        Nhập mã 6 số vừa gửi tới <span className="masked-email">{state.maskedEmail || state.email}</span>
      </p>

      {error && <Alert type="error">{error}</Alert>}
      {info && !error && <Alert type="success">{info}</Alert>}

      <form className="auth-form" onSubmit={handleVerify}>
        <OtpInput value={otp} onChange={setOtp} disabled={loading} />

        <div className="otp-meta">
          <span>{expiry.isDone ? "Mã đã hết hạn" : "Mã hết hạn sau"}</span>
          <span className="otp-meta__timer">{!expiry.isDone && expiry.formatted}</span>
        </div>

        <button className="btn btn-shutter btn-block" type="submit" disabled={loading || expiry.isDone}>
          {loading ? <ApertureMark size={18} spinning color="#1a1208" /> : null}
          {loading ? "Đang xác thực..." : "Xác nhận"}
        </button>

        <button
          type="button"
          className="btn btn-ghost btn-block"
          onClick={handleResend}
          disabled={resending || !cooldown.isDone}
        >
          {resending
            ? "Đang gửi lại..."
            : cooldown.isDone
              ? "Gửi lại mã OTP"
              : `Gửi lại sau ${cooldown.formatted}`}
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