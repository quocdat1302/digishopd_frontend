import { useEffect, useState } from "react";
import { productApi } from "../api/productApi";
import { toApiError } from "../api/client";
import { formatPrice } from "../utils/formatters";

/** Section quản lý phụ kiện bổ sung khi thuê cho 1 sản phẩm — nhúng thẳng trong form sửa sản phẩm. */
export default function AddonsManager({ product }) {
  const [addons, setAddons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [included, setIncluded] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const load = () => {
    setLoading(true);
    productApi
      .getAddons(product.id)
      .then(setAddons)
      .catch((err) => setError(toApiError(err).message))
      .finally(() => setLoading(false));
  };

  useEffect(load, [product.id]);

  const handleAdd = async () => {
    if (!name.trim()) {
      setError("Vui lòng nhập tên phụ kiện.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await productApi.addAddon(product.id, {
        name: name.trim(),
        price: included ? 0 : Number(price) || 0,
        included,
        displayOrder: addons.length,
      });
      setName("");
      setPrice("");
      setIncluded(false);
      load();
    } catch (err) {
      setError(toApiError(err).message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (addonId) => {
    setDeletingId(addonId);
    try {
      await productApi.deleteAddon(addonId);
      setAddons((prev) => prev.filter((a) => a.id !== addonId));
    } catch (err) {
      setError(toApiError(err).message);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="admin-inline-section">
      <h3 className="admin-inline-section__title">🎒 Phụ kiện bổ sung</h3>
      <p className="profile-hint">
        Phụ kiện "đi kèm miễn phí" sẽ tự động cộng vào mọi đơn thuê sản phẩm này. Phụ kiện "trả thêm" để khách
        tự chọn lúc đặt lịch, cộng thêm vào tổng tiền nếu được chọn.
      </p>

      <div className="admin-field-row">
        <label className="admin-field">
          <span>Tên phụ kiện</span>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Cuộn phim Fuji 200" />
        </label>
        <label className="admin-field">
          <span>Giá phụ thu (đ)</span>
          <input
            type="number"
            min="0"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            disabled={included}
            placeholder="0"
          />
        </label>
      </div>
      <label className="addon-grid__item" style={{ display: "inline-flex", marginBottom: 12 }}>
        <input type="checkbox" checked={included} onChange={(e) => setIncluded(e.target.checked)} />
        <span>Đi kèm miễn phí (không tính phí, tự động thêm vào mọi đơn)</span>
      </label>
      {error && <p className="product-feedback-inline product-feedback-inline--error">{error}</p>}
      <div>
        <button type="button" className="btn btn-shutter btn--sm" disabled={submitting} onClick={handleAdd}>
          {submitting ? "Đang thêm..." : "+ Thêm phụ kiện"}
        </button>
      </div>

      <hr style={{ margin: "20px 0", border: "none", borderTop: "1px solid rgba(68,42,34,0.1)" }} />

      {loading && <p className="profile-hint">Đang tải...</p>}
      {!loading && addons.length === 0 && <p className="profile-hint">Chưa có phụ kiện nào.</p>}

      <div className="addon-grid" style={{ gridTemplateColumns: "1fr" }}>
        {addons.map((addon) => (
          <div className="addon-grid__item" key={addon.id}>
            <span className="addon-grid__name">
              {addon.name} {addon.included && <em>(miễn phí)</em>}
            </span>
            <span className="addon-grid__price">{addon.included ? "Incl." : formatPrice(addon.price)}</span>
            <button
              type="button"
              className="admin2-icon-btn admin2-icon-btn--danger"
              disabled={deletingId === addon.id}
              onClick={() => handleDelete(addon.id)}
              aria-label="Xoá phụ kiện"
            >
              🗑
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}