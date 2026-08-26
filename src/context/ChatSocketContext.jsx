import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { Client } from "@stomp/stompjs";
import { useAuth } from "./AuthContext";
import { getStoredAuth } from "./authStorage";

const ChatSocketContext = createContext(null);

function buildWsUrl() {
  const apiBase = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api";
  // Endpoint WebSocket đăng ký ở backend là "/ws" (không nằm dưới tiền tố "/api" của REST).
  return apiBase.replace(/\/api\/?$/, "").replace(/^http/, "ws") + "/ws";
}

/**
 * UC-31: quản lý vòng đời kết nối STOMP dùng chung cho cả widget chat của khách hàng lẫn trang
 * hỗ trợ của admin. Tự kết nối khi đăng nhập, tự ngắt khi đăng xuất, tự reconnect khi rớt mạng.
 */
export function ChatSocketProvider({ children }) {
  const { isAuthenticated, user } = useAuth();
  const clientRef = useRef(null);
  const listenersRef = useRef(new Set());
  const notificationListenersRef = useRef(new Set());
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      setConnected(false);
      return;
    }
    const auth = getStoredAuth();
    if (!auth?.accessToken) return;

    const client = new Client({
      brokerURL: buildWsUrl(),
      connectHeaders: { Authorization: `Bearer ${auth.accessToken}` },
      reconnectDelay: 4000,
      onConnect: () => {
        setConnected(true);
        // Dùng topic riêng theo userId (client tự biết userId của chính mình, không cần Spring
        // định tuyến theo Principal của phiên STOMP) thay vì "/user/queue/..." — cách cũ phụ thuộc
        // Principal bám đúng vào phiên, thứ không ổn định trong môi trường này (tin nhắn lưu DB
        // được nhưng không tới real-time, phải tải lại trang mới thấy).
        client.subscribe(`/topic/chat.${user.id}`, (frame) => {
          try {
            const msg = JSON.parse(frame.body);
            listenersRef.current.forEach((fn) => fn(msg));
          } catch {
            // bỏ qua frame không parse được
          }
        });
        client.subscribe(`/topic/notifications.${user.id}`, (frame) => {
          try {
            const notification = JSON.parse(frame.body);
            notificationListenersRef.current.forEach((fn) => fn(notification));
          } catch {
            // bỏ qua frame không parse được
          }
        });
        if (user?.role === "ADMIN") {
          client.subscribe("/topic/admin/chat", (frame) => {
            try {
              const msg = JSON.parse(frame.body);
              listenersRef.current.forEach((fn) => fn(msg));
            } catch {
              // bỏ qua frame không parse được
            }
          });
        }
      },
      onWebSocketClose: () => setConnected(false),
      onStompError: () => setConnected(false),
    });

    client.activate();
    clientRef.current = client;

    return () => {
      client.deactivate();
      clientRef.current = null;
      setConnected(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user?.id]);

  const subscribeToMessages = useCallback((fn) => {
    listenersRef.current.add(fn);
    return () => listenersRef.current.delete(fn);
  }, []);

  const subscribeToNotifications = useCallback((fn) => {
    notificationListenersRef.current.add(fn);
    return () => notificationListenersRef.current.delete(fn);
  }, []);

  const sendCustomerMessage = useCallback((content, fileUrl) => {
    // client.publish() tự ném lỗi nếu STOMP chưa thật sự CONNECTED (không chỉ là WebSocket đã mở) —
    // ví dụ lúc đang kết nối lại. Kiểm tra `connected` trước để tránh crash và báo UI biết gửi thất bại.
    if (!clientRef.current?.connected) return false;
    const auth = getStoredAuth();
    clientRef.current.publish({
      destination: "/app/chat.customer",
      // Gắn lại token trên CHÍNH frame gửi tin nhắn (không chỉ lúc CONNECT) — để backend luôn xác
      // thực lại được người gửi ngay tại đây, không phụ thuộc việc Principal có "bám" đúng theo cả
      // phiên STOMP hay không (từng gặp vấn đề Principal bị rớt dù CONNECT đã xác thực thành công).
      headers: auth?.accessToken ? { Authorization: `Bearer ${auth.accessToken}` } : {},
      body: JSON.stringify({ content, fileUrl: fileUrl || null }),
    });
    return true;
  }, []);

  const sendAdminMessage = useCallback((targetUserId, content, fileUrl) => {
    if (!clientRef.current?.connected) return false;
    const auth = getStoredAuth();
    clientRef.current.publish({
      destination: "/app/chat.admin",
      headers: auth?.accessToken ? { Authorization: `Bearer ${auth.accessToken}` } : {},
      body: JSON.stringify({ targetUserId, content, fileUrl: fileUrl || null }),
    });
    return true;
  }, []);

  return (
    <ChatSocketContext.Provider
      value={{ connected, subscribeToMessages, subscribeToNotifications, sendCustomerMessage, sendAdminMessage }}
    >
      {children}
    </ChatSocketContext.Provider>
  );
}

export function useChatSocket() {
  const ctx = useContext(ChatSocketContext);
  if (!ctx) throw new Error("useChatSocket phải được dùng bên trong <ChatSocketProvider>");
  return ctx;
}