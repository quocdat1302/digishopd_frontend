import { useEffect } from "react";
import { createPortal } from "react-dom";

/** Modal đơn giản dùng chung cho trang khách hàng — đóng bằng Esc, bấm nền, hoặc nút X. */
export default function SimpleModal({ title, onClose, children }) {
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  return createPortal(
    <div className="simple-modal__overlay" onClick={onClose}>
      <div className="simple-modal" onClick={(e) => e.stopPropagation()}>
        <div className="simple-modal__header">
          <h2>{title}</h2>
          <button type="button" className="simple-modal__close" onClick={onClose} aria-label="Đóng">
            ✕
          </button>
        </div>
        <div className="simple-modal__body">{children}</div>
      </div>
    </div>,
    document.body
  );
}