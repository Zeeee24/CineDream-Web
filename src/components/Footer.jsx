import logo from '../assets/logo.png';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <img src={logo} alt="CineDream Logo" className="logo-icon" />
          <span className="logo-text">CineDream</span>
        </div>
        <p className="footer-copy">&copy; 1924 CineDream Made For Love</p>
      </div>
    </footer>
  );
}
