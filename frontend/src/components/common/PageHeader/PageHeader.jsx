import './PageHeader.css';

const PageHeader = ({ title, subtitle, action = null, className = '' }) => {
  return (
    <div className={`page-header ${className}`.trim()}>
      <div>
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {action ? <div className="page-header-action">{action}</div> : null}
    </div>
  );
};

export default PageHeader;
