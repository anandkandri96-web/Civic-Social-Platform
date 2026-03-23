import PropTypes from 'prop-types';
import { ISSUE_STATUS_OPTIONS } from '../../../constants/issueOptions';
import './IssueStatusSelect.css';

const STATUS_OPTIONS = ISSUE_STATUS_OPTIONS;

const IssueStatusSelect = ({ value, onChange, disabled = false, className = '' }) => {
  return (
    <select
      className={`issue-status-select ${className}`.trim()}
      value={value || 'reported'}
      onChange={(e) => onChange?.(e.target.value)}
      disabled={disabled}
    >
      {STATUS_OPTIONS.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
};

IssueStatusSelect.propTypes = {
  value: PropTypes.oneOf(STATUS_OPTIONS.map((opt) => opt.value)),
  onChange: PropTypes.func,
  disabled: PropTypes.bool,
  className: PropTypes.string,
};

export default IssueStatusSelect;
