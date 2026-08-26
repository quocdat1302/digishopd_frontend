import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-section">
          <img src="/assets/logoo.png" alt="DigiShop" className="footer-logo" />
          <p className="footer-description">
            Nền tảng mua và cho thuê thiết bị ngành ảnh với giao diện hiện đại, rõ luồng thao tác và trải nghiệm đặt hàng mượt hơn.
          </p>
          <div className="footer-social">
            <a href="#" className="social-link">Facebook</a>
            <a href="#" className="social-link">Instagram</a>
            <a href="#" className="social-link">TikTok</a>
          </div>
        </div>

        <div className="footer-section">
          <h4 className="footer-heading">Danh mục</h4>
          <ul className="footer-links">
            <li><Link to="/products?brand=Canon">Canon</Link></li>
            <li><Link to="/products?brand=Sony">Sony</Link></li>
            <li><Link to="/products?brand=Fujifilm">Fujifilm</Link></li>
            <li><Link to="/products?type=Mirrorless">Mirrorless</Link></li>
            <li><Link to="/products?type=Lens">Ống kính</Link></li>
          </ul>
        </div>

        <div className="footer-section">
          <h4 className="footer-heading">Luồng thao tác</h4>
          <ul className="footer-links">
            <li><Link to="/products?transactionType=rent">Thuê máy ảnh</Link></li>
            <li><Link to="/products?transactionType=buy">Mua máy ảnh</Link></li>
            <li><Link to="/products">Xem bảng giá</Link></li>
            <li><Link to="/products">Chọn sản phẩm</Link></li>
          </ul>
        </div>

        <div className="footer-section">
          <h4 className="footer-heading">Hỗ trợ</h4>
          <ul className="footer-links">
            <li><Link to="/products">Câu hỏi thường gặp</Link></li>
            <li><Link to="/products?transactionType=buy">Chính sách giao hàng</Link></li>
            <li><Link to="/products?transactionType=rent">Chính sách thuê máy</Link></li>
            <li><Link to="/products">Liên hệ tư vấn</Link></li>
          </ul>
        </div>

        <div className="footer-section">
          <h4 className="footer-heading">Liên hệ</h4>
          <ul className="footer-contact">
            <li>📍 DigiShop, TP.Huế</li>
            <li>📞 090 123 4567</li>
            <li>✉️ letanquocdat132@gmail.com</li>
          </ul>
        </div>
      </div>

      <div className="footer-bottom">
        <p>&copy; 2026 DigiShop. Luồng mua và thuê thiết bị ngành ảnh.</p>
      </div>
    </footer>
  );
}