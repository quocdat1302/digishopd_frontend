import { Link } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { formatPrice, resolveImageUrl } from "../utils/formatters";

function MiniCartRow({ item, kind, onClose }) {
  return (
    <div className="mini-cart-row">
      <div className="mini-cart-row__photo">
        <img
          src={resolveImageUrl(item.productImageUrl) || "https://via.placeholder.com/80x80?text=DigiShop"}
          alt={item.productName}
        />
      </div>
      <div className="mini-cart-row__body">
        <p className="mini-cart-row__name">{item.productName}</p>
        {kind === "rental" ? (
          <p className="mini-cart-row__note">
            Thuê {item.rentalDays} ngày · SL {item.quantity}
          </p>
        ) : (
          <p className="mini-cart-row__note">SL {item.quantity}</p>
        )}
        <p className="mini-cart-row__price">{formatPrice(item.unitPrice)}</p>
      </div>
    </div>
  );
}

export default function MiniCartPopover({ onClose }) {
  const { cart, loading } = useCart();
  const purchaseItems = cart?.purchaseItems || [];
  const rentalItems = cart?.rentalItems || [];
  const isEmpty = purchaseItems.length === 0 && rentalItems.length === 0;
  const subtotal = (cart?.purchaseSubtotal || 0) + (cart?.rentalSubtotal || 0);

  return (
    <div className="mini-cart-popover">
      <div className="mini-cart-popover__arrow" aria-hidden="true" />
      <div className="mini-cart-popover__header">
        <h3>Giỏ hàng của bạn</h3>
        <button type="button" className="mini-cart-popover__close" onClick={onClose} aria-label="Đóng">
          ✕
        </button>
      </div>

      {loading && !cart && <p className="mini-cart-popover__hint">Đang tải giỏ hàng...</p>}

      {!loading && isEmpty && (
        <div className="mini-cart-popover__empty">
          <p>Giỏ hàng đang trống.</p>
          <Link to="/products" onClick={onClose} className="btn-tape">
            Xem sản phẩm
          </Link>
        </div>
      )}

      {!isEmpty && (
        <>
          <div className="mini-cart-popover__list">
            {purchaseItems.map((item) => (
              <MiniCartRow key={`purchase-${item.id}`} item={item} kind="purchase" onClose={onClose} />
            ))}
            {rentalItems.map((item) => (
              <MiniCartRow key={`rental-${item.id}`} item={item} kind="rental" onClose={onClose} />
            ))}
          </div>

          <div className="mini-cart-popover__footer">
            <div className="mini-cart-popover__subtotal">
              <span>Tạm tính</span>
              <strong>{formatPrice(subtotal)}</strong>
            </div>
            <Link to="/cart" onClick={onClose} className="btn btn-shutter btn-block">
              Xem giỏ hàng →
            </Link>
          </div>
        </>
      )}
    </div>
  );
} 