import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import NavBar from "../components/NavBar";
import Footer from "../components/Footer";
import { productApi } from "../api/productApi";
import { toApiError } from "../api/client";
import { formatPrice, resolveImageUrl } from "../utils/formatters";
import useDocumentTitle from "../hooks/useDocumentTitle";
import { useWishlist } from "../context/WishlistContext";
import { useAuth } from "../context/AuthContext";

const PAGE_SIZE = 6;

const TAPE_COLORS = ["tape--rose", "tape--sky", "tape--sand", "tape--olive"];

const RENT_PRICE_PRESETS = [
  { id: "under-200", label: "Dưới 200k", min: "", max: "200000" },
  { id: "200-500", label: "200k - 500k", min: "200000", max: "500000" },
  { id: "over-500", label: "Trên 500k", min: "500000", max: "" },
];

const BUY_PRICE_PRESETS = [
  { id: "under-1m", label: "Dưới 1.000.000đ", min: "", max: "1000000" },
  { id: "1m-5m", label: "1tr - 5tr", min: "1000000", max: "5000000" },
  { id: "over-5m", label: "Trên 5.000.000đ", min: "5000000", max: "" },
];

const HERO_COPY = {
  rent: {
    eyebrow: "Kho máy ảnh phim & digital",
    title: "Thuê máy, chụp thật nhiều, tiếc gì!",
    desc: "Ghé DigiShop thuê máy ảnh chụp cho đẹp mi ơi — chọn đúng dáng máy, đúng ngân sách, nhận hàng tận nơi.",
  },
  buy: {
    eyebrow: "Tiệm tạp hóa kỷ ức",
    title: "Sở hữu một \"linh hồn analog\" của riêng bạn",
    desc: "Nơi những thước phim chưa kể tìm thấy người tri kỷ. Bắt đầu hành trình lưu giữ những khoảnh khắc hữu hình.",
  },
  all: {
    eyebrow: "Danh sách sản phẩm",
    title: "Kho máy ảnh Mirrorless & digital",
    desc: "Lọc theo hãng, loại, mức giá và tình trạng để rút ngắn đường đi tới sản phẩm phù hợp nhất.",
  },
};

function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
}

function getPriceForSort(product, transactionType) {
  if (transactionType === "rent") return Number(product.rentPrice || 0);
  if (transactionType === "buy") return Number(product.buyPrice || 0);
  return Number(product.buyPrice || product.rentPrice || 0);
}

function toggleInList(list, value) {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

export default function ProductListPage() {
  useDocumentTitle("Sản phẩm");
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { isLiked, toggleLike } = useWishlist();
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    productApi
      .getAllProducts()
      .then((data) => {
        if (active) setProducts(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        if (active) setError(toApiError(err).message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const filters = useMemo(
    () => ({
      keyword: searchParams.get("keyword") || "",
      types: (searchParams.get("type") || "").split(",").filter(Boolean),
      brands: (searchParams.get("brand") || "").split(",").filter(Boolean),
      transactionType: searchParams.get("transactionType") || "",
      condition: searchParams.get("condition") || "",
      pricePreset: searchParams.get("pricePreset") || "",
      sort: searchParams.get("sort") || "newest",
      page: Math.max(1, Number(searchParams.get("page") || 1)),
    }),
    [searchParams]
  );

  const transactionMode = filters.transactionType === "rent" || filters.transactionType === "buy" ? filters.transactionType : "all";
  const hero = HERO_COPY[transactionMode];
  const pricePresets = transactionMode === "buy" ? BUY_PRICE_PRESETS : RENT_PRICE_PRESETS;
  const activePricePreset = pricePresets.find((preset) => preset.id === filters.pricePreset) || null;
  const minPrice = activePricePreset?.min || "";
  const maxPrice = activePricePreset?.max || "";

  const filterOptions = useMemo(() => {
    const brands = [...new Set(products.map((item) => item.brand).filter(Boolean))].sort((a, b) => a.localeCompare(b));
    const types = [...new Set(products.map((item) => item.type).filter(Boolean))].sort((a, b) => a.localeCompare(b));
    return { brands, types };
  }, [products]);

  const filteredProducts = useMemo(() => {
    const keyword = normalizeText(filters.keyword);
    const types = filters.types.map(normalizeText);
    const brands = filters.brands.map(normalizeText);
    const transactionType = normalizeText(filters.transactionType);
    const condition = normalizeText(filters.condition);
    const min = minPrice ? Number(minPrice) : null;
    const max = maxPrice ? Number(maxPrice) : null;

    const next = products.filter((product) => {
      if (keyword) {
        const haystack = `${product.name} ${product.brand} ${product.type} ${product.description || ""}`.toLowerCase();
        if (!haystack.includes(keyword)) return false;
      }

      if (types.length && !types.includes(normalizeText(product.type))) return false;
      if (brands.length && !brands.includes(normalizeText(product.brand))) return false;
      if (condition && normalizeText(product.productCondition) !== condition) return false;

      if (transactionType === "buy" && !(Number(product.buyPrice || 0) > 0)) return false;
      if (transactionType === "rent" && !(Number(product.rentPrice || 0) > 0)) return false;

      const activePrice = getPriceForSort(product, transactionType);
      if (min !== null && activePrice < min) return false;
      if (max !== null && activePrice > max) return false;

      return true;
    });

    next.sort((a, b) => {
      switch (filters.sort) {
        case "price-asc":
          return getPriceForSort(a, transactionType) - getPriceForSort(b, transactionType);
        case "price-desc":
          return getPriceForSort(b, transactionType) - getPriceForSort(a, transactionType);
        case "best-seller":
          return Number(b.isHot) - Number(a.isHot) || Number(b.isNew) - Number(a.isNew);
        case "newest":
        default:
          return Number(b.isNew) - Number(a.isNew) || Number(b.id) - Number(a.id);
      }
    });

    return next;
  }, [products, filters, minPrice, maxPrice]);

  const visibleProducts = filteredProducts.slice(0, filters.page * PAGE_SIZE);
  const hasMore = visibleProducts.length < filteredProducts.length;

  const updateFilter = (key, value) => {
    const next = new URLSearchParams(searchParams);

    if (value) {
      next.set(key, value);
    } else {
      next.delete(key);
    }

    next.set("page", "1");
    setSearchParams(next);
  };

  const toggleTypeFilter = (type) => {
    const next = new URLSearchParams(searchParams);
    const updated = toggleInList(filters.types, type);
    if (updated.length) next.set("type", updated.join(","));
    else next.delete("type");
    next.set("page", "1");
    setSearchParams(next);
  };

  const toggleBrandFilter = (brand) => {
    const next = new URLSearchParams(searchParams);
    const updated = toggleInList(filters.brands, brand);
    if (updated.length) next.set("brand", updated.join(","));
    else next.delete("brand");
    next.set("page", "1");
    setSearchParams(next);
  };

  const handleToggleLike = (e, productId) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) {
      navigate("/login", { state: { from: window.location.pathname + window.location.search } });
      return;
    }
    toggleLike(productId).catch(() => {
      // Lỗi mạng/hết hạn đăng nhập: WishlistContext đã tự rollback UI, không cần xử lý thêm ở đây.
    });
  };

  const setTransactionType = (value) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set("transactionType", value);
    else next.delete("transactionType");
    next.delete("pricePreset");
    next.set("page", "1");
    setSearchParams(next);
  };

  const handleLoadMore = () => {
    const next = new URLSearchParams(searchParams);
    next.set("page", String(filters.page + 1));
    setSearchParams(next);
  };

  const resetFilters = () => {
    setSearchParams({});
  };

  return (
    <div className="catalog-page">
      <NavBar />

      <section className="catalog-hero">
        <div className="catalog-hero__sparkle" aria-hidden="true">✦ ✧ ✦</div>
        <div className="catalog-hero__content">
          <span className="catalog-hero__eyebrow">{hero.eyebrow}</span>
          <h1>{hero.title}</h1>
          <p>{hero.desc}</p>
          <div className="catalog-hero__underline" aria-hidden="true" />

          <div className="catalog-mode-switch" role="tablist" aria-label="Chọn hình thức">
            <button
              type="button"
              className={transactionMode === "all" ? "is-active" : ""}
              onClick={() => setTransactionType("")}
            >
              Tất cả
            </button>
            <button
              type="button"
              className={transactionMode === "buy" ? "is-active" : ""}
              onClick={() => setTransactionType("buy")}
            >
              Cửa hàng (Mua)
            </button>
            <button
              type="button"
              className={transactionMode === "rent" ? "is-active" : ""}
              onClick={() => setTransactionType("rent")}
            >
              Browse (Thuê)
            </button>
          </div>
        </div>
      </section>

      <section className="catalog-layout">
        <aside className="catalog-sidebar">
          <div className="catalog-panel catalog-panel--torn">
            <div className="catalog-panel__heading">
              <h2>Bộ lọc</h2>
              <button type="button" className="catalog-clear-btn" onClick={resetFilters}>
                Xóa lọc
              </button>
            </div>

            <div className="catalog-field">
              <label>Từ khóa</label>
              <input
                value={filters.keyword}
                onChange={(e) => updateFilter("keyword", e.target.value)}
                placeholder="Tên sản phẩm, hãng..."
              />
            </div>

            <div className="catalog-checklist">
              <span className="catalog-checklist__title">{transactionMode === "buy" ? "Phân loại" : "Loại máy"}</span>
              {filterOptions.types.length === 0 && <p className="catalog-checklist__empty">Đang cập nhật...</p>}
              {filterOptions.types.map((type) => (
                <label key={type} className="catalog-check">
                  <input
                    type="checkbox"
                    checked={filters.types.includes(type)}
                    onChange={() => toggleTypeFilter(type)}
                  />
                  <span className="catalog-check__box" aria-hidden="true" />
                  <span>{type}</span>
                </label>
              ))}
            </div>

            <div className="catalog-checklist">
              <span className="catalog-checklist__title">Thương hiệu</span>
              {filterOptions.brands.map((brand) => (
                <label key={brand} className="catalog-check">
                  <input
                    type="checkbox"
                    checked={filters.brands.includes(brand)}
                    onChange={() => toggleBrandFilter(brand)}
                  />
                  <span className="catalog-check__box" aria-hidden="true" />
                  <span>{brand}</span>
                </label>
              ))}
            </div>

            <div className="catalog-checklist">
              <span className="catalog-checklist__title">Tình trạng</span>
              {[
                { value: "new", label: "Mới 100%" },
                { value: "used", label: "Đã qua sử dụng" },
              ].map((item) => (
                <label key={item.value} className="catalog-check catalog-check--radio">
                  <input
                    type="radio"
                    name="condition"
                    checked={filters.condition === item.value}
                    onChange={() => updateFilter("condition", filters.condition === item.value ? "" : item.value)}
                  />
                  <span className="catalog-check__box catalog-check__box--radio" aria-hidden="true" />
                  <span>{item.label}</span>
                </label>
              ))}
            </div>

            <div className="catalog-checklist">
              <span className="catalog-checklist__title">{transactionMode === "buy" ? "Mức giá" : "Giá thuê"}</span>
              {pricePresets.map((preset) => (
                <label key={preset.id} className="catalog-check catalog-check--radio">
                  <input
                    type="radio"
                    name="pricePreset"
                    checked={filters.pricePreset === preset.id}
                    onChange={() => updateFilter("pricePreset", filters.pricePreset === preset.id ? "" : preset.id)}
                  />
                  <span className="catalog-check__box catalog-check__box--radio" aria-hidden="true" />
                  <span>{preset.label}</span>
                </label>
              ))}
            </div>

            <div className="catalog-panel__stars" aria-hidden="true">✶ ✷ ✶</div>
          </div>
        </aside>

        <div className="catalog-main">
          <div className="catalog-toolbar">
            <div>
              <h2>Hiển thị {filteredProducts.length} sản phẩm</h2>
              <p>Hiển thị danh sách theo điều kiện bạn đang chọn.</p>
            </div>

            <div className="catalog-field catalog-field--sort">
              <label>Sắp xếp</label>
              <select value={filters.sort} onChange={(e) => updateFilter("sort", e.target.value)}>
                <option value="newest">Mới nhất</option>
                <option value="price-asc">Giá tăng dần</option>
                <option value="price-desc">Giá giảm dần</option>
                <option value="best-seller">Bán chạy</option>
              </select>
            </div>
          </div>

          {loading && <div className="catalog-state">Đang tải danh sách sản phẩm...</div>}
          {!loading && error && <div className="catalog-state catalog-state--error">{error}</div>}

          {!loading && !error && filteredProducts.length === 0 && (
            <div className="catalog-empty">
              <h3>Chưa có sản phẩm phù hợp</h3>
              <p>Thử nới bộ lọc hoặc xóa bớt điều kiện để xem thêm sản phẩm.</p>
              <button type="button" className="btn btn-shutter" onClick={resetFilters}>
                Xóa toàn bộ bộ lọc
              </button>
            </div>
          )}

          {!loading && !error && filteredProducts.length > 0 && (
            <>
              <div className="catalog-grid">
                {visibleProducts.map((product, index) => {
                  const supportsBuy = Number(product.buyPrice || 0) > 0;
                  const supportsRent = Number(product.rentPrice || 0) > 0;
                  const showRent = transactionMode === "rent" || (transactionMode === "all" && supportsRent && !supportsBuy);
                  const tapeClass = TAPE_COLORS[index % TAPE_COLORS.length];
                  const rotate = index % 2 === 0 ? "rotate-left" : "rotate-right";

                  return (
                    <article key={product.id} className={`polaroid-card ${rotate}`}>
                      <Link to={`/products/${product.id}`} className="polaroid-card__frame">
                        <span className={`washi-tape ${tapeClass}`} aria-hidden="true" />
                        <div className="polaroid-card__photo">
                          <img
                            src={resolveImageUrl(product.imageUrl) || "https://via.placeholder.com/640x640?text=DigiShop"}
                            alt={product.name}
                          />
                          <button
                            type="button"
                            className={`polaroid-card__like${isLiked(product.id) ? " polaroid-card__like--active" : ""}`}
                            aria-label={isLiked(product.id) ? "Bỏ yêu thích" : "Yêu thích"}
                            onClick={(e) => handleToggleLike(e, product.id)}
                          >
                            {isLiked(product.id) ? "♥" : "♡"}
                          </button>
                          {product.isHot && <span className="washi-flag washi-flag--hot">Best Seller</span>}
                          {!product.isHot && product.isNew && <span className="washi-flag washi-flag--new">Mới về</span>}
                          {!product.isHot && !product.isNew && normalizeText(product.productCondition) === "used" && (
                            <span className="washi-flag washi-flag--soft">Rare Find</span>
                          )}
                        </div>

                        <div className="polaroid-card__caption">
                          <div className="polaroid-card__meta">
                            <span>{product.brand}</span>
                            <span>·</span>
                            <span>{product.type}</span>
                          </div>
                          <h3>{product.name}</h3>

                          {showRent ? (
                            <p className="polaroid-card__price">
                              {supportsRent ? <>Từ <strong>{formatPrice(product.rentPrice)}</strong>/ngày</> : "Ngừng cho thuê"}
                            </p>
                          ) : (
                            <p className="polaroid-card__price">
                              {supportsBuy ? <strong>{formatPrice(product.buyPrice)}</strong> : "Ngừng bán"}
                            </p>
                          )}
                          {(supportsBuy || supportsRent) && (
                            <p className="polaroid-card__subcopy">
                              {supportsRent ? "Thuê nhanh — nhận máy trong ngày" : "Sở hữu ngay — giao hàng tiện lợi"}
                            </p>
                          )}
                        </div>
                      </Link>

                      <div className="polaroid-card__actions">
                        {showRent ? (
                          <Link
                            to={`/products/${product.id}?mode=rent`}
                            className={`btn-tape ${!supportsRent ? "is-disabled" : ""}`}
                          >
                            Thuê ngay
                          </Link>
                        ) : (
                          <Link
                            to={`/products/${product.id}?mode=buy`}
                            className={`btn-tape ${!supportsBuy ? "is-disabled" : ""}`}
                          >
                            Thêm vào giỏ
                          </Link>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>

              {hasMore && (
                <div className="catalog-loadmore">
                  <button type="button" className="btn btn-shutter" onClick={handleLoadMore}>
                    Xem thêm sản phẩm
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
}