import './Skeleton.css';

const Skeleton = ({
  width = '100%',
  height = 16,
  radius = 12,
  className = '',
  style,
}) => {
  return (
    <div
      className={`skeleton ${className}`.trim()}
      style={{
        width,
        height,
        borderRadius: radius,
        ...style,
      }}
      aria-hidden="true"
    />
  );
};

export default Skeleton;

