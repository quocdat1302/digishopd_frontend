import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { orderApi } from "../api/orderApi";
import { reportApi } from "../api/reportApi";
import { toApiError } from "../api/client";
import { formatPrice, formatDate, formatDateTime, resolveImageUrl } from "../utils/formatters";
import DrawerPortal from "./DrawerPortal";
import { STATUS_LABEL, STATUS_CLASS, TYPE_LABEL, getGenericNextActions } from "./orderConstants";
import { IconBox, IconClock, IconTruck, IconArrowReturn, IconWarning, IconWallet, IconCalendar } from "./AdminIcons";

const PAGE_SIZE = 10;

function OrderDetailPanel({ order, onClose, onChanged }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);

  const [showDeliverForm, setShowDeliverForm] = useState(false);
  const [conditionNote, setConditionNote] = useState("");

  const [showInspectForm, setShowInspectForm] = useState(false);
  const [inspectionNote, setInspectionNote] = useState("");

  const [showDeductForm, setShowDeductForm] = useState(false);
  const [damageAmount, setDamageAmount] = useState("");
  const [disputeReason, setDisputeReason] = useState("");

  const runAction = async (action) => {
    setBusy(true);
    setError(null);
    try {
      const updated = await action();
      onChanged(updated);
      return true;
    } catch (err) {
      setError(toApiError(err).message);
      return false;
    } finally {
      setBusy(false);
    }
  };

  const handleStatusChange = (status) => runAction(() => orderApi.updateOrderStatus(order.id, status));
  const handleApproveReturn = () => runAction(() => orderApi.approveReturn(order.id));
  const handleRejectReturn = () => {
    if (!rejectReason.trim()) {
      setError("Vui lòng nhập lý do từ chối.");
      return;
    }
    runAction(() => orderApi.rejectReturn(order.id, rejectReason.trim()));
  };

  const handleMarkDepositPaid = () => runAction(() => orderApi.markDepositPaid(order.id));

  const handleMarkDelivered = async () => {
    if (!conditionNote.trim()) {
      setError("Vui lòng ghi nhận tình trạng máy lúc giao.");
      return;
    }
    const ok = await runAction(() => orderApi.markDelivered(order.id, conditionNote.trim()));
    if (ok) setShowDeliverForm(false);
  };

  const handleMarkReturned = () => runAction(() => orderApi.markRentalReturned(order.id));

  const handleInspect = async () => {
    const ok = await runAction(() => orderApi.inspectRentalReturn(order.id, inspectionNote.trim()));
    if (ok) setShowInspectForm(false);
  };

  const handleRefundDeposit = () => runAction(() => orderApi.refundDeposit(order.id));

  const handleDeductDeposit = async () => {
    const amount = Number(damageAmount);
    if (!amount || amount <= 0) {
      setError("Vui lòng nhập số tiền trừ cọc hợp lệ.");
      return;
    }
    if (!disputeReason.trim()) {
      setError("Vui lòng nhập lý do tranh chấp (hư hỏng/trễ hạn...).");
      return;
    }
    const ok = await runAction(() => orderApi.deductDeposit(order.id, amount, disputeReason.trim()));
    if (ok) setShowDeductForm(false);
  };

  const handleDownloadInvoice = async () => {
    setBusy(true);
    setError(null);
    try {
      const blob = await orderApi.downloadInvoiceAsAdmin(order.id);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `hoa-don-${order.orderCode}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(toApiError(err).message);
    } finally {
      setBusy(false);
    }
  };

  const nextActions = getGenericNextActions(order);
  const isReturnPending = ["RETURN_REQUESTED", "RENTAL_RETURN_REQUESTED"].includes(order.status);
  const isRental = order.orderType === "RENTAL";

  return (
    <DrawerPortal>
      <div className="admin-drawer-backdrop" onClick={onClose}>
        <div className="admin-drawer" onClick={(e) => e.stopPropagation()}>
          <div className="admin-drawer__header">
            <h2>Đơn {order.orderCode}</h2>
            <button type="button" className="admin-drawer__close" onClick={onClose} aria-label="Đóng">✕</button>
          </div>

          <div className="admin-drawer__body">
            <div className="order-detail-summary">
              <span className={`order-status-badge ${STATUS_CLASS[order.status]}`}>{STATUS_LABEL[order.status]}</span>
              <span className="order-type-badge">{TYPE_LABEL[order.orderType]}</span>
            </div>

            <div className="order-detail-grid">
              <div>
                <small>Khách nhận hàng</small>
                <p>{order.recipientName}</p>
                <p>{order.recipientPhone}</p>
              </div>
              <div>
                <small>{order.fulfillmentMethod === "PICKUP_AT_SHOP" ? "Cách nhận máy" : "Địa chỉ giao"}</small>
                <p>{order.fulfillmentMethod === "PICKUP_AT_SHOP" ? "Khách tự đến shop nhận máy" : order.shippingAddress}</p>
              </div>
              <div>
                <small>Ngày đặt</small>
                <p>{formatDateTime(order.createdAt)}</p>
              </div>
              {order.orderType === "RENTAL" && (
                <div>
                  <small>Thời gian thuê</small>
                  <p>{formatDate(order.rentalStartDate)} → {formatDate(order.rentalEndDate)} ({order.rentalDays} ngày)</p>
                </div>
              )}
              {order.note && (
                <div>
                  <small>Ghi chú</small>
                  <p>{order.note}</p>
                </div>
              )}
            </div>

            <h3 className="order-detail-heading">Sản phẩm</h3>
            <div className="order-items-list">
              {order.items?.map((item) => (
                <div key={item.id} className="order-item-row">
                  <img src={resolveImageUrl(item.productImageUrl) || "https://via.placeholder.com/48x48?text=DS"} alt={item.productName} />
                  <div className="order-item-row__info">
                    <p>{item.productName}</p>
                    <span>
                      {formatPrice(item.unitPrice)} × {item.quantity}
                      {item.rentalDays ? ` × ${item.rentalDays} ngày` : ""}
                    </span>
                  </div>
                  <strong>{formatPrice(item.subtotal)}</strong>
                </div>
              ))}
            </div>

            <div className="order-total-breakdown">
              <div><span>Tạm tính</span><span>{formatPrice(order.subtotalAmount)}</span></div>
              {Number(order.discountAmount) > 0 && (
                <div><span>Giảm giá {order.promotionCode ? `(${order.promotionCode})` : ""}</span><span>-{formatPrice(order.discountAmount)}</span></div>
              )}
              {Number(order.loyaltyDiscountAmount) > 0 && (
                <div><span>Giảm giá khách thân thiết</span><span>-{formatPrice(order.loyaltyDiscountAmount)}</span></div>
              )}
              {Number(order.depositAmount) > 0 && (
                <div><span>Tiền cọc</span><span>{formatPrice(order.depositAmount)}</span></div>
              )}
              <div className="order-total-breakdown__total"><span>Tổng cộng</span><span>{formatPrice(order.totalAmount)}</span></div>
            </div>

            {isRental && (
              <div className="order-rental-timeline">
                <h3 className="order-detail-heading">Vòng đời đơn thuê</h3>
                <ul>
                  <li className={order.depositPaidAt ? "is-done" : ""}>
                    <span>Đóng cọc</span>
                    <span>{order.depositPaidAt ? formatDateTime(order.depositPaidAt) : "Chưa"}</span>
                  </li>
                  <li className={order.deliveredAt ? "is-done" : ""}>
                    <span>Giao thiết bị</span>
                    <span>{order.deliveredAt ? formatDateTime(order.deliveredAt) : "Chưa"}</span>
                  </li>
                  <li className={order.returnedAt ? "is-done" : ""}>
                    <span>Khách trả máy</span>
                    <span>{order.returnedAt ? formatDateTime(order.returnedAt) : "Chưa"}</span>
                  </li>
                  <li className={order.inspectedAt ? "is-done" : ""}>
                    <span>Kiểm tra tình trạng</span>
                    <span>{order.inspectedAt ? formatDateTime(order.inspectedAt) : "Chưa"}</span>
                  </li>
                </ul>
                {order.deliveryConditionNote && (
                  <p className="order-rental-timeline__note"><small>Tình trạng lúc giao:</small> {order.deliveryConditionNote}</p>
                )}
                {order.inspectionNote && (
                  <p className="order-rental-timeline__note"><small>Tình trạng lúc nhận lại:</small> {order.inspectionNote}</p>
                )}
              </div>
            )}

            {order.status === "DISPUTED" && (
              <div className="order-return-box order-return-box--dispute">
                <h3 className="order-detail-heading">Tranh chấp — đã trừ cọc</h3>
                <p><strong>Lý do:</strong> {order.disputeReason}</p>
                <p>Trừ cọc: <strong>{formatPrice(order.damageAmount)}</strong> · Hoàn lại khách: <strong>{formatPrice(order.refundAmount)}</strong></p>
              </div>
            )}

            {order.status === "COMPLETED" && isRental && (
              <div className="order-return-box">
                <h3 className="order-detail-heading">Đã hoàn tất — hoàn cọc đủ</h3>
                <p>Hoàn cọc: <strong>{formatPrice(order.refundAmount)}</strong></p>
              </div>
            )}

            {isReturnPending && (
              <div className="order-return-box">
                <h3 className="order-detail-heading">Yêu cầu đổi trả</h3>
                <p><strong>Lý do khách:</strong> {order.returnReason}</p>
                <p><small>Yêu cầu lúc {formatDateTime(order.returnRequestedAt)}</small></p>
                {order.returnImageUrls?.length > 0 && (
                  <div className="return-evidence-grid">
                    {order.returnImageUrls.map((url) => (
                      <a key={url} href={resolveImageUrl(url)} target="_blank" rel="noreferrer">
                        <img src={resolveImageUrl(url)} alt="Ảnh bằng chứng khách gửi" />
                      </a>
                    ))}
                  </div>
                )}
              </div>
            )}

            {order.status === "RETURNED" && (
              <div className="order-return-box">
                <h3 className="order-detail-heading">Đã đổi trả</h3>
                <p>Hoàn tiền: <strong>{formatPrice(order.refundAmount)}</strong> lúc {formatDateTime(order.returnedAt)}</p>
              </div>
            )}

            {order.returnRejectReason && (
              <div className="order-return-box">
                <h3 className="order-detail-heading">Yêu cầu đổi trả đã bị từ chối trước đó</h3>
                <p>{order.returnRejectReason}</p>
              </div>
            )}

            {error && <p className="product-feedback-inline product-feedback-inline--error">{error}</p>}
          </div>

          <div className="admin-drawer__footer admin-drawer__footer--wrap">
            <button type="button" className="btn btn-outline-shutter" onClick={handleDownloadInvoice} disabled={busy}>
              Tải hoá đơn PDF
            </button>

            {nextActions.map((action) => (
              <button
                key={action.value}
                type="button"
                className={action.value === "CANCELLED" ? "btn btn-outline-shutter" : "btn btn-shutter"}
                disabled={busy}
                onClick={() => handleStatusChange(action.value)}
              >
                {action.label}
              </button>
            ))}

            {isReturnPending && !showRejectForm && (
              <>
                <button type="button" className="btn btn-outline-shutter" disabled={busy} onClick={() => setShowRejectForm(true)}>
                  {order.status === "RENTAL_RETURN_REQUESTED" ? "Từ chối trả máy" : "Từ chối đổi trả"}
                </button>
                <button type="button" className="btn btn-shutter" disabled={busy} onClick={handleApproveReturn}>
                  {order.status === "RENTAL_RETURN_REQUESTED" ? "Duyệt trả máy" : "Duyệt đổi trả & hoàn tiền"}
                </button>
              </>
            )}

            {isRental && order.status === "CONFIRMED" && (
              <button type="button" className="btn btn-shutter" disabled={busy} onClick={handleMarkDepositPaid}>
                Xác nhận đã nhận cọc
              </button>
            )}
            {isRental && order.status === "DEPOSIT_PAID" && !showDeliverForm && (
              <button type="button" className="btn btn-shutter" disabled={busy} onClick={() => setShowDeliverForm(true)}>
                Giao thiết bị cho khách
              </button>
            )}
            {isRental && order.status === "DELIVERED" && (
              <button type="button" className="btn btn-shutter" disabled={busy} onClick={handleMarkReturned}>
                Ghi nhận khách đã trả máy
              </button>
            )}
            {isRental && order.status === "RENTAL_RETURNED" && !showInspectForm && (
              <button type="button" className="btn btn-shutter" disabled={busy} onClick={() => setShowInspectForm(true)}>
                Kiểm tra tình trạng máy
              </button>
            )}
            {isRental && order.status === "INSPECTED" && !showDeductForm && (
              <>
                <button type="button" className="btn btn-outline-shutter" disabled={busy} onClick={() => setShowDeductForm(true)}>
                  Trừ cọc (hư hỏng/trễ hạn)
                </button>
                <button type="button" className="btn btn-shutter" disabled={busy} onClick={handleRefundDeposit}>
                  Hoàn đủ cọc
                </button>
              </>
            )}
          </div>

          {showDeliverForm && (
            <div className="admin-drawer__footer admin-drawer__footer--wrap order-reject-form">
              <input
                placeholder="Tình trạng máy lúc giao (vd: còn mới, đủ phụ kiện, có 1 vết xước nhỏ...)"
                value={conditionNote}
                onChange={(e) => setConditionNote(e.target.value)}
              />
              <button type="button" className="btn btn-outline-shutter" disabled={busy} onClick={() => setShowDeliverForm(false)}>
                Huỷ
              </button>
              <button type="button" className="btn btn-shutter" disabled={busy} onClick={handleMarkDelivered}>
                Xác nhận đã giao
              </button>
            </div>
          )}

          {showInspectForm && (
            <div className="admin-drawer__footer admin-drawer__footer--wrap order-inspect-form">
              <input
                placeholder="Ghi chú tình trạng máy lúc nhận lại..."
                value={inspectionNote}
                onChange={(e) => setInspectionNote(e.target.value)}
              />
              <button type="button" className="btn btn-outline-shutter" disabled={busy} onClick={() => setShowInspectForm(false)}>
                Huỷ
              </button>
              <button type="button" className="btn btn-shutter" disabled={busy} onClick={handleInspect}>
                Xác nhận đã kiểm tra
              </button>
            </div>
          )}

          {showDeductForm && (
            <div className="admin-drawer__footer admin-drawer__footer--wrap order-inspect-form">
              <input
                type="number"
                min="0"
                placeholder="Số tiền trừ cọc (đ)"
                value={damageAmount}
                onChange={(e) => setDamageAmount(e.target.value)}
              />
              <input
                placeholder="Lý do tranh chấp (hư hỏng/trễ hạn...)"
                value={disputeReason}
                onChange={(e) => setDisputeReason(e.target.value)}
              />
              <button type="button" className="btn btn-outline-shutter" disabled={busy} onClick={() => setShowDeductForm(false)}>
                Huỷ
              </button>
              <button type="button" className="btn btn-shutter" disabled={busy} onClick={handleDeductDeposit}>
                Xác nhận trừ cọc
              </button>
            </div>
          )}

          {isReturnPending && showRejectForm && (
            <div className="admin-drawer__footer admin-drawer__footer--wrap order-reject-form">
              <input
                placeholder="Lý do từ chối đổi trả..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
              />
              <button type="button" className="btn btn-outline-shutter" disabled={busy} onClick={() => setShowRejectForm(false)}>
                Huỷ
              </button>
              <button type="button" className="btn btn-shutter" disabled={busy} onClick={handleRejectReturn}>
                Xác nhận từ chối
              </button>
            </div>
          )}
        </div>
      </div>
    </DrawerPortal>
  );
}

export default function AdminOrdersPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [typeFilter, setTypeFilter] = useState(""); // "" | PURCHASE | RENTAL
  const [statusFilter, setStatusFilter] = useState("");
  const [keyword, setKeyword] = useState(() => searchParams.get("q") || "");
  const [page, setPage] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [weeklyRevenue, setWeeklyRevenue] = useState(null);

  useEffect(() => {
    reportApi.getWeeklyRevenue().then(setWeeklyRevenue).catch(() => {});
  }, []);

  useEffect(() => {
    const q = searchParams.get("q");
    if (q) {
      setKeyword(q);
      setSearchParams({}, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadOrders = (type) => {
    setLoading(true);
    setError(null);
    orderApi
      .getAllOrdersForAdmin(type || undefined)
      .then(setOrders)
      .catch((err) => setError(toApiError(err).message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadOrders(typeFilter);
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typeFilter]);

  const stats = useMemo(() => {
    const total = orders.length;
    const pending = orders.filter((o) => o.status === "PENDING").length;
    const inProgress = orders.filter((o) =>
      ["CONFIRMED", "DELIVERING", "DEPOSIT_PAID", "DELIVERED", "RENTAL_RETURNED", "INSPECTED"].includes(o.status)
    ).length;
    const returnPending = orders.filter((o) => ["RETURN_REQUESTED", "RENTAL_RETURN_REQUESTED"].includes(o.status)).length;
    const disputed = orders.filter((o) => o.status === "DISPUTED").length;
    const completedOrders = orders.filter((o) => o.status === "COMPLETED");
    const revenue = completedOrders.reduce((sum, o) => sum + Number(o.totalAmount || 0), 0);
    const avgOrderValue = completedOrders.length > 0 ? revenue / completedOrders.length : 0;

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 6);
    weekAgo.setHours(0, 0, 0, 0);
    const thisWeek = orders.filter((o) => new Date(o.createdAt) >= weekAgo).length;

    return { total, pending, inProgress, returnPending, disputed, revenue, avgOrderValue, thisWeek };
  }, [orders]);

  const filtered = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    return orders.filter((o) => {
      if (statusFilter && o.status !== statusFilter) return false;
      if (q && !`${o.orderCode} ${o.recipientName} ${o.recipientPhone}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [orders, statusFilter, keyword]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageSafe = Math.min(page, totalPages);
  const pageItems = filtered.slice((pageSafe - 1) * PAGE_SIZE, pageSafe * PAGE_SIZE);

  const handleChanged = (updated) => {
    setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
    setSelectedOrder(updated);
  };

  return (
    <div className="admin-page">
      <section className="admin2-stats admin2-stats--orders">
        <div className="admin2-stat">
          <IconBox className="admin2-stat__icon" aria-hidden="true" />
          <small>Tổng đơn hàng</small>
          <strong>{stats.total}</strong>
        </div>
        <div className="admin2-stat">
          <IconClock className="admin2-stat__icon" aria-hidden="true" />
          <small>Chờ xác nhận</small>
          <strong>{stats.pending}</strong>
        </div>
        <div className="admin2-stat">
          <IconTruck className="admin2-stat__icon" aria-hidden="true" />
          <small>Đang xử lý/giao</small>
          <strong>{stats.inProgress}</strong>
        </div>
        <div className="admin2-stat">
          <IconArrowReturn className="admin2-stat__icon" aria-hidden="true" />
          <small>Chờ duyệt đổi trả</small>
          <strong>{stats.returnPending}</strong>
        </div>
        <div className="admin2-stat">
          <IconWarning className="admin2-stat__icon" aria-hidden="true" />
          <small>Tranh chấp (trừ cọc)</small>
          <strong>{stats.disputed}</strong>
        </div>
        <div className="admin2-stat">
          <IconWallet className="admin2-stat__icon" aria-hidden="true" />
          <small>Doanh thu (đã hoàn tất)</small>
          <strong className="admin2-stat__revenue">{formatPrice(stats.revenue)}</strong>
        </div>
        <div className="admin2-stat">
          <IconCalendar className="admin2-stat__icon" aria-hidden="true" />
          <small>Đơn đặt 7 ngày qua</small>
          <strong>{stats.thisWeek}</strong>
        </div>
        <div className="admin2-stat">
          <IconWallet className="admin2-stat__icon" aria-hidden="true" />
          <small>Giá trị đơn TB (hoàn tất)</small>
          <strong className="admin2-stat__revenue">{formatPrice(stats.avgOrderValue)}</strong>
        </div>
      </section>

      {weeklyRevenue && (
        <div className="dashboard-panel orders-weekly-panel">
          <div className="dashboard-panel__head">
            <h2><IconCalendar className="dashboard-panel__icon" aria-hidden="true" /> Doanh thu &amp; đơn hoàn tất 7 ngày qua</h2>
          </div>
          <div className="orders-weekly-mini">
            {weeklyRevenue.daily.map((d) => {
              const total = Number(d.purchaseRevenue || 0) + Number(d.rentalRevenue || 0);
              const maxVal = Math.max(1, ...weeklyRevenue.daily.map((x) => Number(x.purchaseRevenue || 0) + Number(x.rentalRevenue || 0)));
              return (
                <div className="orders-weekly-mini__col" key={d.date} title={`${d.dayLabel} (${d.date}): ${formatPrice(total)} · ${d.orderCount} đơn`}>
                  <div className="orders-weekly-mini__track">
                    <div className="orders-weekly-mini__fill" style={{ height: `${(total / maxVal) * 100}%` }} />
                  </div>
                  <span className="orders-weekly-mini__count">{d.orderCount}</span>
                  <span className="orders-weekly-mini__label">{d.dayLabel}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="admin2-toolbar">
        <div>
          <h1>Danh sách đơn hàng</h1>
          <div className="admin2-toolbar__filters">
            <select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}>
              <option value="">Tất cả loại đơn</option>
              <option value="PURCHASE">Mua hàng</option>
              <option value="RENTAL">Cho thuê</option>
            </select>
            <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
              <option value="">Mọi trạng thái</option>
              {Object.entries(STATUS_LABEL).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
            <input
              className="admin-search"
              value={keyword}
              onChange={(e) => { setKeyword(e.target.value); setPage(1); }}
              placeholder="Tìm theo mã đơn, tên, SĐT..."
            />
          </div>
        </div>
      </div>

      {loading && <div className="catalog-state">Đang tải danh sách đơn hàng...</div>}
      {!loading && error && <div className="catalog-state catalog-state--error">{error}</div>}

      {!loading && !error && (
        <>
          <div className="admin2-table-wrap">
            <table className="admin2-table">
              <thead>
                <tr>
                  <th>Mã đơn</th>
                  <th>Khách hàng</th>
                  <th>Loại</th>
                  <th>Ngày đặt</th>
                  <th>Tổng tiền</th>
                  <th>Trạng thái</th>
                  <th className="admin2-table__center">Hành động</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((order) => (
                  <tr key={order.id}>
                    <td><span className="order-code">{order.orderCode}</span></td>
                    <td>
                      <div className="admin2-brand-type">
                        <span>{order.recipientName}</span>
                        <span className="admin2-chip">{order.recipientPhone}</span>
                      </div>
                    </td>
                    <td><span className="order-type-badge">{TYPE_LABEL[order.orderType]}</span></td>
                    <td>{formatDateTime(order.createdAt)}</td>
                    <td className="admin2-table__price">{formatPrice(order.totalAmount)}</td>
                    <td>
                      <span className={`order-status-badge ${STATUS_CLASS[order.status]}`}>
                        {STATUS_LABEL[order.status]}
                      </span>
                    </td>
                    <td className="admin2-table__center">
                      <button type="button" className="admin2-icon-btn" onClick={() => setSelectedOrder(order)} aria-label="Xem chi tiết">
                        👁
                      </button>
                    </td>
                  </tr>
                ))}
                {pageItems.length === 0 && (
                  <tr>
                    <td colSpan={7} className="admin-table__empty">Không có đơn hàng phù hợp.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="admin2-pagination">
            <span>Hiển thị {pageItems.length === 0 ? 0 : (pageSafe - 1) * PAGE_SIZE + 1} - {(pageSafe - 1) * PAGE_SIZE + pageItems.length} trong {filtered.length} đơn hàng</span>
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
        </>
      )}

      {selectedOrder && (
        <OrderDetailPanel order={selectedOrder} onClose={() => setSelectedOrder(null)} onChanged={handleChanged} />
      )}
    </div>
  );
}