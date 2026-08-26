import { useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useChatSocket } from "../context/ChatSocketContext";
import { chatApi } from "../api/chatApi";
import { toApiError, uploadImage } from "../api/client";
import { formatDateTime, resolveImageUrl } from "../utils/formatters";

export default function CustomerChatWidget() {
  const { isAuthenticated, isAdminOrStaff, user } = useAuth();
  const { connected, subscribeToMessages, sendCustomerMessage } = useChatSocket();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [pendingImage, setPendingImage] = useState(null); // { url, uploading }
  const [loaded, setLoaded] = useState(false);
  const [unread, setUnread] = useState(0);
  const bottomRef = useRef(null);

  // Chỉ hiển thị cho khách hàng đã đăng nhập (không hiện cho admin/nhân viên — họ dùng trang Hỗ trợ riêng).
  const shouldRender = isAuthenticated && !isAdminOrStaff;

  useEffect(() => {
    if (!shouldRender) return;
    chatApi.getMyMessages().then(setMessages).finally(() => setLoaded(true));
  }, [shouldRender]);

  useEffect(() => {
    if (!shouldRender) return;
    return subscribeToMessages((msg) => {
      if (msg.conversationUserId !== user?.id) return;
      setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
      if (!open && msg.senderRole === "ADMIN") setUnread((n) => n + 1);
    });
  }, [shouldRender, subscribeToMessages, user?.id, open]);

  useEffect(() => {
    if (open) {
      setUnread(0);
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [open, messages.length]);

  if (!shouldRender) return null;

  const handlePickImage = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setPendingImage({ url: null, uploading: true });
    try {
      const url = await uploadImage(file);
      setPendingImage({ url, uploading: false });
    } catch (err) {
      alert(toApiError(err).message);
      setPendingImage(null);
    }
  };

  const handleSend = (e) => {
    e.preventDefault();
    const content = draft.trim();
    if ((!content && !pendingImage?.url) || !connected || pendingImage?.uploading) return;
    const sent = sendCustomerMessage(content, pendingImage?.url || null);
    if (sent) {
      setDraft("");
      setPendingImage(null);
    }
  };

  return (
    <div className="chat-widget">
      {open && (
        <div className="chat-widget__panel">
          <div className="chat-widget__header">
            <div>
              <p>Hỗ trợ DigiShop</p>
              <span>{connected ? "Đã kết nối" : "Mất kết nối, đang thử lại..."}</span>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Đóng">✕</button>
          </div>

          <div className="chat-widget__messages">
            {!loaded && <p className="chat-widget__hint">Đang tải hội thoại...</p>}
            {loaded && messages.length === 0 && (
              <p className="chat-widget__hint">Chào bạn! Nhắn gì cho DigiShop cũng được nhé 👋</p>
            )}
            {messages.map((m) => (
              <div key={m.id} className={`chat-bubble ${m.senderRole === "ADMIN" ? "chat-bubble--them" : "chat-bubble--me"}`}>
                {m.fileUrl && (
                  <a href={resolveImageUrl(m.fileUrl)} target="_blank" rel="noreferrer">
                    <img className="chat-bubble__image" src={resolveImageUrl(m.fileUrl)} alt="Ảnh đính kèm" />
                  </a>
                )}
                {m.content && <p>{m.content}</p>}
                <span>{formatDateTime(m.createdAt)}</span>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          <form className="chat-widget__composer" onSubmit={handleSend}>
            {pendingImage && (
              <div className="chat-widget__pending-image">
                {pendingImage.uploading ? (
                  <span>Đang tải ảnh lên...</span>
                ) : (
                  <img src={resolveImageUrl(pendingImage.url)} alt="Ảnh sắp gửi" />
                )}
                <button type="button" onClick={() => setPendingImage(null)} aria-label="Bỏ ảnh">✕</button>
              </div>
            )}
            <div className="chat-widget__composer-row">
              <label className="chat-widget__attach" title="Gửi ảnh">
                📎
                <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={handlePickImage} hidden />
              </label>
              <input
                placeholder="Nhập tin nhắn..."
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
              />
              <button type="submit" disabled={(!draft.trim() && !pendingImage?.url) || !connected || pendingImage?.uploading}>
                Gửi
              </button>
            </div>
          </form>
        </div>
      )}

      <button type="button" className="chat-widget__fab" onClick={() => setOpen((v) => !v)}>
        {open ? "✕" : "💬"}
        {!open && unread > 0 && <span className="chat-widget__badge">{unread}</span>}
      </button>
    </div>
  );
}