import { useEffect, useRef, useState } from "react";
import { orderApi } from "../api/orderApi";
import { toApiError } from "../api/client";
import { formatPrice } from "../utils/formatters";

const BANK_CODE = import.meta.env.VITE_BANK_CODE || "MB";
const BANK_ACCOUNT_NUMBER = import.meta.env.VITE_BANK_ACCOUNT_NUMBER || "";
const BANK_ACCOUNT_NAME = import.meta.env.VITE_BANK_ACCOUNT_NAME || "";

const POLL_INTERVAL_MS = 4000;
// Trạng thái coi như "đã thanh toán" — đơn vừa tạo (PENDING) chuyển sang CONFIRMED nghĩa là
// webhook SePay đã nhận được tiền và cập nhật xong (xem PaymentWebhookController phía backend).
const PAID_STATUSES = new Set(["CONFIRMED", "DEPOSIT_PAID", "DELIVERING", "DELIVERED", "COMPLETED"]);

/**
 * Hiển thị QR VietQR cho đơn hàng `order` và tự động kiểm tra trạng thái mỗi vài giây.
 * Gọi `onPaid(order)` ngay khi phát hiện đơn đã được webhook xác nhận thanh toán.
 *
 * `onCancelled(order)` được gọi khi khách bấm "Huỷ đơn / Quay lại" trước khi chuyển khoản —
 * lúc này đơn đang PENDING (chưa có ai xác nhận thanh toán) nên huỷ thẳng ở đây, tránh để đơn
 * treo mãi ở trạng thái PENDING: nó vẫn tính là "đang giữ chỗ" (xem ACTIVE_RENTAL_STATUSES ở BE),
 * làm những ngày đó bị khoá trên lịch dù khách chưa hề chuyển khoản.
 */
export default function QrPaymentPanel({ order, onPaid, onCancelled }) {
  const [status, setStatus] = useState(order.status);
  const [checking, setChecking] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState(null);
  const intervalRef = useRef(null);
  const tickRef = useRef(null);
  // Đánh dấu khi khách đã huỷ đơn (hoặc component unmount) — để bỏ qua kết quả của các lần poll
  // đã gửi đi trước đó nhưng phản hồi về SAU khi huỷ, tránh việc 1 lần poll "trễ" ghi đè lên
  // hành động huỷ và nhảy nhầm sang màn "thanh toán thành công".
  const cancelledRef = useRef(false);

  const amount = order.totalAmount;
  const qrUrl = `https://img.vietqr.io/image/${BANK_CODE}-${BANK_ACCOUNT_NUMBER}-compact2.png?amount=${Math.round(
    amount
  )}&addInfo=${encodeURIComponent(order.orderCode)}&accountName=${encodeURIComponent(BANK_ACCOUNT_NAME)}`;

  useEffect(() => {
    if (PAID_STATUSES.has(status)) return;

    intervalRef.current = setInterval(async () => {
      try {
        setChecking(true);
        const fresh = await orderApi.getMyOrder(order.id);
        if (cancelledRef.current) return; // đơn đã bị huỷ trong lúc chờ phản hồi — bỏ qua kết quả này
        setStatus(fresh.status);
        if (PAID_STATUSES.has(fresh.status)) {
          clearInterval(intervalRef.current);
          onPaid?.(fresh);
        }
      } catch {
        // Bỏ qua lỗi tạm thời của 1 lần poll, sẽ thử lại ở lần sau
      } finally {
        setChecking(false);
      }
    }, POLL_INTERVAL_MS);

    tickRef.current = setInterval(() => setElapsedSec((s) => s + 1), 1000);

    return () => {
      clearInterval(intervalRef.current);
      clearInterval(tickRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order.id, status]);

  useEffect(() => {
    return () => {
      cancelledRef.current = true; // component unmount — bỏ qua mọi poll còn treo lơ lửng
    };
  }, []);

  const minutes = String(Math.floor(elapsedSec / 60)).padStart(2, "0");
  const seconds = String(elapsedSec % 60).padStart(2, "0");

  const handleCancel = async () => {
    if (cancelling) return;
    const confirmed = window.confirm(
      "Bạn chưa chuyển khoản. Huỷ đơn này? Ngày đã giữ chỗ sẽ được mở trống lại cho khách khác."
    );
    if (!confirmed) return;
    setCancelling(true);
    setCancelError(null);
    try {
      const cancelled = await orderApi.cancelMyOrder(order.id);
      cancelledRef.current = true;
      clearInterval(intervalRef.current);
      clearInterval(tickRef.current);
      onCancelled?.(cancelled);
    } catch (err) {
      setCancelError(toApiError(err).message);
      setCancelling(false);
    }
  };

  return (
    <div className="qr-payment-panel">
      <span className="hand-stamped-tag" aria-hidden="true">Chờ thanh toán</span>
      <h1>📱 Quét mã để thanh toán</h1>
      <p className="qr-payment-panel__order">
        Đơn <strong>#{order.orderCode}</strong> — số tiền cần chuyển{" "}
        <strong>{formatPrice(amount)}</strong>
      </p>
      <p className="qr-payment-panel__note qr-payment-panel__note--warning">
        ℹ️ Đơn đang ở trạng thái <strong>chờ chuyển khoản</strong> — chưa tính là đặt thành công. Hệ thống chỉ
        xác nhận sau khi nhận được tiền qua chuyển khoản đúng nội dung bên dưới.
      </p>

      <div className="qr-payment-panel__box">
        <img src={qrUrl} alt={`Mã QR thanh toán đơn ${order.orderCode}`} width={280} height={280} />
      </div>

      <div className="qr-payment-panel__info">
        <div>
          <span>Ngân hàng</span>
          <strong>{BANK_CODE}</strong>
        </div>
        <div>
          <span>Số tài khoản</span>
          <strong>{BANK_ACCOUNT_NUMBER}</strong>
        </div>
        <div>
          <span>Chủ tài khoản</span>
          <strong>{BANK_ACCOUNT_NAME}</strong>
        </div>
        <div>
          <span>Nội dung CK</span>
          <strong>{order.orderCode}</strong>
        </div>
      </div>

      <p className="qr-payment-panel__note">
        ⚠️ Vui lòng giữ đúng nội dung chuyển khoản <strong>{order.orderCode}</strong> để hệ thống tự động
        xác nhận đơn hàng cho bạn.
      </p>

      <div className="qr-payment-panel__status">
        {checking ? (
          <span>🔄 Đang kiểm tra giao dịch...</span>
        ) : (
          <span>⏳ Đang chờ thanh toán ({minutes}:{seconds})</span>
        )}
      </div>

      {cancelError && <p className="product-feedback-inline product-feedback-inline--error">{cancelError}</p>}

      <div className="qr-payment-panel__actions">
        <button type="button" className="btn btn-outline-shutter" onClick={handleCancel} disabled={cancelling}>
          {cancelling ? "Đang huỷ..." : "✕ Chưa chuyển khoản — Huỷ đơn / Quay lại"}
        </button>
      </div>
    </div>
  );
}