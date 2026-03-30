
// Available color variants: primary, secondary, danger, sky-blue, mint-green, sunny-yellow, coral-pink, lavender
// Use the new vibrant variants (sky-blue, mint-green, sunny-yellow, coral-pink, lavender) for a more colorful UI.
import './Button.css';

const Button = ({
  children,
  onClick,
  type = 'button',
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  className = '',
}) => {
  const classes = [
    'button',
    `button--${variant}`,
    `button--${size}`,
    disabled || loading ? 'button--disabled' : '',
    loading ? 'button--loading' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={classes}
      aria-busy={loading}
    >
      <span className="button__label">{children}</span>
      {loading && <span className="button__spinner" aria-hidden="true" />}
    </button>
  );
};

export default Button;
