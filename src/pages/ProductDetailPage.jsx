import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import NavBar from "../components/NavBar";
import Footer from "../components/Footer";
import { productApi } from "../api/productApi";
import { orderApi } from "../api/orderApi";
import { reviewApi } from "../api/reviewApi";
import { feedbackApi } from "../api/feedbackApi";
import { toApiError, uploadImage } from "../api/client";
import { formatCompactDate, formatPrice, resolveImageUrl, toLocalIsoDate, parseLocalIsoDate } from "../utils/formatters";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { useProductImages, ProductGalleryPhoto, ProductGalleryThumbs } from "../components/ProductGallery";
import { flyToCart } from "../utils/flyToCart";
import useDocumentTitle from "../hooks/useDocumentTitle";

function tomorrowIso() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return toLocalIsoDate(d);
}

function addDaysIso(iso, days) {
  const d = parseLocalIsoDate(iso);
  d.setDate(d.getDate() + days);
  return toLocalIsoDate(d);
}

function buildSpecifications(product) {
  if (!product) return [];

  // Ưu tiên thông số kỹ thuật admin tự nhập (mỗi dòng "Tên: Giá trị") — nếu chưa nhập thì mới
  // dùng bộ thông tin suy ra chung chung như cũ (hãng/loại/tình trạng...).
  if (product.techSpecs && product.techSpecs.trim()) {
    const lines = product.techSpecs.split("\n").map((l) => l.trim()).filter(Boolean);
    const icons = ["◆", "◇", "✎", "▣", "✦", "◈", "❖", "◉"];
    return lines.map((line, i) => {
      const idx = line.indexOf(":");
      if (idx === -1) return { icon: icons[i % icons.length], label: line, value: "" };
      return {
        icon: icons[i % icons.length],
        label: line.slice(0, idx).trim(),
        value: line.slice(idx + 1).trim(),
      };
    });
  }

  return [
    { icon: "◆", label: "Hãng", value: product.brand || "Đang cập nhật" },
    { icon: "◇", label: "Loại sản phẩm", value: product.type || "Đang cập nhật" },
    { icon: "✎", label: "Tình trạng", value: product.productCondition === "new" ? "Mới 100%" : "Đã qua sử dụng" },
    { icon: "▣", label: "Số lượng tồn", value: `${product.stockQuantity ?? 0} sản phẩm` },
    { icon: "✦", label: "Trạng thái", value: product.isAvailable ? "Sẵn sàng giao dịch" : "Tạm hết hàng" },
  ];
}

function buildHighlights(product) {
  if (!product) return [];
  const highlights = [];
  highlights.push(product.productCondition === "new" ? "Mới 100%" : "Đã qua sử dụng");
  if (product.isHot) highlights.push("Bán chạy");
  if (product.isNew) highlights.push("Mới về");
  highlights.push(product.isAvailable ? "Còn hàng" : "Tạm hết hàng");
  return highlights;
}

function initials(name) {
  return String(name || "?")
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function Breadcrumb({ product }) {
  return (
    <div className="product-detail-breadcrumb">
      <Link to="/">Home</Link>
      <span>›</span>
      <Link to="/products">Sản phẩm</Link>
      <span>›</span>
      <span className="is-current">{product.name}</span>
    </div>
  );
}

function RelatedGrid({ items, emptyLabel }) {
  if (items.length === 0) {
    return <p className="detail-description">{emptyLabel}</p>;
  }

  return (
    <div className="catalog-grid catalog-grid--compact">
      {items.map((item, index) => (
        <article key={item.id} className={`polaroid-card ${index % 2 === 0 ? "rotate-left" : "rotate-right"}`}>
          <Link to={`/products/${item.id}`} className="polaroid-card__frame">
            <div className="polaroid-card__photo">
              <img src={resolveImageUrl(item.imageUrl) || "https://via.placeholder.com/480x480?text=DigiShop"} alt={item.name} />
            </div>
            <div className="polaroid-card__caption">
              <div className="polaroid-card__meta">
                <span>{item.brand}</span>
                <span>·</span>
                <span>{item.type}</span>
              </div>
              <h3>{item.name}</h3>
              <p className="polaroid-card__price">
                <strong>{formatPrice(item.buyPrice || item.rentPrice)}</strong>
                {!item.buyPrice && item.rentPrice ? "/ngày" : ""}
              </p>
            </div>
          </Link>
        </article>
      ))}
    </div>
  );
}

/* ============================== REVIEWS ================================== */

function ProductReviews({ productId, reviews, isAuthenticated, onSubmitted }) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setUploading(true);
    setMessage(null);
    try {
      const uploadedUrl = await uploadImage(file);
      setImageUrl(uploadedUrl);
      setMessage({ type: "success", text: "Đã tải ảnh lên thành công." });
    } catch (err) {
      setMessage({ type: "error", text: toApiError(err).message });
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);
    try {
      await reviewApi.createReview(productId, {
        rating,
        comment: comment.trim() || null,
        imageUrl: imageUrl.trim() || null,
      });
      setComment("");
      setImageUrl("");
      setMessage({ type: "success", text: "Cảm ơn bạn đã đánh giá!" });
      onSubmitted();
    } catch (err) {
      setMessage({ type: "error", text: toApiError(err).message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="review-shell">
      <div className="review-shell__list">
        <div className="detail-card__heading">
          <h2>Khách hàng nói gì?</h2>
          <span className="detail-card__sub">Đánh giá thật từ khách đã mua/thuê sản phẩm này</span>
        </div>

        {reviews.length === 0 ? (
          <p className="detail-description">Chưa có đánh giá nào cho sản phẩm này.</p>
        ) : (
          <div className="review-grid">
            {reviews.map((review, index) => (
              <article key={review.id} className={`review-polaroid ${index % 2 === 0 ? "rotate-left" : "rotate-right"}`}>
                {index === 1 && <span className="washi-tape tape--rose review-polaroid__tape" aria-hidden="true" />}
                <span className="stars">
                  {"★".repeat(review.rating || 0)}
                  {"☆".repeat(5 - (review.rating || 0))}
                </span>
                {review.comment && <p>"{review.comment}"</p>}
                {review.imageUrl && (
                  <div className="review-polaroid__photo">
                    <img src={resolveImageUrl(review.imageUrl)} alt={`Ảnh đánh giá của ${review.userName}`} />
                  </div>
                )}
                <div className="review-polaroid__author">
                  <span className="review-polaroid__avatar">{initials(review.userName)}</span>
                  <div>
                    <strong>{review.userName}</strong>
                    <small>Verified Review · {formatCompactDate(review.createdAt)}</small>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      <div className="review-shell__form">
        {isAuthenticated ? (
          <form className="review-form" onSubmit={handleSubmit}>
            <h3>Viết đánh giá của bạn</h3>
            <label>
              <span>Số sao</span>
              <select value={rating} onChange={(e) => setRating(Number(e.target.value))}>
                {[5, 4, 3, 2, 1].map((n) => (
                  <option key={n} value={n}>{"★".repeat(n)}{"☆".repeat(5 - n)}</option>
                ))}
              </select>
            </label>
            <label>
              <span>Nhận xét (tuỳ chọn)</span>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Chia sẻ trải nghiệm của bạn..."
                rows={3}
              />
            </label>
            <label>
              <span>Ảnh đính kèm (tuỳ chọn)</span>
              <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={handleUpload} disabled={uploading} />
              {uploading && <small>Đang tải ảnh lên...</small>}
              {imageUrl && <img className="review-upload__preview" src={resolveImageUrl(imageUrl)} alt="Ảnh đánh giá đã tải lên" />}
            </label>
            {message && (
              <p className={`review-form__msg ${message.type === "error" ? "review-form__msg--error" : "review-form__msg--success"}`}>
                {message.text}
              </p>
            )}
            <button type="submit" className="btn btn-shutter" disabled={submitting || uploading}>
              {submitting ? "Đang gửi..." : "Gửi đánh giá"}
            </button>
            <small className="review-form__hint">Bạn cần mua hoặc thuê và hoàn tất đơn hàng của sản phẩm này thì mới gửi được đánh giá.</small>
          </form>
        ) : (
          <p className="detail-description">Đăng nhập và mua/thuê sản phẩm để có thể đánh giá.</p>
        )}
      </div>
    </div>
  );
}

/* ============================== RENT VIEW ============================== */
/* Matches the "Browse / Thuê máy" scrapbook mockup (Fujifilm XT20 style)   */

function RentDetailView({
  product,
  specs,
  highlights,
  calendarDays,
  reviews,
  relatedProducts,
  customerFeedbacks,
  avgRating,
  feedbackMessage,
  feedbackTone,
  handlePrimaryAction,
  canSwitchToBuy,
  onSwitchToBuy,
  rentalStart,
  rentalEnd,
  onRentalStartChange,
  onRentalEndChange,
  onCalendarDayClick,
  submitting,
  detailTab,
  onDetailTabChange,
  isAuthenticated,
  onSubmitted,
}) {
  const images = useProductImages(product);
  const [activeIndex, setActiveIndex] = useState(0);
  useEffect(() => setActiveIndex(0), [product.id]);
  const goPrev = () => setActiveIndex((i) => (i - 1 + images.length) % images.length);
  const goNext = () => setActiveIndex((i) => (i + 1) % images.length);

  const rentalTerms = [
    "Tối thiểu: 6 giờ",
    "Theo ngày: 3 ngày (-10%), 5 ngày (-15%), 7 ngày (-20%)",
    "Linh hoạt theo lịch khách hàng",
  ];
  const documentTerms = [
    "CCCD bản gốc (bắt buộc)",
    "Ảnh chụp CCCD trên APP VNID",
    "Số điện thoại tham chiếu",
  ];
  const paymentTerms = [
    "Cọc CCCD bản gốc/Tiền mặt (tuỳ giá trị máy)",
    "Thanh toán 100% tiền thuê khi nhận máy bằng tiền mặt/chuyển khoản",
    "Hoàn cọc (giấy tờ/tiền): trong 10 phút làm việc",
  ];
  const deliveryTerms = [
    "Chỉ nhận viên cửa Shop giao/nhận máy",
    "Bán kính 5km tại Hồ Chí Minh phí giao nhận là 40.000 VNĐ",
    "Có hình ảnh và video khi giao nhận máy",
  ];

  return (
    <>
      <div className="product-detail-hero">
        <div className="hero-media">
          <div className="polaroid-hero">
            <span className="washi-tape tape--rose polaroid-hero__tape" aria-hidden="true" />
            <span className="polaroid-hero__sticker" aria-hidden="true">✿</span>
            <div className="polaroid-hero__photo">
              <ProductGalleryPhoto
                images={images}
                activeIndex={activeIndex}
                onPrev={goPrev}
                onNext={goNext}
                placeholder="https://via.placeholder.com/720x720?text=DigiShop"
              />
            </div>
            <ProductGalleryThumbs images={images} activeIndex={activeIndex} onSelect={setActiveIndex} />
            <div className="polaroid-hero__caption">
              <h2>{product.name}</h2>
              <p>Capture moments, keep memories.</p>
            </div>
          </div>
        </div>

        <div className="product-summary">
          <div className="product-summary__status">
            <span className={`status-pill ${product.isAvailable ? "" : "status-pill--muted"}`}>
              {product.isAvailable ? "Available" : "Hết hàng"}
            </span>
            {avgRating > 0 && (
              <span className="stars" aria-label={`${avgRating}/5 sao`}>
                {"★".repeat(avgRating)}
                {"☆".repeat(5 - avgRating)}
              </span>
            )}
          </div>

          <h1>{product.name}</h1>
          <p className="product-summary__description">
            {product.description ||
              "Sản phẩm đang được cập nhật mô tả chi tiết. Bạn vẫn có thể xem thông số cơ bản bên dưới."}
          </p>

          <div className="product-price-tag">
            <strong>{formatPrice(product.rentPrice)}</strong>
            <span>/ ngày</span>
          </div>

          {product.rentPriceWeekly && (
            <p className="product-price-weekly">
              Thuê theo tuần: <strong>{formatPrice(product.rentPriceWeekly)}</strong> / tuần
            </p>
          )}

          {(product.rentPriceMorning || product.rentPriceAfternoon || product.rentPriceEvening) && (
            <div className="rental-hourly-price">
              <h3>⏰ Giá thuê theo khung giờ</h3>
              <div className="rental-hourly-price__grid">
                <div className="rental-hourly-price__slot">
                  <span>Sáng</span>
                  <strong>{product.rentPriceMorning ? formatPrice(product.rentPriceMorning) : "—"}</strong>
                </div>
                <div className="rental-hourly-price__slot">
                  <span>Chiều</span>
                  <strong>{product.rentPriceAfternoon ? formatPrice(product.rentPriceAfternoon) : "—"}</strong>
                </div>
                <div className="rental-hourly-price__slot">
                  <span>Tối</span>
                  <strong>{product.rentPriceEvening ? formatPrice(product.rentPriceEvening) : "—"}</strong>
                </div>
              </div>
            </div>
          )}

          <div className="specs-notebook">
            <span className="washi-tape tape--sand specs-notebook__tape" aria-hidden="true" />
            <h3>✎ Thông số kỹ thuật:</h3>
            <ul>
              {specs.map((spec) => (
                <li key={spec.label}>
                  <span>{spec.label}</span>
                  <span>{spec.value}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rental-date-picker">
            <label>
              <span>Ngày nhận máy</span>
              <input type="date" value={rentalStart} min={tomorrowIso()} onChange={(e) => onRentalStartChange(e.target.value)} />
            </label>
            <label>
              <span>Ngày trả máy</span>
              <input type="date" value={rentalEnd} min={rentalStart} onChange={(e) => onRentalEndChange(e.target.value)} />
            </label>
          </div>

          <div className="product-actions-row">
            <button
              type="button"
              className="btn btn-shutter"
              disabled={!product.isAvailable || submitting}
              onClick={handlePrimaryAction}
            >
              🛒 {submitting ? "Đang xử lý..." : "Thuê ngay"}
            </button>
            <a href="#lich-trong" className="btn btn-outline-shutter">
              🗓 Xem lịch thuê
            </a>
          </div>

          {(product.rentPriceMorning || product.rentPriceAfternoon || product.rentPriceEvening) && (
            <p className="product-feedback-inline">
              ⏰ Máy này hỗ trợ thuê theo buổi (Sáng/Chiều/Tối) — chọn buổi cụ thể ở bước tiếp theo sau khi bấm "Thuê ngay".
            </p>
          )}

          {feedbackMessage && (
            <p className={`product-feedback-inline ${feedbackTone === "error" ? "product-feedback-inline--error" : ""}`}>
              {feedbackMessage}
            </p>
          )}

          <div className="highlight-chips">
            <span className="highlight-chips__title">Điểm nổi bật:</span>
            <div>
              {highlights.map((item) => (
                <span key={item} className="highlight-chip">
                  ✓ {item}
                </span>
              ))}
            </div>
          </div>

          <div className="highlight-chips highlight-chips--combo">
            <span className="highlight-chips__title">Combo bao gồm:</span>
            <div>
              {(product.accessoriesIncluded
                ? product.accessoriesIncluded.split(/\n|,/).map((a) => a.trim()).filter(Boolean)
                : ["Thân máy", "Lens kit tiêu chuẩn", "2 viên pin", "Thẻ nhớ 32GB", "Túi đựng"]
              ).map((item) => (
                <span key={item} className="highlight-chip highlight-chip--combo">
                  ✓ {item}
                </span>
              ))}
            </div>
          </div>

          {canSwitchToBuy && (
            <button type="button" className="mode-switch-link" onClick={onSwitchToBuy}>
              Muốn mua đứt sản phẩm này thay vì thuê? →
            </button>
          )}
        </div>
      </div>

      <section className="detail-card detail-card--feedbacks">
        <div className="detail-card__heading">
          <h2>Khách hàng chia sẻ</h2>
          <span className="detail-card__sub">Feedback do admin đăng gắn đúng sản phẩm</span>
        </div>

        {customerFeedbacks.length === 0 ? (
          <p className="detail-description">Sản phẩm này chưa có feedback khách hàng được admin đăng.</p>
        ) : (
          <div className="feedback-wall__grid">
            {customerFeedbacks.map((feedback) => (
              <article key={feedback.id} className="feedback-card">
                {feedback.imageUrl && (
                  <div className="feedback-card__photo">
                    <img src={resolveImageUrl(feedback.imageUrl)} alt={feedback.customerName} />
                  </div>
                )}
                <div className="feedback-card__body">
                  <div className="feedback-card__head">
                    <strong>{feedback.customerName}</strong>
                    <span className="feedback-stars">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <span key={n} className={n <= (feedback.rating || 0) ? "is-filled" : ""}>★</span>
                      ))}
                    </span>
                  </div>
                  <p>{feedback.comment}</p>
                  <small>{formatCompactDate(feedback.createdAt)}</small>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="detail-card detail-card--details">
        <div className="detail-tabs" role="tablist" aria-label="Mô tả chi tiết sản phẩm">
          {[
            { key: "description", label: "Mô tả chi tiết" },
            { key: "specs", label: "Thông số kỹ thuật" },
            { key: "conditions", label: "Điều kiện thuê" },
            { key: "reviews", label: "Đánh giá" },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              className={detailTab === tab.key ? "is-active" : ""}
              onClick={() => onDetailTabChange(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {detailTab === "description" && (
          <div className="detail-tab-content">
            <div className="detail-tab-copy">
              <p>
                {product.description || "DigiShop đang cập nhật thêm nội dung mô tả chi tiết cho sản phẩm này."}
              </p>
            </div>
            <div className="detail-quick-grid">
              <div className="detail-quick-card">
                <span>📷</span>
                <strong>Máy ảnh compact</strong>
                <small>Thiết kế nhỏ gọn, dễ mang theo, phù hợp vlog và chụp đời thường.</small>
              </div>
              <div className="detail-quick-card">
                <span>⚡</span>
                <strong>Khả năng sử dụng</strong>
                <small>Phù hợp thuê theo ngày, quay phim, chụp du lịch và sự kiện nhỏ.</small>
              </div>
            </div>
          </div>
        )}

        {detailTab === "specs" && (
          <div className="detail-tab-content detail-tab-content--specs">
            {specs.map((spec, index) => (
              <div key={`${spec.label}-${index}`} className="spec-row">
                <span>{spec.label}</span>
                <strong>{spec.value}</strong>
              </div>
            ))}
          </div>
        )}

        {detailTab === "conditions" && (
          <div className="detail-tab-content detail-tab-content--conditions">
            <div className="conditions-column">
              <h3>⏱ Thời gian thuê</h3>
              <ul>
                {rentalTerms.map((item) => (
                  <li key={item}>✓ {item}</li>
                ))}
              </ul>
            </div>
            <div className="conditions-column">
              <h3>📄 Giấy tờ cần thiết</h3>
              <ul>
                {documentTerms.map((item) => (
                  <li key={item}>✓ {item}</li>
                ))}
              </ul>
            </div>
            <div className="conditions-column">
              <h3>💳 Thanh toán</h3>
              <ul>
                {paymentTerms.map((item) => (
                  <li key={item}>✓ {item}</li>
                ))}
              </ul>
            </div>
            <div className="conditions-column">
              <h3>🚚 Giao nhận</h3>
              <ul>
                {deliveryTerms.map((item) => (
                  <li key={item}>✓ {item}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {detailTab === "reviews" && (
          <div className="detail-tab-content detail-tab-content--reviews">
            <ProductReviews
              productId={product.id}
              reviews={reviews}
              isAuthenticated={isAuthenticated}
              onSubmitted={onSubmitted}
            />
          </div>
        )}
      </section>

      <section id="lich-trong" className="detail-card detail-card--calendar">
        <div className="detail-card__heading">
          <h2>Lịch thuê</h2>
          <span className="detail-card__sub">Bấm chọn ngày nhận và ngày trả máy trong 15 ngày tới</span>
        </div>
        {calendarDays.length === 0 ? (
          <p className="detail-description">Chưa có dữ liệu lịch cho sản phẩm này trong khoảng thời gian đang xem.</p>
        ) : (
          <>
            <div className="calendar-grid">
              {calendarDays.map((day) => {
                const iso = toLocalIsoDate(day.date);
                const isAvailable = day.status === "available";
                const isStart = iso === rentalStart;
                const isEnd = iso === rentalEnd;
                const isInRange = rentalStart && rentalEnd && iso > rentalStart && iso < rentalEnd;
                const stateClass = isStart || isEnd ? "calendar-day--selected" : isInRange ? "calendar-day--in-range" : "";
                return (
                  <button
                    key={day.date.toISOString()}
                    type="button"
                    disabled={!isAvailable}
                    className={`calendar-day calendar-day--${day.status} ${stateClass}`}
                    onClick={() => onCalendarDayClick(iso)}
                  >
                    <span>{formatCompactDate(day.date)}</span>
                    <small>
                      {!isAvailable ? "Đã thuê hết" : isStart ? "Nhận máy" : isEnd ? "Trả máy" : isInRange ? "Đang chọn" : "Trống"}
                    </small>
                  </button>
                );
              })}
            </div>
            <div className="calendar-legend">
              <span className="calendar-legend__item">
                <i className="calendar-legend__dot calendar-legend__dot--available" /> Còn trống
              </span>
              <span className="calendar-legend__item">
                <i className="calendar-legend__dot calendar-legend__dot--booked" /> Đã thuê hết
              </span>
              <span className="calendar-legend__item">
                <i className="calendar-legend__dot calendar-legend__dot--selected" /> Ngày đang chọn
              </span>
            </div>
          </>
        )}
      </section>

      <section className="detail-card detail-card--related">
        <div className="detail-card__heading">
          <h2>Sản phẩm liên quan</h2>
        </div>
        <RelatedGrid items={relatedProducts} emptyLabel="Chưa có sản phẩm liên quan phù hợp." />
      </section>
    </>
  );
}

/* ============================== BUY VIEW ================================ */
/* Matches the "Shop / Tiệm Tạp Hóa Kỷ Ức" scrapbook mockup (Leica M6 style) */

function BuyDetailView({
  product,
  specs,
  relatedProducts,
  customerFeedbacks,
  reviews,
  avgRating,
  reviewCount,
  feedbackMessage,
  feedbackTone,
  handleAddToCart,
  handleBuyNow,
  canSwitchToRent,
  onSwitchToRent,
  submitting,
  detailTab,
  onDetailTabChange,
  isAuthenticated,
  onSubmitted,
}) {
  const images = useProductImages(product);
  const [activeIndex, setActiveIndex] = useState(0);
  useEffect(() => setActiveIndex(0), [product.id]);
  const goPrev = () => setActiveIndex((i) => (i - 1 + images.length) % images.length);
  const goNext = () => setActiveIndex((i) => (i + 1) % images.length);

  const conditionLabel = product.productCondition === "new" ? "Mới 100%" : "Like New";
  const rentalTerms = [
    "Tối thiểu: 6 giờ",
    "Theo ngày: 3 ngày (-10%), 5 ngày (-15%), 7 ngày (-20%)",
    "Linh hoạt theo lịch khách hàng",
  ];
  const documentTerms = [
    "CCCD bản gốc (bắt buộc)",
    "Ảnh chụp CCCD trên APP VNID",
    "Số điện thoại tham chiếu",
  ];
  const paymentTerms = [
    "Cọc CCCD bản gốc/Tiền mặt (tuỳ giá trị máy)",
    "Thanh toán 100% tiền thuê khi nhận máy bằng tiền mặt/chuyển khoản",
    "Hoàn cọc (giấy tờ/tiền): trong 10 phút làm việc",
  ];
  const deliveryTerms = [
    "Chỉ nhận viên cửa Shop giao/nhận máy",
    "Bán kính 5km tại Hồ Chí Minh phí giao nhận là 40.000 VNĐ",
    "Có hình ảnh và video khi giao nhận máy",
  ];

  return (
    <>
      <div className="buy-hero">
        <div className="buy-hero__media">
          <span className="washi-tape tape--rose buy-hero__tape" aria-hidden="true" />
          <div className="buy-polaroid">
            <div className="buy-polaroid__photo">
              <ProductGalleryPhoto
                images={images}
                activeIndex={activeIndex}
                onPrev={goPrev}
                onNext={goNext}
                placeholder="https://via.placeholder.com/720x720?text=DigiShop"
              />
            </div>
            <ProductGalleryThumbs images={images} activeIndex={activeIndex} onSelect={setActiveIndex} />
            <p className="buy-polaroid__quote">"Giữ trọn khoảnh khắc, vĩnh cửu thời gian"</p>
          </div>
          <span className="status-badge-tilt">{conditionLabel}</span>
        </div>

        <div className="buy-details">
          <h1>{product.name}</h1>

          <div className="buy-rating-row">
            <span className="stars">
              {"★".repeat(avgRating || 5)}
              {"☆".repeat(5 - (avgRating || 5))}
            </span>
            <span>({reviewCount} Đánh giá từ người dùng)</span>
          </div>

          <p className="buy-price-huge">{formatPrice(product.buyPrice)}</p>

          <p className="buy-condition-note">
            Tình trạng: {conditionLabel}. {product.description || "Đã được kiểm tra kỹ lưỡng trước khi lên kệ tại DigiShop."}
          </p>

          <div className="specs-notebook">
            <span className="washi-tape tape--sand specs-notebook__tape" aria-hidden="true" />
            <h3>✎ Thông số kỹ thuật:</h3>
            <ul>
              {specs.map((spec) => (
                <li key={spec.label}>
                  <span>{spec.label}</span>
                  <span>{spec.value}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="cta-pair">
            <button
              type="button"
              className="btn-stamped"
              disabled={!product.isAvailable || Number(product.stockQuantity || 0) <= 0 || submitting}
              onClick={handleAddToCart}
            >
              {submitting ? "Đang thêm..." : "Thêm vào giỏ hàng"}
            </button>
            <button
              type="button"
              className="btn-outline-hand"
              disabled={!product.isAvailable || Number(product.stockQuantity || 0) <= 0 || submitting}
              onClick={handleBuyNow}
            >
              Mua ngay
            </button>
          </div>

          {feedbackMessage && (
            <p className={`product-feedback-inline ${feedbackTone === "error" ? "product-feedback-inline--error" : ""}`}>
              {feedbackMessage}
            </p>
          )}

          <div className="policy-tags">
            <span className="policy-tag">✓ Bảo hành 12 tháng</span>
            <span className="policy-tag">✓ Vệ sinh trọn đời</span>
            <span className="policy-tag">✓ Đổi trả trong 7 ngày</span>
          </div>

          {canSwitchToRent && (
            <button type="button" className="mode-switch-link" onClick={onSwitchToRent}>
              Muốn thuê thử trước khi mua? →
            </button>
          )}
        </div>
      </div>

      <section className="detail-card detail-card--feedbacks">
        <div className="detail-card__heading">
          <h2>Khách hàng chia sẻ</h2>
          <span className="detail-card__sub">Feedback do admin đăng gắn đúng sản phẩm</span>
        </div>

        {customerFeedbacks.length === 0 ? (
          <p className="detail-description">Sản phẩm này chưa có feedback khách hàng được admin đăng.</p>
        ) : (
          <div className="feedback-wall__grid">
            {customerFeedbacks.map((feedback) => (
              <article key={feedback.id} className="feedback-card">
                {feedback.imageUrl && (
                  <div className="feedback-card__photo">
                    <img src={resolveImageUrl(feedback.imageUrl)} alt={feedback.customerName} />
                  </div>
                )}
                <div className="feedback-card__body">
                  <div className="feedback-card__head">
                    <strong>{feedback.customerName}</strong>
                    <span className="feedback-stars">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <span key={n} className={n <= (feedback.rating || 0) ? "is-filled" : ""}>★</span>
                      ))}
                    </span>
                  </div>
                  <p>{feedback.comment}</p>
                  <small>{formatCompactDate(feedback.createdAt)}</small>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="detail-card detail-card--details">
        <div className="detail-tabs" role="tablist" aria-label="Mô tả chi tiết sản phẩm">
          {[
            { key: "description", label: "Mô tả chi tiết" },
            { key: "specs", label: "Thông số kỹ thuật" },
            { key: "conditions", label: "Điều kiện thuê" },
            { key: "reviews", label: "Đánh giá" },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              className={detailTab === tab.key ? "is-active" : ""}
              onClick={() => onDetailTabChange(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {detailTab === "description" && (
          <div className="detail-tab-content">
            <div className="detail-tab-copy">
              <p>
                {product.description ||
                  "DigiShop đang cập nhật thêm nội dung mô tả chi tiết cho sản phẩm này."}
              </p>
            </div>
            <div className="detail-quick-grid">
              <div className="detail-quick-card">
                <span>📷</span>
                <strong>{product.name}</strong>
                <small>Thiết kế tiện dụng, dễ mang theo và phù hợp chụp lưu giữ khoảnh khắc hàng ngày.</small>
              </div>
              <div className="detail-quick-card">
                <span>⚡</span>
                <strong>Khả năng sử dụng</strong>
                <small>Phù hợp cho sở hữu lâu dài, du lịch, quay vlog, và sử dụng hằng ngày với trải nghiệm ổn định.</small>
              </div>
            </div>
          </div>
        )}

        {detailTab === "specs" && (
          <div className="detail-tab-content detail-tab-content--specs">
            {specs.map((spec, index) => (
              <div key={`${spec.label}-${index}`} className="spec-row">
                <span>{spec.label}</span>
                <strong>{spec.value}</strong>
              </div>
            ))}
          </div>
        )}

        {detailTab === "conditions" && (
          <div className="detail-tab-content detail-tab-content--conditions">
            <div className="conditions-column">
              <h3>⏱ Thời gian thuê</h3>
              <ul>
                {rentalTerms.map((item) => (
                  <li key={item}>✓ {item}</li>
                ))}
              </ul>
            </div>
            <div className="conditions-column">
              <h3>📄 Giấy tờ cần thiết</h3>
              <ul>
                {documentTerms.map((item) => (
                  <li key={item}>✓ {item}</li>
                ))}
              </ul>
            </div>
            <div className="conditions-column">
              <h3>💳 Thanh toán</h3>
              <ul>
                {paymentTerms.map((item) => (
                  <li key={item}>✓ {item}</li>
                ))}
              </ul>
            </div>
            <div className="conditions-column">
              <h3>🚚 Giao nhận</h3>
              <ul>
                {deliveryTerms.map((item) => (
                  <li key={item}>✓ {item}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {detailTab === "reviews" && (
          <div className="detail-tab-content detail-tab-content--reviews">
            <ProductReviews
              productId={product.id}
              reviews={reviews}
              isAuthenticated={isAuthenticated}
              onSubmitted={onSubmitted}
            />
          </div>
        )}
      </section>

      <section className="detail-card detail-card--related">
        <div className="detail-card__heading">
          <h2>Phụ kiện &amp; sản phẩm liên quan</h2>
        </div>
        <RelatedGrid items={relatedProducts} emptyLabel="Chưa có phụ kiện hoặc sản phẩm liên quan." />
      </section>
    </>
  );
}

/* ============================== PAGE SHELL =============================== */

export default function ProductDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { addToCart, openMiniCart } = useCart();
  const [searchParams, setSearchParams] = useSearchParams();
  const [product, setProduct] = useState(null);
  useDocumentTitle(product?.name || "Chi tiết sản phẩm");
  const [reviews, setReviews] = useState([]);
  const [feedbacks, setFeedbacks] = useState([]);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [feedbackTone, setFeedbackTone] = useState("info");
  const [submitting, setSubmitting] = useState(false);
  const [rentalStart, setRentalStart] = useState(tomorrowIso());
  const [rentalEnd, setRentalEnd] = useState(addDaysIso(tomorrowIso(), 2));
  // Đang chọn "ngày trả" hay bắt đầu lại một khoảng mới — cho phép bấm 2 lần trên lịch
  // (1 lần chọn ngày nhận, 1 lần chọn ngày trả) thay vì chỉ gõ tay vào ô ngày.
  const [pickingEnd, setPickingEnd] = useState(false);
  const [detailTab, setDetailTab] = useState("description");

  const loadReviews = () => {
    reviewApi.getReviews(id).then(setReviews).catch(() => {});
  };

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    setFeedbackMessage("");

    Promise.all([
      productApi.getProductById(id),
      productApi.getAllProducts(),
      reviewApi.getReviews(id),
      feedbackApi.getProductFeedbacks(id),
    ])
      .then(([currentProduct, allProducts, productReviews, productFeedbacks]) => {
        if (!active) return;

        setProduct(currentProduct);
        setReviews(Array.isArray(productReviews) ? productReviews : []);
        setFeedbacks(Array.isArray(productFeedbacks) ? productFeedbacks : []);

        const related = (allProducts || [])
          .filter((item) => item.id !== currentProduct?.id)
          .filter((item) => item.brand === currentProduct?.brand || item.type === currentProduct?.type)
          .slice(0, 4);
        setRelatedProducts(related);
      })
      .catch((err) => {
        if (active) setError(toApiError(err).message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [id]);

  const supportsBuy = Number(product?.buyPrice || 0) > 0;
  const supportsRent = Number(product?.rentPrice || 0) > 0;
  const mode = searchParams.get("mode");
  const activeMode = mode === "rent" && supportsRent
    ? "rent"
    : mode === "buy" && supportsBuy
      ? "buy"
      : supportsRent
        ? "rent"
        : "buy";

  const specs = useMemo(() => buildSpecifications(product), [product]);
  const highlights = useMemo(() => buildHighlights(product), [product]);
  const customerFeedbacks = useMemo(() => feedbacks || [], [feedbacks]);

  // Lịch trống thật (15 ngày tới) — trước đây phần này bị hardcode "available" cho mọi ngày,
  // không phản ánh đúng ngày nào đã hết máy. Giờ lấy thật từ API theo sản phẩm.
  const [calendarDays, setCalendarDays] = useState([]);
  useEffect(() => {
    if (!product?.id || !supportsRent) {
      setCalendarDays([]);
      return;
    }
    const from = new Date();
    const to = new Date();
    to.setDate(to.getDate() + 14);
    orderApi
      .getProductAvailability(product.id, toLocalIsoDate(from), toLocalIsoDate(to))
      .then((rows) => {
        const allDays = (rows || []).map((r) => ({
          date: parseLocalIsoDate(r.date),
          status: Number(r.remaining || 0) > 0 ? "available" : "booked",
          remaining: Number(r.remaining || 0),
        }));
        setCalendarDays(allDays);
      })
      .catch(() => setCalendarDays([]));
  }, [product?.id, supportsRent]);

  // Tra cứu nhanh trạng thái 1 ngày theo chuỗi ISO — dùng để kiểm tra cả khoảng ngày,
  // không chỉ riêng ngày nhận/ngày trả (đúng với cách backend tính: 2 đầu mút đều tính là ngày bị giữ chỗ).
  const calendarByIso = useMemo(() => {
    const map = new Map();
    for (const day of calendarDays) map.set(toLocalIsoDate(day.date), day.status);
    return map;
  }, [calendarDays]);

  /**
   * Một khoảng thuê chỉ hợp lệ khi TẤT CẢ các ngày từ start → end (bao gồm cả 2 đầu) đều "available".
   * Trước đây chỉ kiểm tra riêng ngày bắt đầu/kết thúc nên khách vẫn có thể chọn xuyên qua
   * một ngày đã hết máy ở giữa khoảng — logic đó sai với cách BE tính overlap (inclusive 2 đầu).
   * Ngày nằm ngoài 15 ngày đã tải (chưa có dữ liệu) được coi là "chưa xác định" và không chặn ở FE,
   * vì BE vẫn sẽ kiểm tra lại lần cuối khi tạo đơn.
   */
  const isRangeAvailable = (startIso, endIso) => {
    let cursor = parseLocalIsoDate(startIso);
    const end = parseLocalIsoDate(endIso);
    while (!(cursor > end)) {
      const iso = toLocalIsoDate(cursor);
      const status = calendarByIso.get(iso);
      if (status === "booked") return false;
      cursor = parseLocalIsoDate(addDaysIso(iso, 1));
    }
    return true;
  };

  // Từ 1 ngày bắt đầu, tìm ngày kết thúc mặc định gần nhất mà cả khoảng vẫn còn trống —
  // tránh tình trạng bấm chọn ngày nhận xong tự động gán ngày trả = nhận + 1 nhưng ngày đó đã hết máy.
  const findNextAvailableEnd = (startIso) => {
    let candidate = addDaysIso(startIso, 1);
    for (let i = 0; i < 15; i += 1) {
      if (isRangeAvailable(startIso, candidate)) return candidate;
      candidate = addDaysIso(candidate, 1);
    }
    return addDaysIso(startIso, 1);
  };

  // Ngày nhận/trả mặc định (mai → mốt) được set trước khi biết lịch trống thật.
  // Khi dữ liệu lịch tải xong, nếu cặp ngày mặc định đó đụng phải ngày đã hết máy
  // thì tự động dò ngày trống gần nhất thay vì để khách bấm "Thuê ngay" rồi mới báo lỗi.
  useEffect(() => {
    if (calendarDays.length === 0) return;
    if (isRangeAvailable(rentalStart, rentalEnd)) return;
    const firstAvailable = calendarDays.find((d) => d.status === "available");
    if (!firstAvailable) return;
    const newStart = toLocalIsoDate(firstAvailable.date);
    setRentalStart(newStart);
    setRentalEnd(findNextAvailableEnd(newStart));
    setPickingEnd(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calendarDays]);

  const avgRating = useMemo(() => {
    if (!reviews.length) return 0;
    const total = reviews.reduce((sum, r) => sum + (Number(r.rating) || 0), 0);
    return Math.round(total / reviews.length);
  }, [reviews]);

  const switchMode = (nextMode) => {
    const next = new URLSearchParams(searchParams);
    next.set("mode", nextMode);
    setSearchParams(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const requireAuthOrRedirect = () => {
    if (isAuthenticated) return true;
    setFeedbackTone("error");
    setFeedbackMessage("Bạn cần đăng nhập trước. Đang chuyển tới trang đăng nhập...");
    setTimeout(() => navigate("/login"), 1200);
    return false;
  };

  const handleAddToCart = async () => {
    if (!requireAuthOrRedirect()) return;
    setSubmitting(true);
    setFeedbackMessage("");
    try {
      await addToCart({ productId: product.id, orderType: "PURCHASE", quantity: 1 });
      setFeedbackTone("success");
      setFeedbackMessage("Đã thêm vào giỏ hàng! Bạn có thể tiếp tục xem sản phẩm khác hoặc vào giỏ để thanh toán.");
      const heroImg = document.querySelector(".buy-polaroid__photo img");
      flyToCart(heroImg);
      openMiniCart();
    } catch (err) {
      setFeedbackTone("error");
      setFeedbackMessage(toApiError(err).message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleBuyNow = async () => {
    if (!requireAuthOrRedirect()) return;
    setSubmitting(true);
    setFeedbackMessage("");
    try {
      await addToCart({ productId: product.id, orderType: "PURCHASE", quantity: 1 });
      navigate("/cart");
    } catch (err) {
      setFeedbackTone("error");
      setFeedbackMessage(toApiError(err).message);
      setSubmitting(false);
    }
  };

  const handleRentNow = () => {
    if (!requireAuthOrRedirect()) return;
    if (!rentalStart || !rentalEnd || !(rentalEnd > rentalStart)) {
      setFeedbackTone("error");
      setFeedbackMessage("Vui lòng chọn ngày trả sau ngày nhận máy.");
      return;
    }
    if (!isRangeAvailable(rentalStart, rentalEnd)) {
      setFeedbackTone("error");
      setFeedbackMessage("Khoảng ngày bạn chọn có ngày đã hết máy, vui lòng chọn lại trên lịch bên dưới.");
      return;
    }
    navigate(`/rent-booking/${product.id}?start=${rentalStart}&end=${rentalEnd}`);
  };

  if (loading) {
    return (
      <div className="product-detail-page">
        <NavBar />
        <div className="catalog-state">Đang tải chi tiết sản phẩm...</div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="product-detail-page">
        <NavBar />
        <div className="catalog-state catalog-state--error">{error || "Không tìm thấy sản phẩm."}</div>
      </div>
    );
  }

  return (
    <div className={`product-detail-page ${activeMode === "buy" ? "product-detail-page--buy" : "product-detail-page--rent"}`}>
      <NavBar />

      <section className="product-detail-shell">
        <Breadcrumb product={product} />

        {activeMode === "buy" ? (
          <BuyDetailView
            product={product}
            specs={specs}
            relatedProducts={relatedProducts}
            customerFeedbacks={customerFeedbacks}
            avgRating={avgRating}
            reviewCount={reviews.length}
            feedbackMessage={feedbackMessage}
            feedbackTone={feedbackTone}
            handleAddToCart={handleAddToCart}
            handleBuyNow={handleBuyNow}
            canSwitchToRent={supportsRent}
            onSwitchToRent={() => switchMode("rent")}
            submitting={submitting}
            reviews={reviews}
            detailTab={detailTab}
            onDetailTabChange={setDetailTab}
            isAuthenticated={isAuthenticated}
            onSubmitted={loadReviews}
          />
        ) : (
          <RentDetailView
            product={product}
            specs={specs}
            highlights={highlights}
            calendarDays={calendarDays}
            reviews={reviews}
            relatedProducts={relatedProducts}
            customerFeedbacks={customerFeedbacks}
            avgRating={avgRating}
            feedbackMessage={feedbackMessage}
            feedbackTone={feedbackTone}
            handlePrimaryAction={handleRentNow}
            canSwitchToBuy={supportsBuy}
            onSwitchToBuy={() => switchMode("buy")}
            rentalStart={rentalStart}
            rentalEnd={rentalEnd}
            onRentalStartChange={(v) => {
              const nextEnd = rentalEnd > v && isRangeAvailable(v, rentalEnd) ? rentalEnd : findNextAvailableEnd(v);
              setRentalStart(v);
              setRentalEnd(nextEnd);
              setPickingEnd(true);
              setFeedbackMessage("");
            }}
            onRentalEndChange={(v) => {
              if (!isRangeAvailable(rentalStart, v)) {
                setFeedbackTone("error");
                setFeedbackMessage("Trong khoảng ngày bạn chọn có ngày đã hết máy, vui lòng chọn lại.");
                return;
              }
              setRentalEnd(v);
              setPickingEnd(false);
              setFeedbackMessage("");
            }}
            onCalendarDayClick={(iso) => {
              if (!pickingEnd || iso <= rentalStart) {
                // Bấm chọn ngày nhận máy (hoặc bắt đầu chọn lại một khoảng ngày mới)
                setRentalStart(iso);
                setRentalEnd(findNextAvailableEnd(iso));
                setPickingEnd(true);
                setFeedbackMessage("");
                return;
              }
              // Bấm chọn ngày trả máy (phải sau ngày nhận và cả khoảng phải còn trống hết)
              if (!isRangeAvailable(rentalStart, iso)) {
                setFeedbackTone("error");
                setFeedbackMessage("Trong khoảng ngày bạn chọn có ngày đã hết máy — đã tự chọn lại ngày nhận máy mới.");
                setRentalStart(iso);
                setRentalEnd(findNextAvailableEnd(iso));
                setPickingEnd(true);
                return;
              }
              setRentalEnd(iso);
              setPickingEnd(false);
              setFeedbackMessage("");
            }}
            submitting={submitting}
            detailTab={detailTab}
            onDetailTabChange={setDetailTab}
            isAuthenticated={isAuthenticated}
            onSubmitted={loadReviews}
          />
        )}

      </section>

      <Footer />
    </div>
  );
}