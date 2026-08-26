import NavBar from "../components/NavBar";
import Footer from "../components/Footer";
import useDocumentTitle from "../hooks/useDocumentTitle";

// Icon dùng ký hiệu hình học đơn sắc (không phải emoji nhiều màu) để đồng bộ với
// bộ icon "✎ ◆ ▣ ✦" đã dùng ở phần "Thông số kỹ thuật" của trang chi tiết sản phẩm.
const TIMELINE = [
  { icon: "✎", label: "Bước 1", title: "Đặt lịch & Xác thực" },
  { icon: "◆", label: "Bước 2", title: "Thanh toán cọc" },
  { icon: "▣", label: "Bước 3", title: "Nhận máy" },
  { icon: "✦", label: "Bước 4", title: "Hỗ trợ" },
  { icon: "◈", label: "Bước 5", title: "Trả máy & Kiểm tra" },
  { icon: "❖", label: "Bước 6", title: "Hoàn/Trừ cọc" },
];

const NOTES = [
  {
    icon: "◇",
    title: "Trách nhiệm thiết bị",
    desc: "Khách hàng chịu trách nhiệm với thiết bị trong suốt thời gian thuê. Nên kiểm tra kỹ tình trạng máy trước khi rời shop.",
    accent: "tertiary",
  },
  {
    icon: "◷",
    title: "Trả máy đúng hạn",
    desc: "Vui lòng trả máy đúng ngày đã đặt. Trả trễ hoặc máy có hư hỏng sẽ được nhân viên kiểm tra và có thể bị trừ một phần tiền cọc tương ứng.",
    accent: "secondary",
  },
  {
    icon: "▲",
    title: "Trách nhiệm khi sử dụng",
    desc: "Không tự ý sửa chữa, tháo lắp thiết bị. Mọi hư hỏng phát sinh trong thời gian thuê sẽ được đối chiếu khi kiểm tra máy lúc trả.",
    accent: "primary",
  },
];

export default function ProcessPage() {
  useDocumentTitle("Quy trình thuê & mua");
  return (
    <div className="checkout2-page">
      <NavBar />

      <main className="process-main">
        <span className="washi-tape tape--rose process-bg-tape process-bg-tape--left" aria-hidden="true" />
        <span className="washi-tape tape--olive process-bg-tape process-bg-tape--right" aria-hidden="true" />

        {/* ---------- Hero ---------- */}
        <section className="process-hero">
          <h1>
            Quy trình thuê máy ảnh
            <br />
            chuyên nghiệp
          </h1>
          <p className="process-hero__note process-torn">
            Hướng dẫn chi tiết từ A-Z quy trình thuê máy ảnh chuyên nghiệp. Đơn giản, minh bạch, an toàn.
          </p>
        </section>

        {/* ---------- Roadmap 6 bước ---------- */}
        <section className="process-roadmap">
          <div className="process-roadmap__line" aria-hidden="true" />
          {TIMELINE.map((t) => (
            <div className="process-roadmap__item" key={t.label}>
              <div className="process-roadmap__circle">
                <span aria-hidden="true">{t.icon}</span>
              </div>
              <span className="process-roadmap__label">{t.label}</span>
              <span className="process-roadmap__title">{t.title}</span>
            </div>
          ))}
        </section>

        {/* ---------- Bento grid 6 bước chi tiết ---------- */}
        <section className="process-bento">
          <article className="process-card process-card--1">
            <span className="washi-tape tape--sand process-card__tape process-card__tape--top" aria-hidden="true" />
            <div className="process-card__head">
              <span className="process-card__icon" aria-hidden="true">✎</span>
              <h3>01. Đặt lịch &amp; Xác thực</h3>
            </div>
            <ul className="process-card__list">
              <li><span>*</span> Chọn thiết bị &amp; khoảng ngày thuê trên website</li>
              <li><span>*</span> Xác thực CCCD/CMND (bắt buộc trước khi thuê)</li>
              <li><span>*</span> Ký hợp đồng thuê điện tử ngay trên màn hình</li>
              <li><span>*</span> Điền thông tin người nhận máy</li>
            </ul>
          </article>

          <article className="process-card process-card--2 process-torn">
            <span className="process-card__pin" aria-hidden="true">✦</span>
            <div className="process-card__head">
              <span className="process-card__icon" aria-hidden="true">◆</span>
              <h3>02. Thanh toán cọc</h3>
            </div>
            <div className="process-card__group">
              <strong>Số tiền cọc:</strong>
              <p>30% giá trị thuê, tính trên đơn giá gốc trước khuyến mãi</p>
            </div>
            <div className="process-card__group">
              <strong>Hình thức:</strong>
              <p>
                Chuyển khoản quét mã QR — hệ thống tự động xác nhận.
                <br />
                <em>(Hoặc thanh toán tiền mặt trực tiếp tại shop)</em>
              </p>
            </div>
          </article>

          <article className="process-card process-card--3">
            <span className="washi-tape tape--olive process-card__tape process-card__tape--side" aria-hidden="true" />
            <div className="process-card__head">
              <span className="process-card__icon" aria-hidden="true">▣</span>
              <h3>03. Nhận máy</h3>
            </div>
            <div className="process-card__group">
              <strong>Tại cửa hàng:</strong>
              <p>12 Trần Phú, P. Tân An, TP. Huế — mang theo CCCD đã xác thực</p>
            </div>
            <div className="process-card__group">
              <strong>Giao tận nơi:</strong>
              <p>
                Trong bán kính 5km, phí 30.000đ.
                <br />
                <em>(Chỉ nhân viên shop trực tiếp giao)</em>
              </p>
            </div>
          </article>

          {/* Ảnh chèn giữa — polaroid minh hoạ */}
         <div className="process-photo-insert">
  <div className="process-photo-insert__frame">
    <img 
      src="assets/logo.png" 
      alt="Thiết bị luôn được bảo dưỡng tốt" 
      className="process-photo-insert__img"
    />
    <p>Thiết bị luôn được bảo dưỡng tốt</p>
  </div>
</div>

          <article className="process-card process-card--4">
            <span className="washi-tape tape--rose process-card__tape process-card__tape--corner" aria-hidden="true" />
            <div className="process-card__head">
              <span className="process-card__icon" aria-hidden="true">✦</span>
              <h3>04. Hỗ trợ trong thời gian thuê</h3>
            </div>
            <p className="process-card__lead">
              <strong>Kỹ thuật:</strong> Liên hệ shop qua mục Hỗ trợ trong ứng dụng khi cần
            </p>
            <p className="process-card__lead"><strong>Trách nhiệm KH:</strong></p>
            <ul className="process-card__list process-card__list--plain">
              <li>Không làm rơi vỡ, vô nước</li>
              <li>Chịu phí sửa chữa nếu hỏng hóc</li>
              <li>Không tự ý sửa chữa, tháo lắp thiết bị</li>
            </ul>
          </article>

          <article className="process-card process-card--5 process-torn">
            <div className="process-card__head">
              <span className="process-card__icon" aria-hidden="true">◈</span>
              <h3>05. Trả máy &amp; Kiểm tra</h3>
            </div>
            <ul className="process-card__list process-card__list--stacked">
              <li>
                <span className="process-card__list-title">Trả máy:</span>
                <span>Đúng ngày đã đặt, tại shop</span>
              </li>
              <li>
                <span className="process-card__list-title">Kiểm tra:</span>
                <span>Nhân viên kiểm tra tình trạng máy khi nhận lại</span>
              </li>
              <li>
                <span className="process-card__list-title">Ghi nhận:</span>
                <span>Hư hỏng/trễ hạn (nếu có) được ghi rõ trước khi hoàn/trừ cọc</span>
              </li>
            </ul>
          </article>

          <article className="process-card process-card--6">
            <span className="process-card__pin process-card__pin--center" aria-hidden="true">◆</span>
            <div className="process-card__head">
              <span className="process-card__icon" aria-hidden="true">❖</span>
              <h3>06. Hoàn / Trừ cọc</h3>
            </div>
            <ul className="process-card__list">
              <li><span>*</span> Máy còn nguyên vẹn, đúng hạn: hoàn đủ 100% tiền cọc</li>
              <li><span>*</span> Có hư hỏng hoặc trễ hạn: trừ một phần cọc tương ứng</li>
              <li><span>*</span> Lý do trừ cọc (nếu có) được ghi rõ trong đơn hàng</li>
              <li className="process-card__list-highlight"><span>*</span> Kết quả hoàn/trừ cọc thông báo ngay trong ứng dụng</li>
            </ul>
          </article>
        </section>

        {/* ---------- Lưu ý quan trọng ---------- */}
        <section className="process-notes-section">
          <h2 className="process-notes-section__title">Lưu ý quan trọng</h2>
          <div className="process-notes-grid">
            {NOTES.map((n) => (
              <article className={`process-note process-note--${n.accent}`} key={n.title}>
                <span className="process-note__icon" aria-hidden="true">{n.icon}</span>
                <h4>{n.title}</h4>
                <p>{n.desc}</p>
              </article>
            ))}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
