export default function MeloopLogo() {
  return (
    <span className="meloop-logo" role="img" aria-label="meloop">
      <span className="meloop-logo-art" aria-hidden="true">
        <svg className="meloop-logo-pick" viewBox="0 0 48 54" fill="none">
          <path d="M24 3C13 3 4 7 4 17c0 13 12 29 20 34 8-5 20-21 20-34C44 7 35 3 24 3Z" fill="currentColor" />
          <path d="M28 15v18m0-18 8-2v7l-8 2" stroke="#faf9f5" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          <ellipse cx="23" cy="34" rx="6" ry="4" fill="#faf9f5" />
        </svg>
        <span className="meloop-logo-letters">mel</span>
        <svg className="meloop-logo-disc" viewBox="0 0 40 40">
          <circle cx="20" cy="20" r="19" fill="currentColor" />
          <g fill="none" stroke="#faf9f5" strokeOpacity=".24" strokeWidth=".8">
            <circle cx="20" cy="20" r="16" /><circle cx="20" cy="20" r="13" />
          </g>
          <circle cx="20" cy="20" r="9" fill="#e7b1a4" />
          <circle cx="20" cy="20" r="2" fill="#faf9f5" />
          <path d="M10 10a14 14 0 0 1 9-4" fill="none" stroke="#faf9f5" strokeOpacity=".5" strokeLinecap="round" />
        </svg>
        <svg className="meloop-logo-disc meloop-logo-disc-second" viewBox="0 0 40 40">
          <circle cx="20" cy="20" r="19" fill="currentColor" />
          <g fill="none" stroke="#faf9f5" strokeOpacity=".24" strokeWidth=".8">
            <circle cx="20" cy="20" r="16" /><circle cx="20" cy="20" r="13" />
          </g>
          <circle cx="20" cy="20" r="9" fill="#b9cfb0" />
          <circle cx="20" cy="20" r="2" fill="#faf9f5" />
          <path d="M10 10a14 14 0 0 1 9-4" fill="none" stroke="#faf9f5" strokeOpacity=".5" strokeLinecap="round" />
        </svg>
        <span className="meloop-logo-note">p
          <svg viewBox="0 0 22 24" className="meloop-logo-flag" fill="none">
            <path d="M3 21V4c5 3 10 4 15 1-1 6-6 9-15 8" fill="currentColor" />
          </svg>
        </span>
        <span className="meloop-logo-dot">.</span>
      </span>
    </span>
  );
}
