import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { resolveImageUrl } from "../utils/formatters";

/**
 * Gộp ảnh chính (product.imageUrl) + ảnh mẫu (product.samplePhotos) thành 1 danh sách ảnh
 * duy nhất để hiển thị dạng gallery (thumbnail + ảnh lớn), loại trùng theo URL.
 */
export function useProductImages(product) {
  return useMemo(() => {
    const list = [];
    const seen = new Set();
    const push = (url, alt) => {
      if (!url || seen.has(url)) return;
      seen.add(url);
      list.push({ url, alt: alt || product?.name || "" });
    };
    push(product?.imageUrl, product?.name);
    (product?.samplePhotos || []).forEach((p) => push(p.imageUrl, p.caption));
    return list;
  }, [product]);
}

/** Ảnh lớn đang xem + mũi tên chuyển ảnh trước/sau (chỉ hiện khi có nhiều hơn 1 ảnh).
 *  Bấm vào ảnh sẽ mở lightbox xem full màn hình (phóng to/thu nhỏ). */
export function ProductGalleryPhoto({ images, activeIndex, onPrev, onNext, placeholder }) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const active = images[activeIndex];

  return (
    <>
      <button
        type="button"
        className="product-gallery__zoom-trigger"
        onClick={() => setLightboxOpen(true)}
        aria-label="Xem ảnh phóng to"
      >
        <img src={resolveImageUrl(active?.url) || placeholder} alt={active?.alt || ""} />
      </button>
      {images.length > 1 && (
        <>
          <button
            type="button"
            className="product-gallery__nav product-gallery__nav--prev"
            onClick={onPrev}
            aria-label="Ảnh trước"
          >
            ‹
          </button>
          <button
            type="button"
            className="product-gallery__nav product-gallery__nav--next"
            onClick={onNext}
            aria-label="Ảnh sau"
          >
            ›
          </button>
          <span className="product-gallery__counter">
            {activeIndex + 1}/{images.length}
          </span>
        </>
      )}

      {lightboxOpen && (
        <ProductGalleryLightbox
          images={images}
          activeIndex={activeIndex}
          onPrev={onPrev}
          onNext={onNext}
          onClose={() => setLightboxOpen(false)}
          placeholder={placeholder}
        />
      )}
    </>
  );
}

/** Xem ảnh phóng to toàn màn hình — Esc/bấm nền/nút X để đóng, mũi tên hoặc phím ←/→ để chuyển ảnh. */
function ProductGalleryLightbox({ images, activeIndex, onPrev, onNext, onClose, placeholder }) {
  const active = images[activeIndex];

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && images.length > 1) onPrev();
      if (e.key === "ArrowRight" && images.length > 1) onNext();
    };
    document.addEventListener("keydown", onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose, onPrev, onNext, images.length]);

  return createPortal(
    <div className="product-lightbox" onClick={onClose}>
      <button type="button" className="product-lightbox__close" onClick={onClose} aria-label="Đóng">
        ✕
      </button>
      <img
        src={resolveImageUrl(active?.url) || placeholder}
        alt={active?.alt || ""}
        className="product-lightbox__image"
        onClick={(e) => e.stopPropagation()}
      />
      {images.length > 1 && (
        <>
          <button
            type="button"
            className="product-lightbox__nav product-lightbox__nav--prev"
            onClick={(e) => {
              e.stopPropagation();
              onPrev();
            }}
            aria-label="Ảnh trước"
          >
            ‹
          </button>
          <button
            type="button"
            className="product-lightbox__nav product-lightbox__nav--next"
            onClick={(e) => {
              e.stopPropagation();
              onNext();
            }}
            aria-label="Ảnh sau"
          >
            ›
          </button>
          <span className="product-lightbox__counter">
            {activeIndex + 1}/{images.length}
          </span>
        </>
      )}
    </div>,
    document.body
  );
}

/** Dải ảnh nhỏ để chọn nhanh ảnh đang xem — ẩn khi chỉ có 1 ảnh. */
export function ProductGalleryThumbs({ images, activeIndex, onSelect }) {
  if (images.length <= 1) return null;
  return (
    <div className="product-gallery__thumbs">
      {images.map((img, i) => (
        <button
          key={img.url + i}
          type="button"
          className={`product-gallery__thumb${i === activeIndex ? " is-active" : ""}`}
          onClick={() => onSelect(i)}
          aria-label={`Xem ảnh ${i + 1}`}
        >
          <img src={resolveImageUrl(img.url)} alt="" />
        </button>
      ))}
    </div>
  );
}