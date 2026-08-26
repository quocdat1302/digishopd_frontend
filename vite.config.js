import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// DigiShop dùng cổng 5173 để khớp với danh sách CORS origin đã cấu hình sẵn trong
// SecurityConfig.java của backend (http://localhost:5173 và http://digishop.local:5173).
//
// `allowedHosts`: Vite mặc định chỉ chấp nhận request có Host header là localhost/127.0.0.1
// (chống DNS-rebinding). Muốn truy cập qua tên miền giả (vd digishop.local đã trỏ về
// 127.0.0.1 trong file hosts) thì phải khai báo tên đó ở đây, không thì Vite sẽ trả lỗi
// "Blocked request. This host is not allowed."
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    allowedHosts: ["localhost", "digishop.local"],
  },
});