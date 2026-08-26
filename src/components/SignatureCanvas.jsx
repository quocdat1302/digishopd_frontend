import { useEffect, useRef, useState } from "react";

/**
 * Canvas cho khách ký tên bằng ngón tay (mobile) hoặc chuột (desktop).
 * Gọi `onChange(dataUrl | null)` mỗi khi nét vẽ thay đổi — null nghĩa là canvas đang trống.
 */
export default function SignatureCanvas({ onChange, width = 480, height = 180 }) {
  const canvasRef = useRef(null);
  const drawingRef = useRef(false);
  const lastPointRef = useRef(null);
  const [isEmpty, setIsEmpty] = useState(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#fffdf6";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "#3a2a20";
    ctx.lineWidth = 2.4;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }, []);

  const getPoint = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
  };

  const start = (e) => {
    e.preventDefault();
    drawingRef.current = true;
    lastPointRef.current = getPoint(e);
  };

  const move = (e) => {
    if (!drawingRef.current) return;
    e.preventDefault();
    const ctx = canvasRef.current.getContext("2d");
    const point = getPoint(e);
    ctx.beginPath();
    ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
    lastPointRef.current = point;
    if (isEmpty) setIsEmpty(false);
  };

  const end = () => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    onChange(isEmpty ? null : canvasRef.current.toDataURL("image/png"));
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#fffdf6";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setIsEmpty(true);
    onChange(null);
  };

  return (
    <div className="signature-pad">
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="signature-pad__canvas"
        onMouseDown={start}
        onMouseMove={move}
        onMouseUp={end}
        onMouseLeave={end}
        onTouchStart={start}
        onTouchMove={move}
        onTouchEnd={end}
      />
      <div className="signature-pad__footer">
        <span>{isEmpty ? "Ký tên vào khung phía trên" : "Đã ký ✓"}</span>
        <button type="button" className="btn btn-outline-shutter btn--sm" onClick={clear}>
          Ký lại
        </button>
      </div>
    </div>
  );
}