import { Navigate, Route, Routes } from "react-router-dom";
import AuthLayout from "./components/AuthLayout";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import VerifyOtpPage from "./pages/VerifyOtpPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import WelcomePage from "./pages/WelcomePage";
import HomePage from "./pages/HomePage";
import ProductListPage from "./pages/ProductListPage";
import ProductDetailPage from "./pages/ProductDetailPage";
import RentBookingPage from "./pages/RentBookingPage";
import CartPage from "./pages/CartPage";
import CheckoutPage from "./pages/Checkoutpage";
import AdminLayout from "./admin/AdminLayout";
import AdminDashboardPage from "./admin/AdminDashboardPage";
import AdminProductsPage from "./admin/AdminProductsPage";
import AdminCategoriesPage from "./admin/AdminCategoriesPage";
import AdminOrdersPage from "./admin/AdminOrdersPage";
import AdminRentalCalendarPage from "./admin/AdminRentalCalendarPage";
import AdminReportsPage from "./admin/AdminReportsPage";
import AdminSupportPage from "./admin/AdminSupportPage";
import CustomerChatWidget from "./components/CustomerChatWidget";
import ProfilePage from "./pages/ProfilePage";
import MyOrdersPage from "./pages/MyOrdersPage";
import FeedbackPage from "./pages/Feedbackpage";
import ProcessPage from "./pages/ProcessPage";
import AdminUsersPage from "./admin/AdminUsersPage";
import AdminFeedbackPage from "./admin/AdminFeedbackpage";
import AdminReviewsPage from "./admin/AdminReviewsPage";
import AdminPickupLocationsPage from "./admin/AdminPickupLocationsPage";
import AdminRentalInventoryPage from "./admin/AdminRentalinVentoryPage";
import AdminOverdueRentalsPage from "./admin/AdminOverdueRentalsPage";
import { useAuth } from "./context/AuthContext";

export default function App() {
  return (
    <>
      <Routes>
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/verify-otp" element={<VerifyOtpPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>

      <Route
        path="/welcome"
        element={
          <RequireAuth>
            <WelcomePage />
          </RequireAuth>
        }
      />

      <Route
        path="/"
        element={
          <RequireAuth>
            <HomePage />
          </RequireAuth>
        }
      />

      <Route path="/products" element={<ProductListPage />} />
      <Route path="/products/:id" element={<ProductDetailPage />} />
      <Route path="/feedback" element={<FeedbackPage />} />
      <Route path="/quy-trinh" element={<ProcessPage />} />
      <Route
        path="/rent-booking/:id"
        element={
          <RequireAuth>
            <RentBookingPage />
          </RequireAuth>
        }
      />
      <Route
        path="/profile"
        element={
          <RequireAuth>
            <ProfilePage />
          </RequireAuth>
        }
      />
      <Route
        path="/orders"
        element={
          <RequireAuth>
            <MyOrdersPage />
          </RequireAuth>
        }
      />
      <Route
        path="/cart"
        element={
          <RequireAuth>
            <CartPage />
          </RequireAuth>
        }
      />
      <Route
        path="/checkout"
        element={
          <RequireAuth>
            <CheckoutPage />
          </RequireAuth>
        }
      />

      <Route
        path="/admin"
        element={
          <RequireAdminOrStaff>
            <AdminLayout />
          </RequireAdminOrStaff>
        }
      >
        <Route index element={<AdminIndexRedirect />} />
        <Route path="dashboard" element={<RequireAdmin><AdminDashboardPage /></RequireAdmin>} />
        <Route path="products" element={<AdminProductsPage />} />
        <Route path="categories" element={<RequireAdmin><AdminCategoriesPage /></RequireAdmin>} />
        <Route path="orders" element={<AdminOrdersPage />} />
        <Route path="rental-calendar" element={<AdminRentalCalendarPage />} />
        <Route path="reports" element={<RequireAdmin><AdminReportsPage /></RequireAdmin>} />
        <Route path="support" element={<RequireAdmin><AdminSupportPage /></RequireAdmin>} />
        <Route path="feedback" element={<RequireAdmin><AdminFeedbackPage /></RequireAdmin>} />
        <Route path="reviews" element={<RequireAdmin><AdminReviewsPage /></RequireAdmin>} />
        <Route path="pickup-locations" element={<RequireAdmin><AdminPickupLocationsPage /></RequireAdmin>} />
        <Route path="rental-inventory" element={<AdminRentalInventoryPage />} />
        <Route path="overdue-rentals" element={<AdminOverdueRentalsPage />} />
        <Route path="users" element={<RequireAdmin><AdminUsersPage /></RequireAdmin>} />
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
      <CustomerChatWidget />
    </>
  );
}

function RequireAuth({ children }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
}

function RequireAdmin({ children }) {
  const { isAuthenticated, isAdmin } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/admin" replace />;
  return children;
}

function RequireAdminOrStaff({ children }) {
  const { isAuthenticated, isAdminOrStaff } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!isAdminOrStaff) return <Navigate to="/" replace />;
  return children;
}

// Nhân viên (STAFF) không có quyền vào Dashboard (chỉ Admin) — điều hướng mặc định theo vai trò để
// tránh vòng lặp redirect vô hạn giữa "/admin" và "/admin/dashboard".
function AdminIndexRedirect() {
  const { isAdmin } = useAuth();
  return <Navigate to={isAdmin ? "dashboard" : "orders"} replace />;
}