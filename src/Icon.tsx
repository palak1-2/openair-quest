import type { JSX, SVGProps } from "react";

export type IconName =
  | "accessibility"
  | "arrow-left"
  | "arrow-right"
  | "building"
  | "camera"
  | "check"
  | "check-circle"
  | "clock"
  | "flower"
  | "heart"
  | "help"
  | "home"
  | "info"
  | "leaf"
  | "pause"
  | "play"
  | "shield-check"
  | "smile"
  | "speaker"
  | "speaker-off"
  | "stop"
  | "tree"
  | "volume";

interface IconProps extends SVGProps<SVGSVGElement> {
  name: IconName;
  size?: number;
}

const ICON_SHAPES: Record<IconName, JSX.Element> = {
    accessibility: (
      <>
        <circle cx="12" cy="4.5" r="1.5" />
        <path d="M5 8.5h14M12 8.5v4m0 0-4 7m4-7 4 7M8 10l-2 5m10-5 2 5" />
      </>
    ),
    "arrow-left": <path d="m14 18-6-6 6-6M8 12h12" />,
    "arrow-right": <path d="m10 18 6-6-6-6m6 6H4" />,
    building: (
      <>
        <path d="M4 21h16M6 21V5l6-2 6 2v16M9 8h.01M15 8h.01M9 12h.01M15 12h.01M10 21v-5h4v5" />
      </>
    ),
    camera: (
      <>
        <path d="M4 7h3l1.5-2h7L17 7h3v12H4z" />
        <circle cx="12" cy="13" r="3.5" />
      </>
    ),
    check: <path d="m5 12 4 4L19 6" />,
    "check-circle": (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="m8 12 2.5 2.5L16.5 9" />
      </>
    ),
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    flower: (
      <>
        <path d="M12 12c-2-2-2-5 0-7 2 2 2 5 0 7Zm0 0c2-2 5-2 7 0-2 2-5 2-7 0Zm0 0c2 2 2 5 0 7-2-2-2-5 0-7Zm0 0c-2 2-5 2-7 0 2-2 5-2 7 0Z" />
        <circle cx="12" cy="12" r="1.5" />
        <path d="M12 19v3" />
      </>
    ),
    heart: <path d="M20.8 8.8c0 4.2-8.8 10-8.8 10s-8.8-5.8-8.8-10A4.8 4.8 0 0 1 12 6.3a4.8 4.8 0 0 1 8.8 2.5Z" />,
    help: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M9.6 9a2.5 2.5 0 1 1 4.5 1.5c-1.2 1.4-2.1 1.4-2.1 3" />
        <path d="M12 17h.01" />
      </>
    ),
    home: (
      <>
        <path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-6v-7h-4v7H4a1 1 0 0 1-1-1z" />
      </>
    ),
    info: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 11v5m0-8h.01" />
      </>
    ),
    leaf: <path d="M20 4c-8 0-14 3.8-14 10a6 6 0 0 0 6 6c6.2 0 8-8 8-16ZM4 21c2-5 6-8 11-11" />,
    pause: <path d="M8 5h3v14H8zM15 5h3v14h-3z" />,
    play: <path d="m8 5 12 7-12 7z" />,
    "shield-check": (
      <>
        <path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z" />
        <path d="m9 11 2 2 4-4" />
      </>
    ),
    smile: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M8 14s1.5 3 4 3 4-3 4-3M9 9h.01M15 9h.01" />
      </>
    ),
    speaker: (
      <>
        <path d="M11 5 6 9H3v6h3l5 4zM15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" />
      </>
    ),
    "speaker-off": (
      <>
        <path d="M11 5 6 9H3v6h3l5 4zM16 9l5 6m0-6-5 6" />
      </>
    ),
    stop: <rect x="6" y="6" width="12" height="12" rx="1" />,
    tree: (
      <>
        <path d="M12 22v-7m0-12 7 9h-4l5 6H4l5-6H5z" />
      </>
    ),
    volume: (
      <>
        <path d="M11 5 6 9H3v6h3l5 4zM16 9a5 5 0 0 1 0 6" />
      </>
    ),
};

export function Icon({ name, size = 20, ...props }: IconProps): JSX.Element {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.7}
      {...props}
    >
      {ICON_SHAPES[name]}
    </svg>
  );
}
