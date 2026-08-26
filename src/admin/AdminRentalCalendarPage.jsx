import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { productApi } from "../api/productApi";
import { orderApi } from "../api/orderApi";
import { toApiError } from "../api/client";
import DrawerPortal from "./DrawerPortal";
import { STATUS_LABEL, STATUS_COLOR } from "./orderConstants";
import { resolveImageUrl, toLocalIsoDate, parseLocalIsoDate } from "../utils/formatters";

const SPAN_OPTIONS = [
  { value: 7, label: "7 ngày" },
  { value: 14, label: "14 ngày" },
  { value: 30, label: "30 ngày" },
];

const SLOT_LABELS = { MORNING: "Sáng", AFTERNOON: "Chiều", EVENING: "Tối" };

/** Trạng thái nào coi là "đã trả máy" — khớp với vòng đời đơn thuê ở backend (sau RENTAL_RETURNED). */
const RETURNED_STATUSES = ["RENTAL_RETURNED", "INSPECTED", "COMPLETED", "DISPUTED"];
function isReturned(status) {
  return RETURNED_STATUSES.includes(status);
}
function returnLabel(status) {
  if (status === "DELIVERED") return "Đang giữ máy — chưa trả";
  if (isReturned(status)) return "Đã trả máy";
  return "Chưa giao máy";
}

const DAY_WIDTH = 44;
const LANE_HEIGHT = 26;
const WEEKDAY_SHORT = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

function toDateOnly(dateLike) {
  const d = typeof dateLike === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dateLike) ? parseLocalIsoDate(dateLike) : new Date(dateLike);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(dateLike, n) {
  const d = toDateOnly(dateLike);
  d.setDate(d.getDate() + n);
  return d;
}

function diffDays(a, b) {
  return Math.round((toDateOnly(a) - toDateOnly(b)) / 86400000);
}

function startOfWeekMonday(dateLike) {
  const d = toDateOnly(dateLike);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  return addDays(d, diff);
}

/** Xếp các thanh chồng lấn thời gian vào các "lane" khác nhau để không đè lên nhau. */
function assignLanes(bars) {
  const sorted = [...bars].sort((a, b) => a.startIdx - b.startIdx);
  const laneEndIdx = [];
  const placed = [];
  for (const bar of sorted) {
    let lane = laneEndIdx.findIndex((endIdx) => endIdx < bar.startIdx);
    if (lane === -1) {
      lane = laneEndIdx.length;
      laneEndIdx.push(bar.endIdx);
    } else {
      laneEndIdx[lane] = bar.endIdx;
    }
    placed.push({ ...bar, lane });
  }
  return { bars: placed, laneCount: Math.max(1, laneEndIdx.length) };
}

export default function AdminRentalCalendarPage() {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [rangeStart, setRangeStart] = useState(() => startOfWeekMonday(new Date()));
  const [spanDays, setSpanDays] = useState(14);
  const [brandFilter, setBrandFilter] = useState("");
  const [keyword, setKeyword] = useState("");
  const [onlyBooked, setOnlyBooked] = useState(true);
  const [activeBar, setActiveBar] = useState(null);

  const rangeStartD = toDateOnly(rangeStart);
  const rangeEndD = addDays(rangeStartD, spanDays - 1);
  const today = toDateOnly(new Date());

  // Danh sách sản phẩm chỉ cần tải 1 lần (dùng cho cột nhãn + bộ lọc hãng).
  useEffect(() => {
    productApi.getAllProductsForAdmin().then(setProducts).catch((err) => setError(toApiError(err).message));
  }, []);

  // Dữ liệu lịch chỉ lấy đúng khoảng ngày đang xem — gọi lại mỗi khi chuyển tuần/tháng,
  // thay vì tải toàn bộ lịch sử đơn thuê về rồi tự lọc ở FE như trước.
  useEffect(() => {
    setLoading(true);
    setError(null);
    const fromIso = toLocalIsoDate(rangeStartD);
    const toIso = toLocalIsoDate(rangeEndD);
    orderApi.getRentalCalendar(fromIso, toIso)
      .then(setEntries)
      .catch((err) => setError(toApiError(err).message))
      .finally(() => setLoading(false));
  }, [rangeStartD.getTime(), rangeEndD.getTime()]);

  const brands = useMemo(() => [...new Set(products.map((p) => p.brand).filter(Boolean))].sort(), [products]);

  const dateColumns = useMemo(
    () => Array.from({ length: spanDays }, (_, i) => addDays(rangeStartD, i)),
    [rangeStartD, spanDays]
  );

  // entries đã được backend lọc đúng khoảng ngày + gộp sẵn theo item, chỉ cần tính vị trí hiển thị.
  const barsByProduct = useMemo(() => {
    const map = new Map();
    for (const entry of entries) {
      const start = toDateOnly(entry.rentalStartDate);
      const end = toDateOnly(entry.rentalEndDate);

      const clampedStart = start < rangeStartD ? rangeStartD : start;
      const clampedEnd = end > rangeEndD ? rangeEndD : end;
      const startIdx = diffDays(clampedStart, rangeStartD);
      const endIdx = diffDays(clampedEnd, rangeStartD);

      const bar = {
        orderId: entry.orderId,
        orderCode: entry.orderCode,
        recipientName: entry.recipientName,
        recipientPhone: entry.recipientPhone,
        status: entry.status,
        quantity: entry.quantity,
        productName: entry.productName,
        rentalSlot: entry.rentalSlot,
        startIdx,
        endIdx,
        actualStart: entry.rentalStartDate,
        actualEnd: entry.rentalEndDate,
        clippedStart: start < rangeStartD,
        clippedEnd: end > rangeEndD,
      };
      const list = map.get(entry.productId) || [];
      list.push(bar);
      map.set(entry.productId, list);
    }
    return map;
  }, [entries, rangeStartD, rangeEndD]);

  const rows = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    return products
      .filter((p) => {
        if (brandFilter && p.brand !== brandFilter) return false;
        if (q && !`${p.name} ${p.brand}`.toLowerCase().includes(q)) return false;
        if (onlyBooked && !barsByProduct.has(p.id)) return false;
        return true;
      })
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((p) => {
        const { bars, laneCount } = assignLanes(barsByProduct.get(p.id) || []);
        return { product: p, bars, laneCount };
      });
  }, [products, brandFilter, keyword, onlyBooked, barsByProduct]);

  const usedStatuses = useMemo(() => {
    const set = new Set();
    barsByProduct.forEach((list) => list.forEach((b) => set.add(b.status)));
    return [...set];
  }, [barsByProduct]);

  const gridWidth = spanDays * DAY_WIDTH;

  const jumpToday = () => setRangeStart(startOfWeekMonday(new Date()));
  const jumpPrev = () => setRangeStart((prev) => addDays(prev, -spanDays));
  const jumpNext = () => setRangeStart((prev) => addDays(prev, spanDays));

  return (
    <div className="admin-page">
      <div className="admin2-toolbar">
        <div>
          <h1>Lịch thuê thiết bị</h1>
          <p className="rental-calendar__subtitle">
            Xem tổng quan thiết bị nào đang/sắp được thuê trong khoảng ngày nào — tránh nhận trùng lịch cùng một máy.
          </p>
        </div>
      </div>

      <div className="rental-calendar__controls">
        <div className="rental-calendar__nav">
          <button type="button" className="btn btn-outline-shutter" onClick={jumpPrev}>← Trước</button>
          <button type="button" className="btn btn-outline-shutter" onClick={jumpToday}>Hôm nay</button>
          <button type="button" className="btn btn-outline-shutter" onClick={jumpNext}>Sau →</button>
          <span className="rental-calendar__range-label">
            {dateColumns[0].toLocaleDateString("vi-VN")} → {dateColumns[dateColumns.length - 1].toLocaleDateString("vi-VN")}
          </span>
        </div>
        <div className="rental-calendar__filters">
          <select value={spanDays} onChange={(e) => setSpanDays(Number(e.target.value))}>
            {SPAN_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <select value={brandFilter} onChange={(e) => setBrandFilter(e.target.value)}>
            <option value="">Tất cả hãng</option>
            {brands.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
          <input
            placeholder="Tìm sản phẩm..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
          <label className="rental-calendar__toggle">
            <input type="checkbox" checked={onlyBooked} onChange={(e) => setOnlyBooked(e.target.checked)} />
            Chỉ hiện sản phẩm có lịch thuê
          </label>
        </div>
      </div>

      {usedStatuses.length > 0 && (
        <div className="rental-calendar__legend">
          {usedStatuses.map((s) => (
            <span key={s} className="rental-calendar__legend-item">
              <i style={{ background: STATUS_COLOR[s] }} />
              {STATUS_LABEL[s]}
            </span>
          ))}
        </div>
      )}

      {loading && <div className="catalog-state">Đang tải lịch thuê...</div>}
      {!loading && error && <div className="catalog-state catalog-state--error">{error}</div>}

      {!loading && !error && (
        <div className="rental-calendar">
          <div className="rental-calendar__scroll">
            <div className="rental-calendar__grid" style={{ width: gridWidth + 220 }}>
              <div className="rental-calendar__header-row">
                <div className="rental-calendar__label-col rental-calendar__label-col--head">Sản phẩm</div>
                <div className="rental-calendar__days" style={{ width: gridWidth }}>
                  {dateColumns.map((d, i) => {
                    const isToday = diffDays(d, today) === 0;
                    const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                    return (
                      <div
                        key={i}
                        className={`rental-calendar__day-head ${isWeekend ? "is-weekend" : ""} ${isToday ? "is-today" : ""}`}
                        style={{ width: DAY_WIDTH }}
                      >
                        <span>{WEEKDAY_SHORT[d.getDay()]}</span>
                        <strong>{d.getDate()}/{d.getMonth() + 1}</strong>
                      </div>
                    );
                  })}
                </div>
              </div>

              {rows.length === 0 && (
                <div className="rental-calendar__empty">Không có sản phẩm nào khớp bộ lọc hiện tại.</div>
              )}

              {rows.map(({ product, bars, laneCount }) => (
                <div className="rental-calendar__row" key={product.id} style={{ height: laneCount * LANE_HEIGHT + 14 }}>
                  <div className="rental-calendar__label-col">
                    <img src={resolveImageUrl(product.imageUrl) || "https://via.placeholder.com/32x32?text=DS"} alt={product.name} />
                    <div>
                      <p>{product.name}</p>
                      <span>{product.brand} · còn {product.stockQuantity}</span>
                    </div>
                  </div>
                  <div className="rental-calendar__track" style={{ width: gridWidth }}>
                    {dateColumns.map((d, i) => {
                      const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                      const isToday = diffDays(d, today) === 0;
                      return (
                        <div
                          key={i}
                          className={`rental-calendar__cell ${isWeekend ? "is-weekend" : ""} ${isToday ? "is-today" : ""}`}
                          style={{ width: DAY_WIDTH }}
                        />
                      );
                    })}
                    {bars.map((bar, idx) => (
                      <button
                        type="button"
                        key={`${bar.orderId}-${idx}`}
                        className="rental-calendar__bar"
                        style={{
                          left: bar.startIdx * DAY_WIDTH + 2,
                          width: (bar.endIdx - bar.startIdx + 1) * DAY_WIDTH - 4,
                          top: bar.lane * LANE_HEIGHT + 4,
                          background: STATUS_COLOR[bar.status],
                          borderTopLeftRadius: bar.clippedStart ? 0 : 6,
                          borderBottomLeftRadius: bar.clippedStart ? 0 : 6,
                          borderTopRightRadius: bar.clippedEnd ? 0 : 6,
                          borderBottomRightRadius: bar.clippedEnd ? 0 : 6,
                        }}
                        onClick={() => setActiveBar(bar)}
                        title={`${bar.orderCode} · ${bar.recipientName} · ${returnLabel(bar.status)}`}
                      >
                        {isReturned(bar.status) && <span className="rental-calendar__bar-check" aria-hidden="true">✓</span>}
                        {bar.orderCode}{bar.quantity > 1 ? ` ×${bar.quantity}` : ""}
                        {bar.rentalSlot && SLOT_LABELS[bar.rentalSlot] && (
                          <span className="rental-calendar__bar-slot"> · {SLOT_LABELS[bar.rentalSlot]}</span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeBar && (
        <DrawerPortal>
          <div className="rental-calendar-popover-backdrop" onClick={() => setActiveBar(null)}>
            <div className="rental-calendar-popover" onClick={(e) => e.stopPropagation()}>
              <div className="rental-calendar-popover__head">
                <span
                  className="order-status-badge"
                  style={{ background: STATUS_COLOR[activeBar.status], color: "#fff", borderColor: "transparent" }}
                >
                  {STATUS_LABEL[activeBar.status]}
                </span>
                <button type="button" onClick={() => setActiveBar(null)} aria-label="Đóng">✕</button>
              </div>
              <h3>{activeBar.orderCode}</h3>
              <p className={`rental-calendar-popover__return ${isReturned(activeBar.status) ? "is-returned" : "is-holding"}`}>
                {isReturned(activeBar.status) ? "✅" : "📷"} {returnLabel(activeBar.status)}
              </p>
              <p><strong>Sản phẩm:</strong> {activeBar.productName} {activeBar.quantity > 1 ? `× ${activeBar.quantity}` : ""}</p>
              {activeBar.rentalSlot && SLOT_LABELS[activeBar.rentalSlot] && (
                <p><strong>Buổi thuê:</strong> {SLOT_LABELS[activeBar.rentalSlot]}</p>
              )}
              <p><strong>Khách:</strong> {activeBar.recipientName} · {activeBar.recipientPhone}</p>
              <p>
                <strong>Thời gian thuê:</strong>{" "}
                {new Date(activeBar.actualStart).toLocaleDateString("vi-VN")} → {new Date(activeBar.actualEnd).toLocaleDateString("vi-VN")}
              </p>
              <button
                type="button"
                className="btn btn-shutter"
                onClick={() => navigate(`/admin/orders?q=${encodeURIComponent(activeBar.orderCode)}`)}
              >
                Mở chi tiết đơn hàng
              </button>
            </div>
          </div>
        </DrawerPortal>
      )}
    </div>
  );
}