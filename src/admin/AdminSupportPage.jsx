import { useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useChatSocket } from "../context/ChatSocketContext";
import { chatApi } from "../api/chatApi";
import { toApiError, uploadImage } from "../api/client";
import { formatDateTime, resolveImageUrl } from "../utils/formatters";

export default function AdminSupportPage() {
  const { user } = useAuth();
  const { connected, subscribeToMessages, sendAdminMessage } = useChatSocket();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeCustomerId, setActiveCustomerId] = useState(null);
  const [thread, setThread] = useState([]);
  const [threadLoading, setThreadLoading] = useState(false);
  const [draft, setDraft] = useState("");
  const [pendingImage, setPendingImage] = useState(null); // { url, uploading }
  const bottomRef = useRef(null);

  const loadConversations = () => {
    setLoading(true);
    setError(null);
    chatApi.getConversations()
      .then(setConversations)
      .catch((err) => setError(toApiError(err).message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadConversations();
  }, []);

  // Nhận tin nhắn realtime: cập nhật danh sách hội thoại (đưa lên đầu) và nếu đang mở đúng luồng đó thì thêm vào thread.
  useEffect(() => {
    return subscribeToMessages((msg) => {
      setConversations((prev) => {
        const idx = prev.findIndex((c) => c.customerId === msg.conversationUserId);
        const updated = {
          customerId: msg.conversationUserId,
          customerName: idx >= 0 ? prev[idx].customerName : `Khách #${msg.conversationUserId}`,
          customerEmail: idx >= 0 ? prev[idx].customerEmail : null,
          lastMessage: msg.content,
          lastSenderRole: msg.senderRole,
          lastMessageAt: msg.createdAt,
        };
        const rest = idx >= 0 ? prev.filter((_, i) => i !== idx) : prev;
        return [updated, ...rest];
      });

      setActiveCustomerId((current) => {
        if (current === msg.conversationUserId) {
          setThread((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
        }
        return current;
      });
    });
  }, [subscribeToMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [thread.length]);

  const openConversation = (customerId) => {
    setActiveCustomerId(customerId);
    setThreadLoading(true);
    chatApi.getConversationWithCustomer(customerId)
      .then(setThread)
      .catch((err) => setError(toApiError(err).message))
      .finally(() => setThreadLoading(false));
  };

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
    if ((!content && !pendingImage?.url) || !activeCustomerId || !connected || pendingImage?.uploading) return;
    const sent = sendAdminMessage(activeCustomerId, content, pendingImage?.url || null);
    if (sent) {
      setDraft("");
      setPendingImage(null);
    }
  };

  const activeConversation = conversations.find((c) => c.customerId === activeCustomerId);

  return (
    <div className="admin-page">
      <div className="admin2-toolbar">
        <div>
          <h1>Hỗ trợ khách hàng</h1>
          <p className="rental-calendar__subtitle">
            {connected ? "Đã kết nối realtime" : "Mất kết nối, đang thử kết nối lại..."}
          </p>
        </div>
      </div>

      {loading && <div className="catalog-state">Đang tải danh sách hội thoại...</div>}
      {!loading && error && <div className="catalog-state catalog-state--error">{error}</div>}

      {!loading && !error && (
        <div className="support-layout">
          <div className="support-conversations">
            {conversations.length === 0 && (
              <p className="dashboard-empty" style={{ padding: 20 }}>Chưa có khách hàng nào nhắn tin.</p>
            )}
            {conversations.map((c) => (
              <button
                type="button"
                key={c.customerId}
                className={`support-conversation-item ${activeCustomerId === c.customerId ? "is-active" : ""}`}
                onClick={() => openConversation(c.customerId)}
              >
                <div className="support-conversation-item__avatar">{c.customerName?.[0]?.toUpperCase() || "?"}</div>
                <div className="support-conversation-item__body">
                  <p>{c.customerName}</p>
                  <span>{c.lastSenderRole === "ADMIN" ? "Bạn: " : ""}{c.lastMessage}</span>
                </div>
                <span className="support-conversation-item__time">{formatDateTime(c.lastMessageAt)}</span>
              </button>
            ))}
          </div>

          <div className="support-thread">
            {!activeCustomerId && <p className="dashboard-empty" style={{ padding: 40 }}>Chọn một hội thoại để bắt đầu trả lời.</p>}
            {activeCustomerId && (
              <>
                <div className="support-thread__head">
                  <p>{activeConversation?.customerName || `Khách #${activeCustomerId}`}</p>
                  <span>{activeConversation?.customerEmail}</span>
                </div>
                <div className="support-thread__messages">
                  {threadLoading && <p className="chat-widget__hint">Đang tải hội thoại...</p>}
                  {!threadLoading && thread.map((m) => (
                    <div key={m.id} className={`chat-bubble ${m.senderRole === "ADMIN" ? "chat-bubble--me" : "chat-bubble--them"}`}>
                      {m.fileUrl && (
                        <a href={resolveImageUrl(m.fileUrl)} target="_blank" rel="noreferrer">
                          <img className="chat-bubble__image" src={resolveImageUrl(m.fileUrl)} alt="Ảnh đính kèm" />
                        </a>
                      )}
                      {m.content && <p>{m.content}</p>}
                      <span>{m.senderName} · {formatDateTime(m.createdAt)}</span>
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
                      placeholder={`Trả lời với tư cách ${user?.name || "Admin"}...`}
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                    />
                    <button type="submit" disabled={(!draft.trim() && !pendingImage?.url) || !connected || pendingImage?.uploading}>
                      Gửi
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}