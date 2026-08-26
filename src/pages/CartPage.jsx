import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import NavBar from "../components/NavBar";
import Footer from "../components/Footer";
import { useCart } from "../context/CartContext.jsx";
import { toApiError } from "../api/client";
import { formatPrice, resolveImageUrl } from "../utils/formatters";
import useDocumentTitle from "../hooks/useDocumentTitle";

const TAPE_COLORS = ["tape--rose", "tape--sky", "tape--sand", "tape--olive"];

function CartItemRow({ item, kind, index, onQuantityChange, onRemove, busy }) {
  const rotate = index % 2 === 0 ? "rotate-left" : "rotate-right";
  const tape = TAPE_COLORS[index % TAPE_COLORS.length];

  return (
    <div className={`cart2-row ${rotate}`}>
      <span className={`washi-tape ${tape} cart2-row__tape`} aria-hidden="true" />
      <div className="cart2-row__photo">
        <img src={resolveImageUrl(item.productImageUrl) || "https://via.placeholder.com/200x200?text=DigiShop"} alt={item.productName} />
      </div>

      <div className="cart2-row__body">
        <h3>{item.productName}</h3>
        {kind === "rental" ? (
          <p className="cart2-row__note">
            Thuê {item.rentalDays} ngày · {item.rentalStartDate} → {item.rentalEndDate}
          </p>
        ) : (
          <p className="cart2-row__note">{formatPrice(item.unitPrice)} / sản phẩm</p>
        )}
        {item.productAvailable === false && <p className="cart2-row__warning">Sản phẩm hiện không khả dụng</p>}

        <div className="cart2-row__controls">
          <span className="cart2-row__price">{formatPrice(item.unitPrice)}</span>
          {kind === "purchase" ? (
            <div className="cart2-stepper">
              <button type="button" disabled={busy || item.quantity <= 1} onClick={() => onQuantityChange(item.id, item.quantity - 1)}>
                −
              </button>
              <span>{item.quantity}</span>
              <button
                type="button"
                disabled={busy || item.quantity >= item.stockQuantity}
                onClick={() => onQuantityChange(item.id, item.quantity + 1)}
              >
                +
              </button>
            </div>
          ) : (
            <span className="cart2-stepper cart2-stepper--static">SL: {item.quantity}</span>
          )}
        </div>
      </div>

      <button type="button" className="cart2-row__delete" disabled={busy} onClick={() => onRemove(item.id)} aria-label="Xoá khỏi giỏ">
        🗑
      </button>
    </div>
  );
}

function SummaryPanel({ title, subtotal, extraLabel, extraValue, ctaLabel, onCheckout, quote }) {
  const total = subtotal + (extraValue || 0);

  return (
    <div className="cart2-summary">
      <span className="hand-stamped-tag" aria-hidden="true">Hand-Stamped</span>
      <h2>📋 {title}</h2>

      <div className="cart2-summary__lines">
        <div className="cart2-summary__line">
          <span>Tạm tính</span>
          <strong>{formatPrice(subtotal)}</strong>
        </div>
        {extraLabel && (
          <div className="cart2-summary__line">
            <span>{extraLabel}</span>
            <strong className="cart2-summary__accent">{formatPrice(extraValue)}</strong>
          </div>
        )}
      </div>

      <div className="cart2-summary__total">
        <span>Thành tiền</span>
        <strong>{formatPrice(total)}</strong>
      </div>

      <button type="button" className="btn-stamped btn-block" onClick={onCheckout}>
        {ctaLabel} →
      </button>

      <p className="cart2-summary__secure">🛡 Thanh toán bảo mật &amp; đóng gói thủ công 100%.</p>

      {quote && (
        <div className="cart2-quote">
          <p>"{quote}"</p>
        </div>
      )}
    </div>
  );
}

export default function CartPage() {
  useDocumentTitle("Giỏ hàng");
  const navigate = useNavigate();
  const { cart, loading, updateCartItem, removeCartItem } = useCart();
  const [busyItemId, setBusyItemId] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  const purchaseItems = cart?.purchaseItems || [];
  const rentalItems = cart?.rentalItems || [];

  const handleQuantityChange = async (itemId, quantity) => {
    setBusyItemId(itemId);
    setErrorMessage(null);
    try {
      await updateCartItem(itemId, { quantity });
    } catch (err) {
      setErrorMessage(toApiError(err).message);
    } finally {
      setBusyItemId(null);
    }
  };

  const handleRemove = async (itemId) => {
    setBusyItemId(itemId);
    setErrorMessage(null);
    try {
      await removeCartItem(itemId);
    } catch (err) {
      setErrorMessage(toApiError(err).message);
    } finally {
      setBusyItemId(null);
    }
  };

  return (
    <div className="cart2-page">
      <NavBar />

      <section className="cart2-shell">
        <header className="cart2-header">
          <h1>Giỏ hàng của bạn</h1>
          <p>Lưu giữ từng khoảnh khắc, chọn lựa kỹ càng...</p>
          <div className="cart2-header__underline" aria-hidden="true" />
        </header>

        {errorMessage && <p className="product-feedback-inline product-feedback-inline--error">{errorMessage}</p>}

        {loading && !cart && <div className="catalog-state">Đang tải giỏ hàng...</div>}

        {!loading && purchaseItems.length === 0 && rentalItems.length === 0 && (
          <div className="catalog-empty">
            <h3>Giỏ hàng đang trống</h3>
            <p>Ghé qua trang sản phẩm để chọn máy ảnh yêu thích nhé.</p>
            <Link to="/products" className="btn btn-shutter">
              Xem sản phẩm
            </Link>
          </div>
        )}

        {purchaseItems.length > 0 && (
          <div className="cart2-grid">
            <div className="cart2-items">
              <h2 className="cart2-section-title">🛍 Sản phẩm mua</h2>
              {purchaseItems.map((item, index) => (
                <CartItemRow
                  key={item.id}
                  item={item}
                  kind="purchase"
                  index={index}
                  onQuantityChange={handleQuantityChange}
                  onRemove={handleRemove}
                  busy={busyItemId === item.id}
                />
              ))}
            </div>

            <SummaryPanel
              title="Tổng kết đơn mua"
              subtotal={cart.purchaseSubtotal}
              ctaLabel="Tiến hành thanh toán"
              onCheckout={() => navigate("/checkout?type=purchase")}
              quote="Mỗi chiếc máy ảnh là một câu chuyện chờ được kể. Cảm ơn bạn đã đồng hành cùng DigiShop."
            />
          </div>
        )}

        {rentalItems.length > 0 && (
          <div className="cart2-grid">
            <div className="cart2-items">
              <h2 className="cart2-section-title">🎥 Sản phẩm thuê</h2>
              {rentalItems.map((item, index) => (
                <CartItemRow
                  key={item.id}
                  item={item}
                  kind="rental"
                  index={index}
                  onQuantityChange={handleQuantityChange}
                  onRemove={handleRemove}
                  busy={busyItemId === item.id}
                />
              ))}
            </div>

            <SummaryPanel
              title="Tổng kết đơn thuê"
              subtotal={cart.rentalSubtotal}
              extraLabel="Tiền cọc (30%)"
              extraValue={cart.rentalSubtotal * 0.3}
              ctaLabel="Tiến hành thanh toán"
              onCheckout={() => navigate("/checkout?type=rental")}
              quote="Giữ gìn cẩn thận, trả đúng hẹn — để hành trình cho thuê luôn trọn vẹn."
            />
          </div>
        )}
      </section>

      <Footer />
    </div>
  );
}