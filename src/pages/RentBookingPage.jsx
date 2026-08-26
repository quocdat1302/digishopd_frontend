import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import NavBar from "../components/NavBar";
import Footer from "../components/Footer";
import QrPaymentPanel from "../components/QrPaymentPanel";
import { productApi } from "../api/productApi";
import { userApi } from "../api/userApi";
import { orderApi } from "../api/orderApi";
import { pickupLocationApi } from "../api/pickupLocationApi";
import { toApiError } from "../api/client";
import { formatPrice, resolveImageUrl, toLocalIsoDate, parseLocalIsoDate } from "../utils/formatters";
import useDocumentTitle from "../hooks/useDocumentTitle";

const WEEKDAY_LABELS = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
const DEPOSIT_RATE = 0.3;

// Chấp nhận cả Date lẫn chuỗi "yyyy-MM-dd" (từ query string) — new Date("yyyy-MM-dd") trực tiếp
// sẽ bị JS hiểu là UTC midnight, lệch ngày ở múi giờ VN (UTC+7), nên phải tự parse cho chuỗi.
function toDateOnly(d) {
  const x = typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d) ? parseLocalIsoDate(d) : new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function addDays(d, n) {
  const x = toDateOnly(d);
  x.setDate(x.getDate() + n);
  return x;
}
function diffDays(a, b) {
  return Math.round((toDateOnly(a) - toDateOnly(b)) / 86400000);
}
function toIso(d) {
  return toLocalIsoDate(toDateOnly(d));
}
function startOfMonth(d) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

/** Lịch tháng trực quan để chọn ngày nhận/trả — click 1 lần chọn ngày bắt đầu, click lần 2 chọn ngày kết thúc. */
function BookingCalendar({ month, onPrevMonth, onNextMonth, rangeStart, rangeEnd, onPickDay, isDayFull }) {
  const today = toDateOnly(new Date());
  const first = startOfMonth(month);
  const startWeekday = first.getDay();
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();

  const cells = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(month.getFullYear(), month.getMonth(), d));

  return (
    <div className="booking-calendar">
      <div className="booking-calendar__nav">
        <button type="button" onClick={onPrevMonth}>‹</button>
        <strong>Tháng {month.getMonth() + 1}/{month.getFullYear()}</strong>
        <button type="button" onClick={onNextMonth}>›</button>
      </div>
      <div className="booking-calendar__weekdays">
        {WEEKDAY_LABELS.map((w) => <span key={w}>{w}</span>)}
      </div>
      <div className="booking-calendar__legend">
        <span><i className="booking-calendar__dot booking-calendar__dot--full" /> Đã hết máy</span>
      </div>
      <div className="booking-calendar__grid">
        {cells.map((date, i) => {
          if (!date) return <span key={`empty-${i}`} className="booking-calendar__cell booking-calendar__cell--empty" />;
          const isPast = date <= today; // Backend yêu cầu ngày nhận máy phải SAU hôm nay (@Future), nên khoá luôn hôm nay.
          const isFull = !isPast && isDayFull && isDayFull(date);
          const isStart = rangeStart && diffDays(date, rangeStart) === 0;
          const isEnd = rangeEnd && diffDays(date, rangeEnd) === 0;
          const inRange = rangeStart && rangeEnd && date > rangeStart && date < rangeEnd;
          const cls = [
            "booking-calendar__cell",
            isPast || isFull ? "is-disabled" : "",
            isFull ? "is-full" : "",
            isStart || isEnd ? "is-endpoint" : "",
            inRange ? "is-in-range" : "",
          ].filter(Boolean).join(" ");
          return (
            <button
              type="button"
              key={date.toISOString()}
              className={cls}
              disabled={isPast || isFull}
              title={isFull ? "Đã hết máy trong ngày này" : undefined}
              onClick={() => onPickDay(date)}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function RentBookingPage() {
  useDocumentTitle("Đặt lịch thuê");
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [product, setProduct] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [rangeStart, setRangeStart] = useState(() => {
    const s = searchParams.get("start");
    return s ? toDateOnly(s) : addDays(new Date(), 1);
  });
  const [rangeEnd, setRangeEnd] = useState(() => {
    const e = searchParams.get("end");
    return e ? toDateOnly(e) : addDays(new Date(), 3);
  });

  const [form, setForm] = useState({ recipientName: "", recipientPhone: "", shippingAddress: "" });
  const [fulfillmentMethod, setFulfillmentMethodRaw] = useState("HOME_DELIVERY"); // hoặc "PICKUP_AT_SHOP"
  const [pickupLocations, setPickupLocations] = useState([]);
  const [selectedLocationId, setSelectedLocationId] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState("BANK_TRANSFER");
  // "DAILY" (mặc định, chọn khoảng ngày) hoặc "HOURLY" (thuê theo buổi Sáng/Chiều/Tối trong 1 ngày)
  const [rentalMode, setRentalMode] = useState("DAILY");
  const [rentalSlot, setRentalSlot] = useState(null); // "MORNING" | "AFTERNOON" | "EVENING"
  const [selectedAddonIds, setSelectedAddonIds] = useState([]); // các phụ kiện trả thêm khách tự chọn
  const [idForm, setIdForm] = useState({ idCardNumber: "", idCardFrontUrl: "", idCardBackUrl: "" });
  const [verifyingId, setVerifyingId] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [completedOrder, setCompletedOrder] = useState(null);
  // "form" -> "awaitingPayment" (QR) -> "thankYou"
  const [stage, setStage] = useState("form");

  // Lịch trống thật của sản phẩm trong tháng đang xem: "yyyy-MM-dd" -> { remaining, bookedSlots }
  const [availability, setAvailability] = useState({});

  // Đổi cách nhận máy phải xoá thông báo lỗi cũ (vd lỗi "thiếu địa chỉ" của lựa chọn trước) — nếu không,
  // thông báo cũ vẫn còn hiển thị dù khách đã đổi lựa chọn, trông như hệ thống "bắt chọn lại" vô lý.
  const setFulfillmentMethod = (value) => {
    setFulfillmentMethodRaw(value);
    setFeedback(null);
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([productApi.getProductById(id), userApi.getMyProfile()])
      .then(([p, me]) => {
        setProduct(p);
        setProfile(me);
        setForm({ recipientName: me.name || "", recipientPhone: me.phone || "", shippingAddress: "" });
      })
      .catch((err) => setError(toApiError(err).message))
      .finally(() => setLoading(false));
  }, [id]);

  // Danh sách địa điểm/hình thức nhận máy do admin cấu hình (tại shop, chi nhánh khác, giao tận nơi...).
  useEffect(() => {
    pickupLocationApi
      .getActiveLocations()
      .then((locs) => {
        setPickupLocations(locs);
        if (locs.length > 0) setSelectedLocationId(locs[0].id);
      })
      .catch(() => {}); // không có địa điểm cấu hình -> quay lại toggle mặc định cũ
  }, []);

  // Tải lịch trống thật cho tháng đang xem — để tô màu/khoá ngày đã hết máy thay vì để khách bấm thử
  // rồi mới báo lỗi lúc xác nhận đặt lịch.
  useEffect(() => {
    if (!id) return;
    const from = toIso(startOfMonth(month));
    const to = toIso(new Date(month.getFullYear(), month.getMonth() + 1, 0));
    orderApi
      .getProductAvailability(id, from, to)
      .then((rows) => {
        const map = {};
        rows.forEach((r) => {
          map[r.date] = { remaining: r.remaining, bookedSlots: r.bookedSlots || [] };
        });
        setAvailability(map);
      })
      .catch(() => {}); // không chặn trang chính nếu lỗi — chỉ mất phần tô màu lịch
  }, [id, month]);

  const handlePickDay = (date) => {
    if (rentalMode === "HOURLY") {
      setRangeStart(date);
      setRangeEnd(date);
      return;
    }
    if (!rangeStart || (rangeStart && rangeEnd)) {
      setRangeStart(date);
      setRangeEnd(null);
      return;
    }
    if (date <= rangeStart) {
      setRangeStart(date);
      setRangeEnd(null);
      return;
    }
    setRangeEnd(date);
  };

  /** Ngày đã hết máy hoàn toàn (remaining <= 0) — dùng để khoá không cho bấm chọn trên lịch. */
  const isDayFull = (date) => {
    const info = availability[toIso(date)];
    return info ? info.remaining <= 0 : false;
  };

  /** Các buổi (Sáng/Chiều/Tối) đã có người đặt trong ngày đang chọn — dùng để khoá nút buổi tương ứng. */
  const bookedSlotsForSelectedDay = rangeStart ? availability[toIso(rangeStart)]?.bookedSlots || [] : [];

  const hasHourlyPricing =
    product && (product.rentPriceMorning || product.rentPriceAfternoon || product.rentPriceEvening);

  const SLOT_LABELS = { MORNING: "Sáng", AFTERNOON: "Chiều", EVENING: "Tối" };
  // rentPriceMorning/Afternoon/Evening — map trực tiếp theo từng buổi, tránh dựng key động dễ sai chính tả.
  const getSlotFieldValue = (slot) => {
    if (!product) return 0;
    if (slot === "MORNING") return Number(product.rentPriceMorning || 0);
    if (slot === "AFTERNOON") return Number(product.rentPriceAfternoon || 0);
    if (slot === "EVENING") return Number(product.rentPriceEvening || 0);
    return 0;
  };

  const days = rangeStart && rangeEnd ? diffDays(rangeEnd, rangeStart) : 0;
  const isHourlyBooking = rentalMode === "HOURLY";
  const rentFee = isHourlyBooking
    ? rentalSlot
      ? getSlotFieldValue(rentalSlot)
      : 0
    : product && days > 0
    ? Number(product.rentPrice) * days
    : 0;
  const deposit = rentFee * DEPOSIT_RATE;
  const paidAddons = (product?.addons || []).filter((a) => !a.included && selectedAddonIds.includes(a.id));
  const addonTotal = paidAddons.reduce((sum, a) => sum + Number(a.price || 0), 0);
  const selectedLocation = pickupLocations.find((l) => l.id === selectedLocationId);
  const pickupFee = selectedLocation ? Number(selectedLocation.fee || 0) : 0;
  const total = rentFee + deposit + addonTotal + pickupFee;

  const toggleAddon = (addonId) => {
    setSelectedAddonIds((prev) => (prev.includes(addonId) ? prev.filter((x) => x !== addonId) : [...prev, addonId]));
  };

  const includedItems = useMemo(() => {
    if (!product) return [];
    const items = ["Thân máy", "Sạc & phụ kiện đi kèm"];
    if (product.lensMount) items.push("Lens kit tiêu chuẩn");
    items.push("Thẻ nhớ 32GB");
    return items;
  }, [product]);

  const handleVerifyId = async () => {
    if (!idForm.idCardNumber || !idForm.idCardFrontUrl || !idForm.idCardBackUrl) {
      setFeedback({ type: "error", text: "Vui lòng nhập đủ số CCCD và ảnh 2 mặt." });
      return;
    }
    setVerifyingId(true);
    setFeedback(null);
    try {
      const updated = await userApi.verifyId(idForm);
      setProfile(updated);
      setFeedback({ type: "success", text: "Xác thực CCCD thành công!" });
    } catch (err) {
      setFeedback({ type: "error", text: toApiError(err).message });
    } finally {
      setVerifyingId(false);
    }
  };

  const handleConfirmBooking = async () => {
    setFeedback(null);
    if (!rangeStart || !rangeEnd || (isHourlyBooking ? diffDays(rangeEnd, rangeStart) !== 0 : days < 1)) {
      setFeedback({ type: "error", text: "Vui lòng chọn khoảng ngày lưu giữ hợp lệ." });
      return;
    }
    if (isHourlyBooking && !rentalSlot) {
      setFeedback({ type: "error", text: "Vui lòng chọn buổi thuê (Sáng/Chiều/Tối)." });
      return;
    }
    if (!form.recipientName.trim() || !form.recipientPhone.trim()) {
      setFeedback({ type: "error", text: "Vui lòng điền đủ thông tin khách hàng." });
      return;
    }
    if (fulfillmentMethod === "HOME_DELIVERY" && !form.shippingAddress.trim()) {
      setFeedback({ type: "error", text: "Vui lòng nhập địa chỉ nhận máy, hoặc chọn \"Nhận tại shop\"." });
      return;
    }
    if (!profile?.identityVerified) {
      setFeedback({ type: "error", text: "Vui lòng xác thực CCCD/CMND trước khi đặt lịch." });
      return;
    }

    setSubmitting(true);
    try {
      const order = await orderApi.checkoutRental({
        rentNowProductId: product.id,
        rentNowQuantity: 1,
        rentNowStartDate: toIso(rangeStart),
        rentNowEndDate: toIso(isHourlyBooking ? rangeStart : rangeEnd),
        rentNowSlot: isHourlyBooking ? rentalSlot : null,
        recipientName: form.recipientName.trim(),
        recipientPhone: form.recipientPhone.trim(),
        fulfillmentMethod,
        pickupLocationId: pickupLocations.length > 0 ? selectedLocationId : null,
        shippingAddress: fulfillmentMethod === "HOME_DELIVERY" ? form.shippingAddress.trim() : "",
        selectedAddonIds,
        note: `[PTTT: ${paymentMethod === "BANK_TRANSFER" ? "Chuyển khoản ngân hàng" : "Tiền mặt"}] [Nhận máy: ${
          fulfillmentMethod === "PICKUP_AT_SHOP" ? "Tại shop" : "Giao tận nơi"
        }]${isHourlyBooking ? ` [Buổi: ${SLOT_LABELS[rentalSlot]}]` : ""}`,
      });

      setCompletedOrder(order);
      setStage(paymentMethod === "BANK_TRANSFER" ? "awaitingPayment" : "thankYou");
    } catch (err) {
      setFeedback({ type: "error", text: toApiError(err).message });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="booking-page">
        <NavBar />
        <div className="catalog-state">Đang tải...</div>
      </div>
    );
  }
  if (error || !product) {
    return (
      <div className="booking-page">
        <NavBar />
        <div className="catalog-state catalog-state--error">{error || "Không tìm thấy sản phẩm."}</div>
      </div>
    );
  }

  if (stage === "awaitingPayment" && completedOrder) {
    return (
      <div className="booking-page">
        <NavBar />
        <section className="booking-shell">
          <QrPaymentPanel
            order={completedOrder}
            onPaid={(fresh) => {
              setCompletedOrder(fresh);
              setStage("thankYou");
            }}
            onCancelled={(cancelled) => {
              setCompletedOrder(cancelled);
              setStage("cancelled");
            }}
          />
        </section>
        <Footer />
      </div>
    );
  }

  if (stage === "cancelled" && completedOrder) {
    return (
      <div className="booking-page">
        <NavBar />
        <section className="booking-shell">
          <div className="rental-thankyou">
            <span className="postmark-stamp" aria-hidden="true">Đã huỷ</span>
            <h1>Đơn #{completedOrder.orderCode} đã được huỷ</h1>
            <p>Đơn chưa được chuyển khoản nên đã huỷ thành công — ngày đã giữ chỗ được mở lại cho khách khác. Bạn có thể đặt lại bất cứ lúc nào.</p>
            <div className="rental-contract-panel__actions" style={{ justifyContent: "center" }}>
              <button type="button" className="btn btn-outline-shutter" onClick={() => navigate("/products")}>
                Tiếp tục khám phá
              </button>
              <button type="button" className="btn btn-shutter" onClick={() => navigate("/profile")}>
                Xem đơn hàng của tôi
              </button>
            </div>
          </div>
        </section>
        <Footer />
      </div>
    );
  }

  if (stage === "thankYou" && completedOrder) {
    return (
      <div className="booking-page">
        <NavBar />
        <section className="booking-shell">
          <div className="rental-thankyou">
            <span className="postmark-stamp" aria-hidden="true">Đã xác nhận</span>
            <h1>Cảm ơn bạn đã ghé Tiệm Tạp Hóa Kỷ Ức 📷</h1>
            <p>
              Đơn thuê của bạn đã được ghi nhận. Bạn đang chờ{" "}
              {completedOrder.fulfillmentMethod === "PICKUP_AT_SHOP"
                ? "shop xác nhận và bạn ghé nhận máy trực tiếp"
                : "shop giao máy tận nơi, bạn kiểm tra tình trạng máy ngay lúc nhận"}
              .
            </p>
            <div className="rental-thankyou__code">#{completedOrder.orderCode}</div>
            <div className="rental-contract-panel__actions" style={{ justifyContent: "center" }}>
              <button type="button" className="btn btn-outline-shutter" onClick={() => navigate("/products")}>
                Tiếp tục khám phá
              </button>
              <button type="button" className="btn btn-shutter" onClick={() => navigate("/profile")}>
                Xem đơn hàng của tôi
              </button>
            </div>
          </div>
        </section>
        <Footer />
      </div>
    );
  }

  return (
    <div className="booking-page">
      <NavBar />

      <section className="booking-shell">
        <h1 className="booking-title">
          <span className="washi-tape tape--rose booking-title__tape" aria-hidden="true" />
          Ghi danh ký ức
        </h1>

        <div className="booking-grid">
          <div className="booking-col-left">
            <div className="booking-card">
              <div className="booking-product-row">
                <div className="polaroid-frame-mini booking-product-row__photo">
                  <span className="booking-product-row__selected">SELECTED</span>
                  <img src={resolveImageUrl(product.imageUrl) || "https://via.placeholder.com/160x160?text=DigiShop"} alt={product.name} />
                </div>
                <div className="booking-product-row__info">
                  <h2>{product.name}</h2>
                  <p>{product.lensMount ? `Kèm ${product.lensMount}` : product.brand}</p>
                  <div className="booking-product-row__price">
                    <strong>{formatPrice(product.rentPrice)}</strong>
                    <span>/ ngày</span>
                  </div>
                  <ul className="booking-product-row__included">
                    {includedItems.map((item) => <li key={item}>✓ {item}</li>)}
                  </ul>
                </div>
              </div>
            </div>

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

            {product.accessoriesIncluded && (
              <div className="rental-accessories">
                <strong>🎁 Phụ kiện đi kèm</strong>
                <ul className="booking-product-row__included">
                  {product.accessoriesIncluded.split(/\n|,/).map((a) => a.trim()).filter(Boolean).map((a) => (
                    <li key={a}>✓ {a}</li>
                  ))}
                </ul>
              </div>
            )}

            {product.samplePhotos && product.samplePhotos.length > 0 && (
              <div className="sample-photos">
                <h3>📸 Ảnh khách chụp bằng máy này</h3>
                <div className="sample-photos__grid">
                  {product.samplePhotos.map((photo) => (
                    <div className="sample-photos__item" key={photo.id}>
                      <img src={resolveImageUrl(photo.imageUrl)} alt={photo.caption || product.name} />
                      {photo.caption && <span>{photo.caption}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="booking-card">
              <h3 className="booking-card__heading">📅 Thời gian lưu giữ</h3>

              {hasHourlyPricing && (
                <div className="fulfillment-toggle" style={{ marginTop: 0 }}>
                  <button
                    type="button"
                    className={`fulfillment-toggle__option ${rentalMode === "DAILY" ? "is-active" : ""}`}
                    onClick={() => {
                      setRentalMode("DAILY");
                      setRentalSlot(null);
                      setFeedback(null);
                    }}
                  >
                    <strong>🗓 Thuê theo ngày</strong>
                    <span>Chọn khoảng ngày lưu giữ, tính theo giá/ngày</span>
                  </button>
                  <button
                    type="button"
                    className={`fulfillment-toggle__option ${rentalMode === "HOURLY" ? "is-active" : ""}`}
                    onClick={() => {
                      setRentalMode("HOURLY");
                      setRangeEnd(rangeStart);
                      setFeedback(null);
                    }}
                  >
                    <strong>⏰ Thuê theo buổi</strong>
                    <span>Chọn 1 ngày + buổi Sáng/Chiều/Tối, giá rẻ hơn cho lượt ngắn</span>
                  </button>
                </div>
              )}

              <div className="booking-form-row" style={{ marginTop: 12 }}>
                <label>
                  <span>Ngày nhận máy</span>
                  <input
                    type="date"
                    value={rangeStart ? toIso(rangeStart) : ""}
                    min={toIso(addDays(new Date(), 1))}
                    onChange={(e) => {
                      if (!e.target.value) return;
                      const picked = parseLocalIsoDate(e.target.value);
                      setRangeStart(picked);
                      setMonth(startOfMonth(picked));
                      if (isHourlyBooking || !rangeEnd || rangeEnd < picked) setRangeEnd(picked);
                      setFeedback(null);
                    }}
                  />
                </label>
                {!isHourlyBooking && (
                  <label>
                    <span>Ngày trả máy</span>
                    <input
                      type="date"
                      value={rangeEnd ? toIso(rangeEnd) : ""}
                      min={rangeStart ? toIso(rangeStart) : toIso(addDays(new Date(), 1))}
                      onChange={(e) => {
                        if (!e.target.value) return;
                        setRangeEnd(parseLocalIsoDate(e.target.value));
                        setFeedback(null);
                      }}
                    />
                  </label>
                )}
              </div>

              {rangeStart && isDayFull(rangeStart) && (
                <p className="product-feedback-inline product-feedback-inline--error">
                  Ngày {rangeStart.toLocaleDateString("vi-VN")} đã hết máy, vui lòng chọn ngày khác.
                </p>
              )}

              {isHourlyBooking && (
                <div className="rental-hourly-price" style={{ marginTop: 12 }}>
                  <h3>Chọn buổi thuê</h3>
                  <div className="rental-hourly-price__grid">
                    {["MORNING", "AFTERNOON", "EVENING"].map((slot) => {
                      const price = getSlotFieldValue(slot);
                      const isBooked = bookedSlotsForSelectedDay.includes(slot);
                      const disabled = !price || isBooked;
                      return (
                        <button
                          key={slot}
                          type="button"
                          disabled={disabled}
                          className="rental-hourly-price__slot"
                          title={isBooked ? "Buổi này đã có người đặt trong ngày đã chọn" : undefined}
                          style={{
                            cursor: disabled ? "not-allowed" : "pointer",
                            opacity: disabled ? 0.4 : 1,
                            borderColor: rentalSlot === slot ? "var(--primary)" : undefined,
                            background: rentalSlot === slot ? "var(--surface-container)" : undefined,
                          }}
                          onClick={() => {
                            setRentalSlot(slot);
                            setFeedback(null);
                          }}
                        >
                          <span>{SLOT_LABELS[slot]}</span>
                          <strong>{isBooked ? "Đã đặt" : price ? formatPrice(price) : "—"}</strong>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="booking-summary-strip">
                <div>
                  <small>Dự kiến</small>
                  <strong>
                    {isHourlyBooking
                      ? rentalSlot
                        ? `1 buổi (${SLOT_LABELS[rentalSlot]})`
                        : "Chưa chọn buổi"
                      : days > 0
                      ? `${days} ngày`
                      : "Chưa chọn"}
                  </strong>
                </div>
                <div>
                  <small>{isHourlyBooking ? "Ngày thuê" : "Khoảng thời gian"}</small>
                  <strong>
                    {rangeStart ? rangeStart.toLocaleDateString("vi-VN") : "—"}
                    {!isHourlyBooking && (
                      <>
                        {" → "}
                        {rangeEnd ? rangeEnd.toLocaleDateString("vi-VN") : "—"}
                      </>
                    )}
                  </strong>
                </div>
              </div>
            </div>

            {product.addons && product.addons.length > 0 && (
              <div className="booking-card">
                <h3 className="booking-card__heading">🎒 Phụ kiện bổ sung</h3>
                <div className="addon-grid">
                  {product.addons.map((addon) => {
                    const checked = addon.included || selectedAddonIds.includes(addon.id);
                    return (
                      <label
                        key={addon.id}
                        className={`addon-grid__item ${addon.included ? "addon-grid__item--included" : ""}`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={addon.included}
                          onChange={() => toggleAddon(addon.id)}
                        />
                        <span className="addon-grid__name">{addon.name}</span>
                        <span className="addon-grid__price">
                          {addon.included ? "Incl." : `+${formatPrice(addon.price)}`}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="booking-card">
              <h3 className="booking-card__heading">📇 Thông tin khách hàng</h3>
              <div className="booking-form-row">
                <label>
                  <span>Họ và tên</span>
                  <input value={form.recipientName} onChange={(e) => setForm((f) => ({ ...f, recipientName: e.target.value }))} />
                </label>
                <label>
                  <span>Số điện thoại</span>
                  <input value={form.recipientPhone} onChange={(e) => setForm((f) => ({ ...f, recipientPhone: e.target.value }))} />
                </label>
              </div>

              <span className="booking-form-full booking-form-full--label">Cách nhận máy</span>
              {pickupLocations.length > 0 ? (
                <div className="fulfillment-toggle" style={{ flexWrap: "wrap" }}>
                  {pickupLocations.map((loc) => (
                    <button
                      key={loc.id}
                      type="button"
                      className={`fulfillment-toggle__option ${selectedLocationId === loc.id ? "is-active" : ""}`}
                      onClick={() => {
                        setSelectedLocationId(loc.id);
                        setFulfillmentMethod(loc.isDelivery ? "HOME_DELIVERY" : "PICKUP_AT_SHOP");
                      }}
                    >
                      <strong>{loc.isDelivery ? "🛵" : "🏬"} {loc.name}</strong>
                      <span>
                        {loc.address && `${loc.address} — `}
                        {Number(loc.fee) > 0 ? `+${formatPrice(loc.fee)}` : "Miễn phí"}
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="fulfillment-toggle">
                  <button
                    type="button"
                    className={`fulfillment-toggle__option ${fulfillmentMethod === "PICKUP_AT_SHOP" ? "is-active" : ""}`}
                    onClick={() => setFulfillmentMethod("PICKUP_AT_SHOP")}
                  >
                    <strong>🏬 Nhận tại shop</strong>
                    <span>Bạn đến shop, kiểm tra máy trực tiếp trước khi mang về</span>
                  </button>
                  <button
                    type="button"
                    className={`fulfillment-toggle__option ${fulfillmentMethod === "HOME_DELIVERY" ? "is-active" : ""}`}
                    onClick={() => setFulfillmentMethod("HOME_DELIVERY")}
                  >
                    <strong>🛵 Giao tận nơi</strong>
                    <span>Shop giao đến, bạn kiểm tra máy ngay lúc nhận</span>
                  </button>
                </div>
              )}

              {fulfillmentMethod === "HOME_DELIVERY" && (
                <label className="booking-form-full">
                  <span>Địa chỉ nhận máy</span>
                  <input
                    value={form.shippingAddress}
                    onChange={(e) => setForm((f) => ({ ...f, shippingAddress: e.target.value }))}
                    placeholder="Số nhà, tên đường, phường/xã..."
                  />
                </label>
              )}

              <span className="booking-form-full booking-form-full--label">Căn cước công dân (CMND/CCCD)</span>
              {profile?.identityVerified ? (
                <div className="booking-id-verified">✓ Đã xác thực CCCD ({profile.idCardNumber})</div>
              ) : (
                <>
                  <label className="booking-form-full">
                    <span>Số CCCD/CMND</span>
                    <input
                      value={idForm.idCardNumber}
                      onChange={(e) => setIdForm((f) => ({ ...f, idCardNumber: e.target.value }))}
                      placeholder="9 hoặc 12 chữ số"
                    />
                  </label>
                  <div className="booking-form-row">
                    <label>
                      <span>Ảnh mặt trước (URL)</span>
                      <input value={idForm.idCardFrontUrl} onChange={(e) => setIdForm((f) => ({ ...f, idCardFrontUrl: e.target.value }))} placeholder="https://..." />
                    </label>
                    <label>
                      <span>Ảnh mặt sau (URL)</span>
                      <input value={idForm.idCardBackUrl} onChange={(e) => setIdForm((f) => ({ ...f, idCardBackUrl: e.target.value }))} placeholder="https://..." />
                    </label>
                  </div>
                  <button type="button" className="btn btn-outline-shutter" onClick={handleVerifyId} disabled={verifyingId}>
                    {verifyingId ? "Đang xác thực..." : "Xác thực CCCD"}
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="booking-col-right">
            <div className="booking-receipt">
              <span className="washi-tape tape--rose booking-receipt__tape" aria-hidden="true" />
              <h3>BIÊN NHẬN</h3>
              <div className="booking-receipt__rows">
                <div>
                  <span>
                    {isHourlyBooking
                      ? `Phí thuê (buổi ${rentalSlot ? SLOT_LABELS[rentalSlot] : "—"})`
                      : `Phí thuê (${days || 0} ngày × ${formatPrice(product.rentPrice)})`}
                  </span>
                  <strong>{formatPrice(rentFee)}</strong>
                </div>
                <div><span>Tiền cọc thiết bị (30%)</span><strong>{formatPrice(deposit)}</strong></div>
                {addonTotal > 0 && (
                  <div><span>Phụ kiện bổ sung ({paidAddons.length})</span><strong>{formatPrice(addonTotal)}</strong></div>
                )}
                <div>
                  <span>Phí nhận máy{selectedLocation ? ` (${selectedLocation.name})` : ""}</span>
                  <strong>{pickupFee > 0 ? formatPrice(pickupFee) : "0đ (Freeship)"}</strong>
                </div>
              </div>
              <div className="booking-receipt__total">
                <span>TỔNG CỘNG</span>
                <strong>{formatPrice(total)}</strong>
              </div>
              <p className="booking-receipt__thanks">CẢM ƠN BẠN ĐÃ ĐỒNG HÀNH CÙNG DIGISHOP</p>
            </div>

            <h4 className="booking-card__heading">Phương thức thanh toán</h4>
            <div className="booking-payment-row">
              <button
                type="button"
                className={`booking-payment-btn ${paymentMethod === "BANK_TRANSFER" ? "is-active" : ""}`}
                onClick={() => setPaymentMethod("BANK_TRANSFER")}
              >
                🏦 Chuyển khoản
              </button>
              <button
                type="button"
                className={`booking-payment-btn ${paymentMethod === "CASH" ? "is-active" : ""}`}
                onClick={() => setPaymentMethod("CASH")}
              >
                💵 Tiền mặt
              </button>
            </div>

            {feedback && (
              <p className={`product-feedback-inline ${feedback.type === "error" ? "product-feedback-inline--error" : ""}`}>
                {feedback.text}
              </p>
            )}

            <button type="button" className="btn btn-shutter booking-confirm-btn" onClick={handleConfirmBooking} disabled={submitting}>
              {submitting ? "Đang xử lý..." : "Xác nhận đặt lịch"}
            </button>
            <p className="booking-confirm-hint">* Bạn sẽ nhận được cuộc gọi xác nhận trong vòng 15 phút.</p>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
} 