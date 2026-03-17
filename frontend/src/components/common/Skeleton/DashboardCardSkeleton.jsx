import Skeleton from './Skeleton';
import './Skeleton.css';

const DashboardCardSkeleton = () => {
  return (
    <div className="card dashboard-card-skeleton" aria-hidden="true">
      <Skeleton height={12} width="55%" radius={10} />
      <Skeleton height={28} width="40%" radius={10} />
      <Skeleton height={12} width="65%" radius={10} />
    </div>
  );
};

export default DashboardCardSkeleton;
