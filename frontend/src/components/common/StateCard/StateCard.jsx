import './StateCard.css';

const VARIANT_CLASS = {
  neutral: 'state-card-neutral',
  error: 'state-card-error',
};

const StateCard = ({
  title,
  message,
  action = null,
  icon = null,
  variant = 'neutral',
  className = '',
}) => {
  return (
    <div className={`state-card ${VARIANT_CLASS[variant] || VARIANT_CLASS.neutral} ${className}`.trim()}>
      {icon ? <div className="state-card-icon">{icon}</div> : null}
      {title ? <h3>{title}</h3> : null}
      {message ? <p>{message}</p> : null}
      {action ? <div className="state-card-action">{action}</div> : null}
    </div>
  );
};

export default StateCard;
