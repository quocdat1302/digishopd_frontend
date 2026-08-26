import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { productApi } from "../api/productApi";
import { categoryApi } from "../api/categoryApi";
import { promotionApi } from "../api/promotionApi";
import { feedbackApi } from "../api/feedbackApi";
import { resolveImageUrl } from "../utils/formatters";
import NavBar from "../components/NavBar";
import Footer from "../components/Footer";
import useDocumentTitle from "../hooks/useDocumentTitle";

export default function HomePage() {
  useDocumentTitle("DigiShop — Mua và thuê thiết bị ảnh");
  const { user } = useAuth();
  const navigate = useNavigate();
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [promotions, setPromotions] = useState([]);
  const [recommendedProducts, setRecommendedProducts] = useState([]);
  const [customerFeedbacks, setCustomerFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [products, cats, promos, feedbacks] = await Promise.all([
        productApi.getHotProducts(),
        categoryApi.getAllCategories(),
        promotionApi.getActivePromotions(),
        feedbackApi.getTopFeedbacks(),
      ]);
      setFeaturedProducts(products);
      setCategories(cats);
      setPromotions(promos);
      setCustomerFeedbacks(feedbacks);

      if (user) {
        const recommended = await productApi.getLatestProducts();
        setRecommendedProducts(recommended.slice(0, 4));
      }
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(price);
  };

  const heroProducts = useMemo(() => featuredProducts.slice(0, 3), [featuredProducts]);
  const heroPrimary = heroProducts[0];
  const heroSecondary = heroProducts[1];
  const heroAccent = heroProducts[2];
  const quickCategories = useMemo(() => categories.slice(0, 4), [categories]);
  const spotlightProducts = useMemo(() => featuredProducts.slice(0, 3), [featuredProducts]);
  const visibleFeedbacks = useMemo(() => customerFeedbacks.slice(0, 3), [customerFeedbacks]);
  const avatarFeedbacks = useMemo(() => customerFeedbacks.slice(0, 2), [customerFeedbacks]);

  const formatCompactPrice = (price) => {
    if (!price) return null;
    return formatPrice(price).replace(",00", "");
  };

  const getProductVisual = (product) =>
    resolveImageUrl(product?.imageUrl) || "https://via.placeholder.com/900x700/f6f1e5/6b4f45?text=DigiShop";

  const CATEGORY_ICON_HINTS = [
    { keys: ["phim", "film"], icon: "🎞" },
    { keys: ["kỹ thuật số", "digital", "mirrorless", "dslr"], icon: "📷" },
    { keys: ["ống kính", "lens"], icon: "🔍" },
    { keys: ["phụ kiện", "accessor"], icon: "🎒" },
    { keys: ["thuê", "rental"], icon: "🗓" },
  ];
  const iconForCategory = (name) => {
    const lower = (name || "").toLowerCase();
    const hit = CATEGORY_ICON_HINTS.find((h) => h.keys.some((k) => lower.includes(k)));
    return hit ? hit.icon : "🏷";
  };

  // Banner marquee text (uses promotion title if available)
  const bannerText = promotions[0]?.title || "LƯU GIỮ KỶ NIỆM QUA TỪNG THƯỚC PHIM — CHÀO MỪNG BẠN ĐẾN VỚI DigiShop";

  const getTransactionLabel = (product) => {
    if (!product) return "Sẵn sàng giao ngay";
    if (Number(product.rentPrice || 0) > 0) return `Từ ${formatCompactPrice(product.rentPrice)}/ngày`;
    if (Number(product.buyPrice || 0) > 0) return formatCompactPrice(product.buyPrice);
    return "Liên hệ để nhận giá";
  };

  const getProductLink = (product, mode) => `/products/${product.id}${mode ? `?mode=${mode}` : ""}`;

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const value = keyword.trim();
    navigate(value ? `/products?keyword=${encodeURIComponent(value)}` : "/products");
  };

  if (loading) {
    return (
      <div className="homepage">
        <div className="home-loading">
          <div className="home-loading__hero" />
          <div className="home-loading__grid">
            <span />
            <span />
            <span />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="homepage">
      <NavBar />

      <main className="home-main">

        <div className="home-banner-marquee" aria-hidden="true">
          <div className="home-banner-marquee__track">
            <span className="home-banner-marquee__item">{bannerText}</span>
            <span className="home-banner-marquee__item">{bannerText}</span>
            <span className="home-banner-marquee__item">{bannerText}</span>
            <span className="home-banner-marquee__item">{bannerText}</span>
          </div>
        </div>

        <section className="home-hero-banner">
          <div className="home-hero-banner__image">
            <div className="home-hero-banner__bg" />
            <div className="home-hero-banner__scrim" />

            <Link to="/products?transactionType=rent" className="home-hero-banner__fab" aria-label="Đặt lịch thuê máy">
              <span aria-hidden="true">📅</span>
            </Link>
          </div>
        </section>

        <section className="home-products-showcase">
          <div className="home-shell">
            <div className="home-section-title home-section-title--center">
              <span className="home-section-pill">Sản phẩm nổi bật</span>
              <h2>Các loại máy ảnh sẵn có</h2>
            </div>

            <div className="home-polaroid-grid">
              {spotlightProducts.map((product, index) => (
                <article key={product.id} className={`home-camera-card home-camera-card--${index + 1}`}>
                  <span className={`home-camera-card__tape home-camera-card__tape--${index + 1}`} />
                  <Link to={getProductLink(product)} className="home-camera-card__frame">
                    <div className="home-camera-card__image">
                      <img src={getProductVisual(product)} alt={product.name} />
                      <span className="home-camera-card__badge">{getTransactionLabel(product)}</span>
                    </div>
                    <div className="home-camera-card__body">
                      <h3>{product.name}</h3>
                      <p>{product.description || `${product.brand || "Máy ảnh"} dành cho nhu cầu quay chụp linh hoạt.`}</p>
                    </div>
                  </Link>
                  <div className="home-camera-card__actions">
                    <Link to={getProductLink(product, "buy")} className="home-btn home-btn--mini home-btn--primary">
                      Mua
                    </Link>
                    <Link to={getProductLink(product, "rent")} className="home-btn home-btn--mini home-btn--outline">
                      Thuê
                    </Link>
                  </div>
                </article>
              ))}
            </div>

            {quickCategories.length > 0 && (
              <div className="home-category-shortcuts">
                {quickCategories.map((category) => (
                  <Link
                    key={category.id}
                    to={`/products?${category.type}=${encodeURIComponent(category.name)}`}
                    className="home-category-shortcuts__item"
                  >
                    {category.imageUrl ? (
                      <img
                        className="home-category-shortcuts__icon home-category-shortcuts__icon--img"
                        src={resolveImageUrl(category.imageUrl)}
                        alt={category.name}
                      />
                    ) : (
                      <span className="home-category-shortcuts__icon" aria-hidden="true">
                        {iconForCategory(category.name)}
                      </span>
                    )}
                    <span className="home-category-shortcuts__text">
                      <strong>{category.name}</strong>
                      <span>{category.productCount} sản phẩm</span>
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="home-process-section">
          <div className="home-shell home-process__grid">
            <div className="home-process__content">
              <h2>Quy trình mua hoặc thuê chỉ với 3 bước</h2>
              <div className="home-process__steps">
                <article className="home-process-step">
                  <span>1</span>
                  <div>
                    <h4>Chọn sản phẩm phù hợp</h4>
                    <p>Người dùng xem chi tiết, giá bán hoặc giá thuê theo ngày ngay từ thẻ sản phẩm.</p>
                  </div>
                </article>
                <article className="home-process-step">
                  <span>2</span>
                  <div>
                    <h4>Xác nhận đơn hàng</h4>
                    <p>Luồng thuê có thể chọn ngày và xác minh hồ sơ, còn luồng mua đi thẳng tới checkout giao hàng.</p>
                  </div>
                </article>
                <article className="home-process-step">
                  <span>3</span>
                  <div>
                    <h4>Thanh toán nhanh</h4>
                    <p>Kết nối backend để hiển thị tổng tiền, ưu đãi, và cập nhật trạng thái thanh toán rõ ràng.</p>
                  </div>
                </article>
              </div>
            </div>

            <div className="home-process__quote">
              <div className="home-process__quote-card">
                <img src={getProductVisual(heroAccent || heroPrimary)} alt={heroAccent?.name || heroPrimary?.name || "Khách hàng DigiShop"} />
                <div className="home-process__quote-body">
                  <div className="home-process__stars">★★★★★</div>
                  <p>
                    {visibleFeedbacks[0]?.comment ||
                      "Dịch vụ tốt, giao diện rõ ràng và có thể phân biệt ngay sản phẩm dùng để mua hay để thuê."}
                  </p>
                  <span>— {visibleFeedbacks[0]?.customerName || "Khách hàng DigiShop"}</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="home-cta-banner">
          <div className="home-shell home-cta-banner__inner">
            <h2>Bạn đã sẵn sàng chọn chiếc máy phù hợp cho buổi chụp tiếp theo?</h2>
            <p>
              Trang chủ giữ nguyên tinh thần của mẫu thiết kế, chỉ thay phần nội dung bằng dữ liệu động từ backend để còn nối tiếp các luồng mua và thuê.
            </p>
            <div className="home-cta-banner__actions">
              <Link to="/products?transactionType=rent" className="home-btn home-btn--primary">
                Thuê máy
              </Link>
              <Link to="/products?transactionType=buy" className="home-btn home-btn--outline">
                Mua máy
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}