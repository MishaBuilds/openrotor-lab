import type { ReactElement } from 'react';
import type { IconKey } from './routes';

const PATHS: Record<IconKey, ReactElement> = {
  logo: (
    <>
      <circle cx="12" cy="12" r="2.2" />
      <path d="M12 4c3 2 4 4.6 3.1 6.7" />
      <path d="M20 12c-2 3-4.6 4-6.7 3.1" />
      <path d="M12 20c-3-2-4-4.6-3.1-6.7" />
      <path d="M4 12c2-3 4.6-4 6.7-3.1" />
    </>
  ),
  sliders: (
    <>
      <path d="M4 7h9" />
      <path d="M17 7h3" />
      <circle cx="15" cy="7" r="2" />
      <path d="M4 12h3" />
      <path d="M11 12h9" />
      <circle cx="9" cy="12" r="2" />
      <path d="M4 17h9" />
      <path d="M17 17h3" />
      <circle cx="15" cy="17" r="2" />
    </>
  ),
  gauge: (
    <>
      <path d="M4 18a8 8 0 1 1 16 0" />
      <path d="M12 18l4-5" />
      <circle cx="12" cy="18" r="1.4" />
    </>
  ),
  waveform: <path d="M3 12h3l2.2-6 3 12 2.6-8 1.8 2H21" />,
  compass: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M15.2 8.8l-2 5.4-5.4 2 2-5.4z" />
    </>
  ),
  package: (
    <>
      <path d="M20.5 7.7L12 3.2 3.5 7.7v8.6L12 20.8l8.5-4.5z" />
      <path d="M3.5 7.7L12 12l8.5-4.3" />
      <path d="M12 12v8.8" />
    </>
  ),
  terminal: (
    <>
      <rect x="3.5" y="4.5" width="17" height="15" rx="2" />
      <path d="M7.5 9.5l3 2.5-3 2.5" />
      <path d="M13 15h4" />
    </>
  ),
  plug: (
    <>
      <path d="M9 3v5" />
      <path d="M15 3v5" />
      <path d="M6.5 8h11v3.5a5.5 5.5 0 0 1-11 0z" />
      <path d="M12 17v4" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3.2l7.5 2.8v5.5c0 4.6-3.2 7.4-7.5 8.3-4.3-.9-7.5-3.7-7.5-8.3V6z" />
      <path d="M9 12.2l2.2 2.2 4-4.2" />
    </>
  ),
  play: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M10.2 8.6l5.6 3.4-5.6 3.4z" />
    </>
  ),
  menu: (
    <>
      <path d="M4 7h16" />
      <path d="M4 12h16" />
      <path d="M4 17h16" />
    </>
  ),
  close: (
    <>
      <path d="M6 6l12 12" />
      <path d="M18 6L6 18" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4L6 18M18 6l1.4-1.4" />
    </>
  ),
  moon: <path d="M20 14.2A8.2 8.2 0 1 1 9.8 4a6.6 6.6 0 0 0 10.2 10.2z" />,
  download: (
    <>
      <path d="M12 4v10" />
      <path d="M8 10.5l4 4 4-4" />
      <path d="M5 19h14" />
    </>
  ),
  upload: (
    <>
      <path d="M12 20V9.5" />
      <path d="M8 13l4-4 4 4" />
      <path d="M5 5h14" />
    </>
  ),
  reset: (
    <>
      <path d="M4.5 12a7.5 7.5 0 1 0 2.4-5.5" />
      <path d="M4.5 5v4h4" />
    </>
  ),
  trash: (
    <>
      <path d="M4 7h16" />
      <path d="M9.5 7V4.8h5V7" />
      <path d="M6.5 7l1 13h9l1-13" />
    </>
  ),
  save: (
    <>
      <path d="M5 4.5h11l3 3v12H5z" />
      <path d="M8.5 4.5v5h7v-5" />
      <path d="M8.5 19.5v-5.5h7v5.5" />
    </>
  ),
  swap: (
    <>
      <path d="M6.5 8.5h11l-3-3" />
      <path d="M17.5 15.5h-11l3 3" />
    </>
  ),
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  alert: (
    <>
      <path d="M12 4l8.5 15h-17z" />
      <path d="M12 10v4" />
      <path d="M12 16.8h.01" />
    </>
  ),
};

export interface IconProps {
  readonly name: IconKey;
  readonly className?: string;
}

export function Icon({ name, className }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {PATHS[name]}
    </svg>
  );
}
