
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

export const UsbIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 512"><path d="M633.5 256c0 3.1-1.7 6.1-4.5 7.5L539.9 317c-1.4 .8-2.8 1.4-4.5 1.4-1.4 0-3.1-.3-4.5-1.1-2.8-1.7-4.5-4.5-4.5-7.8l0-35.6-230.7 0c25.3 39.6 40.5 106.9 69.6 106.9l26.7 0 0-26.8c0-5 3.9-8.9 8.9-8.9l89.1 0c5 0 8.9 3.9 8.9 8.9l0 89.1c0 5-3.9 8.9-8.9 8.9l-89.1 0c-5 0-8.9-3.9-8.9-8.9l0-26.7-26.7 0c-75.4 0-81.1-142.5-124.7-142.5l-100.3 0c-8.1 30.6-35.9 53.5-69 53.5-39.3-.1-71.3-32.1-71.3-71.4s32-71.3 71.3-71.3c33.1 0 61 22.8 69 53.5 39.1 0 43.9 9.5 74.6-60.4 40.1-89.1 58.1-82.1 108.9-82.1 7.5-20.9 27-35.6 50.4-35.6 29.5 0 53.5 23.9 53.5 53.5s-23.9 53.5-53.5 53.5c-23.4 0-42.9-14.8-50.4-35.6l-29.8 0c-29.1 0-44.3 67.4-69.6 106.9l302.1 0 0-35.6c0-3.3 1.7-6.1 4.5-7.8s6.4-1.4 8.9 .3L629 248.8c2.8 1.1 4.5 4.1 4.5 7.2z"/></svg>
