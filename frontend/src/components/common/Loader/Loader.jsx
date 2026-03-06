import './Loader.css';

const Loader = ({
  size = 'md',
  fullScreen = false,
  className = '',
}) => {
  const spinner = (
    <div
      className={`loader__spinner loader__spinner--${size} ${className}`.trim()}
      role="status"
      aria-label="Loading"
    />
  );

  if (fullScreen) {
    return <div className="loader loader--fullscreen">{spinner}</div>;
  }

  return <div className="loader">{spinner}</div>;
};

export default Loader;
