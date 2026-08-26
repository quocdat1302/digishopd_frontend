import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { productApi } from "../api/productApi";
import { categoryApi } from "../api/categoryApi";
import { orderApi } from "../api/orderApi";
import { reportApi } from "../api/reportApi";
import { toApiError } from "../api/client";
import { formatPrice, formatDateTime, resolveImageUrl } from "../utils/formatters";
import { STATUS_LABEL, STATUS_CLASS, TYPE_LABEL, STATUS_COLOR } from "./orderConstants";
import { IconCamera, IconCheck, IconTag, IconClock, IconWallet, IconReport, IconInventory, IconCalendar, IconBox } from "./AdminIcons";

const LOW_STOCK_THRESHOLD = 2;
const RECENT_ORDERS_LIMIT = 6;
const LOW_STOCK_LIMIT = 6;

function monthLabel(key) {
  const [y, m] = key.split("-");
  return `Th${Number(m)}/${y.slice(2)}`;
}

/** Biểu đồ đường — doanh thu theo tháng, 2 đường Mua/Thuê. Tự vẽ bằng SVG, không cần thư viện ngoài. */
function RevenueLineChart({ months }) {
  const width = 560;
  const height = 200;
  const padX = 36;
  const padY = 20;

  if (months.length === 0) {
    return <p className="dashboard-empty">Chưa có dữ liệu doanh thu để vẽ biểu đồ.</p>;
  }

  const maxVal = Math.max(1, ...months.map((m) => Math.max(m.purchase, m.rental)));
  const stepX = months.length > 1 ? (width - padX * 2) / (months.length - 1) : 0;

  const pointsFor = (key) =>
    months.map((m, i) => {
      const x = padX + i * stepX;
      const y = height - padY - (m[key] / maxVal) * (height - padY * 2);
      return { x, y, value: m[key] };
    });

  const purchasePoints = pointsFor("purchase");
  const rentalPoints = pointsFor("rental");
  const toPolyline = (pts) => pts.map((p) => `${p.x},${p.y}`).join(" ");

  return (
    <div className="line-chart">
      <svg viewBox={`0 0 ${width} ${height}`} className="line-chart__svg">
        {[0.25, 0.5, 0.75, 1].map((f) => (
          <line
            key={f}
            x1={padX} x2={width - padX}
            y1={height - padY - f * (height - padY * 2)}
            y2={height - padY - f * (height - padY * 2)}
            className="line-chart__grid"
          />
        ))}
        <polyline points={toPolyline(purchasePoints)} className="line-chart__line line-chart__line--purchase" />
        <polyline points={toPolyline(rentalPoints)} className="line-chart__line line-chart__line--rental" />
        {purchasePoints.map((p, i) => (
          <circle key={`p-${i}`} cx={p.x} cy={p.y} r={3.5} className="line-chart__dot line-chart__dot--purchase">
            <title>Mua {months[i].label}: {formatPrice(p.value)}</title>
          </circle>
        ))}
        {rentalPoints.map((p, i) => (
          <circle key={`r-${i}`} cx={p.x} cy={p.y} r={3.5} className="line-chart__dot line-chart__dot--rental">
            <title>Thuê {months[i].label}: {formatPrice(p.value)}</title>
          </circle>
        ))}
        {months.map((m, i) => (
          <text key={m.key} x={padX + i * stepX} y={height - 4} className="line-chart__axis-label" textAnchor="middle">
            {m.label}
          </text>
        ))}
      </svg>
      <div className="line-chart__legend">
        <span><i className="line-chart__legend-dot line-chart__legend-dot--purchase" /> Mua hàng</span>
        <span><i className="line-chart__legend-dot line-chart__legend-dot--rental" /> Cho thuê</span>
      </div>
    </div>
  );
}

/** Biểu đồ cột — doanh thu 7 ngày gần nhất, mỗi cột tách 2 phần Mua/Thuê chồng lên nhau. */
function WeeklyRevenueChart({ days }) {
  if (!days || days.length === 0) {
    return <p className="dashboard-empty">Chưa có dữ liệu doanh thu tuần này.</p>;
  }
  const maxVal = Math.max(1, ...days.map((d) => d.purchase + d.rental));

  return (
    <div className="weekly-chart">
      {days.map((d) => (
        <div className="weekly-chart__col" key={d.date}>
          <div className="weekly-chart__track" title={`${d.label} (${d.date}): ${formatPrice(d.purchase + d.rental)} · ${d.orderCount} đơn`}>
            <div
              className="weekly-chart__seg weekly-chart__seg--rental"
              style={{ height: `${(d.rental / maxVal) * 100}%` }}
            />
            <div
              className="weekly-chart__seg weekly-chart__seg--purchase"
              style={{ height: `${(d.purchase / maxVal) * 100}%` }}
            />
          </div>
          <span className="weekly-chart__count">{d.orderCount > 0 ? d.orderCount : ""}</span>
          <span className="weekly-chart__label">{d.label}</span>
        </div>
      ))}
      <div className="line-chart__legend weekly-chart__legend">
        <span><i className="line-chart__legend-dot line-chart__legend-dot--purchase" /> Mua hàng</span>
        <span><i className="line-chart__legend-dot line-chart__legend-dot--rental" /> Cho thuê</span>
      </div>
    </div>
  );
}

/** Biểu đồ tròn (donut) — phân bố trạng thái đơn hàng. Dùng CSS conic-gradient, không cần vẽ path SVG. */
function StatusDonutChart({ segments, total }) {
  if (total === 0) {
    return <p className="dashboard-empty">Chưa có đơn hàng nào.</p>;
  }

  let cursor = 0;
  const stops = segments
    .filter((s) => s.count > 0)
    .map((s) => {
      const start = cursor;
      const pct = (s.count / total) * 100;
      cursor += pct;
      return `${s.color} ${start}% ${cursor}%`;
    });

  return (
    <div className="donut-chart">
      <div className="donut-chart__circle" style={{ background: `conic-gradient(${stops.join(", ")})` }}>
        <div className="donut-chart__hole">
          <strong>{total}</strong>
          <span>đơn</span>
        </div>
      </div>
      <ul className="donut-chart__legend">
        {segments.filter((s) => s.count > 0).map((s) => (
          <li key={s.status}>
            <i style={{ background: s.color }} />
            <span>{s.label}</span>
            <strong>{s.count}</strong>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Biểu đồ cột thẳng đứng — top sản phẩm thuê nhiều nhất. */
function TopRentedBarChart({ items }) {
  if (items.length === 0) {
    return <p className="dashboard-empty">Chưa có dữ liệu thuê.</p>;
  }
  const maxCount = Math.max(1, ...items.map((i) => i.rentalCount));

  return (
    <div className="bar-chart">
      {items.map((item) => (
        <div className="bar-chart__col" key={item.productId}>
          <div className="bar-chart__track">
            <div
              className="bar-chart__fill"
              style={{ height: `${(item.rentalCount / maxCount) * 100}%` }}
              title={`${item.productName}: ${item.rentalCount} lượt thuê`}
            />
          </div>
          <span className="bar-chart__count">{item.rentalCount}</span>
          <span className="bar-chart__label">{item.productName}</span>
        </div>
      ))}
    </div>
  );
}

export default function AdminDashboardPage() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [orders, setOrders] = useState([]);
  const [revenueReport, setRevenueReport] = useState(null);
  const [weeklyRevenue, setWeeklyRevenue] = useState(null);
  const [topRented, setTopRented] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    Promise.all([
      productApi.getAllProductsForAdmin(),
      categoryApi.getAllCategories(),
      orderApi.getAllOrdersForAdmin(),
      reportApi.getRevenueReport(),
      reportApi.getWeeklyRevenue(),
      reportApi.getTopRentedProducts(undefined, undefined, 5),
    ])
      .then(([productsData, categoriesData, ordersData, revenueData, weeklyData, topRentedData]) => {
        setProducts(productsData);
        setCategories(categoriesData);
        setOrders(ordersData);
        setRevenueReport(revenueData);
        setWeeklyRevenue(weeklyData);
        setTopRented(topRentedData);
      })
      .catch((err) => setError(toApiError(err).message))
      .finally(() => setLoading(false));
  }, []);

  const productStats = useMemo(() => {
    const total = products.length;
    const active = products.filter((p) => p.isAvailable).length;
    const lowStock = products.filter((p) => p.isAvailable && Number(p.stockQuantity) <= LOW_STOCK_THRESHOLD);
    return { total, active, lowStock };
  }, [products]);

  const orderStats = useMemo(() => {
    const total = orders.length;
    const pending = orders.filter((o) => o.status === "PENDING").length;
    const byStatus = Object.keys(STATUS_LABEL).map((status) => ({
      status,
      label: STATUS_LABEL[status],
      color: STATUS_COLOR[status],
      count: orders.filter((o) => o.status === status).length,
    }));
    const recent = [...orders]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, RECENT_ORDERS_LIMIT);
    return { total, pending, byStatus, recent };
  }, [orders]);

  const months = useMemo(() => {
    if (!revenueReport) return [];
    return revenueReport.monthly.map((m) => ({
      key: m.month,
      label: monthLabel(m.month),
      purchase: Number(m.purchaseRevenue || 0),
      rental: Number(m.rentalRevenue || 0),
    }));
  }, [revenueReport]);

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

  if (loading) return <div className="catalog-state">Đang tải bảng điều khiển...</div>;
  if (error) return <div className="catalog-state catalog-state--error">{error}</div>;

  return (
    <div className="admin-page">
      <div className="admin2-ledger-hero">
        <div>
          <h1>Bảng điều khiển</h1>
          <p>Tổng quan nhanh về kho sản phẩm, đơn hàng và doanh thu của DigiShop.</p>
        </div>
      </div>

      <section className="admin2-stats admin2-stats--dashboard">
        <div className="admin2-stat">
          <IconCamera className="admin2-stat__icon" aria-hidden="true" />
          <small>Tổng sản phẩm</small>
          <strong>{productStats.total}</strong>
        </div>
        <div className="admin2-stat">
          <IconCheck className="admin2-stat__icon" aria-hidden="true" />
          <small>Đang bán/cho thuê</small>
          <strong>{productStats.active}</strong>
        </div>
        <div className="admin2-stat">
          <IconTag className="admin2-stat__icon" aria-hidden="true" />
          <small>Danh mục</small>
          <strong>{categories.length}</strong>
        </div>
        <div className="admin2-stat">
          <IconClock className="admin2-stat__icon" aria-hidden="true" />
          <small>Đơn chờ xác nhận</small>
          <strong>{orderStats.pending}</strong>
        </div>
        <div className="admin2-stat">
          <IconWallet className="admin2-stat__icon" aria-hidden="true" />
          <small>Doanh thu (đã hoàn tất)</small>
          <strong className="admin2-stat__revenue">{formatPrice(revenueReport.totalRevenue)}</strong>
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

      <div className="dashboard-grid">
        <div className="dashboard-panel dashboard-panel--wide">
          <div className="dashboard-panel__head">
            <h2><IconReport className="dashboard-panel__icon" aria-hidden="true" /> Doanh thu theo tháng</h2>
            <Link to="/admin/reports">Xem báo cáo chi tiết →</Link>
          </div>
          <RevenueLineChart months={months} />
        </div>

        <div className="dashboard-panel">
          <div className="dashboard-panel__head">
            <h2><IconCalendar className="dashboard-panel__icon" aria-hidden="true" /> Doanh thu 7 ngày qua</h2>
            <Link to="/admin/reports">Xem báo cáo chi tiết →</Link>
          </div>
          <WeeklyRevenueChart days={weekDays} />
        </div>

        <div className="dashboard-panel">
          <div className="dashboard-panel__head">
            <h2><IconTag className="dashboard-panel__icon" aria-hidden="true" /> Phân bố trạng thái đơn hàng</h2>
          </div>
          <StatusDonutChart segments={orderStats.byStatus} total={orderStats.total} />
        </div>

        <div className="dashboard-panel">
          <div className="dashboard-panel__head">
            <h2><IconInventory className="dashboard-panel__icon" aria-hidden="true" /> Top 5 thiết bị thuê nhiều nhất</h2>
            <Link to="/admin/reports">Xem tất cả →</Link>
          </div>
          <TopRentedBarChart items={topRented} />
        </div>

        <div className="dashboard-panel">
          <div className="dashboard-panel__head">
            <h2>Đơn hàng gần đây</h2>
            <Link to="/admin/orders">Xem tất cả →</Link>
          </div>
          {orderStats.recent.length === 0 && <p className="dashboard-empty">Chưa có đơn hàng nào.</p>}
          <ul className="dashboard-order-list">
            {orderStats.recent.map((order) => (
              <li key={order.id}>
                <div>
                  <p className="dashboard-order-list__code">{order.orderCode}</p>
                  <span>{order.recipientName} · {TYPE_LABEL[order.orderType]} · {formatDateTime(order.createdAt)}</span>
                </div>
                <div className="dashboard-order-list__right">
                  <strong>{formatPrice(order.totalAmount)}</strong>
                  <span className={`order-status-badge order-status-badge--sm ${STATUS_CLASS[order.status]}`}>
                    {STATUS_LABEL[order.status]}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="dashboard-panel">
          <div className="dashboard-panel__head">
            <h2>Sắp hết hàng</h2>
            <Link to="/admin/products">Xem tất cả →</Link>
          </div>
          {productStats.lowStock.length === 0 && <p className="dashboard-empty">Không có sản phẩm nào sắp hết hàng. 🎉</p>}
          <ul className="dashboard-stock-list">
            {productStats.lowStock.slice(0, LOW_STOCK_LIMIT).map((product) => (
              <li key={product.id}>
                <img src={resolveImageUrl(product.imageUrl) || "https://via.placeholder.com/40x40?text=DS"} alt={product.name} />
                <div className="dashboard-stock-list__info">
                  <p>{product.name}</p>
                  <span>{product.brand} · {product.type}</span>
                </div>
                <span className="admin2-stock admin2-stock--low">{product.stockQuantity} còn lại</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}