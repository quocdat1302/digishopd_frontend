import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { feedbackApi } from "../api/feedbackApi";
import { productApi } from "../api/productApi";
import { toApiError, uploadImage } from "../api/client";
import { resolveImageUrl, formatDateTime } from "../utils/formatters";

const STATUS_LABEL = { APPROVED: "Đang hiện", REJECTED: "Đã ẩn" };
const STATUS_CLASS = { APPROVED: "order-status--completed", REJECTED: "order-status--cancelled" };

/** Form đăng 1 bài feedback mới — admin chọn ảnh khách gửi, gõ lại lời khách nói, gắn vào đúng sản phẩm. */
function CreateFeedbackForm({ products, onCreated }) {
  const [customerName, setCustomerName] = useState("");
  const [comment, setComment] = useState("");
  const [rating, setRating] = useState(5);
  const [productId, setProductId] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      setImageUrl(await uploadImage(file));
    } catch (err) {
      setError(toApiError(err).message);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!customerName.trim() || !comment.trim()) {
      setError("Vui lòng nhập tên khách và nội dung feedback.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const created = await feedbackApi.createFeedback({
        customerName: customerName.trim(),
        comment: comment.trim(),
        rating,
        imageUrl: imageUrl || null,
        productId: productId ? Number(productId) : null,
      });
      onCreated(created);
      setCustomerName("");
      setComment("");
      setRating(5);
      setProductId("");
      setImageUrl("");
    } catch (err) {
      setError(toApiError(err).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="admin-feedback-form" onSubmit={handleSubmit}>
      <h3 className="admin-drawer__section-title">📷 Đăng feedback mới</h3>

      <div className="admin-field-row">
        <label className="admin-field">
          <span>Tên khách hàng</span>
          <input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="vd: Ánh Trần" />
        </label>
        <label className="admin-field">
          <span>Sản phẩm được feedback (tuỳ chọn)</span>
          <select value={productId} onChange={(e) => setProductId(e.target.value)}>
            <option value="">— Không gắn sản phẩm —</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="admin-field admin-image-upload">
        <span>Ảnh khách gửi</span>
        <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={handleFile} disabled={uploading} />
        {uploading && <small>Đang tải ảnh lên...</small>}
        {imageUrl && <img className="admin-image-upload__preview" src={resolveImageUrl(imageUrl)} alt="Xem trước" />}
      </div>

      <label className="admin-field">
        <span>Đánh giá</span>
        <div className="feedback-form__rating">
          {[1, 2, 3, 4, 5].map((n) => (
            <button type="button" key={n} className={n <= rating ? "is-active" : ""} onClick={() => setRating(n)} aria-label={`${n} sao`}>
              ★
            </button>
          ))}
        </div>
      </label>

      <label className="admin-field">
        <span>Nội dung (lời khách nói / caption)</span>
        <textarea rows={3} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Máy màu đẹp rõ nét lắm chị ơi..." />
      </label>

      {error && <p className="product-feedback-inline product-feedback-inline--error">{error}</p>}

      <button type="submit" className="btn btn-shutter" disabled={submitting || uploading}>
        {submitting ? "Đang đăng..." : "+ Đăng bài feedback"}
      </button>
    </form>
  );
}

export default function AdminFeedbackPage() {
  const [feedbacks, setFeedbacks] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const load = () => {
    setLoading(true);
    feedbackApi
      .getAllFeedbacksForAdmin()
      .then(setFeedbacks)
      .catch((err) => setError(toApiError(err).message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    productApi.getAllProducts().then(setProducts).catch(() => {});
  }, []);

  const handleToggleVisible = async (f) => {
    setBusyId(f.id);
    try {
      const next = f.status === "APPROVED" ? "REJECTED" : "APPROVED";
      const updated = await feedbackApi.updateFeedbackStatus(f.id, next);
      setFeedbacks((prev) => prev.map((x) => (x.id === f.id ? updated : x)));
    } catch (err) {
      alert(toApiError(err).message);
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Xoá vĩnh viễn bài feedback này?")) return;
    setBusyId(id);
    try {
      await feedbackApi.deleteFeedback(id);
      setFeedbacks((prev) => prev.filter((f) => f.id !== id));
    } catch (err) {
      alert(toApiError(err).message);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="admin-page">
      <div className="admin2-ledger-hero">
        <div>
          <h1>Quản lý Feedback</h1>
         
        </div>
      </div>

      <CreateFeedbackForm products={products} onCreated={(f) => setFeedbacks((prev) => [f, ...prev])} />

      <hr style={{ margin: "24px 0", border: "none", borderTop: "1px solid rgba(68,42,34,0.1)" }} />

      {loading && <div className="catalog-state">Đang tải...</div>}
      {!loading && error && <div className="catalog-state catalog-state--error">{error}</div>}

      {!loading && !error && (
        <div className="admin-feedback-list">
          {feedbacks.length === 0 && <p className="profile-hint">Chưa có bài feedback nào.</p>}
          {feedbacks.map((f) => (
            <article key={f.id} className="admin-feedback-card">
              {f.imageUrl && (
                <img className="admin-feedback-card__photo" src={resolveImageUrl(f.imageUrl)} alt={f.customerName} />
              )}
              <div className="admin-feedback-card__body">
                <div className="admin-feedback-card__head">
                  <strong>{f.customerName}</strong>
                  <span className={`order-status-badge ${STATUS_CLASS[f.status]}`}>{STATUS_LABEL[f.status]}</span>
                  {f.productName && <span className="admin-feedback-card__product">📷 {f.productName}</span>}
                </div>
                <span className="feedback-stars">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <span key={n} className={n <= f.rating ? "is-filled" : ""}>★</span>
                  ))}
                </span>
                <span className="admin-feedback-card__likes">♥ {f.likeCount} lượt thích</span>
                <p>{f.comment}</p>
                <small>{formatDateTime(f.createdAt)}</small>

                <div className="admin-feedback-card__actions">
                  <button type="button" className="btn btn-outline-shutter btn--sm" disabled={busyId === f.id} onClick={() => handleToggleVisible(f)}>
                    {f.status === "APPROVED" ? "Ẩn bài" : "Hiện lại"}
                  </button>
                  <button type="button" className="admin2-bento-card__delete" disabled={busyId === f.id} onClick={() => handleDelete(f.id)}>
                    XOÁ
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}