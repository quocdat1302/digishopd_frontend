import { useEffect, useState } from "react";
import { userApi } from "../api/userApi";
import { notificationApi } from "../api/notificationApi";
import { toApiError } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { formatDate, resolveImageUrl } from "../utils/formatters";
import DrawerPortal from "./DrawerPortal";

const STATUS_LABEL = {
  PENDING_VERIFICATION: "Chờ xác minh email",
  ACTIVE: "Đang hoạt động",
  BLOCKED: "Đã khoá",
  PENDING_PROFILE: "Chưa hoàn tất hồ sơ",
};

const ROLE_LABEL = {
  CUSTOMER: "Khách hàng",
  STAFF: "Nhân viên",
  ADMIN: "Admin",
};

export default function AdminUsersPage() {
  const { user: currentUser } = useAuth();
  const [pageData, setPageData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [keyword, setKeyword] = useState("");
  const [page, setPage] = useState(0);
  const [busyId, setBusyId] = useState(null);

  const [messageTarget, setMessageTarget] = useState(null);
  const [messageTitle, setMessageTitle] = useState("");
  const [messageBody, setMessageBody] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState(null);
  const [sendSuccess, setSendSuccess] = useState(false);

  // Xoá cứng tài khoản — hành động không thể hoàn tác, bắt gõ đúng email để xác nhận (tránh bấm nhầm).
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  const load = () => {
    setLoading(true);
    setError(null);
    userApi.listUsers({ role: roleFilter, status: statusFilter, keyword, page, size: 20 })
      .then(setPageData)
      .catch((err) => setError(toApiError(err).message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roleFilter, statusFilter, page]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(0);
    load();
  };

  const openMessageForm = (targetUser) => {
    setMessageTarget(targetUser);
    setMessageTitle("");
    setMessageBody("");
    setSendError(null);
    setSendSuccess(false);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!messageTitle.trim() || !messageBody.trim()) {
      setSendError("Vui lòng nhập đủ tiêu đề và nội dung.");
      return;
    }
    setSending(true);
    setSendError(null);
    try {
      await notificationApi.sendFromAdmin(messageTarget.id, messageTitle.trim(), messageBody.trim());
      setSendSuccess(true);
      setMessageTitle("");
      setMessageBody("");
    } catch (err) {
      setSendError(toApiError(err).message);
    } finally {
      setSending(false);
    }
  };

  const handleRoleChange = async (targetUser, nextRole) => {
    if (nextRole === targetUser.role) return;
    const verb = `đổi vai trò của "${targetUser.name}" từ ${ROLE_LABEL[targetUser.role]} sang ${ROLE_LABEL[nextRole]}`;
    if (!window.confirm(`Xác nhận ${verb}?`)) return;

    setBusyId(targetUser.id);
    try {
      const updated = await userApi.updateUserRole(targetUser.id, nextRole);
      setPageData((prev) => ({
        ...prev,
        content: prev.content.map((u) => (u.id === updated.id ? updated : u)),
      }));
    } catch (err) {
      alert(toApiError(err).message);
    } finally {
      setBusyId(null);
    }
  };

  const openDeleteConfirm = (targetUser) => {
    setDeleteTarget(targetUser);
    setDeleteConfirmText("");
    setDeleteError(null);
  };

  const handleDeleteUser = async () => {
    if (deleteConfirmText.trim().toLowerCase() !== deleteTarget.email.toLowerCase()) {
      setDeleteError("Email xác nhận không khớp.");
      return;
    }
    setDeleting(true);
    setDeleteError(null);
    try {
      await userApi.deleteUser(deleteTarget.id);
      setPageData((prev) => ({
        ...prev,
        content: prev.content.filter((u) => u.id !== deleteTarget.id),
        totalElements: (prev.totalElements ?? 1) - 1,
      }));
      setDeleteTarget(null);
    } catch (err) {
      setDeleteError(toApiError(err).message);
    } finally {
      setDeleting(false);
    }
  };

  const users = pageData?.content || [];
  const totalPages = pageData?.totalPages ?? 1;

  return (
    <div className="admin-page">
      <div className="admin2-toolbar">
        <div>
          <h1>Quản lý người dùng</h1>
          <div className="admin2-toolbar__filters">
            <select value={roleFilter} onChange={(e) => { setRoleFilter(e.target.value); setPage(0); }}>
              <option value="">Tất cả vai trò</option>
              <option value="CUSTOMER">Khách hàng</option>
              <option value="STAFF">Nhân viên</option>
              <option value="ADMIN">Admin</option>
            </select>
            <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}>
              <option value="">Mọi trạng thái</option>
              {Object.entries(STATUS_LABEL).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
            <form onSubmit={handleSearchSubmit} style={{ display: "flex", gap: 8 }}>
              <input
                className="admin-search"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="Tìm theo tên, email, SĐT..."
              />
              <button type="submit" className="btn btn-outline-shutter">Tìm</button>
            </form>
          </div>
        </div>
      </div>

      {loading && <div className="catalog-state">Đang tải danh sách người dùng...</div>}
      {!loading && error && <div className="catalog-state catalog-state--error">{error}</div>}

      {!loading && !error && (
        <>
          <div className="admin2-table-wrap">
            <table className="admin2-table">
              <thead>
                <tr>
                  <th>Người dùng</th>
                  <th>Liên hệ</th>
                  <th>Vai trò</th>
                  <th>Hạng KH</th>
                  <th>Trạng thái</th>
                  <th>CCCD</th>
                  <th>Ngày tạo</th>
                  <th className="admin2-table__center">Hành động</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <div className="admin2-product-cell">
                        <div className="polaroid-frame-mini">
                          <img src={u.avatarUrl ? resolveImageUrl(u.avatarUrl) : "https://via.placeholder.com/40x40?text=U"} alt={u.name} />
                        </div>
                        <div>
                          <p>{u.name}</p>
                          <span>#{u.id}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="admin2-brand-type">
                        <span>{u.email}</span>
                        <span className="admin2-chip">{u.phone || "—"}</span>
                      </div>
                    </td>
                    <td>
                      <span className={`stamp-badge ${u.role === "ADMIN" ? "stamp-badge--ok" : u.role === "STAFF" ? "stamp-badge--staff" : ""}`}>{ROLE_LABEL[u.role] || u.role}</span>
                    </td>
                    <td>
                      {u.role === "CUSTOMER" && u.loyalty?.tier === "THAN_THIET" ? (
                        <span
                          className="admin2-condition-chip"
                          title={`Đã chi tiêu ${(u.loyalty.totalSpent || 0).toLocaleString("vi-VN")}đ · ${u.loyalty.completedOrderCount} đơn hoàn tất · tự động giảm ${u.loyalty.discountPercent}% mỗi đơn`}
                        >
                          ★ Thân thiết
                        </span>
                      ) : (
                        <span className="admin2-chip">—</span>
                      )}
                    </td>
                    <td>{STATUS_LABEL[u.status] || u.status}</td>
                    <td>
                      {u.identityVerified ? (
                        <span className="admin2-condition-chip">✓ Đã xác thực</span>
                      ) : (
                        <span className="admin2-stock--low">Chưa xác thực</span>
                      )}
                    </td>
                    <td>{formatDate(u.createdAt)}</td>
                    <td className="admin2-table__center">
                      <div className="admin2-row-actions">
                        <button
                          type="button"
                          className="admin2-icon-btn"
                          onClick={() => openMessageForm(u)}
                          title="Gửi thông báo/tin nhắn"
                        >
                          ✉ Nhắn tin
                        </button>
                        <select
                          className="admin2-role-select"
                          value={u.role}
                          disabled={busyId === u.id || u.id === currentUser?.id}
                          title={u.id === currentUser?.id ? "Không thể tự đổi quyền của chính mình" : "Đổi vai trò"}
                          onChange={(e) => handleRoleChange(u, e.target.value)}
                        >
                          <option value="CUSTOMER">Khách hàng</option>
                          <option value="STAFF">Nhân viên</option>
                          <option value="ADMIN">Admin</option>
                        </select>
                        <button
                          type="button"
                          className="admin2-icon-btn admin2-icon-btn--danger"
                          onClick={() => openDeleteConfirm(u)}
                          disabled={u.id === currentUser?.id}
                          title={u.id === currentUser?.id ? "Không thể tự xoá tài khoản của chính mình" : "Xoá tài khoản"}
                        >
                          🗑 Xoá
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={8} className="admin-table__empty">Không có người dùng phù hợp.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="admin2-pagination">
            <span>Trang {page + 1} / {Math.max(totalPages, 1)} · {pageData?.totalElements ?? 0} người dùng</span>
            <div className="admin2-pagination__buttons">
              <button disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>‹</button>
              <button disabled={page + 1 >= totalPages} onClick={() => setPage((p) => p + 1)}>›</button>
            </div>
          </div>
        </>
      )}

      {messageTarget && (
        <DrawerPortal>
          <div className="rental-calendar-popover-backdrop" onClick={() => setMessageTarget(null)}>
            <div className="rental-calendar-popover" onClick={(e) => e.stopPropagation()}>
              <div className="rental-calendar-popover__head">
                <span style={{ background: "var(--primary)", color: "#fff" }}>Gửi tin nhắn</span>
                <button type="button" onClick={() => setMessageTarget(null)} aria-label="Đóng">✕</button>
              </div>
              <h3>Tới: {messageTarget.name}</h3>
              <form onSubmit={handleSendMessage}>
                <label className="admin-field" style={{ display: "block", marginBottom: 10 }}>
                  <span>Tiêu đề</span>
                  <input value={messageTitle} onChange={(e) => setMessageTitle(e.target.value)} placeholder="VD: Thông báo bảo trì thiết bị" />
                </label>
                <label className="admin-field" style={{ display: "block", marginBottom: 10 }}>
                  <span>Nội dung</span>
                  <textarea
                    rows={4}
                    value={messageBody}
                    onChange={(e) => setMessageBody(e.target.value)}
                    placeholder="Nội dung tin nhắn..."
                  />
                </label>
                {sendError && <p className="profile-hint profile-hint--error">{sendError}</p>}
                {sendSuccess && <p className="profile-hint profile-hint--success">Đã gửi! Khách sẽ nhận ngay nếu đang online.</p>}
                <button type="submit" className="btn btn-shutter" disabled={sending} style={{ width: "100%" }}>
                  {sending ? "Đang gửi..." : "Gửi"}
                </button>
              </form>
            </div>
          </div>
        </DrawerPortal>
      )}

      {deleteTarget && (
        <DrawerPortal>
          <div className="rental-calendar-popover-backdrop" onClick={() => !deleting && setDeleteTarget(null)}>
            <div className="rental-calendar-popover" onClick={(e) => e.stopPropagation()}>
              <div className="rental-calendar-popover__head">
                <span style={{ background: "#8a2c2c", color: "#fff" }}>⚠ Xoá tài khoản</span>
                <button type="button" onClick={() => setDeleteTarget(null)} aria-label="Đóng" disabled={deleting}>✕</button>
              </div>
              <h3>Xoá "{deleteTarget.name}" ({deleteTarget.email})?</h3>
              <p className="profile-hint profile-hint--error" style={{ marginBottom: 12 }}>
                Hành động này XOÁ VĨNH VIỄN tài khoản cùng toàn bộ đơn hàng, giỏ hàng, đánh giá,
                sản phẩm yêu thích, thông báo, tin nhắn chat và hợp đồng thuê liên quan.
                Không thể hoàn tác.
              </p>
              <label className="admin-field" style={{ display: "block", marginBottom: 10 }}>
                <span>Gõ chính xác email <strong>{deleteTarget.email}</strong> để xác nhận</span>
                <input
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder={deleteTarget.email}
                  autoFocus
                />
              </label>
              {deleteError && <p className="profile-hint profile-hint--error">{deleteError}</p>}
              <button
                type="button"
                className="btn btn-shutter"
                style={{ width: "100%", background: "#8a2c2c" }}
                disabled={deleting || deleteConfirmText.trim().toLowerCase() !== deleteTarget.email.toLowerCase()}
                onClick={handleDeleteUser}
              >
                {deleting ? "Đang xoá..." : "Xoá vĩnh viễn"}
              </button>
            </div>
          </div>
        </DrawerPortal>
      )}
    </div>
  );
}