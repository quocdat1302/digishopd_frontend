import { useEffect, useMemo, useState } from "react";
import { reportApi } from "../api/reportApi";
import { orderApi } from "../api/orderApi";
import { productApi } from "../api/productApi";
import { toApiError } from "../api/client";
import { formatPrice, formatDateTime, toLocalIsoDate, parseLocalIsoDate } from "../utils/formatters";
import { IconWallet, IconBag, IconCamera, IconWarning, IconCalendar, IconBox } from "./AdminIcons";

const RANGE_PRESETS = [
  { value: "all", label: "Toàn bộ thời gian" },
  { value: "7", label: "7 ngày qua" },
  { value: "30", label: "30 ngày qua" },
  { value: "90", label: "90 ngày qua" },
];

function toCsv(rows, headers) {
  const escape = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const lines = [headers.map(escape).join(",")];
  rows.forEach((row) => lines.push(row.map(escape).join(",")));
  return lines.join("\n");
}

function downloadCsv(filename, csvContent) {
  const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function monthLabel(key) {
  const [y, m] = key.split("-");
  return `Th${Number(m)}/${y.slice(2)}`;
}

function toIso(d) {
  return toLocalIsoDate(d);
}

function rangeToDates(range) {
  if (range === "all") return { from: undefined, to: undefined };
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - Number(range));
  return { from: toIso(from), to: toIso(to) };
}

export default function AdminReportsPage() {
  const [range, setRange] = useState("all");
  const [revenue, setRevenue] = useState(null);
  const [weeklyRevenue, setWeeklyRevenue] = useState(null);
  const [topRented, setTopRented] = useState([]);
  const [damaged, setDamaged] = useState([]);
  const [topSold, setTopSold] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const { from, to } = rangeToDates(range);

    Promise.all([
      reportApi.getRevenueReport(from, to),
      reportApi.getWeeklyRevenue(),
      reportApi.getTopRentedProducts(from, to, 10),
      reportApi.getDamagedDevices(from, to),
      Promise.all([orderApi.getAllOrdersForAdmin("PURCHASE"), productApi.getAllProductsForAdmin()]),
    ])
      .then(([revenueData, weeklyData, topRentedData, damagedData, [purchaseOrders, products]]) => {
        setRevenue(revenueData);
        setWeeklyRevenue(weeklyData);
        setTopRented(topRentedData);
        setDamaged(damagedData);

        // "Sản phẩm bán chạy nhất" chưa có API riêng theo yêu cầu ban đầu (chỉ revenue/top-rented/damaged-devices
        // có API) — tính bổ sung ở đây từ danh sách đơn mua, lọc theo cùng khoảng ngày.
        const productById = new Map(products.map((p) => [p.id, p]));
        const cutoffFrom = from ? parseLocalIsoDate(from) : null;
        const cutoffTo = to ? new Date(to + "T23:59:59") : null;
        const map = new Map();
        purchaseOrders
          .filter((o) => o.status !== "CANCELLED")
          .filter((o) => {
            const created = new Date(o.createdAt);
            if (cutoffFrom && created < cutoffFrom) return false;
            if (cutoffTo && created > cutoffTo) return false;
            return true;
          })
          .forEach((o) => {
            (o.items || []).forEach((item) => {
              if (!item.productId) return;
              const bucket = map.get(item.productId) || { quantity: 0, revenue: 0 };
              bucket.quantity += item.quantity || 0;
              bucket.revenue += Number(item.subtotal || 0);
              map.set(item.productId, bucket);
            });
          });
        const sold = [...map.entries()]
          .map(([productId, stats]) => ({ product: productById.get(productId), productId, ...stats }))
          .sort((a, b) => b.quantity - a.quantity)
          .slice(0, 10);
        setTopSold(sold);
      })
      .catch((err) => setError(toApiError(err).message))
      .finally(() => setLoading(false));
  }, [range]);

  const months = useMemo(() => {
    if (!revenue) return [];
    return revenue.monthly.map((m) => ({
      key: m.month,
      label: monthLabel(m.month),
      purchase: Number(m.purchaseRevenue || 0),
      rental: Number(m.rentalRevenue || 0),
    }));
  }, [revenue]);
  const maxMonthly = Math.max(1, ...months.map((m) => Math.max(m.purchase, m.rental)));

  const weekDays = useMemo(() => {
    if (!weeklyRevenue) return [];
    return weeklyRevenue.daily.map((d) => ({
      date: d.date,
      label: d.dayLabel,
      purchase: Number(d.purchaseRevenue || 0),
      rental: Number(d.rentalRevenue || 0),
      orderCount: Number(d.orderCount || 0),
    }));
  }, [weeklyRevenue]);
  const maxWeekly = Math.max(1, ...weekDays.map((d) => d.purchase + d.rental));

  const handleExportWeekly = () => {
    const csv = toCsv(
      weekDays.map((d) => [d.date, d.label, Math.round(d.purchase), Math.round(d.rental), Math.round(d.purchase + d.rental), d.orderCount]),
      ["Ngày", "Thứ", "Doanh thu mua (đ)", "Doanh thu thuê (đ)", "Tổng doanh thu (đ)", "Số đơn hoàn tất"]
    );
    downloadCsv("doanh-thu-7-ngay.csv", csv);
  };

  const handleExportTopRented = () => {
    const csv = toCsv(
      topRented.map((r, i) => [i + 1, r.productName, r.brand || "", r.rentalCount, r.totalQuantity, r.revenue]),
      ["Hạng", "Sản phẩm", "Hãng", "Số lượt thuê", "Tổng số lượng", "Doanh thu (đ)"]
    );
    downloadCsv("thiet-bi-thue-nhieu-nhat.csv", csv);
  };

  const handleExportDamaged = () => {
    const csv = toCsv(
      damaged.map((r) => [r.productName, r.brand || "", r.disputeCount, Math.round(r.totalDamageAmount), r.lastDisputeAt ? formatDateTime(r.lastDisputeAt) : ""]),
      ["Sản phẩm", "Hãng", "Số lần tranh chấp", "Tổng tiền trừ cọc (đ)", "Lần gần nhất"]
    );
    downloadCsv("thiet-bi-hong.csv", csv);
  };

  if (loading) return <div className="catalog-state">Đang tải báo cáo...</div>;
  if (error) return <div className="catalog-state catalog-state--error">{error}</div>;

  return (
    <div className="admin-page">
      <div className="admin2-toolbar">
        <div>
          <h1>Báo cáo thống kê</h1>
          <p className="rental-calendar__subtitle">Doanh thu, thiết bị được thuê nhiều nhất và thiết bị phát sinh hư hỏng.</p>
        </div>
        <div className="reports-range-picker">
          {RANGE_PRESETS.map((preset) => (
            <button
              key={preset.value}
              type="button"
              className={range === preset.value ? "is-active" : ""}
              onClick={() => setRange(preset.value)}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      <section className="admin2-stats admin2-stats--reports">
        <div className="admin2-stat">
          <IconWallet className="admin2-stat__icon" aria-hidden="true" />
          <small>Tổng doanh thu</small>
          <strong className="admin2-stat__revenue">{formatPrice(revenue.totalRevenue)}</strong>
        </div>
        <div className="admin2-stat">
          <IconBag className="admin2-stat__icon" aria-hidden="true" />
          <small>Doanh thu mua hàng</small>
          <strong className="admin2-stat__revenue">{formatPrice(revenue.purchaseRevenue)}</strong>
        </div>
        <div className="admin2-stat">
          <IconCamera className="admin2-stat__icon" aria-hidden="true" />
          <small>Doanh thu cho thuê</small>
          <strong className="admin2-stat__revenue">{formatPrice(revenue.rentalRevenue)}</strong>
        </div>
        <div className="admin2-stat">
          <IconBox className="admin2-stat__icon" aria-hidden="true" />
          <small>Tổng đơn hàng hoàn tất</small>
          <strong>{revenue.totalOrders}</strong>
        </div>
        <div className="admin2-stat">
          <IconWallet className="admin2-stat__icon" aria-hidden="true" />
          <small>Giá trị đơn TB (hoàn tất)</small>
          <strong className="admin2-stat__revenue">
            {formatPrice(revenue.totalOrders > 0 ? Number(revenue.totalRevenue) / revenue.totalOrders : 0)}
          </strong>
        </div>
        <div className="admin2-stat">
          <IconWarning className="admin2-stat__icon" aria-hidden="true" />
          <small>Thiết bị có báo cáo hỏng</small>
          <strong>{damaged.length}</strong>
        </div>
        <div className="admin2-stat">
          <IconCalendar className="admin2-stat__icon" aria-hidden="true" />
          <small>Doanh thu 7 ngày qua</small>
          <strong className="admin2-stat__revenue">{formatPrice(weeklyRevenue?.totalRevenue || 0)}</strong>
        </div>
        <div className="admin2-stat">
          <IconBox className="admin2-stat__icon" aria-hidden="true" />
          <small>Đơn hoàn tất 7 ngày qua</small>
          <strong>{weeklyRevenue?.totalOrders || 0}</strong>
        </div>
      </section>

      <div className="dashboard-panel dashboard-panel--wide">
        <div className="dashboard-panel__head">
          <h2><IconCalendar className="dashboard-panel__icon" aria-hidden="true" /> Doanh thu 7 ngày gần nhất — theo ngày</h2>
          {weekDays.length > 0 && (
            <button type="button" className="reports-export-btn" onClick={handleExportWeekly}>Xuất CSV</button>
          )}
        </div>
        {weekDays.length === 0 && <p className="dashboard-empty">Chưa có dữ liệu doanh thu tuần này.</p>}
        {weekDays.length > 0 && (
          <>
            <div className="reports-monthly-chart">
              {weekDays.map((d) => (
                <div className="reports-monthly-chart__col" key={d.date}>
                  <div className="reports-monthly-chart__bars" title={`${d.label} (${d.date}): ${formatPrice(d.purchase + d.rental)} · ${d.orderCount} đơn`}>
                    <div
                      className="reports-monthly-chart__bar reports-monthly-chart__bar--purchase"
                      style={{ height: `${(d.purchase / maxWeekly) * 100}%` }}
                    />
                    <div
                      className="reports-monthly-chart__bar reports-monthly-chart__bar--rental"
                      style={{ height: `${(d.rental / maxWeekly) * 100}%` }}
                    />
                  </div>
                  <span>{d.label} · {d.orderCount} đơn</span>
                </div>
              ))}
            </div>
            <div className="reports-monthly-chart__legend">
              <span><i className="reports-monthly-chart__bar--purchase" /> Mua hàng</span>
              <span><i className="reports-monthly-chart__bar--rental" /> Cho thuê</span>
            </div>
          </>
        )}
      </div>

      <div className="dashboard-panel dashboard-panel--wide">
        <div className="dashboard-panel__head">
          <h2>Doanh thu theo tháng — Mua vs Thuê</h2>
        </div>
        {months.length === 0 && <p className="dashboard-empty">Chưa có đơn hàng hoàn tất nào trong khoảng thời gian này.</p>}
        {months.length > 0 && (
          <>
            <div className="reports-monthly-chart">
              {months.map((m) => (
                <div className="reports-monthly-chart__col" key={m.key}>
                  <div className="reports-monthly-chart__bars">
                    <div
                      className="reports-monthly-chart__bar reports-monthly-chart__bar--purchase"
                      style={{ height: `${(m.purchase / maxMonthly) * 100}%` }}
                      title={`Mua: ${formatPrice(m.purchase)}`}
                    />
                    <div
                      className="reports-monthly-chart__bar reports-monthly-chart__bar--rental"
                      style={{ height: `${(m.rental / maxMonthly) * 100}%` }}
                      title={`Thuê: ${formatPrice(m.rental)}`}
                    />
                  </div>
                  <span>{m.label}</span>
                </div>
              ))}
            </div>
            <div className="reports-monthly-chart__legend">
              <span><i className="reports-monthly-chart__bar--purchase" /> Mua hàng</span>
              <span><i className="reports-monthly-chart__bar--rental" /> Cho thuê</span>
            </div>
          </>
        )}
      </div>

      <div className="dashboard-grid">
        <div className="dashboard-panel">
          <div className="dashboard-panel__head">
            <h2>Thiết bị thuê nhiều nhất</h2>
            <button type="button" className="reports-export-btn" onClick={handleExportTopRented}>Xuất CSV</button>
          </div>
          {topRented.length === 0 && <p className="dashboard-empty">Chưa có dữ liệu thuê trong khoảng thời gian này.</p>}
          {topRented.length > 0 && (
            <table className="reports-table">
              <thead>
                <tr><th>#</th><th>Sản phẩm</th><th>Lượt thuê</th><th>Doanh thu</th></tr>
              </thead>
              <tbody>
                {topRented.map((r, i) => (
                  <tr key={r.productId}>
                    <td>{i + 1}</td>
                    <td>
                      <p>{r.productName}</p>
                      <span>{r.brand}</span>
                    </td>
                    <td>{r.rentalCount} lượt · {r.totalQuantity} máy</td>
                    <td>{formatPrice(r.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="dashboard-panel">
          <div className="dashboard-panel__head">
            <h2>Sản phẩm bán chạy nhất</h2>
          </div>
          {topSold.length === 0 && <p className="dashboard-empty">Chưa có dữ liệu mua hàng trong khoảng thời gian này.</p>}
          {topSold.length > 0 && (
            <table className="reports-table">
              <thead>
                <tr><th>#</th><th>Sản phẩm</th><th>Đã bán</th><th>Doanh thu</th></tr>
              </thead>
              <tbody>
                {topSold.map((r, i) => (
                  <tr key={r.productId}>
                    <td>{i + 1}</td>
                    <td>
                      <p>{r.product?.name || `#${r.productId}`}</p>
                      <span>{r.product?.brand}</span>
                    </td>
                    <td>{r.quantity} máy</td>
                    <td>{formatPrice(r.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="dashboard-panel dashboard-panel--wide">
          <div className="dashboard-panel__head">
            <h2>Thiết bị hỏng / phát sinh tranh chấp</h2>
            {damaged.length > 0 && (
              <button type="button" className="reports-export-btn" onClick={handleExportDamaged}>Xuất CSV</button>
            )}
          </div>
          {damaged.length === 0 && <p className="dashboard-empty">Không có thiết bị nào phát sinh hư hỏng/tranh chấp trong khoảng thời gian này. 🎉</p>}
          {damaged.length > 0 && (
            <table className="reports-table">
              <thead>
                <tr><th>Sản phẩm</th><th>Số lần</th><th>Tổng tiền trừ cọc</th><th>Lần gần nhất</th></tr>
              </thead>
              <tbody>
                {damaged.map((r) => (
                  <tr key={r.productId}>
                    <td>
                      <p>{r.productName}</p>
                      <span>{r.brand}</span>
                    </td>
                    <td>{r.disputeCount}</td>
                    <td className="reports-table__danger">{formatPrice(r.totalDamageAmount)}</td>
                    <td>{r.lastDisputeAt ? formatDateTime(r.lastDisputeAt) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}