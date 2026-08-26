import { useEffect, useRef, useState } from "react";

/**
 * Đếm ngược theo giây. Gọi restart(seconds) để đặt lại (dùng khi gửi lại OTP).
 */
export function useCountdown(initialSeconds = 0) {
  const [seconds, setSeconds] = useState(initialSeconds);
  const intervalRef = useRef(null);

  useEffect(() => {
    clearInterval(intervalRef.current);
    if (seconds <= 0) return;
    intervalRef.current = setInterval(() => {
      setSeconds((s) => (s <= 1 ? 0 : s - 1));
    }, 1000);
    return () => clearInterval(intervalRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seconds > 0]);

  const restart = (next) => setSeconds(next);

  const formatted = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;

  return { seconds, formatted, restart, isDone: seconds <= 0 };
}
