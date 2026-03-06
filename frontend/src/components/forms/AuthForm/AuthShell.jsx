import { Link } from 'react-router-dom';
import './AuthShell.css';

const AuthShell = ({
  pageClassName,
  cardClassName,
  title,
  subtitle,
  error,
  footer,
  children,
}) => {
  return (
    <div className={pageClassName}>
      <Link to="/" className="auth-back-home">
        Back to home
      </Link>

      <div className={cardClassName}>
        <h1 className="auth-shell-title">{title}</h1>
        {subtitle ? <p className="auth-shell-subtitle">{subtitle}</p> : null}
        {error ? <div className="auth-shell-error">{error}</div> : null}
        {children}
        {footer ? <div className="auth-shell-footer">{footer}</div> : null}
      </div>
    </div>
  );
};

export default AuthShell;
