import { useEffect, useState } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import NavBar from "../components/NavBar";
import Footer from "../components/Footer";
import QrPaymentPanel from "../components/QrPaymentPanel";
import { useCart } from "../context/CartContext.jsx";
import { orderApi } from "../api/orderApi";
import { productApi } from "../api/productApi";
import { pickupLocationApi } from "../api/pickupLocationApi";
import { toApiError } from "../api/client";
import { formatPrice, resolveImageUrl } from "../utils/formatters";
import useDocumentTitle from "../hooks/useDocumentTitle";

const PAYMENT_METHODS = [
  { value: "BANK_TRANSFER", label: "Chuyển khoản ngân hàng", desc: "Thanh toán qua mã QR hoặc STK nội địa", icon: "🏦" },
  { value: "COD", label: "Thanh toán khi nhận hàng (COD)", desc: "Thanh toán tiền mặt cho nhân viên giao hàng", icon: "🚚" },
];

export default function CheckoutPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const type = searchParams.get("type") === "rental" ? "rental" : "purchase";
  useDocumentTitle(type === "rental" ? "Thanh toán đơn thuê" : "Thanh toán đơn mua");
  const { cart, loading, refreshCart } = useCart();

  const [form, setForm] = useState({
    recipientName: "",
    recipientPhone: "",
    shippingAddress: "", // dùng cho THUÊ (nhận tại địa điểm nội thành do shop cấu hình)
    addressStreet: "", // 3 field dưới dùng cho MUA (giao hàng toàn quốc, không giới hạn nội thành)
    addressWard: "",
    addressCity: "",
    promotionCode: "",
    note: "",
    paymentMethod: "BANK_TRANSFER",
  });
  const [fulfillmentMethod, setFulfillmentMethodRaw] = useState("HOME_DELIVERY"); // hoặc "PICKUP_AT_SHOP"
  const [pickupLocations, setPickupLocations] = useState([]);
  const [selectedLocationId, setSelectedLocationId] = useState(null);
  const [provinces, setProvinces] = useState([]);
  const [wards, setWards] = useState([]);
  const [selectedProvinceCode, setSelectedProvinceCode] = useState("");
  const [selectedWardCode, setSelectedWardCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [completedOrder, setCompletedOrder] = useState(null);
  // "form" -> "awaitingPayment" (QR, chỉ khi chuyển khoản) -> "done"
  const [stage, setStage] = useState("form");

  const setFulfillmentMethod = (value) => {
    setFulfillmentMethodRaw(value);
    setError(null);
  };

  // Địa điểm nhận hàng do admin cấu hình — dùng cho cả THUÊ và MUA. Với MUA, luôn cộng thêm 1 lựa chọn
  // "Tỉnh/thành khác" vì các địa điểm admin cấu hình thường chỉ giao nội thành bán kính vài km.
  useEffect(() => {
    pickupLocationApi
      .getActiveLocations()
      .then((locs) => {
        setPickupLocations(locs);
        if (type === "rental" && locs.length > 0) {
          setSelectedLocationId(locs[0].id);
          setFulfillmentMethodRaw(locs[0].isDelivery ? "HOME_DELIVERY" : "PICKUP_AT_SHOP");
        }
      })
      .catch(() => {}); // không có địa điểm cấu hình -> quay lại toggle mặc định cũ
  }, [type]);

  // Với MUA: danh sách hiển thị = các địa điểm admin cấu hình + (nếu chưa có lựa chọn "nhận tại shop"
  // miễn phí nào) 1 nút "Nhận tại shop" mặc định + luôn có thêm 1 nút "Tỉnh/thành khác" để ship xa.
  const purchaseOptions =
    type === "purchase"
      ? [
          ...pickupLocations,
          ...(pickupLocations.some((l) => !l.isDelivery)
            ? []
            : [{ id: "SHOP", name: "Nhận tại shop", address: "", fee: 0, isDelivery: false }]),
          { id: "OTHER", name: "Tỉnh/thành phố khác", address: "Ship toàn quốc, mọi tỉnh thành", fee: 35000, isDelivery: true },
        ]
      : pickupLocations;

  useEffect(() => {
    if (type === "purchase" && !selectedLocationId && purchaseOptions.length > 0) {
      setSelectedLocationId(purchaseOptions[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, pickupLocations]);

  const selectedLocation =
    type === "purchase"
      ? purchaseOptions.find((l) => String(l.id) === String(selectedLocationId))
      : pickupLocations.find((l) => l.id === selectedLocationId);
  const pickupFee = selectedLocation ? Number(selectedLocation.fee || 0) : 0;

  // Danh sách Tỉnh/Thành phố — chỉ tải khi đơn MUA chọn "Tỉnh/thành phố khác" (giao hàng toàn quốc).
  useEffect(() => {
    if (type !== "purchase") return;
    fetch("https://provinces.open-api.vn/api/v2/p/")
      .then((r) => r.json())
      .then((data) => setProvinces(Array.isArray(data) ? data : []))
      .catch(() => setProvinces([]));
  }, [type]);

  // Danh sách Phường/Xã thuộc tỉnh/thành đang chọn — tải lại mỗi khi đổi tỉnh/thành.
  useEffect(() => {
    if (!selectedProvinceCode) {
      setWards([]);
      return;
    }
    fetch(`https://provinces.open-api.vn/api/v2/p/${selectedProvinceCode}?depth=2`)
      .then((r) => r.json())
      .then((data) => setWards(Array.isArray(data?.wards) ? data.wards : []))
      .catch(() => setWards([]));
  }, [selectedProvinceCode]);

  const items = type === "rental" ? cart?.rentalItems || [] : cart?.purchaseItems || [];
  const subtotal = type === "rental" ? cart?.rentalSubtotal || 0 : cart?.purchaseSubtotal || 0;
  const deposit = type === "rental" ? subtotal * 0.3 : 0;

  // Ảnh khách chụp bằng máy — gộp theo từng sản phẩm trong giỏ (giống mục "Ảnh khách chụp bằng máy này" ở trang thuê).
  const [samplePhotosByProduct, setSamplePhotosByProduct] = useState({});
  useEffect(() => {
    const productIds = [...new Set(items.map((i) => i.productId))];
    if (productIds.length === 0) return;
    Promise.all(
      productIds.map((id) =>
        productApi
          .getSamplePhotos(id)
          .then((photos) => [id, photos])
          .catch(() => [id, []])
      )
    ).then((results) => setSamplePhotosByProduct(Object.fromEntries(results)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.map((i) => i.productId).join(",")]);

  const setField = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const requiresAddress =
    type === "rental"
      ? pickupLocations.length > 0
        ? Boolean(selectedLocation?.isDelivery)
        : fulfillmentMethod === "HOME_DELIVERY"
      : Boolean(selectedLocation?.isDelivery);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (requiresAddress) {
      if (type === "rental" && !form.shippingAddress.trim()) {
        setError("Vui lòng nhập địa chỉ nhận máy, hoặc chọn địa điểm không cần giao tận nơi.");
        return;
      }
      if (type === "purchase" && (!form.addressStreet.trim() || !form.addressWard.trim() || !form.addressCity.trim())) {
        setError("Vui lòng nhập đầy đủ địa chỉ, phường/xã và tỉnh/thành phố.");
        return;
      }
    }

    setSubmitting(true);
    setError(null);

    const paymentLabel = PAYMENT_METHODS.find((p) => p.value === form.paymentMethod)?.label || form.paymentMethod;
    const noteWithPayment = `[PTTT: ${paymentLabel}]${form.note ? " " + form.note : ""}`;

    const shippingAddress = type === "rental"
      ? form.shippingAddress
      : [form.addressStreet, form.addressWard, form.addressCity].filter((s) => s.trim()).join(", ");

    try {
      const payload = {
        cartItemIds: null,
        promotionCode: form.promotionCode || null,
        recipientName: form.recipientName,
        recipientPhone: form.recipientPhone,
        fulfillmentMethod,
        shippingAddress: requiresAddress ? shippingAddress : "",
        pickupLocationId:
          type === "rental"
            ? pickupLocations.length > 0
              ? selectedLocationId
              : null
            : selectedLocationId !== "SHOP" && selectedLocationId !== "OTHER"
              ? selectedLocationId
              : null,
        note: noteWithPayment,
      };

      const order =
        type === "rental"
          ? await orderApi.checkoutRental({ ...payload, rentNowProductId: null, rentNowQuantity: null, rentNowStartDate: null, rentNowEndDate: null })
          : await orderApi.checkoutPurchase({ ...payload, buyNowProductId: null, buyNowQuantity: null });

      setCompletedOrder(order);
      await refreshCart();

      if (type === "rental") {
        setStage(form.paymentMethod === "BANK_TRANSFER" ? "awaitingPayment" : "done");
      } else if (form.paymentMethod === "BANK_TRANSFER") {
        setStage("awaitingPayment");
      } else {
        setStage("done");
      }
    } catch (err) {
      setError(toApiError(err).message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!loading && items.length === 0 && !completedOrder) {
    return <Navigate to="/cart" replace />;
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
              setStage("done");
            }}
            onCancelled={() => {
              navigate("/cart", { replace: true });
            }}
          />
        </section>
        <Footer />
      </div>
    );
  }

  if (stage === "done" && completedOrder) {
    return (
      <div className="booking-page">
        <NavBar />
        <section className="booking-shell">
          <div className="rental-thankyou">
            <span className="postmark-stamp" aria-hidden="true">Đã xác nhận</span>
            <h1>Cảm ơn bạn đã ghé Tiệm Tạp Hóa Kỷ Ức 📷</h1>
            <p>
              Đơn {type === "rental" ? "thuê" : "mua"} của bạn đã được ghi nhận — mã đơn{" "}
              <strong>#{completedOrder.orderCode}</strong>, tổng thanh toán{" "}
              <strong>{formatPrice(completedOrder.totalAmount)}</strong>
              {type === "rental" && (
                <> (đã gồm cọc <strong>{formatPrice(completedOrder.depositAmount)}</strong>)</>
              )}
              . Đơn đang chờ shop xác nhận và chuẩn bị {type === "rental" ? "thiết bị" : "hàng"} cho bạn.
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
          {type === "rental" ? "Xác nhận đơn thuê" : "Xác nhận đơn mua"}
        </h1>

        <form onSubmit={handleSubmit}>
          <div className="booking-grid">
            <div className="booking-col-left">
              <div className="booking-card">
                <h3 className="booking-card__heading">📇 Thông tin {type === "rental" ? "nhận máy" : "giao hàng"}</h3>

                <div className="booking-form-row">
                  <label>
                    <span>Họ và tên</span>
                    <input value={form.recipientName} onChange={setField("recipientName")} required placeholder="" />
                  </label>
                  <label>
                    <span>Số điện thoại</span>
                    <input value={form.recipientPhone} onChange={setField("recipientPhone")} required placeholder="" />
                  </label>
                </div>

                {/* ---- Phần dưới đây khác nhau giữa MUA và THUÊ ---- */}
                <span className="booking-form-full booking-form-full--label">Cách nhận hàng</span>
                {type === "rental" ? (
                  <>
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
                          <span>Bạn đến shop nhận trực tiếp</span>
                        </button>
                        <button
                          type="button"
                          className={`fulfillment-toggle__option ${fulfillmentMethod === "HOME_DELIVERY" ? "is-active" : ""}`}
                          onClick={() => setFulfillmentMethod("HOME_DELIVERY")}
                        >
                          <strong>🛵 Giao tận nơi</strong>
                          <span>Shop giao đến địa chỉ của bạn (nội thành)</span>
                        </button>
                      </div>
                    )}

                    {requiresAddress && (
                      <label className="booking-form-full">
                        <span>Địa chỉ giao/nhận thiết bị</span>
                        <input
                          value={form.shippingAddress}
                          onChange={setField("shippingAddress")}
                          required
                          placeholder="123 Đường B, Quận 1, TP. Hồ Chí Minh"
                        />
                      </label>
                    )}
                  </>
                ) : (
                  <>
                    <div className="fulfillment-toggle" style={{ flexWrap: "wrap" }}>
                      {purchaseOptions.map((loc) => (
                        <button
                          key={loc.id}
                          type="button"
                          className={`fulfillment-toggle__option ${String(selectedLocationId) === String(loc.id) ? "is-active" : ""}`}
                          onClick={() => {
                            setSelectedLocationId(loc.id);
                            setFulfillmentMethod(loc.isDelivery ? "HOME_DELIVERY" : "PICKUP_AT_SHOP");
                          }}
                        >
                          <strong>{loc.isDelivery ? "🚚" : "🏬"} {loc.name}</strong>
                          <span>
                            {loc.address && `${loc.address} — `}
                            {Number(loc.fee) > 0 ? `+${formatPrice(loc.fee)}` : "Miễn phí"}
                          </span>
                        </button>
                      ))}
                    </div>

                    {requiresAddress && (
                      <>
                        <label className="booking-form-full">
                          <span>Địa chỉ cụ thể (số nhà, tên đường)</span>
                          <input
                            value={form.addressStreet}
                            onChange={setField("addressStreet")}
                            required
                            placeholder="123 Đường B"
                          />
                        </label>
                        <div className="booking-form-row">
                          <label>
                            <span>Tỉnh / Thành phố</span>
                            <select
                              value={selectedProvinceCode}
                              onChange={(e) => {
                                const code = e.target.value;
                                setSelectedProvinceCode(code);
                                setSelectedWardCode("");
                                const p = provinces.find((x) => String(x.code) === code);
                                setForm((f) => ({ ...f, addressCity: p?.name || "", addressWard: "" }));
                              }}
                              required
                            >
                              <option value="">-- Chọn tỉnh/thành phố --</option>
                              {provinces.map((p) => (
                                <option key={p.code} value={p.code}>
                                  {p.name}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label>
                            <span>Phường / Xã</span>
                            <select
                              value={selectedWardCode}
                              onChange={(e) => {
                                const code = e.target.value;
                                setSelectedWardCode(code);
                                const w = wards.find((x) => String(x.code) === code);
                                setForm((f) => ({ ...f, addressWard: w?.name || "" }));
                              }}
                              required
                              disabled={!selectedProvinceCode || wards.length === 0}
                            >
                              <option value="">
                                {selectedProvinceCode ? "-- Chọn phường/xã --" : "Chọn tỉnh/thành phố trước"}
                              </option>
                              {wards.map((w) => (
                                <option key={w.code} value={w.code}>
                                  {w.name}
                                </option>
                              ))}
                            </select>
                          </label>
                        </div>
                      </>
                    )}
                  </>
                )}
                {/* ---- Hết phần khác nhau giữa MUA và THUÊ ---- */}

                <label className="booking-form-full">
                  <span>Ghi chú cho DigiShop</span>
                  <input value={form.note} onChange={setField("note")} placeholder="Gói quà giúp mình nhé!" />
                </label>
              </div>

              <div className="booking-card">
                <h3 className="booking-card__heading">🛍️ {type === "rental" ? "Thiết bị thuê" : "Sản phẩm"}</h3>
                {items.map((item, idx) => (
                  <div
                    className="booking-product-row"
                    key={item.id}
                    style={idx > 0 ? { marginTop: 20, paddingTop: 20, borderTop: "1px dashed var(--outline-variant)" } : undefined}
                  >
                    <div className="polaroid-frame-mini booking-product-row__photo">
                      <span className="booking-product-row__selected">SL: {String(item.quantity).padStart(2, "0")}</span>
                      <img
                        src={resolveImageUrl(item.productImageUrl) || "https://via.placeholder.com/160x160?text=DigiShop"}
                        alt={item.productName}
                      />
                    </div>
                    <div className="booking-product-row__info">
                      <h2>{item.productName}</h2>
                      <p>{type === "rental" ? `Thuê ${item.rentalDays} ngày` : "Sản phẩm mua"}</p>
                      <div className="booking-product-row__price">
                        <strong>{formatPrice(item.subtotal)}</strong>
                        <span>{type === "rental" ? `${item.quantity} × ${item.rentalDays} ngày` : `× ${item.quantity}`}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {items.map((item) => {
                const photos = samplePhotosByProduct[item.productId];
                if (!photos || photos.length === 0) return null;
                return (
                  <div className="sample-photos" key={item.productId}>
                    <h3>📸 Ảnh khách chụp bằng {item.productName}</h3>
                    <div className="sample-photos__grid">
                      {photos.map((photo) => (
                        <div className="sample-photos__item" key={photo.id}>
                          <img src={resolveImageUrl(photo.imageUrl)} alt={photo.caption || item.productName} />
                          {photo.caption && <span>{photo.caption}</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}

              {error && <p className="product-feedback-inline product-feedback-inline--error">{error}</p>}
            </div>

            <div className="booking-col-right">
              <div className="booking-receipt">
                <span className="washi-tape tape--rose booking-receipt__tape" aria-hidden="true" />
                <h3>BIÊN NHẬN</h3>
                <div className="booking-receipt__rows">
                  <div>
                    <span>Tạm tính</span>
                    <strong>{formatPrice(subtotal)}</strong>
                  </div>
                  {type === "rental" && (
                    <div>
                      <span>Tiền cọc (30%)</span>
                      <strong>{formatPrice(deposit)}</strong>
                    </div>
                  )}
                  {(type === "rental" || (type === "purchase" && selectedLocationId !== "OTHER")) && (
                    <div>
                      <span>Phí nhận hàng{selectedLocation ? ` (${selectedLocation.name})` : ""}</span>
                      <strong>{pickupFee > 0 ? formatPrice(pickupFee) : "0đ (Freeship)"}</strong>
                    </div>
                  )}
                </div>
                <div className="booking-receipt__total">
                  <span>TỔNG CỘNG</span>
                  <strong>{formatPrice(subtotal + deposit + pickupFee)}</strong>
                </div>
                <p className="booking-receipt__thanks">CẢM ƠN BẠN ĐÃ ĐỒNG HÀNH CÙNG DIGISHOP</p>
              </div>

              <h4 className="booking-card__heading">Phương thức thanh toán</h4>
              <div className="booking-payment-row">
                {PAYMENT_METHODS.map((method) => (
                  <button
                    key={method.value}
                    type="button"
                    className={`booking-payment-btn ${form.paymentMethod === method.value ? "is-active" : ""}`}
                    onClick={() => setForm((f) => ({ ...f, paymentMethod: method.value }))}
                    title={method.desc}
                  >
                    {method.icon} {method.label}
                  </button>
                ))}
              </div>

              <button type="submit" className="btn btn-shutter booking-confirm-btn" disabled={submitting}>
                {submitting ? "Đang xử lý..." : "Hoàn tất đặt hàng"}
              </button>
              <p className="booking-confirm-hint">* Đơn sẽ được shop xác nhận trong thời gian sớm nhất.</p>
            </div>
          </div>
        </form>
      </section>

      <Footer />
    </div>
  );
}