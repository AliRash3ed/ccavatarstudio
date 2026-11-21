import React from 'react';

interface CcAvatarLogoProps {
  size?: number;
  showWordmark?: boolean;
  className?: string;
  badgeText?: string;
}

/**
 * ccavatarstudio Official Brand Identity Logo
 * Minimalist flat 2D monoline avatar with streetwear cap, studio headphones,
 * and 3 concentric voiceover soundwaves on an orange circular enclosure.
 */
export const CcAvatarLogo: React.FC<CcAvatarLogoProps> = ({
  size = 36,
  showWordmark = true,
  className = '',
  badgeText,
}) => {
  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      {/* Precision Monoline SVG Mark */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0 transition-transform duration-200 group-hover:scale-105"
        aria-hidden="true"
      >
        {/* Studio Circular Backdrop Enclosure */}
        <circle
          cx="21"
          cy="24"
          r="19"
          className="fill-orange-50 dark:fill-orange-950/40 stroke-[#FF7A30]"
          strokeWidth="2.2"
        />

        {/* Head & Neck Base Fill (Skin tone #FFF1E6) */}
        <path
          d="M17 17 C21 16 28 17 29 20 C29.8 22 28.5 24 26.5 24.5 C28 25.5 28.5 27 27 29 C25 31.5 22 32 19 32 L18 39 L14 38 L15 32 Z"
          fill="#FFF1E6"
        />

        {/* Streetwear Cap (worn backward, crown & bill) */}
        {/* Cap Bill / Visor pointing back */}
        <path
          d="M13 18 C10 18.5 6 20 5 21.5 C7 23 11 21.5 14 20 Z"
          fill="#FF7A30"
          stroke="#1E2A47"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Cap Crown */}
        <path
          d="M12 19 C12 13 17 9 23 11 C26 12 28 14 28.5 17 C24 16 17 16.5 12 19 Z"
          fill="#1E2A47"
          stroke="#1E2A47"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Cap Button on top */}
        <circle cx="21" cy="9.8" r="1.5" fill="#FF7A30" />

        {/* Facial Profile Outline (monoline with rounded terminals) */}
        <path
          d="M28 17 C28.5 18 29.5 20.2 29.8 21.2 C30 21.8 29.4 22.4 28.7 22.4 C27.5 22.4 26.5 22.8 26.2 23.5 C25.8 24.5 27.5 26 27.2 27.5 C26.8 29.5 24.5 31 21 31.5"
          stroke="#1E2A47"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Cheerful Smiling Open Mouth */}
        <path
          d="M26.2 25 C27.6 25.4 27.6 27 25.8 27.2 C24.8 27.3 25.2 25.2 26.2 25 Z"
          fill="#FF7A30"
          stroke="#1E2A47"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />

        {/* Smiling Eye Line (happy crescent) */}
        <path
          d="M24 19.5 C25 18.5 26.5 18.5 27.2 19.5"
          stroke="#1E2A47"
          strokeWidth="2"
          strokeLinecap="round"
        />

        {/* Studio Over-Ear Headphones (Soft Blue #6BBFBF + Navy #1E2A47) */}
        {/* Headband arching over head */}
        <path
          d="M17 10 C18.8 8.8 21 8.5 23.5 9"
          stroke="#6BBFBF"
          strokeWidth="2.8"
          strokeLinecap="round"
        />
        {/* Headphone Ear Cup (Capsule) */}
        <rect
          x="15"
          y="18"
          width="7"
          height="11"
          rx="3.5"
          fill="#6BBFBF"
          stroke="#1E2A47"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        {/* Inner ear cup highlight accent */}
        <line
          x1="18.5"
          y1="21"
          x2="18.5"
          y2="26"
          stroke="#1E2A47"
          strokeWidth="1.6"
          strokeLinecap="round"
        />

        {/* 3 Concentric Soundwave / Voiceover Speech Arcs (Vibrant Orange #FF7A30) */}
        {/* Inner Arc */}
        <path
          d="M32.5 22.5 C34 24 34 26.5 32.5 28"
          stroke="#FF7A30"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
        {/* Mid Arc */}
        <path
          d="M36.5 20 C39 23 39 27.5 36.5 30.5"
          stroke="#FF7A30"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
        {/* Outer Arc */}
        <path
          d="M40.5 17.5 C44 21.5 44 29 40.5 33"
          stroke="#FF7A30"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
      </svg>

      {/* Clean Modern Wordmark */}
      {showWordmark && (
        <div className="flex flex-col text-left">
          <div className="flex items-baseline tracking-tight leading-none">
            {/* 'cc' in Vibrant Orange */}
            <span className="font-black text-[18px] text-[#FF7A30] tracking-tight">
              cc
            </span>
            {/* 'avatar' in Dark Navy / Crisp White in dark mode */}
            <span className="font-extrabold text-[18px] text-[#1E2A47] dark:text-slate-100 tracking-tight">
              avatar
            </span>
            {/* 'studio' in Slate Blue */}
            <span className="font-semibold text-[17px] text-[#5A6B82] dark:text-slate-400 tracking-tight ml-0.5">
              studio
            </span>
            {badgeText && (
              <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-orange-100 dark:bg-orange-950/70 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800">
                {badgeText}
              </span>
            )}
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium tracking-normal mt-1">
            Cartoon AI Avatar &amp; Voiceover Studio
          </span>
        </div>
      )}
    </div>
  );
};

// Backwards compatibility alias
export const PersonaLogo = CcAvatarLogo;
