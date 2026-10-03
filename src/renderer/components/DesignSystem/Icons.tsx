
interface IconProps {
  fill?: string;
  className?: string;
}

// Rounded triangle corners computed via quadratic bezier at each vertex (r=1.5)
export const PlayIcon = ({ fill = "currentColor", className }: IconProps) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill={fill} className={className}>
    <path d="M6 6.5 Q6 5 7.3 5.7 L17.7 11.3 Q19 12 17.7 12.7 L7.3 18.3 Q6 19 6 17.5 Z"/>
  </svg>
);

export const PauseIcon = ({ fill = "currentColor", className }: IconProps) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill={fill} className={className}>
    <rect x="5" y="5" width="4" height="14" rx="2"/>
    <rect x="15" y="5" width="4" height="14" rx="2"/>
  </svg>
);

export const RecordIcon = ({ fill = "currentColor", className }: IconProps) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill={fill} className={className}>
    <circle cx="12" cy="12" r="8"/>
  </svg>
);

export const SaveIcon = ({ fill = "currentColor", className }: IconProps) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill={fill} className={className}>
    <path fillRule="evenodd" d="M6 4 H15.5 L20 8.5 V18 Q20 20 18 20 H6 Q4 20 4 18 V6 Q4 4 6 4 Z M7 6 V10 H15 V6 Z M12 13 A2.5 2.5 0 1 0 12 18 A2.5 2.5 0 1 0 12 13 Z"/>
  </svg>
);

export const StopIcon = ({ fill = "currentColor", className }: IconProps) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill={fill} className={className}>
    <rect x="5" y="5" width="14" height="14" rx="2"/>
  </svg>
);

// Bar (rect) + left-pointing triangle with rounded corners (r=1.5)
export const BackToStartIcon = ({ fill = "currentColor", className }: IconProps) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill={fill} className={className}>
    <rect x="5" y="5" width="3" height="14" rx="1.5"/>
    <path d="M19 7 Q19 5 17.4 6.1 L10.6 10.9 Q9 12 10.6 13.1 L17.4 17.9 Q19 19 19 17 Z"/>
  </svg>
);

// Outlined: the playhead, and an arrow carrying the view along with it
export const FollowIcon = ({ className }: Pick<IconProps, 'className'>) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M6 4v16M10 12h9M16 9l3 3-3 3"/>
  </svg>
);

// Outlined, like a line icon: lid, can and two slats
export const TrashIcon = ({ className }: Pick<IconProps, 'className'>) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M4 7h16M10 7V5h4v2M6 7l1 12.5h10L18 7M10 11v5M14 11v5"/>
  </svg>
);
