import { useEffect, useRef, useState } from "react";
import { hasGoogleClientId } from "../utils/socialAuth";

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const GOOGLE_CONFIGURED = hasGoogleClientId();

/**
 * Nút "Đăng nhập với Google" theo đúng theme tối của DigiShop.
 * Google yêu cầu nút thật của họ để xử lý cú click (chính sách thương hiệu),
 * nên ta render nút chính thức ẩn đi và "bấm hộ" nó khi người dùng bấm nút của mình.
 */
export default function GoogleButton({ onCredential, onUnavailable, disabled, forceShow = false, iconOnly = false }) {
  const hiddenHostRef = useRef(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!GOOGLE_CONFIGURED) {
      if (!forceShow) {
        onUnavailable?.();
      }
      return;
    }

    let cancelled = false;

    const init = () => {
      if (cancelled || !window.google?.accounts?.id) return;
      window.google.accounts.id.initialize({
        client_id: CLIENT_ID,
        callback: (response) => onCredential(response.credential),
        use_fedcm_for_prompt: true,
      });
      if (hiddenHostRef.current) {
        window.google.accounts.id.renderButton(hiddenHostRef.current, {
          type: "standard",
          theme: "outline",
          size: "large",
          width: 320,
        });
      }
      setReady(true);
    };

    if (window.google?.accounts?.id) {
      init();
    } else {
      const poll = setInterval(() => {
        if (window.google?.accounts?.id) {
          clearInterval(poll);
          init();
        }
      }, 150);
      const timeout = setTimeout(() => clearInterval(poll), 8000);
      return () => {
        cancelled = true;
        clearInterval(poll);
        clearTimeout(timeout);
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!GOOGLE_CONFIGURED && !forceShow) return null;

  const handleClick = () => {
    if (!GOOGLE_CONFIGURED) return;
    const realButton = hiddenHostRef.current?.querySelector("div[role=button]");
    realButton?.click();
  };

  return (
    <>
      <button
        type="button"
        className={`btn-social-auth btn-google-auth ${iconOnly ? "btn-social-auth--icon-only" : ""}`}
        onClick={handleClick}
        disabled={disabled || (!GOOGLE_CONFIGURED ? true : !ready)}
        aria-label="Tiếp tục với Google"
        title={!GOOGLE_CONFIGURED ? "Google chưa được cấu hình, chỉ hiển thị để dựng giao diện" : "Tiếp tục với Google"}
      >
        <span className="btn-social-auth__icon">
          <GoogleGlyph />
        </span>
        {!iconOnly && (
          <span className="btn-social-auth__text">
            <strong>Tiếp tục với Google</strong>
            <small>{ready ? "Đăng nhập nhanh bằng tài khoản Google" : "Đang chuẩn bị Google Sign-In..."}</small>
          </span>
        )}
      </button>
      {/* Nút thật của Google, ẩn khỏi mắt nhưng vẫn nhận click lập trình ở trên */}
      <div ref={hiddenHostRef} style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", opacity: 0, pointerEvents: "none" }} />
    </>
  );
}

function GoogleGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5Z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 15.9 18.9 13 24 13c3 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7Z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.4 26.7 36 24 36c-5.2 0-9.6-3.3-11.2-8l-6.5 5C9.6 39.6 16.2 44 24 44Z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.2-4.1 5.6l6.2 5.2C40.8 36 44 30.6 44 24c0-1.3-.1-2.7-.4-3.5Z" />
    </svg>
  );
}