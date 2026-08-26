import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import NavBar from "../components/NavBar";
import Footer from "../components/Footer";
import { useAuth } from "../context/AuthContext";
import { userApi } from "../api/userApi";
import { orderApi } from "../api/orderApi";
import { toApiError, uploadImage } from "../api/client";
import { formatDate, resolveImageUrl } from "../utils/formatters";
import useDocumentTitle from "../hooks/useDocumentTitle";

const ACTIVE_RENTAL_STATUSES = ["CONFIRMED", "DEPOSIT_PAID", "DELIVERED"];

export default function ProfilePage() {
  useDocumentTitle("Tài khoản của tôi");
  const { updateUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [form, setForm] = useState({ name: "", phone: "", avatarUrl: "" });
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const [idForm, setIdForm] = useState({ idCardNumber: "", idCardFrontUrl: "", idCardBackUrl: "" });
  const [savingId, setSavingId] = useState(false);
  const [idMsg, setIdMsg] = useState(null);

  useEffect(() => {
    Promise.all([userApi.getMyProfile(), orderApi.getMyOrders().catch(() => [])])
      .then(([data, myOrders]) => {
        setProfile(data);
        setForm({ name: data.name || "", phone: data.phone || "", avatarUrl: data.avatarUrl || "" });
        setOrders(Array.isArray(myOrders) ? myOrders : []);
      })
      .catch((err) => setError(toApiError(err).message))
      .finally(() => setLoading(false));
  }, []);

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploadingAvatar(true);
    setProfileMsg(null);
    try {
      const url = await uploadImage(file);
      setForm((f) => ({ ...f, avatarUrl: url }));
    } catch (err) {
      setProfileMsg({ type: "error", text: toApiError(err).message });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileMsg(null);
    try {
      const updated = await userApi.updateMyProfile(form);
      setProfile(updated);
      updateUser(updated);
      setProfileMsg({ type: "success", text: "Đã lưu thông tin cá nhân." });
    } catch (err) {
      setProfileMsg({ type: "error", text: toApiError(err).message });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleIdSubmit = async (e) => {
    e.preventDefault();
    setSavingId(true);
    setIdMsg(null);
    try {
      const updated = await userApi.verifyId(idForm);
      setProfile(updated);
      updateUser(updated);
      setIdMsg({ type: "success", text: "Xác thực CCCD/CMND thành công. Bạn đã có thể thuê thiết bị." });
    } catch (err) {
      setIdMsg({ type: "error", text: toApiError(err).message });
    } finally {
      setSavingId(false);
    }
  };

  const totalOrders = orders.length;
  const activeRentals = orders.filter((o) => o.orderType === "RENTAL" && ACTIVE_RENTAL_STATUSES.includes(o.status)).length;
  const completedOrders = orders.filter((o) => o.status === "COMPLETED").length;

  return (
    <div className="checkout2-page">
      <NavBar />
      <section className="profile-shell">
        {loading && <p className="profile-hint">Đang tải hồ sơ...</p>}
        {!loading && error && <p className="profile-hint profile-hint--error">{error}</p>}

        {!loading && !error && profile && (
          <>
            <div className="profile-hero">
              <span className="washi-tape tape--rose profile-hero__tape" aria-hidden="true" />
              <div className="profile-hero__polaroid">
                <div className="profile-hero__photo">
                  {form.avatarUrl ? (
                    <img src={resolveImageUrl(form.avatarUrl)} alt={profile.name} />
                  ) : (
                    <span>{(profile.name || "?")[0]?.toUpperCase()}</span>
                  )}
                </div>
                <label className="profile-hero__upload">
                  {uploadingAvatar ? "Đang tải..." : "Đổi ảnh"}
                  <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={handleAvatarUpload} hidden />
                </label>
                <p>{profile.name}</p>
              </div>

              <div className="profile-hero__info">
                <h1>{profile.name}</h1>
                <p className="profile-hero__quote">"Lưu giữ những khoảnh khắc đời thường qua ống kính máy ảnh thuê tại DigiShop."</p>
                <span className="profile-hero__joined">Tham gia từ {formatDate(profile.createdAt)}</span>
              </div>
            </div>

            <div className="profile-layout">
              <aside className="profile-sidebar">
                <nav className="profile-sidebar__tabs">
                  <span className="is-active">Thông tin cá nhân</span>
                  <Link to="/orders">Đơn hàng của tôi</Link>
                  <a href="#xac-thuc">Xác thực CCCD</a>
                </nav>

                <div className="profile-sidebar__stats">
                  <h3>Thống kê</h3>
                  <div>
                    <span>Tổng đơn hàng:</span>
                    <strong>{totalOrders}</strong>
                  </div>
                  <div>
                    <span>Đang thuê:</span>
                    <strong>{activeRentals}</strong>
                  </div>
                  <div>
                    <span>Đã hoàn tất:</span>
                    <strong>{completedOrders}</strong>
                  </div>
                </div>
              </aside>

              <div className="profile-grid">
                <form className="profile-card" onSubmit={handleProfileSubmit}>
                  <h2>Thông tin cá nhân</h2>

                  <label>
                    <span>Email</span>
                    <input value={profile.email} disabled />
                  </label>
                  <label>
                    <span>Họ tên</span>
                    <input
                      value={form.name}
                      onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                      required
                    />
                  </label>
                  <label>
                    <span>Số điện thoại</span>
                    <input
                      value={form.phone}
                      onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                      placeholder="0901234567"
                    />
                  </label>

                  {profileMsg && (
                    <p className={`profile-hint ${profileMsg.type === "error" ? "profile-hint--error" : "profile-hint--success"}`}>
                      {profileMsg.text}
                    </p>
                  )}

                  <button type="submit" className="btn btn-shutter" disabled={savingProfile}>
                    {savingProfile ? "Đang lưu..." : "Lưu thay đổi"}
                  </button>
                </form>

                <div className="profile-card" id="xac-thuc">
                  <h2>Xác thực CCCD/CMND</h2>
                  <p className="profile-card__desc">Bắt buộc trước khi thuê thiết bị — dùng để đối chiếu khi giao/nhận máy.</p>

                  {profile.identityVerified ? (
                    <div className="profile-verified">
                      <span className="profile-verified__badge">✓ Đã xác thực</span>
                      <p>Số giấy tờ: <strong>{profile.idCardNumber}</strong></p>
                      {profile.idCardSubmittedAt && <p>Nộp lúc: {formatDate(profile.idCardSubmittedAt)}</p>}
                    </div>
                  ) : (
                    <form onSubmit={handleIdSubmit}>
                      <label>
                        <span>Số CCCD/CMND</span>
                        <input
                          value={idForm.idCardNumber}
                          onChange={(e) => setIdForm((f) => ({ ...f, idCardNumber: e.target.value }))}
                          placeholder="9 hoặc 12 chữ số"
                          required
                        />
                      </label>
                      <label>
                        <span>Ảnh mặt trước (URL)</span>
                        <input
                          value={idForm.idCardFrontUrl}
                          onChange={(e) => setIdForm((f) => ({ ...f, idCardFrontUrl: e.target.value }))}
                          placeholder="https://..."
                          required
                        />
                      </label>
                      <label>
                        <span>Ảnh mặt sau (URL)</span>
                        <input
                          value={idForm.idCardBackUrl}
                          onChange={(e) => setIdForm((f) => ({ ...f, idCardBackUrl: e.target.value }))}
                          placeholder="https://..."
                          required
                        />
                      </label>

                      {idMsg && (
                        <p className={`profile-hint ${idMsg.type === "error" ? "profile-hint--error" : "profile-hint--success"}`}>
                          {idMsg.text}
                        </p>
                      )}

                      <button type="submit" className="btn btn-shutter" disabled={savingId}>
                        {savingId ? "Đang gửi..." : "Gửi xác thực"}
                      </button>
                    </form>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </section>
      <Footer />
    </div>
  );
}