import { useEffect, useState } from "react";
import { productApi } from "../api/productApi";
import { toApiError, uploadImage } from "../api/client";
import { resolveImageUrl } from "../utils/formatters";

/**
 * Section quản lý ảnh mẫu (khách chụp bằng máy này) cho 1 sản phẩm — nhúng thẳng trong form
 * sửa sản phẩm (không còn là drawer riêng). Cho phép tải ảnh từ file HOẶC dán URL, xoá theo từng ảnh.
 */
export default function SamplePhotosManager({ product }) {
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [imageUrl, setImageUrl] = useState("");
  const [caption, setCaption] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const load = () => {
    setLoading(true);
    productApi
      .getSamplePhotos(product.id)
      .then(setPhotos)
      .catch((err) => setError(toApiError(err).message))
      .finally(() => setLoading(false));
  };

  useEffect(load, [product.id]);

  const addPhoto = async (url) => {
    setError(null);
    try {
      await productApi.addSamplePhoto(product.id, { imageUrl: url, caption: caption.trim() || null });
      setImageUrl("");
      setCaption("");
      load();
    } catch (err) {
      setError(toApiError(err).message);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // cho phép chọn lại cùng 1 file lần sau
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const url = await uploadImage(file);
      await addPhoto(url);
    } catch (err) {
      setError(toApiError(err).message);
    } finally {
      setUploading(false);
    }
  };

  const handleAddByUrl = async () => {
    if (!imageUrl.trim()) {
      setError("Vui lòng nhập URL ảnh.");
      return;
    }
    setSubmitting(true);
    await addPhoto(imageUrl.trim());
    setSubmitting(false);
  };

  const handleDelete = async (photoId) => {
    setDeletingId(photoId);
    try {
      await productApi.deleteSamplePhoto(photoId);
      setPhotos((prev) => prev.filter((p) => p.id !== photoId));
    } catch (err) {
      setError(toApiError(err).message);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="admin-inline-section">
      <h3 className="admin-inline-section__title">📸 Ảnh mẫu</h3>
      <p className="profile-hint">
        Ảnh chụp bằng máy này, hiển thị ở trang sản phẩm để khách hình dung chất lượng ảnh trước khi thuê.
      </p>

      <div className="admin-field admin-image-upload">
        <span>Thêm ảnh từ file</span>
        <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={handleFileUpload} disabled={uploading} />
        {uploading && <small>Đang tải ảnh lên...</small>}
      </div>

      <div className="admin-field-row">
        <label className="admin-field">
          <span>Hoặc dán URL ảnh</span>
          <input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://..." />
        </label>
        <label className="admin-field">
          <span>Chú thích (tuỳ chọn)</span>
          <input value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Chụp buổi tối tại Hồ Gươm" />
        </label>
      </div>
      {error && <p className="product-feedback-inline product-feedback-inline--error">{error}</p>}
      <button type="button" className="btn btn-shutter btn--sm" disabled={submitting} onClick={handleAddByUrl}>
        {submitting ? "Đang thêm..." : "+ Thêm ảnh bằng URL"}
      </button>

      <hr style={{ margin: "20px 0", border: "none", borderTop: "1px solid rgba(68,42,34,0.1)" }} />

      {loading && <p className="profile-hint">Đang tải...</p>}
      {!loading && photos.length === 0 && <p className="profile-hint">Chưa có ảnh mẫu nào.</p>}

      <div className="sample-photos__grid">
        {photos.map((photo) => (
          <div className="sample-photos__item" key={photo.id}>
            <img src={resolveImageUrl(photo.imageUrl)} alt={photo.caption || product.name} />
            {photo.caption && <span>{photo.caption}</span>}
            <button
              type="button"
              className="admin2-icon-btn admin2-icon-btn--danger"
              style={{ position: "absolute", top: 4, right: 4 }}
              disabled={deletingId === photo.id}
              onClick={() => handleDelete(photo.id)}
              aria-label="Xoá ảnh"
            >
              🗑
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}