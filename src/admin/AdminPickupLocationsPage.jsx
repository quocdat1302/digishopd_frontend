import { useEffect, useState } from "react";
import { pickupLocationApi } from "../api/pickupLocationApi";
import { toApiError } from "../api/client";
import { formatPrice } from "../utils/formatters";

const EMPTY_FORM = { name: "", address: "", fee: "0", isDelivery: false, active: true, displayOrder: 0 };

export default function AdminPickupLocationsPage() {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    pickupLocationApi
      .getAllForAdmin()
      .then(setLocations)
      .catch((err) => setError(toApiError(err).message))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const startEdit = (loc) => {
    setEditingId(loc.id);
    setForm({
      name: loc.name,
      address: loc.address || "",
      fee: String(loc.fee ?? 0),
      isDelivery: loc.isDelivery,
      active: loc.active,
      displayOrder: 0,
    });
  };

  const resetForm = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError("Vui lòng nhập tên địa điểm.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = {
        name: form.name.trim(),
        address: form.address.trim() || null,
        fee: Number(form.fee) || 0,
        isDelivery: form.isDelivery,
        active: form.active,
        displayOrder: Number(form.displayOrder) || 0,
      };
      if (editingId) {
        await pickupLocationApi.update(editingId, payload);
      } else {
        await pickupLocationApi.create(payload);
      }
      resetForm();
      load();
    } catch (err) {
      setError(toApiError(err).message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Xoá địa điểm này?")) return;
    try {
      await pickupLocationApi.remove(id);
      setLocations((prev) => prev.filter((l) => l.id !== id));
    } catch (err) {
      alert(toApiError(err).message);
    }
  };

  return (
    <div className="admin-page">
      <div className="admin2-ledger-hero">
        <div>
          <h1>Địa điểm nhận máy</h1>
          <p>Cấu hình các lựa chọn nhận máy khi thuê (tại shop, chi nhánh khác, giao tận nơi...) kèm phụ phí — khách chọn lúc đặt thuê.</p>
        </div>
      </div>

      <form className="admin-feedback-form" onSubmit={handleSubmit}>
        <h3 className="admin-drawer__section-title">{editingId ? "✎ Sửa địa điểm" : "+ Thêm địa điểm mới"}</h3>
        <div className="admin-field-row">
          <label className="admin-field">
            <span>Tên hiển thị</span>
            <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="vd: Chi nhánh Bình Thạnh" />
          </label>
          <label className="admin-field">
            <span>Phụ phí (đ, 0 = miễn phí)</span>
            <input type="number" min="0" value={form.fee} onChange={(e) => setForm((f) => ({ ...f, fee: e.target.value }))} />
          </label>
        </div>
        <label className="admin-field">
          <span>Địa chỉ / ghi chú</span>
          <input
            value={form.address}
            onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
            placeholder="vd: 525/20 Tô Hiến Thành, P.14, Q.10 — hoặc 'Giao trong bán kính 5km'"
          />
        </label>
        <div className="admin-field-row">
          <label className="addon-grid__item" style={{ display: "inline-flex" }}>
            <input type="checkbox" checked={form.isDelivery} onChange={(e) => setForm((f) => ({ ...f, isDelivery: e.target.checked }))} />
            <span>Là hình thức giao tận nơi (khách phải nhập địa chỉ riêng)</span>
          </label>
          <label className="addon-grid__item" style={{ display: "inline-flex" }}>
            <input type="checkbox" checked={form.active} onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))} />
            <span>Đang áp dụng (hiện cho khách chọn)</span>
          </label>
        </div>

        {error && <p className="product-feedback-inline product-feedback-inline--error">{error}</p>}

        <div style={{ display: "flex", gap: 10 }}>
          <button type="submit" className="btn btn-shutter btn--sm" disabled={saving}>
            {saving ? "Đang lưu..." : editingId ? "Lưu thay đổi" : "+ Thêm địa điểm"}
          </button>
          {editingId && (
            <button type="button" className="btn btn-outline-shutter btn--sm" onClick={resetForm}>
              Huỷ sửa
            </button>
          )}
        </div>
      </form>

      {loading && <div className="catalog-state">Đang tải...</div>}
      {!loading && (
        <div className="admin-feedback-list">
          {locations.map((loc) => (
            <article key={loc.id} className="admin-feedback-card">
              <div className="admin-feedback-card__body">
                <div className="admin-feedback-card__head">
                  <strong>{loc.name}</strong>
                  <span className={`order-status-badge ${loc.active ? "order-status--completed" : "order-status--cancelled"}`}>
                    {loc.active ? "Đang áp dụng" : "Đã ẩn"}
                  </span>
                  {loc.isDelivery && <span className="admin-feedback-card__product">🛵 Giao tận nơi</span>}
                </div>
                {loc.address && <p>{loc.address}</p>}
                <p><strong>Phụ phí:</strong> {Number(loc.fee) > 0 ? formatPrice(loc.fee) : "Miễn phí"}</p>
                <div className="admin-feedback-card__actions">
                  <button type="button" className="btn btn-outline-shutter btn--sm" onClick={() => startEdit(loc)}>
                    Sửa
                  </button>
                  <button type="button" className="admin2-bento-card__delete" onClick={() => handleDelete(loc.id)}>
                    XOÁ
                  </button>
                </div>
              </div>
            </article>
          ))}
          {locations.length === 0 && <p className="profile-hint">Chưa có địa điểm nào — khách sẽ mặc định nhận tại shop.</p>}
        </div>
      )}
    </div>
  );
}