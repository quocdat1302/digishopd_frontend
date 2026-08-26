import { useRef } from "react";

export default function OtpInput({ length = 6, value, onChange, disabled }) {
  const inputsRef = useRef([]);
  const digits = value.split("").concat(Array(length).fill("")).slice(0, length);

  const setDigit = (index, char) => {
    const next = [...digits];
    next[index] = char;
    onChange(next.join("").slice(0, length));
  };

  const handleChange = (index, e) => {
    const raw = e.target.value.replace(/\D/g, "");
    if (!raw) {
      setDigit(index, "");
      return;
    }
    // Cho phép gõ nhanh nhiều số (hoặc autofill) vào 1 ô: rải các số còn lại sang các ô kế tiếp.
    const chars = raw.split("");
    const next = [...digits];
    let i = index;
    for (const ch of chars) {
      if (i >= length) break;
      next[i] = ch;
      i++;
    }
    onChange(next.join("").slice(0, length));
    const focusIndex = Math.min(i, length - 1);
    inputsRef.current[focusIndex]?.focus();
  };

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
    if (e.key === "ArrowLeft" && index > 0) inputsRef.current[index - 1]?.focus();
    if (e.key === "ArrowRight" && index < length - 1) inputsRef.current[index + 1]?.focus();
  };

  const handlePaste = (e) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    if (!pasted) return;
    e.preventDefault();
    onChange(pasted.padEnd(length, "").slice(0, length).replace(/\s/g, ""));
    const focusIndex = Math.min(pasted.length, length - 1);
    inputsRef.current[focusIndex]?.focus();
  };

  return (
    <div className="otp-row" onPaste={handlePaste}>
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => (inputsRef.current[i] = el)}
          className="otp-box"
          inputMode="numeric"
          maxLength={1}
          value={d}
          disabled={disabled}
          onChange={(e) => handleChange(i, e)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          aria-label={`Chữ số OTP thứ ${i + 1}`}
        />
      ))}
    </div>
  );
}
