/**
 * Bộ icon outline đơn sắc cho sidebar Admin — thay cho emoji màu mè.
 * Vẽ tay bằng SVG (stroke, currentColor) để không cần thêm thư viện icon ngoài.
 * Dùng chung 1 khung: viewBox 0 0 24 24, stroke-width 1.7, không tô nền.
 */
const base = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

export function IconDashboard(props) {
  return (
    <svg {...base} {...props}>
      <rect x="3.5" y="13" width="4" height="7.5" rx="1" />
      <rect x="10" y="8.5" width="4" height="12" rx="1" />
      <rect x="16.5" y="4" width="4" height="16.5" rx="1" />
    </svg>
  );
}

export function IconCamera(props) {
  return (
    <svg {...base} {...props}>
      <path d="M4 8.5a1.5 1.5 0 0 1 1.5-1.5h2l1.2-1.8A1.5 1.5 0 0 1 10 4.5h4a1.5 1.5 0 0 1 1.3.7L16.5 7h2A1.5 1.5 0 0 1 20 8.5v9A1.5 1.5 0 0 1 18.5 19h-13A1.5 1.5 0 0 1 4 17.5z" />
      <circle cx="12" cy="13" r="3.4" />
    </svg>
  );
}

export function IconTag(props) {
  return (
    <svg {...base} {...props}>
      <path d="M11.6 4H6.4A2.4 2.4 0 0 0 4 6.4v5.2c0 .5.2 1 .55 1.35l8 8a1.9 1.9 0 0 0 2.7 0l4.7-4.7a1.9 1.9 0 0 0 0-2.7l-8-8A1.9 1.9 0 0 0 11.6 4Z" />
      <circle cx="8.5" cy="8.5" r="1.3" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconOrders(props) {
  return (
    <svg {...base} {...props}>
      <path d="M6 3.5h9l3 3v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-15a1 1 0 0 1 1-1Z" />
      <path d="M15 3.5V7h3" />
      <path d="M8 11h8M8 14.5h8M8 18h5" />
    </svg>
  );
}

export function IconCalendar(props) {
  return (
    <svg {...base} {...props}>
      <rect x="3.5" y="5" width="17" height="15" rx="1.6" />
      <path d="M3.5 9.5h17M8 3v3.4M16 3v3.4" />
      <path d="M8 13.2h.01M12 13.2h.01M16 13.2h.01M8 16.6h.01M12 16.6h.01" />
    </svg>
  );
}

export function IconInventory(props) {
  return (
    <svg {...base} {...props}>
      <path d="M4 7.2 12 3l8 4.2v9.6L12 21l-8-4.2Z" />
      <path d="M4 7.2 12 11l8-3.8M12 11v10" />
    </svg>
  );
}

export function IconPin(props) {
  return (
    <svg {...base} {...props}>
      <path d="M12 21s7-6.4 7-11.5A7 7 0 0 0 5 9.5C5 14.6 12 21 12 21Z" />
      <circle cx="12" cy="9.5" r="2.4" />
    </svg>
  );
}

export function IconReport(props) {
  return (
    <svg {...base} {...props}>
      <path d="M3.5 19.5h17" />
      <path d="M4.5 16 9 10.5l3.2 3L20 6" />
      <path d="M15.5 6H20v4.5" />
    </svg>
  );
}

export function IconSupport(props) {
  return (
    <svg {...base} {...props}>
      <path d="M4 12a8 8 0 1 1 3.2 6.4L4 19.5l1.1-3.3A7.96 7.96 0 0 1 4 12Z" />
      <path d="M8.3 12h.01M12 12h.01M15.7 12h.01" strokeWidth="2.3" />
    </svg>
  );
}

export function IconFeedback(props) {
  return (
    <svg {...base} {...props}>
      <rect x="3.5" y="5.5" width="17" height="13" rx="1.6" />
      <path d="M4 6.5 12 13l8-6.5" />
    </svg>
  );
}

export function IconStar(props) {
  return (
    <svg {...base} {...props}>
      <path d="M12 3.3 14.6 9l6.2.5-4.7 4.1 1.4 6.1L12 16.8 6.5 19.7l1.4-6.1L3.2 9.5 9.4 9Z" />
    </svg>
  );
}

export function IconCheck(props) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="m8.3 12.3 2.5 2.5 5-5.2" />
    </svg>
  );
}

export function IconClock(props) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3.2 2" />
    </svg>
  );
}

export function IconWallet(props) {
  return (
    <svg {...base} {...props}>
      <path d="M4 7.5A1.5 1.5 0 0 1 5.5 6H18a2 2 0 0 1 2 2v9.5a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5Z" />
      <path d="M4 7.5V6a1.5 1.5 0 0 1 1.5-1.5h9" />
      <path d="M15.5 13.2a1.3 1.3 0 1 0 0-2.6 1.3 1.3 0 0 0 0 2.6Z" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconWarning(props) {
  return (
    <svg {...base} {...props}>
      <path d="M12 4 21 19.5H3Z" />
      <path d="M12 10.2v4M12 16.8h.01" strokeWidth="2.1" />
    </svg>
  );
}

export function IconBan(props) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="m6.5 6.5 11 11" />
    </svg>
  );
}

export function IconBox(props) {
  return (
    <svg {...base} {...props}>
      <path d="M4 7.2 12 3l8 4.2v9.6L12 21l-8-4.2Z" />
      <path d="M4 7.2 12 11l8-3.8M12 11v10" />
    </svg>
  );
}

export function IconTruck(props) {
  return (
    <svg {...base} {...props}>
      <path d="M3.5 6.5h9v10h-9Z" />
      <path d="M12.5 10.5h4l3 3v3h-7Z" />
      <circle cx="7" cy="18" r="1.6" />
      <circle cx="16.5" cy="18" r="1.6" />
    </svg>
  );
}

export function IconArrowReturn(props) {
  return (
    <svg {...base} {...props}>
      <path d="M8 8 4 12l4 4" />
      <path d="M4 12h11a4.5 4.5 0 0 0 0-9h-1" />
    </svg>
  );
}

export function IconBag(props) {
  return (
    <svg {...base} {...props}>
      <path d="M6.5 8.5h11l1 11.5h-13Z" />
      <path d="M9 8.5V7a3 3 0 0 1 6 0v1.5" />
    </svg>
  );
}

export function IconUser(props) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="8" r="3.4" />
      <path d="M4.8 20c1-3.5 3.9-5.5 7.2-5.5s6.2 2 7.2 5.5" />
    </svg>
  );
}

export function IconLogout(props) {
  return (
    <svg {...base} {...props}>
      <path d="M9 20H5.5A1.5 1.5 0 0 1 4 18.5v-13A1.5 1.5 0 0 1 5.5 4H9" />
      <path d="M14.5 16 19 12l-4.5-4" />
      <path d="M19 12H9" />
    </svg>
  );
}