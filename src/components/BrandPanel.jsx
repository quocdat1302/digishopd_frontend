import { useState } from "react";
import ApertureMark from "./ApertureMark";

/**
 * Panel ảnh/video bên trái. Tự thêm video của bạn bằng cách đặt file vào:
 * public/camera.mp4
 */
export default function BrandPanel({
  eyebrow = "DIGISHOP", // Chỉ giữ lại chữ DIGISHOP nhỏ phía trên
}) {
  const [videoOk, setVideoOk] = useState(true);

  return (
    <div className="brand-panel">
      {videoOk && (
        <video
          className="brand-panel__photo"
          src="/camera.mp4"
          autoPlay
          loop
          muted
          playsInline
          style={{ objectFit: "cover", width: "100%", height: "100%" }}
          onError={() => setVideoOk(false)}
        />
      )}

      {!videoOk && (
        <div className="brand-panel__fallback">
          <div className="brand-panel__fallback-inner">
            <ApertureMark size={40} />
            <p>
              Đặt video sản phẩm của bạn vào <br />
              <code>public/camera.mp4</code>
              <br />
              để hiển thị tại đây.
            </p>
          </div>
        </div>
      )}
      <div className="brand-panel__scrim" />

      <span className="viewfinder-corner viewfinder-corner--tl" />
      <span className="viewfinder-corner viewfinder-corner--tr" />
      <span className="viewfinder-corner viewfinder-corner--bl" />
      <span className="viewfinder-corner viewfinder-corner--br" />

      <div className="brand-panel__content">
        <a className="brand-mark" href="/">
          <img src="/assets/logoo.png" alt="DigiShop" className="brand-mark__logo" />
        </a>

      </div>
    </div>
  );
}