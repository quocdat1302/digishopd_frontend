import { useEffect, useMemo, useState } from "react";
import { categoryApi } from "../api/categoryApi";
import { productApi } from "../api/productApi";
import { toApiError, uploadImage } from "../api/client";
import { resolveImageUrl } from "../utils/formatters";
import DrawerPortal from "./DrawerPortal";

const EMPTY_FORM = { name: "", type: "brand", imageUrl: "" };

const ICON_HINTS = [
  { keys: ["phim", "film"], icon: "🎞" },
  { keys: ["kỹ thuật số", "digital", "mirrorless", "dslr"], icon: "📷" },
  { keys: ["ống kính", "lens"], icon: "🔍" },
  { keys: ["phụ kiện", "accessor"], icon: "🎒" },
  { keys: ["thuê", "rental"], icon: "🗓" },
];

function iconFor(name) {
  const lower = (name || "").toLowerCase();
  const hit = ICON_HINTS.find((h) => h.keys.some((k) => lower.includes(k)));
  return hit ? hit.icon : "🏷";
}

const TAPE_CLASSES = ["tape--rose", "tape--sky", "tape--sand", "tape--olive"];

function CategoryFormPanel({ initial, onCancel, onSaved }) {
  const [form, setForm] = useState(
    initial ? { name: initial.name, type: initial.type, imageUrl: initial.imageUrl || "" } : EMPTY_FORM
  );
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const isEditing = Boolean(initial?.id);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
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
      const saved = isEditing ? await categoryApi.updateCategory(initial.id, form) : await categoryApi.createCategory(form);
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
        <form className="admin-drawer admin-drawer--narrow" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <div className="admin-drawer__header">
          <h2>{isEditing ? "Sửa danh mục" : "Tạo danh mục mới"}</h2>
          <button type="button" className="admin-drawer__close" onClick={onCancel} aria-label="Đóng">✕</button>
        </div>

        <div className="admin-drawer__body">
          <label className="admin-field">
            <span>Tên</span>
            <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required placeholder="VD: Canon hoặc Mirrorless" />
          </label>

          <label className="admin-field">
            <span>Loại</span>
            <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}>
              <option value="brand">Hãng (brand)</option>
              <option value="category">Loại sản phẩm (category)</option>
            </select>
          </label>

          <div className="admin-field admin-image-upload">
            <span>Ảnh danh mục (tuỳ chọn — không có thì hiện icon mặc định)</span>
            <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={handleFileUpload} disabled={uploading} />
            {uploading && <small>Đang tải ảnh lên...</small>}
            {form.imageUrl && (
              <img className="admin-image-upload__preview" src={resolveImageUrl(form.imageUrl)} alt="Xem trước" />
            )}
          </div>

          {error && <p className="product-feedback-inline product-feedback-inline--error">{error}</p>}
        </div>

        <div className="admin-drawer__footer">
          <button type="button" className="btn btn-outline-shutter" onClick={onCancel}>Huỷ</button>
          <button type="submit" className="btn btn-shutter" disabled={saving}>
            {saving ? "Đang lưu..." : isEditing ? "Lưu thay đổi" : "Tạo danh mục"}
          </button>
        </div>
      </form>
      </div>
    </DrawerPortal>
  );
}

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [panel, setPanel] = useState(undefined); // undefined = closed, null = create, object = edit
  const [busyId, setBusyId] = useState(null);

  const loadAll = () => {
    setLoading(true);
    setError(null);
    Promise.all([categoryApi.getAllCategories(), productApi.getAllProductsForAdmin()])
      .then(([categoriesData, productsData]) => {
        setCategories(categoriesData);
        setProducts(productsData);
      })
      .catch((err) => setError(toApiError(err).message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadAll();
  }, []);

  // Backend chỉ khởi tạo productCount = 0 khi tạo danh mục và không có nơi nào cập nhật lại
  // sau đó (Product lưu brand/type dưới dạng chuỗi tự do, không tham chiếu Category), nên
  // con số này luôn lệch thực tế. Tính lại số lượng thật từ danh sách sản phẩm hiện có.
  const productCountByCategory = useMemo(() => {
    const counts = new Map();
    products.forEach((p) => {
      const brandKey = `brand:${(p.brand || "").toLowerCase()}`;
      const typeKey = `category:${(p.type || "").toLowerCase()}`;
      counts.set(brandKey, (counts.get(brandKey) || 0) + 1);
      counts.set(typeKey, (counts.get(typeKey) || 0) + 1);
    });
    return counts;
  }, [products]);

  const liveCountFor = (category) => productCountByCategory.get(`${category.type}:${(category.name || "").toLowerCase()}`) || 0;

  const handleDelete = async (category) => {
    const count = liveCountFor(category);
    const warning = count > 0
      ? `Danh mục "${category.name}" hiện đang gắn với ${count} sản phẩm. Xoá danh mục sẽ KHÔNG xoá các sản phẩm đó, nhưng danh mục sẽ không còn xuất hiện trong bộ lọc. Tiếp tục xoá?`
      : `Xoá danh mục "${category.name}"?`;
    if (!window.confirm(warning)) return;
    setBusyId(category.id);
    try {
      await categoryApi.deleteCategory(category.id);
      setCategories((prev) => prev.filter((c) => c.id !== category.id));
    } catch (err) {
      alert(toApiError(err).message);
    } finally {
      setBusyId(null);
    }
  };

  const handleSaved = (saved) => {
    setCategories((prev) => {
      const exists = prev.some((c) => c.id === saved.id);
      return exists ? prev.map((c) => (c.id === saved.id ? saved : c)) : [saved, ...prev];
    });
    setPanel(undefined);
  };

  return (
    <div className="admin-page">
      <div className="admin2-ledger-hero">
        <div>
          <h1>Quản lý danh mục</h1>
          <p>Tổ chức kho lưu trữ sản phẩm thông qua các phân loại máy ảnh và hãng. Hãy giữ cho bộ sưu tập luôn ngăn nắp và dễ tìm kiếm.</p>
        </div>
        <button type="button" className="admin2-wax-seal" onClick={() => setPanel(null)}>
          <span className="admin2-wax-seal__circle" aria-hidden="true">+</span>
          <span>Thêm mới</span>
        </button>
      </div>

      {loading && <div className="catalog-state">Đang tải danh mục...</div>}
      {!loading && error && <div className="catalog-state catalog-state--error">{error}</div>}

      {!loading && !error && (
        <div className="admin2-bento">
          {categories.map((category, index) => (
            <article key={category.id} className="admin2-bento-card">
              <span className={`washi-tape ${TAPE_CLASSES[index % TAPE_CLASSES.length]} admin2-bento-card__tape`} aria-hidden="true" />
              <div className="admin2-bento-card__head">
                {category.imageUrl ? (
                  <img className="admin2-bento-card__icon admin2-bento-card__icon--img" src={resolveImageUrl(category.imageUrl)} alt={category.name} />
                ) : (
                  <div className="admin2-bento-card__icon">{iconFor(category.name)}</div>
                )}
                <div>
                  <h3>{category.name}</h3>
                  <span>{liveCountFor(category)} sản phẩm</span>
                  <span className="admin2-bento-card__count-hint" title="Số lượng được tính trực tiếp từ danh sách sản phẩm hiện có">thực tế</span>
                </div>
              </div>
              <p className="admin2-bento-card__type">{category.type === "brand" ? "Hãng sản xuất" : "Loại sản phẩm"}</p>
              <div className="admin2-bento-card__footer">
                <button type="button" onClick={() => setPanel(category)}>SỬA</button>
                <button type="button" className="admin2-bento-card__delete" disabled={busyId === category.id} onClick={() => handleDelete(category)}>
                  XÓA
                </button>
              </div>
            </article>
          ))}

          <button type="button" className="admin2-bento-empty" onClick={() => setPanel(null)}>
            <span aria-hidden="true">＋</span>
            <h3>Tạo danh mục mới</h3>
            <p>Thêm một trang mới vào cuốn sổ quản lý của bạn.</p>
          </button>
        </div>
      )}

      {panel !== undefined && <CategoryFormPanel initial={panel} onCancel={() => setPanel(undefined)} onSaved={handleSaved} />}
    </div>
  );
}