export default function Icon({ name, size = 20, ...props }) {
  const paths = {
    calendar: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="3" />
        <path d="M7 3v4M17 3v4M3 11h18" />
      </>
    ),
    week: (
      <>
        <rect x="3" y="4" width="18" height="17" rx="3" />
        <path d="M9 4v17M15 4v17M3 10h18" />
      </>
    ),
    panel: (
      <>
        <rect x="3" y="4" width="18" height="16" rx="3" />
        <path d="M9 4v16" />
      </>
    ),
    settings: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="m9 3-1 3-3 1-2 3 2 2-1 3 3 2 2 3h4l2-3 3-1 2-3-2-2 1-3-3-2-2-3Z" />
      </>
    ),
    repeat: (
      <>
        <path d="M4 9a6 6 0 0 1 6-5h9l-3-3M20 15a6 6 0 0 1-6 5H5l3 3M19 4l-3 3M5 20l3-3" />
      </>
    ),
    close: <path d="m6 6 12 12M6 18 18 6" />,
    plus: <path d="M12 5v14M5 12h14" />,
    check: <path d="m6 12 4 4 8-8" />,
    list: (
      <>
        <path d="M9 6h11M9 12h11M9 18h11" />
        <path d="M4 6h.01M4 12h.01M4 18h.01" />
      </>
    ),
    star: (
      <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9Z" />
    ),
    done: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="m8 12 3 3 5-6" />
      </>
    ),
    search: (
      <>
        <circle cx="10.5" cy="10.5" r="6.5" />
        <path d="m16 16 4 4" />
      </>
    ),
    edit: (
      <>
        <path d="m15 5 4 4M4 20l4-1L20 7a2.8 2.8 0 0 0-4-4L4 15Z" />
      </>
    ),
    trash: (
      <>
        <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v5M14 11v5" />
      </>
    ),
    arrow: <path d="m9 5 7 7-7 7" />,
    logout: (
      <>
        <path d="M9 4H4v16h5M14 8l4 4-4 4M9 12h11" />
      </>
    ),
    cloud: <path d="M7 18a5 5 0 1 1 1-9.9A6 6 0 0 1 20 10a4 4 0 0 1-1 8Z" />,
    rain: <><path d="M5 15a4 4 0 0 1 2-7.5A6 6 0 0 1 18.5 8 3.5 3.5 0 0 1 19 15H5ZM8 18l-1 3M13 18l-1 3M18 18l-1 3" /></>,
    snow: <path d="M12 3v18M4 7l16 10M4 17 20 7M9 5l3 2 3-2M9 19l3-2 3 2" />,
    storm: <><path d="M5 15a4 4 0 0 1 2-7.5A6 6 0 0 1 18.5 8 3.5 3.5 0 0 1 19 15" /><path d="m13 12-4 6h5l-3 5" /></>,
    moon: <path d="M20.5 13A8.5 8.5 0 0 1 11 3.5 8.5 8.5 0 1 0 20.5 13Z" />,
    sun: (
      <>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M5 19l1.5-1.5M17.5 6.5 19 5" />
      </>
    ),
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {paths[name]}
    </svg>
  );
}
