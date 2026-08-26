/**
 * ApertureMark — biểu tượng khẩu độ (iris) của DigiShop.
 * Dùng làm logo tĩnh hoặc spinner khi `spinning=true`.
 * Các lá khẩu độ được tính toán bằng lượng giác thay vì path SVG cứng,
 * để dễ đổi số lá / bán kính mà không phải vẽ lại tay.
 */
export default function ApertureMark({ size = 28, blades = 7, spinning = false, color = "var(--accent-flash)" }) {
  const cx = 50;
  const cy = 50;
  const rOuter = 46;
  const rInner = 20;
  const gapRatio = 0.14; // khoảng hở giữa các lá

  const paths = [];
  for (let i = 0; i < blades; i++) {
    const a0 = (i / blades) * Math.PI * 2;
    const a1 = a0 + (1 / blades) * Math.PI * 2 * (1 - gapRatio);
    const pivot = polar(cx, cy, rInner, a0);
    const outerStart = polar(cx, cy, rOuter, a0);
    const outerEnd = polar(cx, cy, rOuter, a1);
    const d = `M ${pivot.x} ${pivot.y} L ${outerStart.x} ${outerStart.y} A ${rOuter} ${rOuter} 0 0 1 ${outerEnd.x} ${outerEnd.y} Z`;
    paths.push(<path key={i} d={d} />);
  }

  return (
    <svg
      className={`aperture${spinning ? " aperture--spin" : ""}`}
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill={color}
      aria-hidden="true"
    >
      <circle cx={cx} cy={cy} r={rOuter + 2} fill="none" stroke={color} strokeOpacity="0.35" strokeWidth="2" />
      <g opacity="0.92">{paths}</g>
    </svg>
  );
}

function polar(cx, cy, r, angle) {
  return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
}
