import PropTypes from 'prop-types';
import './IssueStatusSelect.css';

const STATUS_OPTIONS = ['pending', 'assigned', 'resolved'];

const IssueStatusSelect = ({ value, onChange, disabled = false, className = '' }) => {
  return (
    <select
      className={`issue-status-select ${className}`.trim()}
      value={value || 'pending'}
      onChange={(e) => onChange?.(e.target.value)}
      disabled={disabled}
    >
      {STATUS_OPTIONS.map((status) => (
        <option key={status} value={status}>
          {status}
        </option>
      ))}
    </select>
  );
};

IssueStatusSelect.propTypes = {
  value: PropTypes.oneOf(STATUS_OPTIONS),
  onChange: PropTypes.func,
  disabled: PropTypes.bool,
  className: PropTypes.string,
};

export default IssueStatusSelect;
