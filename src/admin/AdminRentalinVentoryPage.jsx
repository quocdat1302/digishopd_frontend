import { useEffect, useState } from "react";
import { orderApi } from "../api/orderApi";
import { toApiError } from "../api/client";
import { resolveImageUrl } from "../utils/formatters";

const SLOT_LABELS = { MORNING: "Sáng", AFTERNOON: "Chiều", EVENING: "Tối" };

function toIso(d) {
  return d.toISOString().slice(0, 10);
}

export default function AdminRentalInventoryPage() {
  const [date, setDate] = useState(() => toIso(new Date()));
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    orderApi
      .getRentalInventory(date)
      .then(setRows)
      .catch((err) => setError(toApiError(err).message))
      .finally(() => setLoading(false));
  }, [date]);

  const totalOut = rows.reduce((sum, r) => sum + r.reservedQuantity, 0);
  const totalStock = rows.reduce((sum, r) => sum + r.stockQuantity, 0);

  return (
    <div className="admin-page">
      <div className="admin2-ledger-hero">
        <div>
          <h1>Kiểm soát tồn kho thuê</h1>
          <p>Xem theo từng ngày: sản phẩm nào đang được thuê bao nhiêu máy, còn trống bao nhiêu — kể cả buổi nào (Sáng/Chiều/Tối) đã có người đặt.</p>
        </div>
      </div>

      <div className="admin-field-row" style={{ maxWidth: 320, marginBottom: 20 }}>
        <label className="admin-field">
          <span>Xem theo ngày</span>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
      </div>

      {!loading && !error && rows.length > 0 && (
        <div className="admin-field-row" style={{ marginBottom: 20 }}>
          <div className="profile-sidebar__stats" style={{ flex: 1 }}>
            <div><span>Tổng máy cho thuê:</span><strong>{totalStock}</strong></div>
            <div><span>Đang được thuê ngày này:</span><strong>{totalOut}</strong></div>
            <div><span>Còn trống:</span><strong>{totalStock - totalOut}</strong></div>
          </div>
        </div>
      )}

      {loading && <div className="catalog-state">Đang tải...</div>}
      {!loading && error && <div className="catalog-state catalog-state--error">{error}</div>}

      {!loading && !error && (
        <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Sản phẩm</th>
              <th>Tổng kho</th>
              <th>Đang thuê</th>
              <th>Còn trống</th>
              <th>Buổi đã đặt</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.productId}>
                <td style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  {r.productImageUrl && (
                    <img
                      src={resolveImageUrl(r.productImageUrl)}
                      alt={r.productName}
                      style={{ width: 40, height: 40, objectFit: "cover", borderRadius: 4 }}
                    />
                  )}
                  {r.productName}
                </td>
                <td>{r.stockQuantity}</td>
                <td>
                  <strong style={{ color: r.reservedQuantity > 0 ? "var(--tertiary)" : "inherit" }}>
                    {r.reservedQuantity}
                  </strong>
                </td>
                <td>
                  <span className={`order-status-badge ${r.availableQuantity > 0 ? "order-status--completed" : "order-status--cancelled"}`}>
                    {r.availableQuantity > 0 ? `Còn ${r.availableQuantity}` : "Hết máy"}
                  </span>
                </td>
                <td>
                  {r.bookedSlots?.length > 0
                    ? r.bookedSlots.map((s) => SLOT_LABELS[s] || s).join(", ")
                    : "—"}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="profile-hint">Chưa có sản phẩm cho thuê nào.</td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
      )}
    </div>
  );
}