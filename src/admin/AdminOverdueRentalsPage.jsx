import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { reportApi } from "../api/reportApi";
import { toApiError } from "../api/client";
import { formatPrice } from "../utils/formatters";
import { IconWarning } from "./AdminIcons";

export default function AdminOverdueRentalsPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = () => {
    setLoading(true);
    reportApi
      .getOverdueRentals()
      .then(setRows)
      .catch((err) => setError(toApiError(err).message))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const totalLateFee = rows.reduce((sum, r) => sum + Number(r.lateFeeAmount || 0), 0);

  return (
    <div className="admin-page">
      <div className="admin2-ledger-hero">
        <div>
          <h1>Lịch trễ hạn</h1>
          <p>
            Đơn thuê đang quá hạn trả máy, kèm số tiền phạt trễ hạn tạm tính (tự cập nhật mỗi ngày lúc 10:00
            sáng, đơn giá phạt/ngày = giá thuê trung bình/ngày của đơn).
          </p>
        </div>
      </div>

      <section className="admin2-stats" style={{ marginBottom: 24 }}>
        <div className="admin2-stat">
          <IconWarning className="admin2-stat__icon" aria-hidden="true" />
          <small>Đơn đang trễ hạn</small>
          <strong>{rows.length}</strong>
        </div>
        <div className="admin2-stat">
          <IconWarning className="admin2-stat__icon" aria-hidden="true" />
          <small>Tổng phí phạt tạm tính</small>
          <strong className="admin2-stat__revenue">{formatPrice(totalLateFee)}</strong>
        </div>
      </section>

      {error && <p className="product-feedback-inline product-feedback-inline--error">{error}</p>}
      {loading && <p className="profile-hint">Đang tải...</p>}

      {!loading && rows.length === 0 && (
        <p className="profile-hint">Không có đơn thuê nào đang trễ hạn 🎉</p>
      )}

      {!loading && rows.length > 0 && (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Đơn hàng</th>
                <th>Khách hàng</th>
                <th>Sản phẩm</th>
                <th>Hết hạn</th>
                <th>Số ngày trễ</th>
                <th>Cọc</th>
                <th>Phí phạt tạm tính</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.orderId}>
                  <td>
                    <Link to={`/admin/orders?q=${encodeURIComponent(r.orderCode)}`}>{r.orderCode}</Link>
                  </td>
                  <td>
                    {r.customerName}
                    <br />
                    <small style={{ color: "var(--text-faint)" }}>{r.customerPhone}</small>
                  </td>
                  <td>
                    {r.productName}
                    {r.quantity > 1 && ` (x${r.quantity})`}
                  </td>
                  <td>{r.rentalEndDate}</td>
                  <td>
                    <strong style={{ color: "var(--error)" }}>{r.overdueDays} ngày</strong>
                  </td>
                  <td>{formatPrice(r.depositAmount)}</td>
                  <td>
                    <strong style={{ color: "var(--error)" }}>{formatPrice(r.lateFeeAmount)}</strong>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}