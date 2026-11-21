import React, { useEffect, useMemo, useRef } from 'react';
import {
  CharacterConfig,
  EmotionPreset,
  EyeSprite,
  FramingMode,
  HandGesture,
  MouthSprite,
  PropType,
  StageBackgroundType,
} from '../types/character';
import { EMOTIONS_LIST } from '../data/characters';
import { clampHeadTilt, computeCuffEnd } from '../utils/geometry';
import { getGestureLimbConfig, LimbConfig } from '../utils/poseEngine';

export interface CharacterStageProps {
  character: CharacterConfig;
  eye?: EyeSprite;
  mouth?: MouthSprite;
  gesture?: HandGesture;
  emotion?: EmotionPreset;
  prop?: PropType;
  headTilt?: number;
  framing?: FramingMode;
  background?: StageBackgroundType;
  customBgColor?: string;
  customBgImage?: string;
  isBlinking?: boolean;
  isNodding?: boolean;
  isShaking?: boolean;
  showGrid?: boolean;
  flatShading?: boolean;
  isExploded?: boolean;
  scale?: number;
  className?: string;
  id?: string;
  hairStyleOverride?: string;
  clothesTypeOverride?: string;
  pantsTypeOverride?: string;
  capOverride?: string;
  glassesOverride?: string;
  maskOverride?: string;
  beardOverride?: string;
  topHexOverride?: string;
  topAccentOverride?: string;
  pantsHexOverride?: string;
  pantsShadeOverride?: string;
  shoeHexOverride?: string;
  shoeToeOverride?: string;
  shoeAccentOverride?: string;
  turn?: '0' | '35' | '90' | '180';
  instantPose?: boolean;
  deterministicPose?: boolean;
  limbOverride?: { L: LimbConfig; R: LimbConfig };
}

const HairBackLayer = React.memo<{
  style: string;
  hc: { base: string; shade: string; hi: string };
}>(({ style, hc }) => {
  if (style === 'zara-curls') {
    return (
      <g>
        <circle cx="62" cy="108" r="20" fill={hc.hi} />
        <circle cx="178" cy="108" r="20" fill={hc.hi} />
        <circle cx="57" cy="134" r="21" fill={hc.hi} />
        <circle cx="183" cy="134" r="21" fill={hc.hi} />
        <circle cx="68" cy="154" r="19" fill={hc.hi} />
        <circle cx="172" cy="154" r="19" fill={hc.hi} />
        <path d="M66,94 C52,114 54,148 74,166 L166,166 C186,148 188,114 174,94 Z" fill={hc.base} />
        <path
          d="M61,130 C55,138 61,148 71,146 M179,130 C185,138 179,148 169,146"
          stroke={hc.hi}
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
          className="shade-layer"
        />
      </g>
    );
  }
  if (style === 'zainab-waves') {
    return (
      <g>
        <path
          d="M56,84 C38,98 34,128 44,148 C36,164 44,184 68,188 L172,188 C196,184 204,164 196,148 C206,128 202,98 184,84 Z"
          fill={hc.shade}
        />
        <path
          d="M60,88 C44,104 40,128 50,146 C42,160 50,178 70,182 L170,182 C190,178 198,160 190,146 C200,128 196,104 180,88 Z"
          fill={hc.base}
        />
      </g>
    );
  }
  if (style === 'sleek-bob' || style === 'asym-bob') {
    return <path d="M54,72 C44,106 48,154 68,172 L172,172 C192,154 196,106 186,72 Z" fill={hc.base} />;
  }
  if (style === 'afro-curls') {
    return (
      <g>
        <g fill={hc.shade}>
          <circle cx="58" cy="70" r="27" />
          <circle cx="182" cy="70" r="27" />
          <circle cx="50" cy="104" r="27" />
          <circle cx="190" cy="104" r="27" />
          <circle cx="58" cy="138" r="25" />
          <circle cx="182" cy="138" r="25" />
          <circle cx="88" cy="46" r="29" />
          <circle cx="152" cy="46" r="29" />
          <circle cx="120" cy="40" r="31" />
        </g>
        <g fill={hc.base}>
          <circle cx="62" cy="68" r="24" />
          <circle cx="178" cy="68" r="24" />
          <circle cx="54" cy="100" r="24" />
          <circle cx="186" cy="100" r="24" />
          <circle cx="62" cy="134" r="21" />
          <circle cx="178" cy="134" r="21" />
          <circle cx="90" cy="44" r="26" />
          <circle cx="150" cy="44" r="26" />
          <circle cx="120" cy="38" r="28" />
        </g>
      </g>
    );
  }
  if (style === 'twin-buns') {
    return (
      <g>
        <circle cx="54" cy="48" r="21" fill={hc.base} />
        <circle cx="186" cy="48" r="21" fill={hc.shade} />
        <circle cx="64" cy="58" r="4.5" fill="#FBBF24" />
        <circle cx="176" cy="58" r="4.5" fill="#FBBF24" />
        <path d="M56,72 C48,106 52,148 70,166 L170,166 C188,148 192,106 184,72 Z" fill={hc.shade} />
      </g>
    );
  }
  if (style === 'hijab-drape') {
    return (
      <path
        d="M58,88 C54,128 64,162 82,174 L158,174 C176,162 186,128 182,88 C178,48 152,34 120,34 C88,34 62,48 58,88 Z"
        fill={hc.base}
      />
    );
  }
  return null;
});

const HairFrontLayer = React.memo<{
  style: string;
  hc: { base: string; shade: string; hi: string };
}>(({ style, hc }) => {
  if (style === 'spiky-sweep') {
    return (
      <g>
        <path d="M75,52 C56,42 44,46 55,59 C45,61 49,73 68,71 Z" fill={hc.base} />
        <path
          d="M65,100 C61,58 83,38 122,38 C158,38 179,58 175,100 L165,100 L165,78 C162,68 148,64 120,64 C92,64 78,68 75,78 L75,100 Z"
          fill={hc.base}
        />
        <path d="M84,60 C92,46 144,46 156,62 C140,58 100,58 84,60 Z" fill={hc.hi} className="shade-layer" />
      </g>
    );
  }
  if (style === 'zara-curls') {
    return <path d="M70,86 C86,70 116,68 136,76 C120,84 98,88 70,86 Z" fill={hc.hi} />;
  }
  if (style === 'pompadour') {
    return (
      <g>
        <rect x="66" y="74" width="11" height="27" rx="5" fill={hc.shade} />
        <rect x="163" y="74" width="11" height="27" rx="5" fill={hc.shade} />
        <path
          d="M63,72 C53,52 57,42 69,46 C75,34 102,30 132,31 C166,32 183,48 177,72 C173,80 152,80 120,80 C88,80 67,80 63,72 Z"
          fill={hc.base}
        />
        <path
          d="M96,36 C134,34 169,44 169,66 C167,74 155,74 146,72 C152,54 128,42 96,36 Z"
          fill={hc.hi}
          className="shade-layer"
        />
      </g>
    );
  }
  if (style === 'zainab-waves') {
    return (
      <g>
        <path
          d="M60,88 C56,52 78,28 122,28 C162,28 184,52 180,88 C170,70 154,58 138,48 C118,66 90,78 60,88 Z"
          fill={hc.base}
        />
        <path
          d="M74,58 C92,38 122,32 146,40"
          fill="none"
          stroke={hc.hi}
          strokeWidth="5.5"
          strokeLinecap="round"
          opacity="0.65"
          className="shade-layer"
        />
      </g>
    );
  }
  if (style === 'twoblock-asian' || style === 'comma-perm') {
    return (
      <g>
        <path
          d="M62,84 C58,46 82,28 122,28 C160,28 182,46 178,84 C164,68 146,56 128,50 C130,64 122,76 112,82 C116,66 114,54 108,50 C92,58 76,70 62,84 Z"
          fill={hc.base}
        />
        <path
          d="M78,44 C98,32 134,32 156,42"
          fill="none"
          stroke={hc.hi}
          strokeWidth="5"
          strokeLinecap="round"
          opacity="0.6"
          className="shade-layer"
        />
      </g>
    );
  }
  if (style === 'twin-buns' || style === 'sleek-bob' || style === 'asym-bob') {
    return (
      <g>
        <path
          d="M62,84 C60,46 84,30 120,30 C156,30 180,46 178,84 C160,68 136,62 120,48 C104,62 80,68 62,84 Z"
          fill={hc.base}
        />
        <path
          d="M78,44 C102,32 138,32 162,44"
          fill="none"
          stroke={hc.hi}
          strokeWidth="5"
          strokeLinecap="round"
          opacity="0.58"
          className="shade-layer"
        />
      </g>
    );
  }
  if (style === 'buzz-fade' || style === 'slick-back') {
    return (
      <g>
        <path
          d="M65,80 C64,44 86,32 120,32 C154,32 176,44 175,80 C168,62 150,56 120,56 C90,56 72,62 65,80 Z"
          fill={hc.base}
        />
        <path
          d="M84,42 C106,34 134,34 156,42"
          fill="none"
          stroke={hc.hi}
          strokeWidth="4.5"
          strokeLinecap="round"
          opacity="0.5"
          className="shade-layer"
        />
      </g>
    );
  }
  if (style === 'bald-elder') {
    return (
      <g>
        <rect x="62" y="68" width="11" height="32" rx="5" fill={hc.base} />
        <rect x="167" y="68" width="11" height="32" rx="5" fill={hc.shade} />
      </g>
    );
  }
  if (style === 'hijab-drape') {
    return (
      <g>
        <path
          d="M60,92 C60,48 84,32 120,32 C156,32 180,48 180,92 C180,132 158,156 120,158 C82,156 60,132 60,92 Z M73,98 C73,130 92,148 120,148 C148,148 167,130 167,98 C167,70 148,56 120,56 C92,56 73,70 73,98 Z"
          fill={hc.base}
          fillRule="evenodd"
        />
        {/* Modest full-coverage chest and neck drape */}
        <path d="M72,144 Q120,162 168,144 L162,192 Q120,208 78,192 Z" fill={hc.base} />
        <path d="M84,158 Q120,178 156,158 L152,182 Q120,200 88,182 Z" fill={hc.shade} opacity="0.6" className="shade-layer" />
        <circle cx="144" cy="158" r="3.6" fill="#F59E0B" />
      </g>
    );
  }
  return null;
});

const CapLayer = React.memo<{ capType?: string }>(({ capType }) => {
  if (!capType || capType === 'none') return null;
  if (capType === 'coral-beanie') {
    return (
      <g className="svg-front-accessory">
        <path d="M64,74 C66,38 90,28 120,28 C150,28 174,38 176,74 Z" fill="#C65A4B" />
        <path d="M84,50 C96,36 134,36 146,48 C128,44 102,44 84,50 Z" fill="#DF7B6C" className="shade-layer" />
        <path d="M60,70 C88,60 152,60 180,70 L178,86 C150,76 90,76 62,86 Z" fill="#D46657" />
        <path d="M62,71 C90,62 150,62 178,71" stroke="#EA8A7B" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      </g>
    );
  }
  if (capType === 'kufi') {
    return (
      <g className="svg-front-accessory">
        <path d="M65,68 C65,36 88,24 120,24 C152,24 175,36 175,68 Z" fill="#F8FAFC" />
        <rect x="63" y="58" width="114" height="12" rx="6" fill="#CBD5E1" />
      </g>
    );
  }
  if (capType === 'baseball') {
    return (
      <g className="svg-front-accessory">
        <path d="M62,68 C64,34 88,24 120,24 C152,24 176,34 178,68 Z" fill="#1E3A8A" />
        <path d="M58,64 Q124,54 196,68 Q156,76 58,70 Z" fill="#1D4ED8" />
      </g>
    );
  }
  if (capType === 'beanie') {
    return (
      <g className="svg-front-accessory">
        <path d="M64,72 C66,36 90,26 120,26 C150,26 174,36 176,72 Z" fill="#B91C1C" />
        <rect x="60" y="62" width="120" height="16" rx="8" fill="#991B1B" />
      </g>
    );
  }
  if (capType === 'scrub-cap') {
    return (
      <g className="svg-front-accessory">
        <path d="M64,70 C66,38 90,28 120,28 C150,28 174,38 176,70 Z" fill="#0D9488" />
        <rect x="62" y="60" width="116" height="12" rx="6" fill="#0F766E" />
      </g>
    );
  }
  if (capType === 'beret') {
    return (
      <g className="svg-front-accessory">
        <path d="M54,62 C50,32 92,20 134,24 C174,28 190,46 178,64 Z" fill="#7F1D1D" />
        <rect x="64" y="60" width="112" height="8" rx="4" fill="#450A0A" />
      </g>
    );
  }
  if (capType === 'turban') {
    return (
      <g className="svg-front-accessory">
        <path d="M56,76 C52,38 82,20 120,20 C158,20 188,38 184,76 C172,62 146,54 120,66 C94,54 68,62 56,76 Z" fill="#D97706" />
        <path d="M60,72 C74,46 106,36 130,54 C104,52 78,62 60,72 Z" fill="#F59E0B" className="shade-layer" />
        <path d="M180,72 C166,46 134,36 110,54 C136,52 162,62 180,72 Z" fill="#B45309" className="shade-layer" />
        <circle cx="120" cy="40" r="5" fill="#FEF3C7" />
        <circle cx="120" cy="40" r="2.6" fill="#E11D48" />
      </g>
    );
  }
  return null;
});

const BeardLayer = React.memo<{ beardType?: string; bc?: string }>(({ beardType, bc }) => {
  if (!beardType || beardType === 'none') return null;
  if (beardType === 'mustache') {
    return (
      <g className="svg-front-accessory">
        <path
          d="M120,120 C108,118 92,121 90,129 C89,134 96,137 106,134 C113,132 117,129 120,129 C123,129 127,132 134,134 C144,137 151,134 150,129 C148,121 132,118 120,120 Z"
          fill={bc || '#CF4D38'}
        />
        <path
          d="M96,125 Q108,120 120,123 Q132,120 144,125"
          stroke="rgba(255,255,255,0.28)"
          strokeWidth="2.5"
          fill="none"
          strokeLinecap="round"
          className="shade-layer"
        />
      </g>
    );
  }
  if (beardType === 'boxed' || beardType === 'elder') {
    const col = beardType === 'elder' ? '#F1F5F9' : bc || '#252C3E';
    return (
      <g className="svg-front-accessory">
        <path
          d="M67,108 C67,138 84,158 120,159 C156,158 173,138 173,108 L165,108 C162,126 150,133 138,129 C131,126 125,124 120,124 C115,124 109,126 102,129 C90,133 78,126 75,108 Z"
          fill={col}
        />
        <path d="M96,123 Q120,116 144,123 Q140,130 120,128 Q100,130 96,123 Z" fill={col} />
      </g>
    );
  }
  if (beardType === 'goatee' || beardType === 'stubble') {
    return (
      <g className="svg-front-accessory" opacity={beardType === 'stubble' ? 0.45 : 1}>
        <path d="M102,123 Q120,118 138,123 Q135,128 120,126 Q105,128 102,123 Z" fill={bc || '#252C3E'} />
        <path d="M100,141 Q120,148 140,141 Q136,154 120,155 Q104,154 100,141 Z" fill={bc || '#252C3E'} />
      </g>
    );
  }
  return null;
});

const GlassesLayer = React.memo<{ glassesType?: string }>(({ glassesType }) => {
  if (!glassesType || glassesType === 'none') return null;
  if (glassesType === 'cyan-tech') {
    return (
      <g className="svg-front-accessory">
        <rect x="72" y="90" width="44" height="29" rx="8" fill="#7CC4F8" fillOpacity="0.56" stroke="#1E2536" strokeWidth="4.2" />
        <rect x="124" y="90" width="44" height="29" rx="8" fill="#7CC4F8" fillOpacity="0.56" stroke="#1E2536" strokeWidth="4.2" />
        <path d="M78,93 L90,93 L82,116 L74,116 Z" fill="#FFFFFF" opacity="0.46" />
        <path d="M130,93 L142,93 L134,116 L126,116 Z" fill="#FFFFFF" opacity="0.46" />
        <line x1="116" y1="103" x2="124" y2="103" stroke="#1E2536" strokeWidth="4.4" />
        <line x1="66" y1="101" x2="72" y2="101" stroke="#1E2536" strokeWidth="4.2" strokeLinecap="round" />
        <line x1="168" y1="101" x2="174" y2="101" stroke="#1E2536" strokeWidth="4.2" strokeLinecap="round" />
      </g>
    );
  }
  if (glassesType === 'round-tort') {
    return (
      <g className="svg-front-accessory">
        <circle cx="95" cy="105" r="17" fill="rgba(254,243,199,0.16)" stroke="#78350F" strokeWidth="3.4" />
        <circle cx="145" cy="105" r="17" fill="rgba(254,243,199,0.16)" stroke="#78350F" strokeWidth="3.4" />
        <path d="M112,104 Q120,99 128,104" fill="none" stroke="#78350F" strokeWidth="3.2" />
      </g>
    );
  }
  if (glassesType === 'wayfarer' || glassesType === 'sunglasses') {
    return (
      <g className="svg-front-accessory">
        <rect x="72" y="90" width="44" height="28" rx="6" fill="#0F172A" stroke="#1E293B" strokeWidth="3.4" />
        <rect x="124" y="90" width="44" height="28" rx="6" fill="#0F172A" stroke="#1E293B" strokeWidth="3.4" />
        <line x1="116" y1="100" x2="124" y2="100" stroke="#1E293B" strokeWidth="4" />
        <path d="M78,94 L90,94 L82,114 L74,114 Z" fill="rgba(255,255,255,0.32)" />
      </g>
    );
  }
  if (glassesType === 'aviator') {
    return (
      <g className="svg-front-accessory">
        <rect x="72" y="90" width="44" height="28" rx="9" fill="rgba(15,23,42,0.82)" stroke="#F59E0B" strokeWidth="2.8" />
        <rect x="124" y="90" width="44" height="28" rx="9" fill="rgba(15,23,42,0.82)" stroke="#F59E0B" strokeWidth="2.8" />
        <line x1="116" y1="98" x2="124" y2="98" stroke="#F59E0B" strokeWidth="2.6" />
      </g>
    );
  }
  if (glassesType === 'cateye') {
    return (
      <g className="svg-front-accessory">
        <path d="M68,88 L114,93 L110,117 L74,115 Z" fill="rgba(244,63,94,0.16)" stroke="#881337" strokeWidth="3.4" />
        <path d="M126,93 L172,88 L166,115 L130,117 Z" fill="rgba(244,63,94,0.16)" stroke="#881337" strokeWidth="3.4" />
        <line x1="114" y1="98" x2="126" y2="98" stroke="#881337" strokeWidth="3.2" />
      </g>
    );
  }
  return null;
});

const MaskLayer = React.memo<{ maskType?: string }>(({ maskType }) => {
  if (!maskType || maskType === 'none') return null;
  const color = maskType === 'surgical' || maskType === 'surgical-blue' ? '#38BDF8' : maskType === 'kn95' ? '#F8FAFC' : '#1E293B';
  const shade = maskType === 'surgical' || maskType === 'surgical-blue' ? '#0284C7' : maskType === 'kn95' ? '#CBD5E1' : '#0F172A';
  return (
    <g className="svg-front-accessory">
      <path d="M68,110 L86,118 M172,110 L154,118" stroke={shade} strokeWidth="2.5" />
      <path d="M82,116 Q120,106 158,116 L152,148 Q120,160 88,148 Z" fill={color} stroke={shade} strokeWidth="2" />
    </g>
  );
});

const TorsoLayer = React.memo<{
  clothesType: string;
  topHex: string;
  topAccent: string;
  skin: { base: string; mid: string; deep: string };
  hasDupatta?: boolean;
  hijabColor?: string;
}>(({ clothesType, topHex, topAccent, skin, hasDupatta, hijabColor }) => {
  const top = topHex || '#252C42';
  const acc = topAccent || '#FFFFFF';
  const type = clothesType || 'crew-collar';

  let collarMarkup: React.ReactNode = null;
  if (type === 'crew-collar') {
    collarMarkup = <path d="M94,146 C96,174 144,174 146,146 L138,145 C136,165 104,165 102,145 Z" fill={acc} />;
  } else if (type === 'polo-sweater') {
    collarMarkup = (
      <>
        {/* Back collar band framing neck */}
        <path d="M96,136 Q120,132 144,136 L142,142 Q120,138 98,142 Z" fill={acc} opacity="0.9" />
        {/* Left folded polo collar flap */}
        <path d="M96,136 C88,144 86,156 94,166 C102,172 116,166 120,154 L119,142 C112,138 104,136 96,136 Z" fill={acc} />
        {/* Right folded polo collar flap */}
        <path d="M144,136 C152,144 154,156 146,166 C138,172 124,166 120,154 L121,142 C128,138 136,136 144,136 Z" fill={acc} />
        {/* Collar seams */}
        <path d="M96,136 C88,144 86,156 94,166 C102,172 116,166 120,154 M144,136 C152,144 154,156 146,166 C138,172 124,166 120,154" stroke="rgba(0,0,0,0.22)" strokeWidth="1.5" fill="none" />
        {/* Placket & Buttons */}
        <rect x="117" y="154" width="6" height="22" rx="2" fill={top} stroke="rgba(0,0,0,0.2)" strokeWidth="1" />
        <circle cx="120" cy="161" r="1.5" fill={acc} />
        <circle cx="120" cy="170" r="1.5" fill={acc} />
      </>
    );
  } else if (type === 'plush-sweater' || type === 'scoop-blouse') {
    collarMarkup = <path d="M96,154 Q120,169 144,154" stroke="rgba(0,0,0,0.22)" strokeWidth="3" fill="none" strokeLinecap="round" />;
  } else if (type === 'hoodie') {
    collarMarkup = (
      <>
        <path d="M84,154 Q120,174 156,154 L148,168 Q120,182 92,168 Z" fill="rgba(0,0,0,0.2)" />
        <line x1="108" y1="168" x2="108" y2="196" stroke={acc} strokeWidth="2.8" strokeLinecap="round" />
        <line x1="132" y1="168" x2="132" y2="196" stroke={acc} strokeWidth="2.8" strokeLinecap="round" />
        <path d="M92,208 L148,208 L154,234 Q120,242 86,234 Z" fill="rgba(0,0,0,0.14)" className="shade-layer" />
      </>
    );
  } else if (type === 'lab-coat') {
    collarMarkup = (
      <>
        <path d="M92,156 L120,238 L148,156 Z" fill={acc} />
        <path d="M80,156 L98,156 L114,238 L84,238 Z" fill="#E2E8F0" />
        <path d="M160,156 L142,156 L126,238 L156,238 Z" fill="#CBD5E1" />
      </>
    );
  } else if (type === 'vneck-tie' || type === 'suit-tie') {
    collarMarkup = (
      <>
        <path d="M90,156 L120,216 L150,156 Z" fill="#FFFFFF" />
        <path d="M115,164 L125,164 L128,212 L120,220 L112,212 Z" fill={acc} />
      </>
    );
  } else if (type === 'tunic-kurta') {
    collarMarkup = (
      <>
        <rect x="92" y="152" width="56" height="10" rx="5" fill={top} />
        <rect x="115" y="158" width="10" height="62" rx="3" fill={acc} />
        <circle cx="120" cy="174" r="2" fill="#334155" />
        <circle cx="120" cy="190" r="2" fill="#334155" />
        {hasDupatta && (
          <path d="M72,158 C92,158 122,190 166,228 L168,242 C118,212 88,184 70,174 Z" fill={acc} opacity="0.9" />
        )}
      </>
    );
  } else if (type === 'vest-shirt' || type === 'open-jacket') {
    collarMarkup = <path d="M96,156 L144,156 L142,240 L98,240 Z" fill={acc} />;
  }

  return (
    <g className="svg-torso-group">
      <path d="M72,232 Q120,250 168,232 L166,246 Q120,260 74,246 Z" fill="rgba(15, 23, 42, 0.25)" className="shade-layer" />
      <path d="M66,166 C68,153 88,150 120,150 C152,150 172,153 174,166 L170,230 C170,242 150,245 120,245 C90,245 70,242 70,230 Z" fill={top} />
      <path d="M70,224 Q120,235 170,224 L169,236 Q120,246 71,236 Z" fill="rgba(0,0,0,0.22)" className="shade-layer" />
      <path d="M73,163 Q96,153 120,153" stroke="rgba(255,255,255,0.18)" strokeWidth="5" fill="none" strokeLinecap="round" className="shade-layer" />
      <g className="svg-neck-group">
        {hijabColor ? (
          <path d="M90,124 L150,124 L146,154 C146,160 94,160 94,154 Z" fill={hijabColor} />
        ) : (
          <>
            {/* Proportionate neck width (36px) neatly tucked under jawline and collar (y=126 to y=142) */}
            <path d="M103,126 L137,126 L135,142 L105,142 Z" fill={skin.base} />
            {/* Soft jaw shadow directly under chin */}
            <path d="M104,130 Q120,138 136,130 L135,135 Q120,143 105,135 Z" fill={skin.mid} opacity="0.6" className="shade-layer" />
          </>
        )}
      </g>
      {collarMarkup}
    </g>
  );
});

const LowerBodyLayer = React.memo<{
  pantsHex: string;
  pantsShade: string;
  shoeHex: string;
  shoeToe: string;
  shoeAccent: string;
}>(({ pantsHex, pantsShade, shoeHex, shoeToe, shoeAccent }) => {
  const pBase = pantsHex || '#C8B59B';
  const pShade = pantsShade || '#AC977B';
  const sBase = shoeHex || '#6E5648';
  const sToe = shoeToe || '#4E3B30';
  const sAcc = shoeAccent || '#F8FAFC';

  return (
    <g className="svg-legs-group">
      <ellipse cx="120" cy="356" rx="62" ry="7.5" fill="rgba(0,0,0,0.24)" className="shade-layer" />
      <path d="M74,232 L120,232 L117,334 L78,334 Z" fill={pBase} />
      <path d="M120,232 L166,232 L162,334 L123,334 Z" fill={pBase} />
      <path d="M74,232 Q120,250 166,232 L165,245 Q120,260 75,245 Z" fill={pShade} className="shade-layer" />
      <path d="M115,260 L120,260 L117,334 L113,334 Z" fill={pShade} className="shade-layer" />
      <path d="M120,260 L125,260 L127,334 L123,334 Z" fill={pShade} className="shade-layer" />
      <path d="M75,246 Q90,255 94,239 M165,246 Q150,255 146,239" stroke={pShade} strokeWidth="2.4" fill="none" strokeLinecap="round" />
      <path d="M120,240 L120,262 Q120,266 113,266" stroke={pShade} strokeWidth="2.3" fill="none" strokeLinecap="round" />
      <path d="M83,315 Q97,319 111,314 M129,314 Q143,319 157,315" stroke={pShade} strokeWidth="2.2" fill="none" strokeLinecap="round" className="shade-layer" />
      <rect x="76" y="325" width="42" height="10" rx="3" fill={pShade} />
      <rect x="122" y="325" width="42" height="10" rx="3" fill={pShade} />
      <g>
        <path d="M62,348 C62,334 78,332 115,332 L116,352 C116,355 62,355 62,348 Z" fill={sBase} />
        <path d="M62,348 C62,338 72,334 84,334 C86,342 84,349 78,352 L62,352 Z" fill={sToe} />
        <rect x="61" y="349" width="56" height="6" rx="3" fill={pShade} />
        <path d="M85,336 L93,341 M90,334 L98,339" stroke={sAcc} strokeWidth="2.3" strokeLinecap="round" />
      </g>
      <g>
        <path d="M178,348 C178,334 162,332 125,332 L124,352 C124,355 178,355 178,348 Z" fill={sBase} />
        <path d="M178,348 C178,338 168,334 156,334 C154,342 156,349 162,352 L178,352 Z" fill={sToe} />
        <rect x="123" y="349" width="56" height="6" rx="3" fill={pShade} />
        <path d="M155,336 L147,341 M150,334 L142,339" stroke={sAcc} strokeWidth="2.3" strokeLinecap="round" />
      </g>
    </g>
  );
});

const HandPosePrimitives = React.memo<{
  pose: string;
  skin: { base: string; mid: string; deep: string; hi?: string };
  side: 'left' | 'right';
}>(({ pose, skin, side }) => {
  const flipX = side === 'left' ? 1 : -1;
  const b = skin.base;
  const m = skin.mid;
  const d = skin.deep;
  const hi = skin.hi || '#FFE0C4';

  if (pose === 'steeple-half') {
    return (
      <g transform={`scale(${flipX}, 1)`}>
        <path d="M-16,6 C-14,-6 -4,-13 8,-10 C15,-8 16,4 10,11 C2,15 -12,14 -16,6 Z" fill={b} />
        <path d="M-14,8 C-4,13 6,12 12,8" stroke={m} strokeWidth="2" fill="none" strokeLinecap="round" />
        <path d="M-2,-10 L22,-25 C25,-27 28,-23 24,-19 L2,-4 Z" fill={b} />
        <path d="M0,-5 L24,-19 C27,-21 29,-17 26,-13 L3,1 Z" fill={b} />
        <path d="M2,0 L23,-12 C26,-14 28,-10 25,-6 L4,6 Z" fill={b} />
        <path d="M4,5 L21,-5 C24,-7 25,-3 22,0 L5,9 Z" fill={b} />
        <path d="M2,-4 L23,-19 M3,1 L24,-12 M5,6 L21,-5" stroke={d} strokeWidth="1.6" strokeLinecap="round" />
        <path d="M-4,5 L22,5 C26,5 26,11 22,11 L-4,11 C-8,11 -8,5 -4,5 Z" fill={b} />
        <path d="M-3,5 L21,5" stroke={d} strokeWidth="1.5" strokeLinecap="round" />
      </g>
    );
  }

  if (pose === 'chest-empathy') {
    const inRot = side === 'left' ? 34 : -34;
    return (
      <g transform={`rotate(${inRot}) scale(${flipX}, 1)`}>
        <path d="M-11,11 C-13,1 -11,-10 0,-11 C11,-10 13,1 11,11 C7,16 -7,16 -11,11 Z" fill={b} />
        <path d="M-10,2 C-17,-3 -17,-13 -12,-15 C-8,-16 -6,-9 -8,-2 Z" fill={b} />
        <path d="M-9,-8 L-8,-24 C-8,-27 -4,-27 -4,-24 L-4,-8 Z" fill={b} />
        <path d="M-4,-9 L-3,-27 C-3,-30 1.5,-30 1.5,-27 L1.5,-9 Z" fill={b} />
        <path d="M1.5,-9 L2,-25 C2,-28 6,-28 6,-25 L6,-8 Z" fill={b} />
        <path d="M6,-7 L6.5,-20 C6.5,-23 10,-23 10,-20 L10,-6 Z" fill={b} />
        <path d="M-4,-22 L-4,-9 M1.5,-23 L1.5,-9 M6,-18 L6,-7" stroke={d} strokeWidth="1.5" strokeLinecap="round" />
        <path d="M-8,10 Q0,14 8,10" stroke={m} strokeWidth="1.8" fill="none" strokeLinecap="round" />
      </g>
    );
  }

  if (pose === 'relaxed-side') {
    return (
      <g transform={`scale(${flipX}, 1)`}>
        <rect x="-8" y="-14" width="16" height="12" rx="4" fill={b} />
        <path d="M-8,-8 Q0,-4 8,-8" stroke={m} strokeWidth="2" fill="none" />
        <path d="M-11,-5 C-12,4 -11,11 0,12 C10,11 12,4 10,-5 Z" fill={b} />
        <path d="M8,-1 C15,2 17,11 13,14 C10,16 7,11 6,4 Z" fill={b} />
        <path d="M8,3 Q11,8 12,11" stroke={m} strokeWidth="1.3" fill="none" strokeLinecap="round" />
        <path d="M4,7 L4,23 C4,27 8.5,27 8.5,23 L8.5,7 Z" fill={b} />
        <path d="M-1,8 L-1,25 C-1,29 3.8,29 3.8,25 L3.8,8 Z" fill={b} />
        <path d="M-6,7 L-6,23 C-6,27 -1.2,27 -1.2,23 L-1.2,7 Z" fill={b} />
        <path d="M-10.5,5 L-10.5,19 C-10.5,22 -6.2,22 -6.2,19 L-6.2,5 Z" fill={b} />
        <path d="M3.8,10 L3.8,22 M-1.2,10 L-1.2,22 M-6.2,9 L-6.2,18" stroke={d} strokeWidth="1.4" strokeLinecap="round" />
      </g>
    );
  }

  let inner: React.ReactNode;
  switch (pose) {
    case 'point-up':
    case 'count-1':
      inner = (
        <g transform="rotate(14)">
          <rect x="-7.5" y="6" width="15" height="11" rx="4" fill={b} />
          <path d="M-12,10 C-14,-2 -10,-13 2,-13 C12,-13 15,-2 12,10 C8,16 -8,16 -12,10 Z" fill={b} />
          <path d="M-10,-8 L-10,-32 C-10,-37 -2,-37 -2,-32 L-2,-8 Z" fill={b} />
          <path d="M-7.5,-31 L-7.5,-14" stroke={hi} strokeWidth="2" strokeLinecap="round" opacity="0.6" />
          <rect x="-2.5" y="-17" width="6.2" height="13" rx="3.1" fill={b} stroke={d} strokeWidth="1.2" />
          <rect x="3.2" y="-15" width="5.8" height="12" rx="2.9" fill={b} stroke={d} strokeWidth="1.2" />
          <rect x="8.5" y="-12.5" width="5.4" height="11" rx="2.7" fill={b} stroke={d} strokeWidth="1.2" />
          <path d="M-2,-4 Q6,1 12,-2" stroke={d} strokeWidth="1.8" fill="none" strokeLinecap="round" />
          <path d="M-12,2 C-13,-6 -4,-11 3,-7 C6,-5 5,1 -1,3 C-6,5 -11,5 -12,2 Z" fill={b} stroke={d} strokeWidth="1.2" />
        </g>
      );
      break;
    case 'count-2':
      inner = (
        <g transform="rotate(8)">
          <rect x="-7.5" y="6" width="15" height="11" rx="4" fill={b} />
          <path d="M-12,10 C-14,-2 -10,-13 2,-13 C12,-13 15,-2 12,10 C8,16 -8,16 -12,10 Z" fill={b} />
          <path d="M-10,-8 L-14,-32 C-14,-37 -6,-37 -5,-32 L-2,-8 Z" fill={b} />
          <path d="M-2,-9 L3,-33 C4,-38 11,-37 10,-32 L5,-8 Z" fill={b} />
          <path d="M-2,-10 L0,-24" stroke={d} strokeWidth="1.5" strokeLinecap="round" />
          <rect x="4" y="-15" width="5.8" height="12" rx="2.9" fill={b} stroke={d} strokeWidth="1.2" />
          <rect x="9" y="-12.5" width="5.4" height="11" rx="2.7" fill={b} stroke={d} strokeWidth="1.2" />
          <path d="M-12,2 C-12,-6 -3,-10 4,-6 C6,-4 5,1 -1,3 Z" fill={b} stroke={d} strokeWidth="1.2" />
        </g>
      );
      break;
    case 'salute-2':
      inner = (
        <g>
          <rect x="-7.5" y="6" width="15" height="11" rx="4" fill={b} />
          <path d="M-12,10 C-14,-2 -10,-13 2,-13 C12,-13 15,-2 12,10 C8,16 -8,16 -12,10 Z" fill={b} />
          <path d="M-9.5,-8 L-9.5,-32 C-9.5,-36 -3,-36 -3,-32 L-3,-8 Z" fill={b} />
          <path d="M-3,-9 L-3,-34 C-3,-38 3.5,-38 3.5,-34 L3.5,-9 Z" fill={b} />
          <line x1="-3" y1="-30" x2="-3" y2="-10" stroke={d} strokeWidth="1.4" strokeLinecap="round" />
          <rect x="3.5" y="-15" width="5.6" height="12" rx="2.8" fill={b} stroke={d} strokeWidth="1.2" />
          <rect x="8.8" y="-12.5" width="5.2" height="11" rx="2.6" fill={b} stroke={d} strokeWidth="1.2" />
          <path d="M-12,2 C-12,-6 -3,-10 4,-6 C6,-4 5,1 -1,3 Z" fill={b} stroke={d} strokeWidth="1.2" />
        </g>
      );
      break;
    case 'count-3':
      inner = (
        <g>
          <rect x="-7.5" y="6" width="15" height="11" rx="4" fill={b} />
          <path d="M-12,10 C-14,-2 -10,-13 2,-13 C12,-13 15,-2 12,10 C8,16 -8,16 -12,10 Z" fill={b} />
          <path d="M-11,-8 L-15,-31 C-15,-35 -8,-35 -7,-31 L-4,-8 Z" fill={b} />
          <path d="M-4,-9 L-4,-34 C-4,-38 3,-38 3,-34 L3,-9 Z" fill={b} />
          <path d="M3,-8 L7,-31 C8,-35 14,-34 13,-30 L9,-8 Z" fill={b} />
          <rect x="8.5" y="-13" width="5.4" height="11" rx="2.7" fill={b} stroke={d} strokeWidth="1.2" />
          <path d="M-11,2 C-10,-5 -1,-8 6,-4 C8,-2 6,3 0,4 Z" fill={b} stroke={d} strokeWidth="1.2" />
        </g>
      );
      break;
    case 'thumbs-up':
      inner = (
        <g>
          <rect x="-10" y="-10" width="19" height="20" rx="8" fill={b} />
          <path d="M-9,-6 L-12,-26 C-12,-31 -4,-31 -3,-26 L-1,-8 Z" fill={b} />
          <rect x="-2" y="-10" width="14" height="5.4" rx="2.7" fill={b} stroke={d} strokeWidth="1.1" />
          <rect x="-2" y="-4.8" width="14.5" height="5.4" rx="2.7" fill={b} stroke={d} strokeWidth="1.1" />
          <rect x="-2" y="0.4" width="13.5" height="5.2" rx="2.6" fill={b} stroke={d} strokeWidth="1.1" />
          <rect x="-2" y="5.4" width="12" height="4.8" rx="2.4" fill={b} stroke={d} strokeWidth="1.1" />
        </g>
      );
      break;
    case 'thumbs-down':
      inner = (
        <g transform="scale(1, -1)">
          <rect x="-10" y="-10" width="19" height="20" rx="8" fill={b} />
          <path d="M-9,-6 L-12,-26 C-12,-31 -4,-31 -3,-26 L-1,-8 Z" fill={b} />
          <rect x="-2" y="-10" width="14" height="5.4" rx="2.7" fill={b} stroke={d} strokeWidth="1.1" />
          <rect x="-2" y="-4.8" width="14.5" height="5.4" rx="2.7" fill={b} stroke={d} strokeWidth="1.1" />
          <rect x="-2" y="0.4" width="13.5" height="5.2" rx="2.6" fill={b} stroke={d} strokeWidth="1.1" />
          <rect x="-2" y="5.4" width="12" height="4.8" rx="2.4" fill={b} stroke={d} strokeWidth="1.1" />
        </g>
      );
      break;
    case 'rock-on':
      inner = (
        <g>
          <rect x="-7.5" y="6" width="15" height="11" rx="4" fill={b} />
          <path d="M-12,10 C-14,-2 -10,-13 2,-13 C12,-13 15,-2 12,10 C8,16 -8,16 -12,10 Z" fill={b} />
          <path d="M-10,-8 L-10,-32 C-10,-36 -3.5,-36 -3.5,-32 L-3.5,-8 Z" fill={b} />
          <rect x="-3" y="-15" width="5.8" height="12" rx="2.9" fill={b} stroke={d} strokeWidth="1.2" />
          <rect x="2.8" y="-15" width="5.8" height="12" rx="2.9" fill={b} stroke={d} strokeWidth="1.2" />
          <path d="M8.5,-8 L8.5,-30 C8.5,-34 14.5,-34 14.5,-30 L14.5,-8 Z" fill={b} />
          <path d="M-12,2 C-12,-5 -2,-9 5,-5 C7,-3 5,2 -1,3 Z" fill={b} stroke={d} strokeWidth="1.2" />
        </g>
      );
      break;
    case 'ily-horns':
      inner = (
        <g>
          <rect x="-7.5" y="6" width="15" height="11" rx="4" fill={b} />
          <path d="M-12,10 C-14,-2 -10,-13 2,-13 C12,-13 15,-2 12,10 C8,16 -8,16 -12,10 Z" fill={b} />
          <path d="M-10,0 L-22,-11 C-25,-14 -21,-19 -17,-16 L-7,-6 Z" fill={b} />
          <path d="M-10,-8 L-10,-32 C-10,-36 -3.5,-36 -3.5,-32 L-3.5,-8 Z" fill={b} />
          <rect x="-3" y="-15" width="5.8" height="12" rx="2.9" fill={b} stroke={d} strokeWidth="1.2" />
          <rect x="2.8" y="-15" width="5.8" height="12" rx="2.9" fill={b} stroke={d} strokeWidth="1.2" />
          <path d="M8.5,-8 L8.5,-30 C8.5,-34 14.5,-34 14.5,-30 L14.5,-8 Z" fill={b} />
        </g>
      );
      break;
    case 'precision-pinch':
    case 'plucked-ok':
    case 'plucked-pinch':
      inner = (
        <g>
          <rect x="-7.5" y="6" width="15" height="11" rx="4" fill={b} />
          <path d="M-11,10 C-13,-1 -9,-12 2,-12 C12,-12 14,-1 11,10 Z" fill={b} />
          <path d="M-9,-4 C-16,-16 -4,-26 1,-15 C3,-9 -4,-3 -9,-4 Z" fill="none" stroke={b} strokeWidth="6" strokeLinecap="round" />
          <path d="M-9,-4 C-16,-16 -4,-26 1,-15" fill="none" stroke={d} strokeWidth="1.2" />
          <path d="M0,-10 L2,-32 C2,-36 8,-36 8,-32 L6,-10 Z" fill={b} />
          <path d="M5,-9 L10,-29 C11,-33 16,-32 15,-28 L10,-8 Z" fill={b} />
          <path d="M9,-6 L15,-23 C16,-26 20,-25 19,-21 L12,-5 Z" fill={b} />
          <path d="M5,-10 L7,-24 M9,-8 L13,-20" stroke={d} strokeWidth="1.4" strokeLinecap="round" />
        </g>
      );
      break;
    case 'l-frame':
      inner = (
        <g>
          <rect x="-7.5" y="6" width="15" height="11" rx="4" fill={b} />
          <path d="M-12,10 C-14,-2 -10,-13 2,-13 C12,-13 15,-2 12,10 C8,16 -8,16 -12,10 Z" fill={b} />
          <path d="M-10,-8 L-10,-32 C-10,-37 -2,-37 -2,-32 L-2,-8 Z" fill={b} />
          <path d="M-9,-2 L-24,-10 C-28,-12 -25,-18 -20,-16 L-7,-8 Z" fill={b} />
          <rect x="-2" y="-16" width="5.8" height="12" rx="2.9" fill={b} stroke={d} strokeWidth="1.2" />
          <rect x="3.5" y="-15" width="5.6" height="11" rx="2.8" fill={b} stroke={d} strokeWidth="1.2" />
          <rect x="8.8" y="-12.5" width="5.2" height="10" rx="2.6" fill={b} stroke={d} strokeWidth="1.2" />
        </g>
      );
      break;
    case 'finger-gun':
      inner = (
        <g>
          <rect x="-8" y="-12" width="20" height="20" rx="8" fill={b} />
          <path d="M2,-10 L6,-25 C7,-29 13,-27 12,-22 L8,-9 Z" fill={b} />
          <rect x="-29" y="-11" width="24" height="6" rx="3" fill={b} />
          <rect x="-27" y="-4.8" width="22" height="6" rx="3" fill={b} stroke={d} strokeWidth="1.1" />
          <rect x="-13" y="1.2" width="11" height="5.5" rx="2.7" fill={m} stroke={d} strokeWidth="1.1" />
        </g>
      );
      break;
    case 'point-right':
      inner = (
        <g>
          <rect x="-10" y="-12" width="20" height="20" rx="8" fill={b} />
          <rect x="5" y="-11" width="24" height="6.5" rx="3.2" fill={b} />
          <rect x="3" y="-4.2" width="11" height="5.5" rx="2.7" fill={b} stroke={d} strokeWidth="1.1" />
          <rect x="2" y="1.5" width="10" height="5.2" rx="2.6" fill={m} stroke={d} strokeWidth="1.1" />
          <path d="M-4,-11 L6,-20 C9,-22 13,-18 9,-14 L2,-9 Z" fill={b} />
        </g>
      );
      break;
    case 'point-left':
    case 'point-down-left':
      inner = (
        <g>
          <rect x="-10" y="-12" width="20" height="20" rx="8" fill={b} />
          <rect x="-29" y="-11" width="24" height="6.5" rx="3.2" fill={b} />
          <rect x="-14" y="-4.2" width="11" height="5.5" rx="2.7" fill={b} stroke={d} strokeWidth="1.1" />
          <rect x="-13" y="1.5" width="10" height="5.2" rx="2.6" fill={m} stroke={d} strokeWidth="1.1" />
        </g>
      );
      break;
    case 'offering-palm':
    case 'open-palms':
      inner = (
        <g>
          <path d="M-12,-3 C-22,-5 -28,-11 -26,-16 C-24,-19 -14,-13 -4,-11 L11,-11 C15,-11 17,-4 12,2 C6,6 -4,5 -12,-3 Z" fill={b} />
          <path d="M-6,-11 C-2,-17 6,-19 10,-16 C12,-14 6,-9 0,-9 Z" fill={m} />
          <path d="M-18,-11 L-6,-8 M-15,-14 L-4,-10" stroke={d} strokeWidth="1.3" strokeLinecap="round" />
        </g>
      );
      break;
    default:
      inner = (
        <g>
          <rect x="-7.5" y="6" width="15" height="11" rx="4" fill={b} />
          <path d="M-11,9 C-14,-1 -11,-11 0,-12 C11,-11 14,-1 11,9 C7,15 -7,15 -11,9 Z" fill={b} />
          <path d="M-7,2 Q0,7 7,2" stroke={m} strokeWidth="1.6" fill="none" strokeLinecap="round" />
          <path d="M-10,0 L-20,-11 C-23,-14 -19,-19 -15,-16 L-6,-6 Z" fill={b} />
          <path d="M-10,-8 L-12,-28 C-12,-32 -6,-32 -6,-28 L-4.5,-8 Z" fill={b} />
          <path d="M-4,-9 L-4,-31 C-4,-35 2,-35 2,-31 L2,-9 Z" fill={b} />
          <path d="M2,-9 L4,-29 C4,-33 10,-33 9.5,-29 L7,-8 Z" fill={b} />
          <path d="M7,-7 L11,-23 C11.5,-26 16,-25 15,-21 L11,-5 Z" fill={b} />
          <path d="M-4.5,-22 L-4.5,-9 M2,-22 L2,-9 M7.2,-19 L7,-7" stroke={d} strokeWidth="1.4" strokeLinecap="round" />
        </g>
      );
  }

  return <g transform={`scale(${flipX}, 1)`}>{inner}</g>;
});

/**
 * 60fps Event-Driven Smooth Bezier Limb Tween Engine (320ms cubic ease-out, zero React re-renders during tween)
 */
const ArticulatedArmsLayer = React.memo<{
  gesture: string;
  clothesType: string;
  topHex: string;
  skin: { base: string; mid: string; deep: string; hi?: string };
  charId: number;
  instantPose?: boolean;
  limbOverride?: { L: LimbConfig; R: LimbConfig };
}>(({ gesture, clothesType, topHex, skin, charId, instantPose, limbOverride }) => {
  const sleeve = clothesType === 'lab-coat' ? '#F8FAFC' : topHex || '#252C42';
  const targetCfg = limbOverride || getGestureLimbConfig(gesture);
  const prevCfgRef = useRef<{ L: LimbConfig; R: LimbConfig }>(targetCfg);
  const rafRef = useRef<number | null>(null);

  const shLRef = useRef<SVGPathElement | null>(null);
  const mnLRef = useRef<SVGPathElement | null>(null);
  const hiLRef = useRef<SVGPathElement | null>(null);
  const hdLRef = useRef<SVGGElement | null>(null);

  const shRRef = useRef<SVGPathElement | null>(null);
  const mnRRef = useRef<SVGPathElement | null>(null);
  const hiRRef = useRef<SVGPathElement | null>(null);
  const hdRRef = useRef<SVGGElement | null>(null);

  useEffect(() => {
    const applyLimbFrame = (L: LimbConfig, R: LimbConfig) => {
      const cL = computeCuffEnd(L.ex, L.ey, L.wx, L.wy, 20);
      const cR = computeCuffEnd(R.ex, R.ey, R.wx, R.wy, 20);

      shLRef.current?.setAttribute('d', `M 73 177 Q ${L.ex.toFixed(1)} ${(L.ey + 4).toFixed(1)} ${cL.x.toFixed(1)} ${(cL.y + 3).toFixed(1)}`);
      mnLRef.current?.setAttribute('d', `M 73 174 Q ${L.ex.toFixed(1)} ${L.ey.toFixed(1)} ${cL.x.toFixed(1)} ${cL.y.toFixed(1)}`);
      hiLRef.current?.setAttribute('d', `M 71 170 Q ${(L.ex - 2).toFixed(1)} ${(L.ey - 4).toFixed(1)} ${(cL.x - 2).toFixed(1)} ${(cL.y - 3).toFixed(1)}`);
      hdLRef.current?.setAttribute('transform', `translate(${L.wx.toFixed(1)}, ${L.wy.toFixed(1)}) rotate(${L.rot.toFixed(1)}) scale(${L.scale || 0.94})`);

      shRRef.current?.setAttribute('d', `M 167 177 Q ${R.ex.toFixed(1)} ${(R.ey + 4).toFixed(1)} ${cR.x.toFixed(1)} ${(cR.y + 3).toFixed(1)}`);
      mnRRef.current?.setAttribute('d', `M 167 174 Q ${R.ex.toFixed(1)} ${R.ey.toFixed(1)} ${cR.x.toFixed(1)} ${cR.y.toFixed(1)}`);
      hiRRef.current?.setAttribute('d', `M 169 170 Q ${(R.ex + 2).toFixed(1)} ${(R.ey - 4).toFixed(1)} ${(cR.x + 2).toFixed(1)} ${(cR.y - 3).toFixed(1)}`);
      hdRRef.current?.setAttribute('transform', `translate(${R.wx.toFixed(1)}, ${R.wy.toFixed(1)}) rotate(${R.rot.toFixed(1)}) scale(${R.scale || 0.94})`);
    };

    // Deterministic timeline / FFmpeg render mode: bypass RAF tween so JSX owns exact coordinates synchronously
    if (limbOverride) {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      applyLimbFrame(limbOverride.L, limbOverride.R);
      prevCfgRef.current = limbOverride;
      return;
    }

    const fromCfg = prevCfgRef.current;
    const toCfg = getGestureLimbConfig(gesture);

    if (instantPose) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      applyLimbFrame(toCfg.L, toCfg.R);
      prevCfgRef.current = toCfg;
      return;
    }

    if (
      fromCfg.L.ex === toCfg.L.ex &&
      fromCfg.L.wx === toCfg.L.wx &&
      fromCfg.R.ex === toCfg.R.ex &&
      fromCfg.R.wx === toCfg.R.wx &&
      fromCfg.R.rot === toCfg.R.rot
    ) {
      applyLimbFrame(toCfg.L, toCfg.R);
      prevCfgRef.current = toCfg;
      return;
    }

    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    const startTime = performance.now();
    const duration = 320;

    const tick = (now: number) => {
      const rawT = Math.min(1, (now - startTime) / duration);
      const t = 1 - Math.pow(1 - rawT, 3);
      const lerp = (a: number, b: number) => a + (b - a) * t;

      const curL: LimbConfig = {
        ex: lerp(fromCfg.L.ex, toCfg.L.ex),
        ey: lerp(fromCfg.L.ey, toCfg.L.ey),
        wx: lerp(fromCfg.L.wx, toCfg.L.wx),
        wy: lerp(fromCfg.L.wy, toCfg.L.wy),
        rot: lerp(fromCfg.L.rot, toCfg.L.rot),
        scale: lerp(fromCfg.L.scale || 0.94, toCfg.L.scale || 0.94),
        pose: toCfg.L.pose,
      };
      const curR: LimbConfig = {
        ex: lerp(fromCfg.R.ex, toCfg.R.ex),
        ey: lerp(fromCfg.R.ey, toCfg.R.ey),
        wx: lerp(fromCfg.R.wx, toCfg.R.wx),
        wy: lerp(fromCfg.R.wy, toCfg.R.wy),
        rot: lerp(fromCfg.R.rot, toCfg.R.rot),
        scale: lerp(fromCfg.R.scale || 0.94, toCfg.R.scale || 0.94),
        pose: toCfg.R.pose,
      };

      applyLimbFrame(curL, curR);
      prevCfgRef.current = rawT >= 1 ? toCfg : { L: curL, R: curR };

      if (rawT < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        rafRef.current = null;
        prevCfgRef.current = toCfg;
      }
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [gesture, instantPose, limbOverride]);

  const renderCfg = targetCfg;
  const L = renderCfg.L;
  const R = renderCfg.R;
  const cL = computeCuffEnd(L.ex, L.ey, L.wx, L.wy, 20);
  const cR = computeCuffEnd(R.ex, R.ey, R.wx, R.wy, 20);

  return (
    <g>
      <g className="svg-arm-left" data-char-arm-l={charId}>
        <path
          ref={shLRef}
          className="arm-shadow-l shade-layer"
          d={`M 73 177 Q ${L.ex.toFixed(1)} ${(L.ey + 4).toFixed(1)} ${cL.x.toFixed(1)} ${(cL.y + 3).toFixed(1)}`}
          fill="none"
          stroke="rgba(15,23,42,0.20)"
          strokeWidth="27"
          strokeLinecap="round"
        />
        <path
          ref={mnLRef}
          className="arm-main-l"
          d={`M 73 174 Q ${L.ex.toFixed(1)} ${L.ey.toFixed(1)} ${cL.x.toFixed(1)} ${cL.y.toFixed(1)}`}
          fill="none"
          stroke={sleeve}
          strokeWidth="25"
          strokeLinecap="round"
        />
        <path
          ref={hiLRef}
          className="arm-hi-l shade-layer"
          d={`M 71 170 Q ${(L.ex - 2).toFixed(1)} ${(L.ey - 4).toFixed(1)} ${(cL.x - 2).toFixed(1)} ${(cL.y - 3).toFixed(1)}`}
          fill="none"
          stroke="rgba(255,255,255,0.16)"
          strokeWidth="7"
          strokeLinecap="round"
        />
        <g ref={hdLRef} className="hand-group-l" transform={`translate(${L.wx.toFixed(1)}, ${L.wy.toFixed(1)}) rotate(${L.rot.toFixed(1)}) scale(${L.scale || 0.94})`}>
          <HandPosePrimitives pose={targetCfg.L.pose} skin={skin} side="left" />
        </g>
      </g>

      <g className="svg-arm-right" data-char-arm-r={charId}>
        <path
          ref={shRRef}
          className="arm-shadow-r shade-layer"
          d={`M 167 177 Q ${R.ex.toFixed(1)} ${(R.ey + 4).toFixed(1)} ${cR.x.toFixed(1)} ${(cR.y + 3).toFixed(1)}`}
          fill="none"
          stroke="rgba(15,23,42,0.22)"
          strokeWidth="27"
          strokeLinecap="round"
        />
        <path
          ref={mnRRef}
          className="arm-main-r"
          d={`M 167 174 Q ${R.ex.toFixed(1)} ${R.ey.toFixed(1)} ${cR.x.toFixed(1)} ${cR.y.toFixed(1)}`}
          fill="none"
          stroke={sleeve}
          strokeWidth="25"
          strokeLinecap="round"
        />
        <path
          ref={hiRRef}
          className="arm-hi-r shade-layer"
          d={`M 169 170 Q ${(R.ex + 2).toFixed(1)} ${(R.ey - 4).toFixed(1)} ${(cR.x + 2).toFixed(1)} ${(cR.y - 3).toFixed(1)}`}
          fill="none"
          stroke="rgba(255,255,255,0.12)"
          strokeWidth="7"
          strokeLinecap="round"
        />
        <g ref={hdRRef} className="hand-group-r" transform={`translate(${R.wx.toFixed(1)}, ${R.wy.toFixed(1)}) rotate(${R.rot.toFixed(1)}) scale(${R.scale || 0.94})`}>
          <g className={gesture === 'wave' && !limbOverride ? 'waving-hand-wrist' : ''}>
            <HandPosePrimitives pose={targetCfg.R.pose} skin={skin} side="right" />
          </g>
        </g>
      </g>
    </g>
  );
});

const EyesAndBrowsLayer = React.memo<{
  charObj: CharacterConfig;
  hcBase: string;
  eyeSprite: string;
  emotion?: EmotionPreset;
  isBlinking?: boolean;
}>(({ charObj, hcBase, eyeSprite, emotion, isBlinking }) => {
  const irisL = charObj.irisLeftColor || charObj.irisColor || '#1E222D';
  const irisR = charObj.irisColor || '#1E222D';
  const browColor = hcBase === '#EB8B35' || hcBase === '#EAB344' || hcBase === '#F1F5F9' ? '#3A2E2B' : hcBase;

  const emotionMeta = EMOTIONS_LIST.find((e) => e.id === emotion);
  let browL = { dy: emotionMeta?.browL.dy ?? 0, rot: emotionMeta?.browL.rot ?? 0 };
  let browR = { dy: emotionMeta?.browR.dy ?? 0, rot: emotionMeta?.browR.rot ?? 0 };

  if (eyeSprite === 'empathetic') {
    browL = { dy: -3, rot: -13 };
    browR = { dy: -3, rot: 13 };
  } else if (eyeSprite === 'shocked') {
    browL = { dy: -6, rot: -8 };
    browR = { dy: -6, rot: 8 };
  } else if (eyeSprite === 'focused') {
    browL = { dy: 4, rot: 8 };
    browR = { dy: 4, rot: -8 };
  } else if (eyeSprite === 'curious') {
    browL = { dy: -5, rot: -6 };
    browR = { dy: 2, rot: 6 };
  }

  const brows = (
    <>
      <path
        d="M84,90 Q97,85 108,89"
        fill="none"
        stroke={browColor}
        strokeWidth="6.2"
        strokeLinecap="round"
        transform={`translate(0, ${browL.dy}) rotate(${browL.rot} 96 88)`}
      />
      <path
        d="M132,89 Q143,85 156,90"
        fill="none"
        stroke={browColor}
        strokeWidth="6.2"
        strokeLinecap="round"
        transform={`translate(0, ${browR.dy}) rotate(${browR.rot} 144 88)`}
      />
    </>
  );

  if (eyeSprite === 'happy') {
    return (
      <g>
        {brows}
        <path d="M87,106 Q97,95 107,106" fill="none" stroke="#1E222D" strokeWidth="4.2" strokeLinecap="round" />
        <path d="M133,106 Q143,95 153,106" fill="none" stroke="#1E222D" strokeWidth="4.2" strokeLinecap="round" />
      </g>
    );
  }
  if (eyeSprite === 'closed') {
    return (
      <g>
        {brows}
        <path d="M87,106 Q97,113 107,106" fill="none" stroke="#1E222D" strokeWidth="4.0" strokeLinecap="round" />
        <path d="M133,106 Q143,113 153,106" fill="none" stroke="#1E222D" strokeWidth="4.0" strokeLinecap="round" />
      </g>
    );
  }

  const pupilR = eyeSprite === 'shocked' ? 5.4 : 7.4;
  const irisShiftX = eyeSprite === 'curious' ? 3.2 : 0;
  const ry = charObj.almondEyes ? 9.0 : eyeSprite === 'focused' ? 7.8 : 10.2;

  return (
    <g>
      {brows}
      <ellipse cx="97" cy="106" rx="10.2" ry={ry} fill="#FFFFFF" />
      <circle cx={97.5 + irisShiftX} cy="106" r={pupilR} fill={irisL} />
      <circle cx={94.8 + irisShiftX} cy="103.2" r="2.9" fill="#FFFFFF" />
      <circle cx={100.2 + irisShiftX} cy="108.8" r="1.3" fill="#FFFFFF" />
      <path
        d={`M86.5,${106 - ry * 0.55} Q97,${106 - ry * 1.16} 107.5,${106 - ry * 0.55}`}
        stroke="#1E222D"
        strokeWidth="3.2"
        strokeLinecap="round"
        fill="none"
      />

      {eyeSprite === 'wink' ? (
        <path d="M133,106 Q143,96 153,106" fill="none" stroke="#1E222D" strokeWidth="4.2" strokeLinecap="round" />
      ) : (
        <>
          <ellipse cx="143" cy="106" rx="10.2" ry={ry} fill="#FFFFFF" />
          <circle cx={142.5 + irisShiftX} cy="106" r={pupilR} fill={irisR} />
          <circle cx={139.8 + irisShiftX} cy="103.2" r="2.9" fill="#FFFFFF" />
          <circle cx={145.2 + irisShiftX} cy="108.8" r="1.3" fill="#FFFFFF" />
          <path
            d={`M132.5,${106 - ry * 0.55} Q143,${106 - ry * 1.16} 153.5,${106 - ry * 0.55}`}
            stroke="#1E222D"
            strokeWidth="3.2"
            strokeLinecap="round"
            fill="none"
          />
        </>
      )}

      {charObj.hasLashes && (
        <>
          <path d="M86,101 L81,97 M89,98 L85,94" stroke="#1E222D" strokeWidth="2.6" strokeLinecap="round" />
          <path d="M154,101 L159,97 M151,98 L155,94" stroke="#1E222D" strokeWidth="2.6" strokeLinecap="round" />
        </>
      )}

      <path
        d="M90,117 Q97,120 104,117 M136,117 Q143,120 150,117"
        stroke={charObj.skin.mid}
        strokeWidth="1.6"
        fill="none"
        strokeLinecap="round"
        opacity="0.7"
      />

      {(emotion === 'warm' || eyeSprite === 'friendly') && (
        <g className="shade-layer" opacity="0.28">
          <ellipse cx="83" cy="121" rx="7" ry="4" fill="#F43F5E" />
          <ellipse cx="157" cy="121" rx="7" ry="4" fill="#F43F5E" />
        </g>
      )}

      {isBlinking && (
        <g className="svg-eyelid-closed" data-blink-closed="true">
          <ellipse cx="97" cy="106" rx="11" ry="11" fill={charObj.skin.base} />
          <path d="M86,106 Q97,113 108,106" fill="none" stroke="#1E222D" strokeWidth="3.8" strokeLinecap="round" />
          <ellipse cx="143" cy="106" rx="11" ry="11" fill={charObj.skin.base} />
          <path d="M132,106 Q143,113 154,106" fill="none" stroke="#1E222D" strokeWidth="3.8" strokeLinecap="round" />
        </g>
      )}
    </g>
  );
});

const MouthShapeLayer = React.memo<{
  mouthSprite: string;
  skin: { base: string; mid: string; deep: string };
}>(({ mouthSprite, skin }) => {
  if (mouthSprite === 'ee') {
    return (
      <g>
        <path d="M106,131 Q120,130 134,131 C133,138 107,138 106,131 Z" fill="#4A151D" stroke="#261D1A" strokeWidth="2.4" strokeLinejoin="round" />
        <rect x="108" y="131" width="24" height="4.2" rx="1.5" fill="#FFFFFF" />
        <line x1="109" y1="135" x2="131" y2="135" stroke="#E2E8F0" strokeWidth="1" />
        <path d="M112,141 Q120,143 128,141" fill="none" stroke={skin.mid} strokeWidth="2.0" strokeLinecap="round" />
      </g>
    );
  }
  if (mouthSprite === 'th') {
    return (
      <g>
        <path d="M106,130 Q120,129 134,130 C133,141 107,141 106,130 Z" fill="#4A151D" stroke="#261D1A" strokeWidth="2.4" strokeLinejoin="round" />
        <rect x="110" y="130" width="20" height="3.5" rx="1" fill="#FFFFFF" />
        <ellipse cx="120" cy="135.5" rx="6.5" ry="3.4" fill="#E86A6A" />
        <path d="M112,143 Q120,145 128,143" fill="none" stroke={skin.mid} strokeWidth="2.0" strokeLinecap="round" />
      </g>
    );
  }
  if (mouthSprite === 'l') {
    return (
      <g>
        <path d="M106,130 Q120,129 134,130 C133,141 107,141 106,130 Z" fill="#4A151D" stroke="#261D1A" strokeWidth="2.4" strokeLinejoin="round" />
        <ellipse cx="120" cy="134" rx="5.5" ry="4.2" fill="#E86A6A" />
        <rect x="110" y="129.5" width="20" height="3.2" rx="1" fill="#FFFFFF" />
        <path d="M112,143 Q120,145 128,143" fill="none" stroke={skin.mid} strokeWidth="2.0" strokeLinecap="round" />
      </g>
    );
  }
  if (mouthSprite === 'wq' || mouthSprite === 'u') {
    return (
      <g>
        <ellipse cx="120" cy="135" rx="6.8" ry="7.8" fill="#4A151D" stroke="#261D1A" strokeWidth="2.4" />
        <ellipse cx="120" cy="135" rx="9" ry="10" fill="none" stroke={skin.deep} strokeWidth="1.8" />
        <path d="M116,145 Q120,147 124,145" fill="none" stroke={skin.mid} strokeWidth="1.8" strokeLinecap="round" />
      </g>
    );
  }
  if (mouthSprite === 'ah') {
    return (
      <g>
        <path d="M106,128 Q120,127 134,128 C134,147 106,147 106,128 Z" fill="#4A151D" stroke="#261D1A" strokeWidth="2.4" strokeLinejoin="round" />
        <rect x="110" y="128" width="20" height="4.5" rx="1.2" fill="#FFFFFF" />
        <path d="M111,146 Q120,139 129,146 Z" fill="#E86A6A" />
        <path d="M113,149 Q120,151 127,149" fill="none" stroke={skin.mid} strokeWidth="2.0" strokeLinecap="round" />
      </g>
    );
  }
  if (mouthSprite === 'grin') {
    // Official Rhubarb B (Consonants K, S, T, D, N, R, Y, etc.) - Parted teeth with dark cavity
    return (
      <g>
        <path d="M106,131 Q120,130 134,131 C133,139 107,139 106,131 Z" fill="#4A151D" stroke="#261D1A" strokeWidth="2.4" strokeLinejoin="round" />
        <path d="M108,131.5 L132,131.5 C131,135 109,135 108,131.5 Z" fill="#FFFFFF" />
        <path d="M112,138.5 Q120,136.5 128,138.5 Z" fill="#E86A6A" />
        <path d="M112,141 Q120,143 128,141" fill="none" stroke={skin.mid} strokeWidth="2.0" strokeLinecap="round" />
      </g>
    );
  }
  if (mouthSprite === 'talk-o' || mouthSprite === 'o') {
    return (
      <g>
        <ellipse cx="120" cy="135" rx="8.5" ry="9.5" fill="#4A151D" stroke="#261D1A" strokeWidth="2.4" />
        <path d="M114,127.5 Q120,129 126,127.5 Z" fill="#FFFFFF" opacity="0.9" />
        <path d="M114,141 Q120,136.5 126,141 Z" fill="#E86A6A" />
        <path d="M115,147 Q120,149 125,147" fill="none" stroke={skin.mid} strokeWidth="1.8" strokeLinecap="round" />
      </g>
    );
  }
  if (mouthSprite === 'aei') {
    return (
      <g>
        <path d="M105,129 Q120,128 135,129 C134,142 106,142 105,129 Z" fill="#4A151D" stroke="#261D1A" strokeWidth="2.4" strokeLinejoin="round" />
        <path d="M107.5,129.5 L132.5,129.5 C131.5,134.5 108.5,134.5 107.5,129.5 Z" fill="#FFFFFF" />
        <path d="M111,141 Q120,136.5 129,141 Z" fill="#E86A6A" />
        <path d="M112,144 Q120,146 128,144" fill="none" stroke={skin.mid} strokeWidth="2.0" strokeLinecap="round" />
      </g>
    );
  }
  if (mouthSprite === 'bmp') {
    return (
      <g>
        <path d="M107,134 Q120,135 133,134" fill="none" stroke="#261D1A" strokeWidth="3.4" strokeLinecap="round" />
        <path d="M113,138 Q120,140 127,138" fill="none" stroke={skin.mid} strokeWidth="2.0" strokeLinecap="round" />
      </g>
    );
  }
  if (mouthSprite === 'fv') {
    return (
      <g>
        <path d="M106,131 Q120,130 134,131 C133,138 107,138 106,131 Z" fill="#4A151D" stroke="#261D1A" strokeWidth="2.4" strokeLinejoin="round" />
        <rect x="109" y="131" width="22" height="4.5" rx="1.2" fill="#FFFFFF" />
        <path d="M110,138 Q120,141 130,138" fill="none" stroke="#261D1A" strokeWidth="2.2" strokeLinecap="round" />
        <path d="M113,142 Q120,144 127,142" fill="none" stroke={skin.mid} strokeWidth="2.0" strokeLinecap="round" />
      </g>
    );
  }
  if (mouthSprite === 'laugh') {
    return (
      <g>
        <path d="M103,128 Q120,127 137,128 C137,147 103,147 103,128 Z" fill="#4A151D" stroke="#261D1A" strokeWidth="2.4" strokeLinejoin="round" />
        <path d="M105,129 L135,129 C134,135 106,135 105,129 Z" fill="#FFFFFF" />
        <path d="M110,145 Q120,138 130,145 Z" fill="#E86A6A" />
        <path d="M112,149 Q120,151 128,149" fill="none" stroke={skin.mid} strokeWidth="2.0" strokeLinecap="round" />
      </g>
    );
  }
  if (mouthSprite === 'smirk') {
    return (
      <g>
        <path d="M107,134 Q122,139 135,130" fill="none" stroke="#261D1A" strokeWidth="3.2" strokeLinecap="round" />
        <path d="M113,139 Q122,143 131,135" fill="none" stroke={skin.mid} strokeWidth="1.8" strokeLinecap="round" />
      </g>
    );
  }
  if (mouthSprite === 'neutral') {
    return (
      <g>
        <path d="M109,134 Q120,136 131,134" fill="none" stroke="#261D1A" strokeWidth="3.0" strokeLinecap="round" />
        <path d="M114,139 Q120,141 126,139" fill="none" stroke={skin.mid} strokeWidth="1.8" strokeLinecap="round" />
      </g>
    );
  }
  return (
    <g>
      <path d="M107,131 Q120,139 133,131" fill="none" stroke="#261D1A" strokeWidth="3.2" strokeLinecap="round" />
      <path d="M113,139 Q120,142 127,139" fill="none" stroke={skin.mid} strokeWidth="2.0" strokeLinecap="round" />
    </g>
  );
});

const PropsLayer = React.memo<{ propType?: string }>(({ propType }) => {
  if (!propType || propType === 'none') return null;
  if (propType === 'stethoscope') {
    return (
      <g className="svg-front-accessory">
        <path d="M92,158 C86,186 94,208 106,214" fill="none" stroke="#1E293B" strokeWidth="4.2" strokeLinecap="round" />
        <path d="M148,158 C154,186 146,204 138,210" fill="none" stroke="#1E293B" strokeWidth="4.2" strokeLinecap="round" />
        <circle cx="136" cy="212" r="7.5" fill="#94A3B8" stroke="#334155" strokeWidth="2.4" />
        <circle cx="136" cy="212" r="3.2" fill="#E2E8F0" />
      </g>
    );
  }
  if (propType === 'phone') {
    return (
      <rect
        x="162"
        y="108"
        width="18"
        height="32"
        rx="4"
        transform="rotate(16 171 124)"
        fill="#38BDF8"
        stroke="#0F172A"
        strokeWidth="2.5"
      />
    );
  }
  if (propType === 'book') {
    return (
      <g transform="translate(120, 202)">
        <path d="M-38,-14 L0,-8 L38,-14 L38,16 L0,22 L-38,16 Z" fill="#D97706" />
        <path d="M-34,-16 L0,-10 L34,-16 L34,12 L0,18 L-34,12 Z" fill="#FEF3C7" />
        <line x1="0" y1="-10" x2="0" y2="22" stroke="#92400E" strokeWidth="3" />
      </g>
    );
  }
  if (propType === 'coffee' || propType === 'coffee-cup') {
    return (
      <g transform="translate(174, 190)">
        <path d="M-11,-12 L11,-12 L9,16 L-9,16 Z" fill="#78350F" />
        <rect x="-13" y="-16" width="26" height="5" rx="2" fill="#F8FAFC" />
        <rect x="-10" y="-4" width="20" height="9" fill="#D97706" />
      </g>
    );
  }
  if (propType === 'pen') {
    return (
      <g transform="translate(198, 155) rotate(22)">
        <rect x="-2.5" y="-16" width="5" height="28" rx="2" fill="#1D4ED8" />
        <polygon points="-2.5,12 2.5,12 0,19" fill="#FDE68A" />
      </g>
    );
  }
  if (propType === 'tablet' || propType === 'clipboard') {
    return (
      <g>
        <rect x="86" y="182" width="68" height="46" rx="6" fill="#CBD5E1" stroke="#334155" strokeWidth="3" />
        {propType === 'clipboard' && <rect x="108" y="177" width="24" height="8" rx="3" fill="#475569" />}
      </g>
    );
  }
  return null;
});

export const CharacterStage: React.FC<CharacterStageProps> = React.memo(({
  character,
  eye,
  mouth,
  gesture,
  emotion,
  prop,
  headTilt = 0,
  framing = 'full',
  background = 'card',
  customBgColor,
  customBgImage,
  isBlinking = false,
  isNodding = false,
  isShaking = false,
  showGrid = false,
  flatShading = false,
  isExploded = false,
  scale = 1.0,
  className = '',
  id,
  hairStyleOverride,
  clothesTypeOverride,
  capOverride,
  glassesOverride,
  maskOverride,
  beardOverride,
  topHexOverride,
  topAccentOverride,
  pantsHexOverride,
  pantsShadeOverride,
  shoeHexOverride,
  shoeToeOverride,
  shoeAccentOverride,
  turn = '0',
  instantPose = false,
  deterministicPose = false,
  limbOverride,
}) => {
  const emotionMeta = useMemo(() => EMOTIONS_LIST.find((e) => e.id === emotion), [emotion]);
  const activeEye = eye || emotionMeta?.defaultEye || character.defaultEye || 'neutral';
  const activeMouth = mouth || emotionMeta?.defaultMouth || character.defaultMouth || 'smile';
  const activeGesture = gesture || character.defaultGesture || 'steeple';
  const activeProp = prop !== undefined ? prop : character.defaultProp || 'none';
  const activeHairStyle = hairStyleOverride || character.hairStyle;
  const activeClothes = clothesTypeOverride || character.clothesType;
  const activeTopHex = topHexOverride || character.topHex;
  const activeTopAccent = topAccentOverride || character.topAccent;
  const activePantsHex = pantsHexOverride || character.pantsHex;
  const activePantsShade = pantsShadeOverride || character.pantsShade;
  const activeShoeHex = shoeHexOverride || character.shoeHex;
  const activeShoeToe = shoeToeOverride || character.shoeToe;
  const activeShoeAccent = shoeAccentOverride || character.shoeAccent;
  const activeCap = capOverride !== undefined ? capOverride : character.cap;
  const activeGlasses = glassesOverride !== undefined ? glassesOverride : character.glasses;
  const activeMask = maskOverride !== undefined ? maskOverride : character.mask;
  const activeBeard = beardOverride !== undefined ? beardOverride : character.beard;
  const beardColor = character.beardColor || character.hairColor?.base;

  const emotionTiltBonus =
    emotion === 'curious' ? 4 : emotion === 'empathetic' ? -3 : emotion === 'confident' ? 1 : 0;
  const clampedTilt = clampHeadTilt(headTilt + emotionTiltBonus);

  const isFullBody = framing === 'full' || framing === 'bust';
  const fullBodyClass = isFullBody ? 'full-body-stage' : '';
  const explodedClass = isExploded ? 'exploded-rig-mode' : '';
  const shadeClass = flatShading ? 'flat-shading-mode' : '';
  const gridClass = showGrid ? 'show-grid' : '';
  const nodClass = isNodding ? 'nodding-yes' : '';
  const shakeClass = isShaking ? 'shaking-no' : '';
  const blinkClass = isBlinking ? 'manual-blink-now' : '';
  const turnClass = turn && turn !== '0' ? `turn-${turn}` : '';

  const scaleVal = (character.bodyScale || 1.0) * scale;
  const svgWidth = 240;
  const svgHeight = isFullBody ? 375 : 225;
  const viewBox = isFullBody ? '0 0 240 375' : '0 15 240 225';

  const skin = character.skin || { base: '#F3C39C', mid: '#D9A177', deep: '#BF835A', hi: '#FFE0C4' };
  const hc = character.hairColor || { base: '#252C3E', shade: '#1A2030', hi: '#364059' };

  let bgStyle: React.CSSProperties = {
    ['--active-card-bg' as string]: character.tileHex,
    ['--local-tilt' as string]: `${clampedTilt}deg`,
    ['--head-tilt' as string]: `${clampedTilt}deg`,
  };

  if (customBgImage) {
    bgStyle = {
      ...bgStyle,
      backgroundImage: `url(${customBgImage})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
    };
  } else if (customBgColor) {
    bgStyle = { ...bgStyle, backgroundColor: customBgColor };
  } else if (background === 'card') {
    bgStyle = { ...bgStyle, backgroundColor: character.tileHex };
  }

  const bgClass = customBgImage || customBgColor ? '' : `stage-bg-${background}`;

  const instantClass = instantPose || deterministicPose ? 'instant-pose' : '';

  return (
    <div
      id={id}
      className={`char-stage ${character.codeClass} ${blinkClass} ${instantClass} sprite-eye-${activeEye} sprite-mouth-${activeMouth} gesture-${activeGesture} ${turnClass} ${fullBodyClass} ${explodedClass} ${shadeClass} ${gridClass} ${nodClass} ${shakeClass} ${bgClass} ${className}`}
      style={bgStyle}
    >
      <svg
        width={svgWidth}
        height={svgHeight}
        viewBox={viewBox}
        className="w-full h-full block"
        xmlns="http://www.w3.org/2000/svg"
      >
        <g transform={`translate(120, ${isFullBody ? 358 : 118}) scale(${scaleVal}) translate(-120, -${isFullBody ? 358 : 118})`}>
          {isFullBody && (
            <LowerBodyLayer
              pantsHex={activePantsHex}
              pantsShade={activePantsShade}
              shoeHex={activeShoeHex}
              shoeToe={activeShoeToe}
              shoeAccent={activeShoeAccent}
            />
          )}

          <TorsoLayer
            clothesType={activeClothes}
            topHex={activeTopHex}
            topAccent={activeTopAccent}
            skin={skin}
            hasDupatta={character.hasDupatta}
            hijabColor={activeHairStyle === 'hijab-drape' ? hc.base : undefined}
          />

          <g
            className="svg-head-group"
            transform={!isNodding && clampedTilt !== 0 ? `rotate(${clampedTilt} 120 146)` : undefined}
          >
            <HairBackLayer style={activeHairStyle} hc={hc} />

            {/* Ears (hidden when wearing full-coverage hijab) */}
            {activeHairStyle !== 'hijab-drape' && (
              <g>
                <ellipse cx="64" cy="110" rx="13" ry="15" fill={skin.base} />
                <ellipse cx="65" cy="110" rx="7.5" ry="9" fill={skin.mid} />
                <ellipse cx="176" cy="110" rx="13" ry="15" fill={skin.base} />
                <ellipse cx="175" cy="110" rx="7.5" ry="9" fill={skin.mid} />
              </g>
            )}

            {/* Head Contour & Jaw Shading */}
            <rect x="68" y="52" width="104" height="98" rx="46" fill={skin.base} />
            <path
              d="M72,112 C76,140 98,146 120,146 C146,146 166,136 171,106 C172,132 152,150 120,150 C88,150 70,134 72,112 Z"
              fill={skin.mid}
              className="shade-layer"
            />

            <g className="svg-face-features">
              {character.hasBindi && (
                <circle cx="120" cy="82" r="3.5" fill="#BE123C" stroke="#FBBF24" strokeWidth="1.2" />
              )}

              <EyesAndBrowsLayer
                charObj={character}
                hcBase={hc.base}
                eyeSprite={activeEye}
                emotion={emotion}
                isBlinking={isBlinking}
              />

              {/* Nose */}
              {character.noseType === 'rosy' ? (
                <g>
                  <ellipse cx="120" cy="114" rx="8.5" ry="6.8" fill="#D95B43" />
                  <ellipse cx="118" cy="112" rx="3.2" ry="2.0" fill="#F0806C" opacity="0.65" />
                </g>
              ) : (
                <g>
                  <path d="M113,116 Q120,121 127,116" fill="none" stroke={skin.deep} strokeWidth="2.5" strokeLinecap="round" />
                  <ellipse cx="120" cy="113.5" rx="6.5" ry="4.2" fill={skin.mid} opacity="0.45" />
                </g>
              )}

              <BeardLayer beardType={activeBeard} bc={beardColor} />
              <MouthShapeLayer mouthSprite={activeMouth} skin={skin} />
              <MaskLayer maskType={activeMask} />
              <GlassesLayer glassesType={activeGlasses} />
            </g>

            <HairFrontLayer style={activeHairStyle} hc={hc} />
            <CapLayer capType={activeCap} />
            <rect
              x="66"
              y="50"
              width="108"
              height="102"
              rx="48"
              fill={hc.base}
              opacity={turn === '180' ? 1 : 0}
              className="svg-back-hair-cover"
            />
          </g>

          <ArticulatedArmsLayer
            gesture={activeGesture}
            clothesType={activeClothes}
            topHex={activeTopHex}
            skin={skin}
            charId={character.id}
            instantPose={instantPose || deterministicPose}
            limbOverride={limbOverride}
          />

          <PropsLayer propType={activeProp} />
        </g>
      </svg>
    </div>
  );
});
