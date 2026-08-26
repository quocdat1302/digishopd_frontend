import { useEffect, useMemo, useState } from "react";
import { reviewApi } from "../api/reviewApi";
import { feedbackApi } from "../api/feedbackApi";
import { toApiError } from "../api/client";
import { resolveImageUrl, formatDateTime } from "../utils/formatters";

function Stars({ value }) {
  return (
    <span className="feedback-stars">
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className={n <= value ? "is-filled" : ""}>★</span>
      ))}
    </span>
  );
}

/** 1 thẻ đánh giá — admin có thể chỉnh nhẹ nội dung trước khi đăng, hoặc đăng thẳng như khách đã viết. */
function ReviewCard({ review, onPublished, onDeleted }) {
  const [editing, setEditing] = useState(false);
  const [customerName, setCustomerName] = useState(review.userName || "");
  const [comment, setComment] = useState(review.comment || "");
  const [rating, setRating] = useState(review.rating || 5);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const handlePublish = async () => {
    setBusy(true);
    setError(null);
    try {
      const created = await feedbackApi.publishFromReview(review.id, {
        customerName: customerName.trim() || null,
        comment: comment.trim() || null,
        rating,
      });
      onPublished(review.id, created);
      setEditing(false);
    } catch (err) {
      setError(toApiError(err).message);
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Xoá vĩnh viễn đánh giá này của khách?")) return;
    setBusy(true);
    try {
      await reviewApi.deleteReview(review.id);
      onDeleted(review.id);
    } catch (err) {
      alert(toApiError(err).message);
      setBusy(false);
    }
  };

  return (
    <article className="admin-feedback-card">
      {review.imageUrl && (
        <img className="admin-feedback-card__photo" src={resolveImageUrl(review.imageUrl)} alt={review.userName} />
      )}
      <div className="admin-feedback-card__body">
        <div className="admin-feedback-card__head">
          <strong>{review.userName}</strong>
          {review.alreadyPublished && (
            <span className="order-status-badge order-status--completed">Đã đăng lên Feedback</span>
          )}
          {review.productName && <span className="admin-feedback-card__product">📷 {review.productName}</span>}
        </div>

        <Stars value={review.rating} />
        {!editing && <p>{review.comment || <em>(khách không để lại nhận xét)</em>}</p>}
        <small>{formatDateTime(review.createdAt)}</small>

        {editing && (
          <div className="admin-feedback-form" style={{ marginTop: 10 }}>
            <label className="admin-field">
              <span>Tên khách hàng hiển thị</span>
              <input value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
            </label>
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
              <span>Nội dung đăng lên Feedback</span>
              <textarea rows={3} value={comment} onChange={(e) => setComment(e.target.value)} />
            </label>
          </div>
        )}

        {error && <p className="product-feedback-inline product-feedback-inline--error">{error}</p>}

        <div className="admin-feedback-card__actions">
          {!review.alreadyPublished && !editing && (
            <>
              <button type="button" className="btn btn-shutter btn--sm" disabled={busy} onClick={handlePublish}>
                📌 Đăng lên Feedback
              </button>
              <button type="button" className="btn btn-outline-shutter btn--sm" disabled={busy} onClick={() => setEditing(true)}>
                ✎ Sửa trước khi đăng
              </button>
            </>
          )}
          {!review.alreadyPublished && editing && (
            <>
              <button type="button" className="btn btn-shutter btn--sm" disabled={busy} onClick={handlePublish}>
                {busy ? "Đang đăng..." : "📌 Đăng lên Feedback"}
              </button>
              <button type="button" className="btn btn-outline-shutter btn--sm" disabled={busy} onClick={() => setEditing(false)}>
                Huỷ
              </button>
            </>
          )}
          <button type="button" className="admin2-bento-card__delete" disabled={busy} onClick={handleDelete}>
            XOÁ
          </button>
        </div>
      </div>
    </article>
  );
}

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [onlyWithPhoto, setOnlyWithPhoto] = useState(true);

  const load = () => {
    setLoading(true);
    reviewApi
      .getAllReviewsForAdmin()
      .then(setReviews)
      .catch((err) => setError(toApiError(err).message))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const visible = useMemo(
    () => reviews.filter((r) => !onlyWithPhoto || !!r.imageUrl),
    [reviews, onlyWithPhoto]
  );

  const handlePublished = (reviewId, createdFeedback) => {
    setReviews((prev) => prev.map((r) => (r.id === reviewId ? { ...r, alreadyPublished: true } : r)));
  };

  const handleDeleted = (reviewId) => {
    setReviews((prev) => prev.filter((r) => r.id !== reviewId));
  };

  return (
    <div className="admin-page">
      <div className="admin2-ledger-hero">
        <div>
          <h1>Quản lý đánh giá</h1>
          <p>
            Đánh giá kèm ảnh khách hàng gửi sau khi mua hoặc thuê sản phẩm. Chọn ảnh ưng ý và bấm
            "Đăng lên Feedback" để đưa lên trang Feedback công khai.
          </p>
        </div>
      </div>

      <div className="feedback-hero__tabs" style={{ marginBottom: 16 }}>
        <button type="button" className={onlyWithPhoto ? "is-active" : ""} onClick={() => setOnlyWithPhoto(true)}>
          Có ảnh
        </button>
        <button type="button" className={!onlyWithPhoto ? "is-active" : ""} onClick={() => setOnlyWithPhoto(false)}>
          Tất cả đánh giá
        </button>
      </div>

      {loading && <div className="catalog-state">Đang tải...</div>}
      {!loading && error && <div className="catalog-state catalog-state--error">{error}</div>}

      {!loading && !error && (
        <div className="admin-feedback-list">
          {visible.length === 0 && (
            <p className="profile-hint">
              {onlyWithPhoto ? "Chưa có đánh giá nào kèm ảnh." : "Chưa có đánh giá nào."}
            </p>
          )}
          {visible.map((r) => (
            <ReviewCard key={r.id} review={r} onPublished={handlePublished} onDeleted={handleDeleted} />
          ))}
        </div>
      )}
    </div>
  );
}