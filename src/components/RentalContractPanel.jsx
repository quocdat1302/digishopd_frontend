import { useEffect, useState } from "react";
import { orderApi } from "../api/orderApi";
import { toApiError } from "../api/client";
import SignatureCanvas from "./SignatureCanvas";

/**
 * Hiển thị nội dung hợp đồng thuê cho đơn `order` (phải đang ở trạng thái CONFIRMED — đã nhận cọc),
 * cho khách ký tên rồi gọi API hoàn tất. Gọi `onSigned(order)` khi ký xong (đơn chuyển DEPOSIT_PAID).
 */
export default function RentalContractPanel({ order, onSigned, onCancel }) {
  const [contractText, setContractText] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [signature, setSignature] = useState(null);
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    orderApi
      .getContractPreview(order.id)
      .then(setContractText)
      .catch((err) => setError(toApiError(err).message))
      .finally(() => setLoading(false));
  }, [order.id]);

  const handleSign = async () => {
    if (!signature) {
      setError("Vui lòng ký tên vào khung chữ ký trước khi hoàn tất.");
      return;
    }
    if (!agreed) {
      setError("Vui lòng xác nhận bạn đã đọc và đồng ý điều khoản hợp đồng.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const updated = await orderApi.signRentalContract(order.id, signature);
      onSigned(updated);
    } catch (err) {
      setError(toApiError(err).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rental-contract-panel">
      <span className="hand-stamped-tag" aria-hidden="true">Bước cuối</span>
      <h1>📄 Xem &amp; ký hợp đồng thuê</h1>
      <p className="rental-contract-panel__hint">
        Đơn <strong>#{order.orderCode}</strong> đã ghi nhận cọc. Vui lòng đọc kỹ hợp đồng bên dưới và ký tên để
        hoàn tất — sau khi ký, đơn sẽ chuyển sang chờ giao/nhận máy.
      </p>

      {loading && <p className="profile-hint">Đang tải nội dung hợp đồng...</p>}

      {!loading && contractText && (
        <pre className="rental-contract-panel__text">{contractText}</pre>
      )}

      {!loading && (
        <>
          <SignatureCanvas onChange={setSignature} />

          <label className="rental-contract-panel__agree">
            <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
            Tôi đã đọc và đồng ý với các điều khoản trong hợp đồng trên.
          </label>

          {error && <p className="product-feedback-inline product-feedback-inline--error">{error}</p>}

          <div className="rental-contract-panel__actions">
            {onCancel && (
              <button type="button" className="btn btn-outline-shutter" onClick={onCancel} disabled={submitting}>
                Để sau
              </button>
            )}
            <button type="button" className="btn btn-shutter" onClick={handleSign} disabled={submitting}>
              {submitting ? "Đang xử lý..." : "Ký & Hoàn tất"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}