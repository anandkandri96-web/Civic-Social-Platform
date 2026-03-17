import { useId } from 'react';
import './Input.css';

const Input = ({
  label,
  error,
  id,
  className = '',
  ...props
}) => {
  const generatedId = useId();
  const inputId = id || generatedId;

  return (
    <div className={`input-field ${className}`.trim()}>
      {label && (
        <label htmlFor={inputId} className="input-field__label">
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={`input-field__control${error ? ' input-field__control--error' : ''}`}
        {...props}
      />
      {error && <span className="input-field__error">{error}</span>}
    </div>
  );
};

export default Input;
