/**
 * Hiệu ứng "bay vào giỏ hàng" khi bấm Thêm vào giỏ hàng — clone ảnh sản phẩm đang xem,
 * cho nó bay từ vị trí hiện tại tới icon giỏ hàng trên navbar rồi biến mất, không dùng
 * thư viện animation ngoài, chỉ CSS transition + transform.
 *
 * Yêu cầu: icon giỏ hàng trên NavBar phải có id="navbar-cart-icon".
 */
export function flyToCart(sourceImgEl) {
  if (!sourceImgEl) return;
  const cartEl = document.getElementById("navbar-cart-icon");
  if (!cartEl) return;

  const startRect = sourceImgEl.getBoundingClientRect();
  const endRect = cartEl.getBoundingClientRect();
  if (startRect.width === 0 || startRect.height === 0) return;

  const clone = sourceImgEl.cloneNode(true);
  clone.style.position = "fixed";
  clone.style.top = `${startRect.top}px`;
  clone.style.left = `${startRect.left}px`;
  clone.style.width = `${startRect.width}px`;
  clone.style.height = `${startRect.height}px`;
  clone.style.objectFit = "cover";
  clone.style.borderRadius = "10px";
  clone.style.boxShadow = "0 8px 24px rgba(68, 42, 34, 0.35)";
  clone.style.zIndex = "9999";
  clone.style.margin = "0";
  clone.style.pointerEvents = "none";
  clone.style.willChange = "transform, opacity";
  clone.style.transition = "transform 0.7s cubic-bezier(0.55, -0.4, 0.65, 1.35), opacity 0.7s ease 0.15s";
  document.body.appendChild(clone);

  const dx = endRect.left + endRect.width / 2 - (startRect.left + startRect.width / 2);
  const dy = endRect.top + endRect.height / 2 - (startRect.top + startRect.height / 2);
  const scale = Math.max(endRect.width / startRect.width, 0.06);

  // Chờ 1 frame để trình duyệt ghi nhận vị trí ban đầu trước khi đổi transform, nếu không
  // sẽ nhảy thẳng tới đích luôn, không có animation.
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      clone.style.transform = `translate(${dx}px, ${dy}px) scale(${scale})`;
      clone.style.opacity = "0.25";
    });
  });

  const cleanup = () => clone.remove();
  clone.addEventListener("transitionend", cleanup, { once: true });
  setTimeout(cleanup, 900); // an toàn nếu transitionend không bắn (vd tab mất focus)

  // Icon giỏ hàng "nảy" lên khi ảnh bay tới.
  cartEl.classList.add("navbar-cart--bump");
  setTimeout(() => cartEl.classList.remove("navbar-cart--bump"), 750);
}