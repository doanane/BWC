import './Skeleton.css';

export function SkeletonBlock({ width = '100%', height = '16px', radius = '6px', className = '' }) {
  return (
    <div
      className={`skeleton-block ${className}`}
      style={{ width, height, borderRadius: radius }}
    />
  );
}

export function SkeletonLine({ width = '100%', className = '' }) {
  return <SkeletonBlock width={width} height="14px" radius="4px" className={className} />;
}

export function SkeletonCircle({ size = '40px' }) {
  return <SkeletonBlock width={size} height={size} radius="50%" />;
}

export function SkeletonCard() {
  return (
    <div className="skeleton-card">
      <div className="skeleton-card-header">
        <SkeletonCircle size="44px" />
        <div className="skeleton-card-meta">
          <SkeletonLine width="60%" />
          <SkeletonLine width="40%" />
        </div>
      </div>
      <div className="skeleton-card-body">
        <SkeletonLine width="100%" />
        <SkeletonLine width="90%" />
        <SkeletonLine width="75%" />
      </div>
      <div className="skeleton-card-footer">
        <SkeletonBlock width="80px" height="28px" radius="100px" />
        <SkeletonBlock width="80px" height="28px" radius="100px" />
      </div>
    </div>
  );
}

export function SkeletonStatsCard() {
  return (
    <div className="skeleton-stats-card">
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
        <div>
          <SkeletonLine width="100px" />
          <div style={{ marginTop:10 }}><SkeletonBlock width="80px" height="36px" radius="6px" /></div>
        </div>
        <SkeletonCircle size="52px" />
      </div>
      <div style={{ marginTop:16 }}><SkeletonLine width="120px" /></div>
    </div>
  );
}

export function SkeletonTableRow() {
  return (
    <div className="skeleton-table-row">
      <SkeletonLine width="14%" />
      <SkeletonLine width="22%" />
      <SkeletonLine width="16%" />
      <SkeletonLine width="12%" />
      <SkeletonBlock width="64px" height="22px" radius="100px" />
    </div>
  );
}

export default function Skeleton({ type = 'line', ...props }) {
  switch (type) {
    case 'circle': return <SkeletonCircle {...props} />;
    case 'card':   return <SkeletonCard   {...props} />;
    case 'stats':  return <SkeletonStatsCard {...props} />;
    case 'row':    return <SkeletonTableRow  {...props} />;
    default:       return <SkeletonLine   {...props} />;
  }
}
