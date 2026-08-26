import type { LayoutMode } from '../../lib/deviceProfile';

interface ProfileField {
  label: string;
  value: string;
}

const PROFILE_FIELDS: readonly ProfileField[] = [
  { label: 'Location', value: 'Toronto, ON' },
  { label: 'Archetype', value: 'Software Developer' },
  { label: 'School', value: 'University of Waterloo' },
  { label: 'Year', value: 'III' },
];

export default function StatsPanel({ layoutMode = 'desktop' }: { layoutMode?: LayoutMode }) {
  if (layoutMode !== 'desktop') {
    return (
      <aside
        className="profile-card profile-card--compact"
        data-stats-panel
        data-profile-variant={layoutMode}
        aria-label="Ryan Zhou profile"
      >
        <div className="profile-card__compact-copy">
          <strong>Ryan Zhou</strong>
          <span>Software Developer</span>
        </div>
        <span className="profile-card__compact-location">Toronto, ON</span>
      </aside>
    );
  }

  return (
    <aside
      className="profile-card profile-card--desktop"
      data-stats-panel
      data-profile-variant="desktop"
      aria-label="Ryan Zhou profile"
    >
      <div className="profile-card__desktop-body">
        <div className="profile-card__identity">
          <span className="profile-card__label">Name</span>
          <strong>Ryan Zhou</strong>
        </div>

        <dl className="profile-card__details">
          {PROFILE_FIELDS.map(({ label, value }) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      </div>

    </aside>
  );
}
