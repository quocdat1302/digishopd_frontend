import { useEffect } from "react";

/**
 * Đặt tiêu đề tab trình duyệt theo trang đang xem. Gọi 1 lần ở đầu mỗi page component.
 * Tự thêm hậu tố " · DigiShop" nếu title truyền vào chưa có, và tự khôi phục tiêu đề cũ
 * khi rời trang (unmount) — tránh 1 trang "để lại dấu vết" tiêu đề khi component khác
 * không set lại kịp trong lúc chuyển route.
 */
export default function useDocumentTitle(title) {
  useEffect(() => {
    const previous = document.title;
    document.title = title?.includes("DigiShop") ? title : `${title} · DigiShop`;
    return () => {
      document.title = previous;
    };
  }, [title]);
}