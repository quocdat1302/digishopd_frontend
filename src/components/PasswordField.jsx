import { useState } from "react";
import FocusField from "./FocusField";

export default function PasswordField({ label, error, hint, labelAction, ...inputProps }) {
  const [visible, setVisible] = useState(false);

  return (
    <FocusField
      label={label}
      error={error}
      hint={hint}
      labelAction={labelAction}
      type={visible ? "text" : "password"}
      icon={
        <button
          type="button"
          className="field-icon-btn"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
          tabIndex={-1}
        >
          {visible ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      }
      {...inputProps}
    />
  );
}

function EyeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M1.5 12S5 5 12 5s10.5 7 10.5 7-3.5 7-10.5 7S1.5 12 1.5 12Z" />
      <circle cx="12" cy="12" r="3.2" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M3 3l18 18" />
      <path d="M10.6 5.2A10.9 10.9 0 0 1 12 5c7 0 10.5 7 10.5 7a13.4 13.4 0 0 1-3.1 3.9M6.6 6.6C3.4 8.5 1.5 12 1.5 12S5 19 12 19a10.4 10.4 0 0 0 4-.8" />
      <path d="M9.5 9.7A3.2 3.2 0 0 0 12 15.2a3.2 3.2 0 0 0 2.3-1" />
    </svg>
  );
}
