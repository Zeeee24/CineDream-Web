export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <span className="logo-icon">C</span>
          <span className="logo-text">CineDream</span>
        </div>
        <p className="footer-copy">&copy; {new Date().getFullYear()} CineDream. All rights reserved.</p>
      </div>
    </footer>
  );
}
