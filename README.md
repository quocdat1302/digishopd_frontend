# DigiShop — Frontend Đăng nhập / Đăng ký

Giao diện React (Vite) cho hệ thống xác thực của DigiShop, khớp 1-1 với backend
Spring Boot (`AuthController`): đăng ký, đăng nhập, xác thực OTP qua email,
quên/đặt lại mật khẩu, đăng nhập Google (OAuth 2 / Google Identity Services),
refresh token tự động và đăng xuất.

## Thiết kế

Ngôn ngữ hình ảnh lấy cảm hứng từ máy ảnh: nền thân máy màu đen mờ, đèn flash
amber làm accent hành động chính, đèn xác nhận lấy nét (AF confirm) xanh ngọc
cho trạng thái thành công/focus, khung ngắm (viewfinder brackets) quanh ảnh,
và các "điểm lấy nét" sáng lên quanh ô nhập liệu khi bạn click vào. Logo/spinner
là một biểu tượng khẩu độ (aperture) vẽ bằng lượng giác trong `ApertureMark.jsx`.

## Cài đặt

```bash
npm install
cp .env.example .env
```

Sửa `.env`:

```
VITE_API_BASE_URL=http://localhost:8080/api
VITE_GOOGLE_CLIENT_ID=<Client ID từ Google Cloud Console>
```

`VITE_GOOGLE_CLIENT_ID` phải **trùng với** `GOOGLE_CLIENT_ID` / `app.google.client-id`
đang cấu hình ở backend (`application.properties`). Nếu để trống, nút "Tiếp tục
với Google" sẽ tự ẩn (frontend cũng gọi `/api/auth/providers` để kiểm tra
`googleEnabled` trước khi hiển thị nút).

```bash
npm run dev
```

Mặc định chạy ở `http://localhost:5173` — đúng với origin đã được whitelist
trong CORS của `SecurityConfig.java`, nên không cần sửa gì thêm ở backend.

## Thêm ảnh thương hiệu

Đặt file ảnh của bạn vào `public/brand-photo.jpg`. Panel bên trái sẽ tự hiển
thị ảnh này; nếu chưa có file, một placeholder tối kèm hướng dẫn sẽ hiện ra
thay vì vỡ layout hay hiện icon ảnh lỗi.

## Cấu trúc

```
src/
  api/
    client.js       axios instance + tự refresh token khi 401
    authApi.js       toàn bộ endpoint /api/auth/*
  context/
    AuthContext.jsx  user hiện tại + login()/logout()
    authStorage.js   lưu token vào localStorage (rememberMe) / sessionStorage
  components/
    AuthLayout.jsx   khung chia đôi màn hình (ảnh trái / form phải)
    BrandPanel.jsx   panel ảnh + fallback + EXIF strip trang trí
    ApertureMark.jsx logo & spinner hình khẩu độ
    FocusField.jsx   input dùng chung, có "ngoặc lấy nét" khi focus
    PasswordField.jsx input mật khẩu có nút hiện/ẩn
    OtpInput.jsx     6 ô nhập OTP, hỗ trợ paste
    GoogleButton.jsx nút Google theo theme riêng, dùng Google Identity Services
    ModeTabs.jsx     tab Đăng nhập / Đăng ký
    Alert.jsx
  pages/
    LoginPage.jsx
    RegisterPage.jsx
    VerifyOtpPage.jsx        dùng chung cho luồng xác thực OTP đăng ký
    ForgotPasswordPage.jsx   2 bước: gửi OTP -> OTP + mật khẩu mới
    WelcomePage.jsx          trang chào sau khi đăng nhập thành công
  utils/validators.js  validate client-side khớp Bean Validation của backend
```

## Những endpoint đã dùng

| Endpoint | Trang sử dụng |
|---|---|
| `GET /api/auth/providers` | LoginPage (ẩn/hiện nút Google) |
| `POST /api/auth/register` | RegisterPage |
| `POST /api/auth/login` | LoginPage |
| `POST /api/auth/google` | LoginPage (Google Identity Services) |
| `POST /api/auth/verify-otp` | VerifyOtpPage |
| `POST /api/auth/resend-otp` | VerifyOtpPage, LoginPage (tài khoản chưa xác minh) |
| `POST /api/auth/forgot-password` | ForgotPasswordPage (bước 1) |
| `POST /api/auth/reset-password` | ForgotPasswordPage (bước 2) |
| `POST /api/auth/refresh` | tự động trong `api/client.js` khi access token hết hạn |
| `POST /api/auth/logout` | WelcomePage |

## Ghi chú bảo mật/khác

- Access token + refresh token được lưu cùng nhau (đơn giản cho đồ án); nếu
  triển khai thật, nên cân nhắc lưu access token chỉ trong bộ nhớ và refresh
  token trong cookie `HttpOnly`.
- Mọi lỗi từ backend (`ApiErrorResponse`: `code`, `message`, `details`) được
  chuẩn hoá qua `toApiError()` và hiển thị đúng thông điệp tiếng Việt sẵn có
  từ `GlobalExceptionHandler`/`ApiException`.
