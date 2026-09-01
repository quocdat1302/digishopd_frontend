import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { productApi } from "../api/productApi";
import { orderApi } from "../api/orderApi";
import { categoryApi } from "../api/categoryApi";
import SamplePhotosManager from "./SamplePhotosManager";
import AddonsManager from "./AddonsManager";
import { toApiError } from "../api/client";
import { uploadImage } from "../api/client";
import { formatPrice, resolveImageUrl } from "../utils/formatters";
import DrawerPortal from "./DrawerPortal";
import { IconCamera, IconCheck, IconWarning, IconBan } from "./AdminIcons";

const PAGE_SIZE = 8;

const EMPTY_FORM = {
  name: "",
  brand: "",
  type: "",
  buyPrice: "",
  rentPrice: "",
  rentPriceWeekly: "",
  rentPriceMorning: "",
  rentPriceAfternoon: "",
  rentPriceEvening: "",
  accessoriesIncluded: "",
  lensMount: "",
  imageUrl: "",
  description: "",
  stockQuantity: "0",
  isAvailable: true,
  productCondition: "new",
  isNew: false,
  isHot: false,
};

function toFormState(product) {
  if (!product) return EMPTY_FORM;
  return {
    name: product.name || "",
    brand: product.brand || "",
    type: product.type || "",
    buyPrice: product.buyPrice ?? "",
    rentPrice: product.rentPrice ?? "",
    rentPriceWeekly: product.rentPriceWeekly ?? "",
    rentPriceMorning: product.rentPriceMorning ?? "",
    rentPriceAfternoon: product.rentPriceAfternoon ?? "",
    rentPriceEvening: product.rentPriceEvening ?? "",
    accessoriesIncluded: product.accessoriesIncluded || "",
    lensMount: product.lensMount || "",
    imageUrl: product.imageUrl || "",
    description: product.description || "",
    stockQuantity: product.stockQuantity ?? "0",
    isAvailable: product.isAvailable ?? true,
    productCondition: product.productCondition || "new",
    isNew: !!product.isNew,
    isHot: !!product.isHot,
  };
}

function toPayload(form) {
  return {
    name: form.name.trim(),
    brand: form.brand.trim(),
    type: form.type.trim(),
    buyPrice: form.buyPrice === "" ? 0 : Number(form.buyPrice),
    rentPrice: form.rentPrice === "" ? 0 : Number(form.rentPrice),
    rentPriceWeekly: form.rentPriceWeekly === "" ? null : Number(form.rentPriceWeekly),
    rentPriceMorning: form.rentPriceMorning === "" ? null : Number(form.rentPriceMorning),
    rentPriceAfternoon: form.rentPriceAfternoon === "" ? null : Number(form.rentPriceAfternoon),
    rentPriceEvening: form.rentPriceEvening === "" ? null : Number(form.rentPriceEvening),
    accessoriesIncluded: form.accessoriesIncluded.trim() || null,
    lensMount: form.lensMount.trim() || null,
    imageUrl: form.imageUrl.trim() || null,
    description: form.description.trim() || null,
    stockQuantity: form.stockQuantity === "" ? 0 : Number(form.stockQuantity),
    isAvailable: form.isAvailable,
    productCondition: form.productCondition,
    isNew: form.isNew,
    isHot: form.isHot,
  };
}

function ProductFormPanel({ initialProduct, brandOptions, typeOptions, onCancel, onSaved }) {
  const [form, setForm] = useState(() => toFormState(initialProduct));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [uploading, setUploading] = useState(false);
  const isEditing = Boolean(initialProduct?.id);

  const setField = (key) => (e) => {
    const value = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [key]: value }));
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // cho phép chọn lại cùng 1 file lần sau
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const url = await uploadImage(file);
      setForm((f) => ({ ...f, imageUrl: url }));
    } catch (err) {
      setError(toApiError(err).message);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = toPayload(form);
      const saved = isEditing ? await productApi.updateProduct(initialProduct.id, payload) : await productApi.createProduct(payload);
      onSaved(saved);
    } catch (err) {
      setError(toApiError(err).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <DrawerPortal>
      <div className="admin-drawer-backdrop" onClick={onCancel}>
        <form className="admin-drawer" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <div className="admin-drawer__header">
          <h2>{isEditing ? `Sửa kỷ vật #${initialProduct.id}` : "Thêm kỷ vật mới"}</h2>
          <button type="button" className="admin-drawer__close" onClick={onCancel} aria-label="Đóng">
            ✕
          </button>
        </div>

        <div className="admin-drawer__body">
          <label className="admin-field">
            <span>Tên sản phẩm *</span>
            <input value={form.name} onChange={setField("name")} required placeholder="Canon EOS R5" />
          </label>

          <div className="admin-field-row">
            <label className="admin-field">
              <span>Hãng *</span>
              <input value={form.brand} onChange={setField("brand")} required list="admin-brand-options" placeholder="Canon" />
            </label>
            <label className="admin-field">
              <span>Loại sản phẩm *</span>
              <input value={form.type} onChange={setField("type")} required list="admin-type-options" placeholder="Mirrorless" />
            </label>
          </div>
          <datalist id="admin-brand-options">
            {brandOptions.map((b) => (
              <option key={b} value={b} />
            ))}
          </datalist>
          <datalist id="admin-type-options">
            {typeOptions.map((t) => (
              <option key={t} value={t} />
            ))}
          </datalist>

          <div className="admin-field-row">
            <label className="admin-field">
              <span>Giá bán (đ) *</span>
              <input type="number" min="0" value={form.buyPrice} onChange={setField("buyPrice")} required />
            </label>
            <label className="admin-field">
              <span>Giá thuê / ngày (đ) *</span>
              <input type="number" min="0" value={form.rentPrice} onChange={setField("rentPrice")} required />
            </label>
          </div>

          <div className="admin-field-row">
            <label className="admin-field">
              <span>Giá thuê / tuần (đ)</span>
              <input type="number" min="0" value={form.rentPriceWeekly} onChange={setField("rentPriceWeekly")} placeholder="Để trống nếu không áp dụng" />
            </label>
            <label className="admin-field">
              <span>Ngàm ống kính</span>
              <input value={form.lensMount} onChange={setField("lensMount")} placeholder="Canon RF, Sony E..." />
            </label>
          </div>

          <span className="admin-field-row__label">Giá thuê theo khung giờ (tuỳ chọn, song song với giá theo ngày)</span>
          <div className="admin-field-row admin-field-row--3">
            <label className="admin-field">
              <span>Sáng (đ)</span>
              <input type="number" min="0" value={form.rentPriceMorning} onChange={setField("rentPriceMorning")} placeholder="Để trống nếu không áp dụng" />
            </label>
            <label className="admin-field">
              <span>Chiều (đ)</span>
              <input type="number" min="0" value={form.rentPriceAfternoon} onChange={setField("rentPriceAfternoon")} placeholder="Để trống nếu không áp dụng" />
            </label>
            <label className="admin-field">
              <span>Tối (đ)</span>
              <input type="number" min="0" value={form.rentPriceEvening} onChange={setField("rentPriceEvening")} placeholder="Để trống nếu không áp dụng" />
            </label>
          </div>

          <label className="admin-field">
            <span>Phụ kiện đi kèm khi thuê</span>
            <textarea
              rows={2}
              value={form.accessoriesIncluded}
              onChange={setField("accessoriesIncluded")}
              placeholder="Mỗi món 1 dòng hoặc cách nhau bằng dấu phẩy, vd: Pin dự phòng, Sạc, Thẻ nhớ 32GB, Túi đựng"
            />
          </label>

          <div className="admin-field admin-image-upload">
            <span>Ảnh sản phẩm</span>
            <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={handleFileUpload} disabled={uploading} />
            {uploading && <small>Đang tải ảnh lên...</small>}
            {form.imageUrl && (
              <img className="admin-image-upload__preview" src={resolveImageUrl(form.imageUrl)} alt="Xem trước" />
            )}
          </div>

          <label className="admin-field">
            <span>Hoặc dán URL ảnh (tuỳ chọn, nếu không muốn tải file)</span>
            <input value={form.imageUrl} onChange={setField("imageUrl")} placeholder="https://..." />
          </label>

          <label className="admin-field">
            <span>Mô tả</span>
            <textarea rows={3} value={form.description} onChange={setField("description")} />
          </label>

          <div className="admin-field-row">
            <label className="admin-field">
              <span>Số lượng tồn *</span>
              <input type="number" min="0" value={form.stockQuantity} onChange={setField("stockQuantity")} required />
            </label>
            <label className="admin-field">
              <span>Tình trạng *</span>
              <select value={form.productCondition} onChange={setField("productCondition")}>
                <option value="new">Mới 100%</option>
                <option value="used">Đã qua sử dụng</option>
              </select>
            </label>
          </div>

          <div className="admin-checkbox-row">
            <label>
              <input type="checkbox" checked={form.isAvailable} onChange={setField("isAvailable")} />
              Đang bán/cho thuê
            </label>
            <label>
              <input type="checkbox" checked={form.isNew} onChange={setField("isNew")} />
              Gắn nhãn "Mới về"
            </label>
            <label>
              <input type="checkbox" checked={form.isHot} onChange={setField("isHot")} />
              Gắn nhãn "Bán chạy"
            </label>
          </div>

          {error && <p className="product-feedback-inline product-feedback-inline--error">{error}</p>}

          {isEditing ? (
            <>
              <hr style={{ margin: "24px 0", border: "none", borderTop: "1px solid rgba(68,42,34,0.15)" }} />
              <SamplePhotosManager product={initialProduct} />
              <hr style={{ margin: "24px 0", border: "none", borderTop: "1px solid rgba(68,42,34,0.15)" }} />
              <AddonsManager product={initialProduct} />
            </>
          ) : (
            <p className="profile-hint" style={{ marginTop: 20 }}>
              Lưu sản phẩm trước, sau đó mở lại để thêm ảnh mẫu và phụ kiện bổ sung.
            </p>
          )}
        </div>

        <div className="admin-drawer__footer">
          <button type="button" className="btn btn-outline-shutter" onClick={onCancel}>
            Huỷ
          </button>
          <button type="submit" className="btn btn-shutter" disabled={saving}>
            {saving ? "Đang lưu..." : isEditing ? "Lưu thay đổi" : "Tạo sản phẩm"}
          </button>
        </div>
      </form>
      </div>
    </DrawerPortal>
  );
}

const LOW_STOCK_THRESHOLD = 2;

export default function AdminProductsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [brands, setBrands] = useState([]);
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [keyword, setKeyword] = useState(() => searchParams.get("q") || "");
  const [brandFilter, setBrandFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState(""); // "" | "active" | "inactive"
  const [sortKey, setSortKey] = useState("displayOrder"); // displayOrder | idDesc | idAsc | nameAsc
  const [page, setPage] = useState(1);
  const [editingProduct, setEditingProduct] = useState(undefined); // undefined = closed, null = create, object = edit
  const [busyId, setBusyId] = useState(null);
  // Map productId -> { reservedForFutureRentals, availableToSell } — để hiển thị vì sao 1 sản phẩm
  // còn tồn kho nhưng không bán được (đang bị đơn thuê tương lai giữ chỗ). Xem OrderService.
  const [stockBreakdown, setStockBreakdown] = useState({});
  const [manualMode, setManualMode] = useState(false);
  const [manualItems, setManualItems] = useState([]);
  const [draggingId, setDraggingId] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);
  const [savingOrder, setSavingOrder] = useState(false);

  // Nếu người dùng gõ tìm kiếm ở thanh trên đầu trang (AdminLayout), đồng bộ vào ô lọc ở đây
  // và dọn query string để URL không "kẹt" giá trị cũ khi người dùng gõ tiếp tại chỗ.
  useEffect(() => {
    const q = searchParams.get("q");
    if (q) {
      setKeyword(q);
      setSearchParams({}, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadProducts = () => {
    setLoading(true);
    setError(null);
    productApi
      .getAllProductsForAdmin()
      .then(setProducts)
      .catch((err) => setError(toApiError(err).message))
      .finally(() => setLoading(false));
  };

  const loadStockBreakdown = () => {
    orderApi
      .getStockBreakdown()
      .then((rows) => {
        const map = {};
        rows.forEach((r) => {
          map[r.productId] = { reserved: r.reservedForFutureRentals, availableToSell: r.availableToSell };
        });
        setStockBreakdown(map);
      })
      .catch(() => {}); // không chặn trang chính nếu lỗi — chỉ mất phần hiển thị giám sát
  };

  useEffect(() => {
    loadProducts();
    loadStockBreakdown();
    categoryApi.getBrands().then((data) => setBrands(data.map((c) => c.name))).catch(() => {});
    categoryApi.getProductTypes().then((data) => setTypes(data.map((c) => c.name))).catch(() => {});
  }, []);

  const stats = useMemo(() => {
    const total = products.length;
    const active = products.filter((p) => p.isAvailable).length;
    const inactive = total - active;
    const lowStock = products.filter((p) => p.isAvailable && Number(p.stockQuantity) <= LOW_STOCK_THRESHOLD).length;
    return { total, active, inactive, lowStock };
  }, [products]);

  const filtered = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    return products.filter((p) => {
      if (q && !`${p.name} ${p.brand} ${p.type}`.toLowerCase().includes(q)) return false;
      if (brandFilter && p.brand !== brandFilter) return false;
      if (typeFilter && p.type !== typeFilter) return false;
      if (statusFilter === "active" && !p.isAvailable) return false;
      if (statusFilter === "inactive" && p.isAvailable) return false;
      return true;
    });
  }, [products, keyword, brandFilter, typeFilter, statusFilter]);

  const sortedFiltered = useMemo(() => {
    const arr = [...filtered];
    const byDisplayOrder = (a, b) => {
      const ao = a.displayOrder ?? 999999;
      const bo = b.displayOrder ?? 999999;
      if (ao !== bo) return ao - bo;
      return (b.id ?? 0) - (a.id ?? 0);
    };
    switch (sortKey) {
      case "idAsc":
        arr.sort((a, b) => (a.id ?? 0) - (b.id ?? 0));
        break;
      case "nameAsc":
        arr.sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""), "vi", { sensitivity: "base" }));
        break;
      case "idDesc":
        arr.sort((a, b) => (b.id ?? 0) - (a.id ?? 0));
        break;
      case "displayOrder":
      default:
        arr.sort(byDisplayOrder);
        break;
    }
    return arr;
  }, [filtered, sortKey]);

  const totalPages = Math.max(1, Math.ceil(sortedFiltered.length / PAGE_SIZE));
  const pageSafe = Math.min(page, totalPages);
  const pageItems = sortedFiltered.slice((pageSafe - 1) * PAGE_SIZE, pageSafe * PAGE_SIZE);

  const baseManualList = useMemo(() => {
    const byDisplayOrder = (a, b) => {
      const ao = a.displayOrder ?? 999999;
      const bo = b.displayOrder ?? 999999;
      if (ao !== bo) return ao - bo;
      return (b.id ?? 0) - (a.id ?? 0);
    };
    return [...products].sort(byDisplayOrder);
  }, [products]);

  const moveItem = (list, fromIndex, toIndex) => {
    const copy = [...list];
    const [item] = copy.splice(fromIndex, 1);
    copy.splice(toIndex, 0, item);
    return copy;
  };

  const saveManualOrder = async (items) => {
    setSavingOrder(true);
    try {
      await productApi.reorderProducts(items.map((p) => p.id));
      // cập nhật displayOrder trong state để UI ngoài manual mode khớp ngay
      const orderMap = {};
      items.forEach((p, idx) => {
        orderMap[p.id] = idx + 1;
      });
      setProducts((prev) => prev.map((p) => (orderMap[p.id] ? { ...p, displayOrder: orderMap[p.id] } : p)));
    } catch (err) {
      alert(toApiError(err).message);
      // reload để khớp server
      loadProducts();
    } finally {
      setSavingOrder(false);
    }
  };

  const handleDragStart = (e, productId) => {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(productId));
    setDraggingId(productId);
  };

  const handleDragEnd = () => {
    setDraggingId(null);
    setDragOverId(null);
  };

  const handleDragOver = (e, overId) => {
    e.preventDefault();
    setDragOverId(overId);
  };

  const handleDrop = async (e, dropId) => {
    e.preventDefault();
    const dragId = draggingId ?? Number(e.dataTransfer.getData("text/plain"));
    if (!dragId || dragId === dropId) return;
    const fromIndex = manualItems.findIndex((p) => p.id === dragId);
    const toIndex = manualItems.findIndex((p) => p.id === dropId);
    if (fromIndex < 0 || toIndex < 0) return;
    const next = moveItem(manualItems, fromIndex, toIndex);
    setManualItems(next);
    await saveManualOrder(next);
  };

  const handleDeactivate = async (product) => {
    if (!window.confirm(`Ngừng bán/cho thuê "${product.name}"?`)) return;
    setBusyId(product.id);
    try {
      await productApi.deleteProduct(product.id);
      setProducts((prev) => prev.map((p) => (p.id === product.id ? { ...p, isAvailable: false } : p)));
    } catch (err) {
      alert(toApiError(err).message);
    } finally {
      setBusyId(null);
    }
  };

  const handleReactivate = async (product) => {
    setBusyId(product.id);
    try {
      const saved = await productApi.updateProduct(product.id, { isAvailable: true });
      setProducts((prev) => prev.map((p) => (p.id === product.id ? saved : p)));
    } catch (err) {
      alert(toApiError(err).message);
    } finally {
      setBusyId(null);
    }
  };

  const handleSaved = (saved) => {
    setProducts((prev) => {
      const exists = prev.some((p) => p.id === saved.id);
      return exists ? prev.map((p) => (p.id === saved.id ? saved : p)) : [saved, ...prev];
    });
    setEditingProduct(undefined);
    loadStockBreakdown(); // tồn kho có thể vừa đổi, tính lại phần "có thể bán" cho khớp
  };

  return (
    <div className="admin-page">
      {/* Quick stats */}
      <section className="admin2-stats">
        <div className="admin2-stat">
          <IconCamera className="admin2-stat__icon" aria-hidden="true" />
          <small>Tổng sản phẩm</small>
          <strong>{stats.total}</strong>
        </div>
        <div className="admin2-stat">
          <IconCheck className="admin2-stat__icon" aria-hidden="true" />
          <small>Đang bán/cho thuê</small>
          <strong>{stats.active}</strong>
        </div>
        <div className="admin2-stat">
          <IconWarning className="admin2-stat__icon" aria-hidden="true" />
          <small>Sắp hết hàng (≤2)</small>
          <strong>{stats.lowStock}</strong>
        </div>
        <div className="admin2-stat">
          <IconBan className="admin2-stat__icon" aria-hidden="true" />
          <small>Đã ngừng bán</small>
          <strong>{stats.inactive}</strong>
        </div>
      </section>

      <div className="admin2-toolbar">
        <div>
          <h1>Danh sách Kỷ vật</h1>
          <div className="admin2-toolbar__filters">
            <select value={brandFilter} onChange={(e) => { setBrandFilter(e.target.value); setPage(1); }} disabled={manualMode}>
              <option value="">Tất cả thương hiệu</option>
              {brands.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
            <select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }} disabled={manualMode}>
              <option value="">Tất cả danh mục</option>
              {types.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} disabled={manualMode}>
              <option value="">Mọi trạng thái</option>
              <option value="active">Đang bán/cho thuê</option>
              <option value="inactive">Đã ngừng bán</option>
            </select>
            <select value={sortKey} onChange={(e) => { setSortKey(e.target.value); setPage(1); }} disabled={manualMode}>
              <option value="displayOrder">Theo thứ tự hiển thị</option>
              <option value="idDesc">Mới nhất (ID giảm)</option>
              <option value="idAsc">Cũ nhất (ID tăng)</option>
              <option value="nameAsc">Tên A → Z</option>
            </select>
            <input
              className="admin-search"
              value={keyword}
              onChange={(e) => { setKeyword(e.target.value); setPage(1); }}
              disabled={manualMode}
              placeholder="Tìm theo tên..."
            />
          </div>
          {manualMode && (
            <div className="admin2-reorder-hint">
              Kéo biểu tượng ☰ để đổi vị trí. {savingOrder ? "Đang lưu thứ tự..." : "Thứ tự sẽ tự lưu sau khi thả."}
            </div>
          )}
        </div>
        <div className="admin2-toolbar__actions">
          <button
            type="button"
            className="btn btn-outline-shutter"
            onClick={() => {
              if (!manualMode) {
                setManualItems(baseManualList);
                setManualMode(true);
              } else {
                setManualMode(false);
                setDraggingId(null);
                setDragOverId(null);
              }
            }}
            disabled={loading || !!error}
            title="Sắp xếp thủ công bằng kéo-thả"
          >
            ↕ Kéo sắp xếp
          </button>
          <button type="button" className="btn-stamped" onClick={() => setEditingProduct(null)} disabled={manualMode}>
            🖼 Thêm kỷ vật mới
          </button>
        </div>
      </div>

      {loading && <div className="catalog-state">Đang tải danh sách sản phẩm...</div>}
      {!loading && error && <div className="catalog-state catalog-state--error">{error}</div>}

      {!loading && !error && (
        <>
          <div className="admin2-table-wrap">
            <table className="admin2-table">
              <thead>
                <tr>
                  {manualMode && <th className="admin2-table__center" style={{ width: 80 }}>Thứ tự</th>}
                  <th>Sản phẩm</th>
                  <th>Hãng / Loại</th>
                  <th>Giá bán / Giá thuê</th>
                  <th>Tồn kho</th>
                  <th>Tình trạng</th>
                  <th>Trạng thái</th>
                  <th className="admin2-table__center">Hành động</th>
                </tr>
              </thead>
              <tbody>
                {(manualMode ? manualItems : pageItems).map((product, index) => {
                  const stock = Number(product.stockQuantity ?? 0);
                  const isLowStock = product.isAvailable && stock <= LOW_STOCK_THRESHOLD;
                  const breakdown = stockBreakdown[product.id];
                  return (
                    <tr
                      key={product.id}
                      className={manualMode && dragOverId === product.id ? "admin2-row--dragover" : ""}
                      onDragOver={manualMode ? (e) => handleDragOver(e, product.id) : undefined}
                      onDrop={manualMode ? (e) => handleDrop(e, product.id) : undefined}
                    >
                      {manualMode && (
                        <td className="admin2-table__center">
                          <span
                            className={`admin2-drag-handle ${draggingId === product.id ? "is-dragging" : ""}`}
                            draggable
                            onDragStart={(e) => handleDragStart(e, product.id)}
                            onDragEnd={handleDragEnd}
                            title="Kéo để sắp xếp"
                            aria-label="Kéo để sắp xếp"
                          >
                            ☰
                          </span>
                          <small className="admin2-order-index">{index + 1}</small>
                        </td>
                      )}
                      <td>
                        <div className="admin2-product-cell">
                          <div className={`polaroid-frame-mini ${index % 2 === 0 ? "rotate-left" : "rotate-right"}`}>
                            <img src={resolveImageUrl(product.imageUrl) || "https://via.placeholder.com/64x64?text=DS"} alt={product.name} />
                          </div>
                          <div>
                            <p>{product.name}</p>
                            <span>#{product.id}</span>
                            {(product.isHot || product.isNew) && (
                              <div className="admin2-product-cell__tags">
                                {product.isHot && <span className="admin2-mini-tag admin2-mini-tag--hot">Bán chạy</span>}
                                {product.isNew && <span className="admin2-mini-tag admin2-mini-tag--new">Mới về</span>}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="admin2-brand-type">
                          <span>{product.brand}</span>
                          <span className="admin2-chip">{product.type?.toUpperCase()}</span>
                        </div>
                      </td>
                      <td>
                        <div className="admin2-price-stack">
                          <span className="admin2-table__price">{formatPrice(product.buyPrice)}</span>
                          <small>Thuê: {formatPrice(product.rentPrice)}/ngày</small>
                          {product.rentPriceWeekly != null && (
                            <small>{formatPrice(product.rentPriceWeekly)}/tuần</small>
                          )}
                        </div>
                      </td>
                      <td>
                        <span className={`admin2-stock ${isLowStock ? "admin2-stock--low" : ""}`}>
                          {stock}
                        </span>
                        {isLowStock && <small className="admin2-stock__hint">Sắp hết</small>}
                        {breakdown && breakdown.reserved > 0 && (
                          <>
                            <small className="admin2-stock__hint admin2-stock__hint--reserved">
                              🔒 {breakdown.reserved} đang giữ chỗ thuê
                            </small>
                            <small className="admin2-stock__hint">
                              Có thể bán: {breakdown.availableToSell}
                            </small>
                          </>
                        )}
                      </td>
                      <td>
                        <span className="admin2-condition-chip">
                          {product.productCondition === "used" ? "Đã qua sử dụng" : "Mới 100%"}
                        </span>
                      </td>
                      <td>
                        <span className={`stamp-badge ${product.isAvailable ? "stamp-badge--ok" : "stamp-badge--off"}`}>
                          {product.isAvailable ? "Sẵn sàng" : "Ngừng bán"}
                        </span>
                      </td>
                      <td className="admin2-table__center">
                        <div className="admin2-row-actions">
                          <button type="button" className="admin2-icon-btn" onClick={() => setEditingProduct(product)} aria-label="Sửa">
                            ✎
                          </button>
                          {product.isAvailable ? (
                            <button
                              type="button"
                              className="admin2-icon-btn admin2-icon-btn--danger"
                              disabled={busyId === product.id}
                              onClick={() => handleDeactivate(product)}
                              aria-label="Ngừng bán"
                              title="Ngừng bán/cho thuê"
                            >
                              🗑
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="admin2-icon-btn admin2-icon-btn--success"
                              disabled={busyId === product.id}
                              onClick={() => handleReactivate(product)}
                              aria-label="Kích hoạt lại"
                              title="Bán/cho thuê lại"
                            >
                              ↺
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {(manualMode ? manualItems : pageItems).length === 0 && (
                  <tr>
                    <td colSpan={manualMode ? 8 : 7} className="admin-table__empty">Không có sản phẩm phù hợp.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {!manualMode && (
            <div className="admin2-pagination">
              <span>Hiển thị {pageItems.length === 0 ? 0 : (pageSafe - 1) * PAGE_SIZE + 1} - {(pageSafe - 1) * PAGE_SIZE + pageItems.length} trong {sortedFiltered.length} kỷ vật</span>
              <div className="admin2-pagination__buttons">
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === totalPages || Math.abs(p - pageSafe) <= 1)
                  .reduce((acc, p, i, arr) => {
                    if (i > 0 && p - arr[i - 1] > 1) acc.push("...");
                    acc.push(p);
                    return acc;
                  }, [])
                  .map((p, i) =>
                    p === "..." ? (
                      <span key={`ellipsis-${i}`} className="admin2-pagination__ellipsis">...</span>
                    ) : (
                      <button key={p} className={p === pageSafe ? "is-active" : ""} onClick={() => setPage(p)}>
                        {p}
                      </button>
                    )
                  )}
              </div>
            </div>
          )}
        </>
      )}

      {editingProduct !== undefined && (
        <ProductFormPanel
          initialProduct={editingProduct}
          brandOptions={brands}
          typeOptions={types}
          onCancel={() => setEditingProduct(undefined)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
