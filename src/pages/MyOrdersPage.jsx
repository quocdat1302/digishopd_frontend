import { useEffect, useState } from "react";
import NavBar from "../components/NavBar";
import Footer from "../components/Footer";
import { orderApi } from "../api/orderApi";
import { toApiError, uploadImage } from "../api/client";
import { formatPrice, formatDate, formatDateTime, resolveImageUrl } from "../utils/formatters";
import { STATUS_LABEL, STATUS_CLASS, TYPE_LABEL } from "../admin/orderConstants";
import DrawerPortal from "../admin/DrawerPortal";
import useDocumentTitle from "../hooks/useDocumentTitle";

function OrderDetail({ order, onClose, onChanged }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [showExtend, setShowExtend] = useState(false);
  const [newEndDate, setNewEndDate] = useState("");
  const [showReturnForm, setShowReturnForm] = useState(false);
  const [returnReason, setReturnReason] = useState("");
  const [returnImages, setReturnImages] = useState([]);
  const [uploadingReturnImg, setUploadingReturnImg] = useState(false);

  // Backend chỉ cho khách tự huỷ khi đơn CÒN CHƯA thanh toán (PENDING) — xem OrderService.cancelMyOrder.
  // Một khi đã CONFIRMED nghĩa là tiền đã vào, không cho tự huỷ nữa để tránh mất tiền oan cho khách.
  const canCancel = order.status === "PENDING";
  const canExtend = order.orderType === "RENTAL" && order.status === "DELIVERED";
  // Đơn mua đã giao xong (COMPLETED) mới được yêu cầu đổi trả — thời hạn cụ thể (vd 7 ngày) do
  // backend kiểm tra chính xác, ở đây chỉ cần hiện nút, bấm vào mà quá hạn thì backend báo lỗi rõ ràng.
  const canRequestReturn =
    (order.orderType === "PURCHASE" && order.status === "COMPLETED") ||
    (order.orderType === "RENTAL" && order.status === "DELIVERED");

  const handleCancel = async () => {
    if (!window.confirm(`Huỷ đơn ${order.orderCode}?`)) return;
    setBusy(true);
    setError(null);
    try {
      const updated = await orderApi.cancelMyOrder(order.id);
      onChanged(updated);
    } catch (err) {
      setError(toApiError(err).message);
    } finally {
      setBusy(false);
    }
  };

  const handleReturnImageUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (files.length === 0) return;
    setUploadingReturnImg(true);
    setError(null);
    try {
      const urls = await Promise.all(files.map((f) => uploadImage(f)));
      setReturnImages((prev) => [...prev, ...urls]);
    } catch (err) {
      setError(toApiError(err).message);
    } finally {
      setUploadingReturnImg(false);
    }
  };

  const handleSubmitReturn = async () => {
    if (!returnReason.trim()) {
      setError("Vui lòng nhập lý do đổi trả (vd: máy bị hư, trầy xước...).");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const updated = await orderApi.requestReturn(order.id, returnReason.trim(), returnImages);
      setShowReturnForm(false);
      onChanged(updated);
    } catch (err) {
      setError(toApiError(err).message);
    } finally {
      setBusy(false);
    }
  };

  const handleExtend = async () => {
    if (!newEndDate) {
      setError("Vui lòng chọn ngày kết thúc mới.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const updated = await orderApi.extendRental(order.id, newEndDate);
      onChanged(updated);
      setShowExtend(false);
    } catch (err) {
      setError(toApiError(err).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <DrawerPortal>
      <div className="admin-drawer-backdrop order-modal-backdrop--customer" onClick={onClose}>
        <div className="admin-drawer order-drawer--customer" onClick={(e) => e.stopPropagation()}>
          <div className="admin-drawer__header">
            <h2>Đơn {order.orderCode}</h2>
            <button type="button" className="admin-drawer__close" onClick={onClose} aria-label="Đóng">✕</button>
          </div>

          <div className="admin-drawer__body">
            <div className="order-detail-summary">
              <span className={`order-status-badge ${STATUS_CLASS[order.status]}`}>{STATUS_LABEL[order.status]}</span>
              <span className="order-type-badge">{TYPE_LABEL[order.orderType]}</span>
            </div>

            <div className="order-detail-grid">
              <div>
                <small>Người nhận</small>
                <p>{order.recipientName}</p>
                <p>{order.recipientPhone}</p>
              </div>
              <div>
                <small>{order.fulfillmentMethod === "PICKUP_AT_SHOP" ? "Cách nhận máy" : "Địa chỉ giao"}</small>
                <p>{order.fulfillmentMethod === "PICKUP_AT_SHOP" ? "Khách tự đến shop nhận máy" : order.shippingAddress}</p>
              </div>
              <div>
                <small>Ngày đặt</small>
                <p>{formatDateTime(order.createdAt)}</p>
              </div>
              {order.orderType === "RENTAL" && (
                <div>
                  <small>Thời gian thuê</small>
                  <p>{formatDate(order.rentalStartDate)} → {formatDate(order.rentalEndDate)} ({order.rentalDays} ngày)</p>
                </div>
              )}
            </div>

            <h3 className="order-detail-heading">Sản phẩm</h3>
            <div className="order-items-list">
              {order.items?.map((item) => (
                <div key={item.id} className="order-item-row">
                  <img src={resolveImageUrl(item.productImageUrl) || "https://via.placeholder.com/48x48?text=DS"} alt={item.productName} />
                  <div className="order-item-row__info">
                    <p>{item.productName}</p>
                    <span>
                      {formatPrice(item.unitPrice)} × {item.quantity}
                      {item.rentalDays ? ` × ${item.rentalDays} ngày` : ""}
                    </span>
                  </div>
                  <strong>{formatPrice(item.subtotal)}</strong>
                </div>
              ))}
            </div>

            <div className="order-total-breakdown">
              <div><span>Tạm tính</span><span>{formatPrice(order.subtotalAmount)}</span></div>
              {Number(order.discountAmount) > 0 && (
                <div><span>Giảm giá {order.promotionCode ? `(${order.promotionCode})` : ""}</span><span>-{formatPrice(order.discountAmount)}</span></div>
              )}
              {Number(order.loyaltyDiscountAmount) > 0 && (
                <div><span>Giảm giá khách thân thiết</span><span>-{formatPrice(order.loyaltyDiscountAmount)}</span></div>
              )}
              {Number(order.depositAmount) > 0 && (
                <div><span>Tiền cọc</span><span>{formatPrice(order.depositAmount)}</span></div>
              )}
              <div className="order-total-breakdown__total"><span>Tổng cộng</span><span>{formatPrice(order.totalAmount)}</span></div>
            </div>

            {order.status === "DISPUTED" && (
              <div className="order-return-box order-return-box--dispute">
                <h3 className="order-detail-heading">Phát sinh tranh chấp</h3>
                <p><strong>Lý do:</strong> {order.disputeReason}</p>
                <p>Trừ cọc: <strong>{formatPrice(order.damageAmount)}</strong> · Hoàn lại: <strong>{formatPrice(order.refundAmount)}</strong></p>
              </div>
            )}
            {order.status === "COMPLETED" && order.orderType === "RENTAL" && Number(order.refundAmount) > 0 && (
              <div className="order-return-box">
                <p>Đã hoàn cọc: <strong>{formatPrice(order.refundAmount)}</strong></p>
              </div>
            )}

            {order.returnReason && (
              <div className="order-return-box">
                <h3 className="order-detail-heading">
                  {order.status === "RETURN_REQUESTED" && "Đang chờ shop duyệt đổi trả"}
                  {order.status === "RENTAL_RETURN_REQUESTED" && "Đang chờ shop duyệt trả máy"}
                  {order.status === "RETURNED" && "Đã đổi trả thành công"}
                  {!["RETURN_REQUESTED", "RENTAL_RETURN_REQUESTED", "RETURNED"].includes(order.status) && "Yêu cầu đổi trả"}
                </h3>
                <p><strong>Lý do:</strong> {order.returnReason}</p>
                {order.returnRequestedAt && <p><strong>Gửi lúc:</strong> {formatDateTime(order.returnRequestedAt)}</p>}
                {order.returnRejectReason && <p><strong>Lý do từ chối:</strong> {order.returnRejectReason}</p>}
                {order.returnImageUrls?.length > 0 && (
                  <div className="return-evidence-grid">
                    {order.returnImageUrls.map((url) => (
                      <a key={url} href={resolveImageUrl(url)} target="_blank" rel="noreferrer">
                        <img src={resolveImageUrl(url)} alt="Ảnh bằng chứng đổi trả" />
                      </a>
                    ))}
                  </div>
                )}
              </div>
            )}

            {showReturnForm && (
              <div className="order-return-box">
                <h3 className="order-detail-heading">
                  {order.orderType === "RENTAL" ? "📦 Yêu cầu trả máy" : "📦 Yêu cầu đổi trả"}
                </h3>
                <label className="admin-field">
                  <span>Lý do (vd: máy bị hư, trầy xước, thiếu phụ kiện...)</span>
                  <textarea
                    rows={3}
                    value={returnReason}
                    onChange={(e) => setReturnReason(e.target.value)}
                    placeholder="Mô tả cụ thể tình trạng để shop xét duyệt nhanh hơn"
                  />
                </label>

                <label className="admin-field admin-image-upload">
                  <span>Ảnh bằng chứng (có thể chọn nhiều ảnh)</span>
                  <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple onChange={handleReturnImageUpload} disabled={uploadingReturnImg} />
                  {uploadingReturnImg && <small>Đang tải ảnh lên...</small>}
                </label>
                {returnImages.length > 0 && (
                  <div className="return-evidence-grid">
                    {returnImages.map((url, i) => (
                      <div key={url} style={{ position: "relative" }}>
                        <img src={resolveImageUrl(url)} alt={`Ảnh bằng chứng ${i + 1}`} />
                        <button
                          type="button"
                          className="admin2-icon-btn admin2-icon-btn--danger"
                          style={{ position: "absolute", top: 2, right: 2 }}
                          onClick={() => setReturnImages((prev) => prev.filter((u) => u !== url))}
                          aria-label="Xoá ảnh"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="feedback-form__actions">
                  <button type="button" className="btn btn-outline-shutter" onClick={() => setShowReturnForm(false)} disabled={busy}>
                    Huỷ
                  </button>
                  <button type="button" className="btn btn-shutter" onClick={handleSubmitReturn} disabled={busy || uploadingReturnImg}>
                    {busy ? "Đang gửi..." : order.orderType === "RENTAL" ? "Gửi yêu cầu trả máy" : "Gửi yêu cầu đổi trả"}
                  </button>
                </div>
              </div>
            )}

            {error && <p className="product-feedback-inline product-feedback-inline--error">{error}</p>}
          </div>

          <div className="admin-drawer__footer admin-drawer__footer--wrap">
            {canExtend && !showExtend && (
              <button type="button" className="btn btn-outline-shutter" disabled={busy} onClick={() => setShowExtend(true)}>
                Gia hạn thuê
              </button>
            )}
            {canCancel && (
              <button type="button" className="btn btn-outline-shutter" disabled={busy} onClick={handleCancel}>
                Huỷ đơn
              </button>
            )}
            {canRequestReturn && !showReturnForm && (
              <button type="button" className="btn btn-outline-shutter" disabled={busy} onClick={() => setShowReturnForm(true)}>
                {order.orderType === "RENTAL" ? "📦 Yêu cầu trả máy" : "📦 Yêu cầu đổi trả"}
              </button>
            )}
          </div>

          {showExtend && (
            <div className="admin-drawer__footer admin-drawer__footer--wrap order-reject-form">
              <input
                type="date"
                value={newEndDate}
                onChange={(e) => setNewEndDate(e.target.value)}
              />
              <button type="button" className="btn btn-outline-shutter" disabled={busy} onClick={() => setShowExtend(false)}>Huỷ</button>
              <button type="button" className="btn btn-shutter" disabled={busy} onClick={handleExtend}>Xác nhận gia hạn</button>
            </div>
          )}
        </div>
      </div>
    </DrawerPortal>
  );
}

export default function MyOrdersPage() {
  useDocumentTitle("Đơn hàng của tôi");
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [typeFilter, setTypeFilter] = useState("");
  const [selected, setSelected] = useState(null);

  const load = () => {
    setLoading(true);
    setError(null);
    orderApi.getMyOrders(typeFilter || undefined)
      .then(setOrders)
      .catch((err) => setError(toApiError(err).message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typeFilter]);

  const handleChanged = (updated) => {
    setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
    setSelected(updated);
  };

  return (
    <div className="checkout2-page">
      <NavBar />
      <section className="profile-shell">
        <h1>Đơn hàng của tôi</h1>

        <div className="my-orders-filter">
          <button type="button" className={typeFilter === "" ? "is-active" : ""} onClick={() => setTypeFilter("")}>Tất cả</button>
          <button type="button" className={typeFilter === "PURCHASE" ? "is-active" : ""} onClick={() => setTypeFilter("PURCHASE")}>Đơn mua</button>
          <button type="button" className={typeFilter === "RENTAL" ? "is-active" : ""} onClick={() => setTypeFilter("RENTAL")}>Đơn thuê</button>
        </div>

        {loading && <p className="profile-hint">Đang tải đơn hàng...</p>}
        {!loading && error && <p className="profile-hint profile-hint--error">{error}</p>}
        {!loading && !error && orders.length === 0 && <p className="profile-hint">Bạn chưa có đơn hàng nào.</p>}

        {!loading && !error && orders.length > 0 && (
          <div className="my-orders-list">
            {orders.map((order) => (
              <button type="button" className="my-orders-item" key={order.id} onClick={() => setSelected(order)}>
                <div className="my-orders-item__main">
                  <p className="my-orders-item__code">{order.orderCode}</p>
                  <span>{TYPE_LABEL[order.orderType]} · {formatDateTime(order.createdAt)}</span>
                </div>
                <div className="my-orders-item__right">
                  <strong>{formatPrice(order.totalAmount)}</strong>
                  <span className={`order-status-badge order-status-badge--sm ${STATUS_CLASS[order.status]}`}>
                    {STATUS_LABEL[order.status]}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>
      <Footer />

      {selected && (
        <OrderDetail order={selected} onClose={() => setSelected(null)} onChanged={handleChanged} />
      )}
    </div>
  );
}