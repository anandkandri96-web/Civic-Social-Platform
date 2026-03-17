import Skeleton from './Skeleton';
import './Skeleton.css';

const IssueCardSkeleton = () => {
  return (
    <div className="card issue-card-skeleton" aria-hidden="true">
      <Skeleton height={140} radius={10} />
      <Skeleton height={16} width="70%" radius={10} />
      <Skeleton height={12} width="55%" radius={10} />
      <Skeleton height={12} width="40%" radius={10} />
      <Skeleton height={36} radius={10} />
    </div>
  );
};

export default IssueCardSkeleton;
