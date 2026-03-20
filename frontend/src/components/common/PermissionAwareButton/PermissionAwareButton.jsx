import { usePermission } from '../../../hooks/usePermission';
import './PermissionAwareButton.css';

const PermissionAwareButton = ({ required, onClick, className = '', children, ...buttonProps }) => {
  const { canPerformAny, loading } = usePermission();
  const requiredPermissions = Array.isArray(required) ? required : [required];
  const hasPermission = requiredPermissions.length === 0 || canPerformAny(requiredPermissions);

  return (
    <button
      type="button"
      className={`${className} ${!hasPermission ? 'permission-aware-button--disabled' : ''}`}
      onClick={(event) => {
        if (!hasPermission) {
          event.preventDefault();
          return;
        }
        onClick && onClick(event);
      }}
      disabled={!hasPermission || loading || buttonProps.disabled}
      {...buttonProps}
    >
      {children}
    </button>
  );
};

export default PermissionAwareButton;
