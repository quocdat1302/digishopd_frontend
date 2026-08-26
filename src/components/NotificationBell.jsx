import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useChatSocket } from "../context/ChatSocketContext";
import { notificationApi } from "../api/notificationApi";
import { formatDateTime } from "../utils/formatters";

const TYPE_ICON = {
  ORDER_UPDATE: "📦",
  RENTAL_REMINDER: "⏰",
  CHAT_MESSAGE: "💬",
  ADMIN_MESSAGE: "📣",
};

export default function NotificationBell({ orderLinkTo = "/profile" }) {
  const { isAuthenticated } = useAuth();
  const { subscribeToNotifications } = useChatSocket();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!isAuthenticated) return;
    notificationApi.getUnreadCount().then(setUnreadCount).catch(() => {});
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;
    return subscribeToNotifications((n) => {
      setItems((prev) => [n, ...prev]);
      setUnreadCount((c) => c + 1);
    });
  }, [isAuthenticated, subscribeToNotifications]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleToggle = () => {
    const next = !open;
    setOpen(next);
    if (next && !loaded) {
      notificationApi.getMyNotifications().then((data) => {
        setItems(data);
        setLoaded(true);
      });
    }
  };

  const handleItemClick = async (n) => {
    if (!n.isRead) {
      try {
        await notificationApi.markRead(n.id);
        setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, isRead: true } : x)));
        setUnreadCount((c) => Math.max(0, c - 1));
      } catch {
        // bỏ qua lỗi mark-read, không chặn điều hướng
      }
    }
    setOpen(false);
    if (n.relatedOrderId) navigate(orderLinkTo);
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationApi.markAllRead();
      setItems((prev) => prev.map((x) => ({ ...x, isRead: true })));
      setUnreadCount(0);
    } catch {
      // bỏ qua
    }
  };

  if (!isAuthenticated) return null;

  return (
    <div className="notification-bell" ref={rootRef}>
      <button type="button" className="notification-bell__trigger" onClick={handleToggle} aria-label="Thông báo">
        🔔
        {unreadCount > 0 && <span className="notification-bell__badge">{unreadCount > 9 ? "9+" : unreadCount}</span>}
      </button>

      {open && (
        <div className="notification-bell__panel">
          <div className="notification-bell__header">
            <span>Thông báo</span>
            {unreadCount > 0 && (
              <button type="button" onClick={handleMarkAllRead}>Đánh dấu đã đọc hết</button>
            )}
          </div>
          <div className="notification-bell__list">
            {!loaded && <p className="notification-bell__hint">Đang tải...</p>}
            {loaded && items.length === 0 && <p className="notification-bell__hint">Chưa có thông báo nào.</p>}
            {items.map((n) => (
              <button
                type="button"
                key={n.id}
                className={`notification-bell__item ${n.isRead ? "" : "is-unread"}`}
                onClick={() => handleItemClick(n)}
              >
                <span className="notification-bell__icon">{TYPE_ICON[n.type] || "🔔"}</span>
                <span className="notification-bell__body">
                  <strong>{n.title}</strong>
                  <p>{n.message}</p>
                  <small>{formatDateTime(n.createdAt)}</small>
                </span>
                {!n.isRead && <span className="notification-bell__dot" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}