import { useEffect, useState } from "react";
import { hasFacebookAppId } from "../utils/socialAuth";

const FACEBOOK_CONFIGURED = hasFacebookAppId();

/**
 * Nút "Đăng nhập với Facebook" theo phong cách tươi sáng.
 * Sử dụng Facebook SDK để xử lý OAuth2 login.
 */
export default function FacebookButton({ onSuccess, onError, disabled, forceShow = false, iconOnly = false }) {
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!FACEBOOK_CONFIGURED) {
      return;
    }

    // Load Facebook SDK
    const loadFacebookSDK = () => {
      window.fbAsyncInit = function() {
        window.FB.init({
          appId: import.meta.env.VITE_FACEBOOK_APP_ID,
          cookie: true,
          xfbml: true,
          version: 'v19.0'
        });
        setReady(true);
      };

      (function(d, s, id) {
        var js, fjs = d.getElementsByTagName(s)[0];
        if (d.getElementById(id)) return;
        js = d.createElement(s);
        js.id = id;
        js.src = "https://connect.facebook.net/en_US/sdk.js";
        fjs.parentNode.insertBefore(js, fjs);
      }(document, 'script', 'facebook-jssdk'));
    };

    loadFacebookSDK();
  }, []);

  const handleClick = () => {
    if (!window.FB || !ready) return;

    setLoading(true);
    window.FB.login(function(response) {
      if (response.authResponse) {
        // Get user info
        window.FB.api('/me', { fields: 'id,name,email,picture' }, function(userInfo) {
          if (userInfo && !userInfo.error) {
            onSuccess({
              accessToken: response.authResponse.accessToken,
              userID: response.authResponse.userID,
              userInfo: userInfo
            });
          } else {
            onError('Không thể lấy thông tin người dùng từ Facebook');
            setLoading(false);
          }
        });
      } else {
        onError('Đăng nhập Facebook bị hủy');
        setLoading(false);
      }
    }, { scope: 'email,public_profile' });
  };

  if (!FACEBOOK_CONFIGURED && !forceShow) return null;

  return (
    <button
      type="button"
      className={`btn-social-auth btn-facebook-auth ${iconOnly ? "btn-social-auth--icon-only" : ""}`}
      onClick={handleClick}
      disabled={disabled || loading || (!FACEBOOK_CONFIGURED ? true : !ready)}
      aria-label={loading ? "Đang kết nối..." : "Tiếp tục với Facebook"}
      title={
        !FACEBOOK_CONFIGURED
          ? "Facebook chưa được cấu hình, chỉ hiển thị để dựng giao diện"
          : loading
            ? "Đang kết nối..."
            : "Tiếp tục với Facebook"
      }
    >
      <span className="btn-social-auth__icon">
        <FacebookGlyph />
      </span>
      {!iconOnly && (
        <span className="btn-social-auth__text">
          <strong>Tiếp tục với Facebook</strong>
          <small>{loading ? "Đang kết nối tới Facebook..." : "Dùng tài khoản Facebook để đăng nhập"}</small>
        </span>
      )}
    </button>
  );
}

function FacebookGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="#1877F2">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  );
}