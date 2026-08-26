// Phát tiếng "beep" thông báo bằng Web Audio API — không cần kèm file .mp3/.wav
// (đỡ phải quản lý asset nhị phân, và không bị chặn bởi CORS/network khi tải file).
// Trình duyệt chỉ cho phát âm thanh sau khi người dùng đã tương tác ít nhất 1 lần với trang
// (autoplay policy) — admin đã bấm đăng nhập/điều hướng trước đó nên gần như luôn thoả điều kiện này.

let sharedContext = null;

function getAudioContext() {
  if (typeof window === "undefined") return null;
  const Ctor = window.AudioContext || window.webkitAudioContext;
  if (!Ctor) return null;
  if (!sharedContext) sharedContext = new Ctor();
  return sharedContext;
}

/**
 * Phát 2 tiếng "ting" ngắn liên tiếp — dùng cho thông báo đơn hàng mới bên admin.
 */
export function playOrderNotificationSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === "suspended") ctx.resume();

    const playTone = (startTime, frequency) => {
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(frequency, startTime);
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.18, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.22);
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.start(startTime);
      oscillator.stop(startTime + 0.24);
    };

    const now = ctx.currentTime;
    playTone(now, 880); // La5
    playTone(now + 0.16, 1175); // Rê6 — cặp âm cao dần, nghe như "ting-ting" thông báo
  } catch {
    // Một số trình duyệt/thiết bị chặn Web Audio nếu chưa có tương tác người dùng — bỏ qua lặng lẽ,
    // không được để lỗi phát âm thanh làm hỏng luồng cập nhật danh sách đơn hàng.
  }
}
