import { useEffect, useState } from "react";
import NavBar from "../components/NavBar";
import Footer from "../components/Footer";
import { feedbackApi } from "../api/feedbackApi";
import { toApiError } from "../api/client";
import { resolveImageUrl, formatDate } from "../utils/formatters";
import { useAuth } from "../context/AuthContext";
import useDocumentTitle from "../hooks/useDocumentTitle";

function Stars({ value }) {
  return (
    <span className="feedback-stars" aria-label={`${value} sao`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className={n <= value ? "is-filled" : ""}>★</span>
      ))}
    </span>
  );
}

/** Nút thả tim — khách chỉ được thích, không được viết bình luận hay tự đăng bài. */
function LikeButton({ feedback, onToggled }) {
  const { isAuthenticated } = useAuth();
  const [busy, setBusy] = useState(false);

  const handleClick = async () => {
    if (!isAuthenticated) {
      window.location.href = "/login";
      return;
    }
    setBusy(true);
    try {
      if (feedback.likedByMe) {
        await feedbackApi.unlikeFeedback(feedback.id);
        onToggled(feedback.id, false);
      } else {
        await feedbackApi.likeFeedback(feedback.id);
        onToggled(feedback.id, true);
      }
    } catch {
      // im lặng bỏ qua — không phải thao tác quan trọng, không cần chặn UI bằng lỗi
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      className={`feedback-like-btn ${feedback.likedByMe ? "is-liked" : ""}`}
      onClick={handleClick}
      disabled={busy}
      aria-label="Thích"
    >
      <span>{feedback.likedByMe ? "♥" : "♡"}</span>
      {feedback.likeCount > 0 && <em>{feedback.likeCount}</em>}
    </button>
  );
}

export default function FeedbackPage() {
  useDocumentTitle("Feedback khách hàng");
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortMode, setSortMode] = useState("latest"); // "latest" | "loved"

  useEffect(() => {
    feedbackApi
      .getTopFeedbacks()
      .then(setFeedbacks)
      .catch((err) => setError(toApiError(err).message))
      .finally(() => setLoading(false));
  }, []);

  const sorted = [...feedbacks].sort((a, b) =>
    sortMode === "loved" ? (b.likeCount || 0) - (a.likeCount || 0) : new Date(b.createdAt) - new Date(a.createdAt)
  );

  const handleToggleLike = (feedbackId, liked) => {
    setFeedbacks((prev) =>
      prev.map((f) =>
        f.id === feedbackId ? { ...f, likedByMe: liked, likeCount: f.likeCount + (liked ? 1 : -1) } : f
      )
    );
  };

  return (
    <div className="checkout2-page">
      <NavBar />

      <section className="feedback-hero feedback-hero--torn">
        <span className="washi-tape feedback-hero__tape" aria-hidden="true" />
        <span className="hand-stamped-tag" aria-hidden="true">Shared Memories</span>
        <h1>Gói ghém ký ức — Nơi những thước phim kể chuyện</h1>
        <p>Những khoảnh khắc khách hàng lưu giữ được cùng máy ảnh thuê/mua tại DigiShop.</p>

        <div className="feedback-hero__actions">
          <div className="feedback-hero__tabs">
            <button type="button" className={sortMode === "latest" ? "is-active" : ""} onClick={() => setSortMode("latest")}>
              Mới nhất
            </button>
            <button type="button" className={sortMode === "loved" ? "is-active" : ""} onClick={() => setSortMode("loved")}>
              Được yêu thích
            </button>
          </div>
        </div>
      </section>

      <section className="feedback-wall">
        {loading && <p className="profile-hint">Đang tải kỷ niệm...</p>}
        {!loading && error && <p className="profile-hint profile-hint--error">{error}</p>}
        {!loading && !error && sorted.length === 0 && (
          <p className="profile-hint">Chưa có kỷ niệm nào được chia sẻ.</p>
        )}

        <div className="feedback-wall__grid">
          {sorted.map((f, i) => (
            <article key={f.id} className={`feedback-card ${i % 2 === 1 ? "feedback-card--tilt" : ""}`}>
              {f.imageUrl && (
                <div className="feedback-card__photo">
                  <img src={resolveImageUrl(f.imageUrl)} alt={f.customerName} />
                  {f.productName && <span className="feedback-card__tag">📷 {f.productName}</span>}
                </div>
              )}
              <div className="feedback-card__body">
                <div className="feedback-card__head">
                  <strong>{f.customerName}</strong>
                  <LikeButton feedback={f} onToggled={handleToggleLike} />
                </div>
                <Stars value={f.rating} />
                <p>"{f.comment}"</p>
                <small>{formatDate(f.createdAt)}</small>
              </div>
            </article>
          ))}
        </div>
      </section>

      <Footer />
    </div>
  );
}