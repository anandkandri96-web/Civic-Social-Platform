const VARIANTS = {
  primary: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500',
  secondary: 'bg-gray-600 hover:bg-gray-700 focus:ring-gray-500',
  danger: 'bg-red-600 hover:bg-red-700 focus:ring-red-500',
  outline:
    'bg-transparent border border-gray-300 text-gray-700 hover:bg-gray-100 focus:ring-gray-400',
};

const SIZES = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-5 py-2.5 text-base',
};

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
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`
        inline-flex items-center justify-center
        rounded-md font-medium
        transition-colors duration-200
        focus:outline-none focus:ring-2 focus:ring-offset-2
        ${VARIANTS[variant]}
        ${SIZES[size]}
        ${disabled || loading ? 'opacity-50 cursor-not-allowed' : ''}
        ${className}
      `}
    >
      {loading ? 'Loading…' : children}
    </button>
  );
};

export default Button;
