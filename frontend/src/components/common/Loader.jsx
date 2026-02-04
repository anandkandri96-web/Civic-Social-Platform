const SIZES = {
  sm: 'h-5 w-5 border-2',
  md: 'h-10 w-10 border-2',
  lg: 'h-16 w-16 border-4',
};

const Loader = ({
  size = 'md',
  fullScreen = false,
  className = '',
}) => {
  const spinner = (
    <div
      className={`
        animate-spin rounded-full
        border-t-transparent border-blue-600
        ${SIZES[size]}
        ${className}
      `}
      role="status"
      aria-label="Loading"
    />
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white/70 z-50">
        {spinner}
      </div>
    );
  }

  return (
    <div className="flex justify-center items-center py-8">
      {spinner}
    </div>
  );
};

export default Loader;
