import React from 'react';
import { BookOpen, CheckCircle, ShieldAlert, Layers, SunMedium, Ruler } from 'lucide-react';

export const StyleGuide: React.FC = () => {
  return (
    <div className="w-full space-y-6">
      <div className="nb-card p-5 bg-[#FFFFFF] space-y-2">
        <h2 className="font-display text-base font-extrabold text-[#111111] flex items-center gap-2">
          <BookOpen className="w-4 h-4" />
          ccavatarstudio Vector Character System — Design Constitution &amp; Rig Specifications
        </h2>
        <p className="text-xs text-[#333333] leading-relaxed max-w-4xl">
          Specifications establishing our lineless 2D flat-vector design language: unified top-left (-35°) key lighting,
          3-tier skin &amp; fabric shading, zero-outline discipline, and resolution of all anatomical &amp; layer ordering defects.
        </p>
      </div>

      {/* 1. CORE STYLE RULES MATRIX */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="nb-card p-4 bg-[#FFFFFF] space-y-2.5">
          <div className="flex items-center gap-2 text-[#111111]">
            <span className="p-1 bg-[#FFDE59] border border-[#111111]">
              <SunMedium className="w-4 h-4" />
            </span>
            <h3 className="text-[11px] font-mono font-bold uppercase tracking-wider">01. Key Light (-35°)</h3>
          </div>
          <p className="text-xs text-[#333333] leading-relaxed">
            Every character, limb, and prop adheres strictly to a <strong className="text-[#111111]">top-left key light</strong>.
            Facial highlights sit on the left forehead, soft shadow planes fall on the right jaw, and drop shadows project downward.
          </p>
        </div>

        <div className="nb-card p-4 bg-[#FFFFFF] space-y-2.5">
          <div className="flex items-center gap-2 text-[#111111]">
            <span className="p-1 bg-[#7BF1A8] border border-[#111111]">
              <ShieldAlert className="w-4 h-4" />
            </span>
            <h3 className="text-[11px] font-mono font-bold uppercase tracking-wider">02. 0px Lineless</h3>
          </div>
          <p className="text-xs text-[#333333] leading-relaxed">
            <strong className="text-[#111111]">Zero black cartoon strokes.</strong> Forms are defined exclusively by
            adjacent color values, tone contrasts, and subtle inset drop shadows.
          </p>
        </div>

        <div className="nb-card p-4 bg-[#FFFFFF] space-y-2.5">
          <div className="flex items-center gap-2 text-[#111111]">
            <span className="p-1 bg-[#70D6FF] border border-[#111111]">
              <Layers className="w-4 h-4" />
            </span>
            <h3 className="text-[11px] font-mono font-bold uppercase tracking-wider">03. 3-Tier Shading</h3>
          </div>
          <p className="text-xs text-[#333333] leading-relaxed">
            All organic surfaces utilize a 3-tier value triad: <strong className="text-[#111111]">Highlight</strong> (specular crests),
            <strong className="text-[#111111]"> Mid-Tone</strong> (primary local color), and <strong className="text-[#111111]">Deep Core</strong> (occlusion shadows).
          </p>
        </div>

        <div className="nb-card p-4 bg-[#FFFFFF] space-y-2.5">
          <div className="flex items-center gap-2 text-[#111111]">
            <span className="p-1 bg-[#FFDE59] border border-[#111111]">
              <Ruler className="w-4 h-4" />
            </span>
            <h3 className="text-[11px] font-mono font-bold uppercase tracking-wider">04. ±15° Head Tilt</h3>
          </div>
          <p className="text-xs text-[#333333] leading-relaxed">
            The cervical pivot at (120, 165) enforces a strict <strong className="text-[#111111]">[-15°, +15°] range</strong>.
            Prevents unnatural neck angles while allowing nuanced inquisitive and empathetic motion.
          </p>
        </div>
      </div>

      {/* 2. BEFORE VS AFTER QA AUDIT MATRIX */}
      <div className="nb-card p-5 bg-[#FFFFFF] space-y-4">
        <h3 className="text-xs font-mono font-bold text-[#111111] tracking-wider uppercase flex items-center gap-2">
          <CheckCircle className="w-4 h-4" />
          Before &amp; After Rig Audit Matrix
        </h3>

        <div className="overflow-x-auto border-2 border-[#111111] rounded">
          <table className="w-full text-left text-xs text-[#222222]">
            <thead className="bg-[#F4F0EA] text-[#111111] font-mono text-[11px] font-bold uppercase border-b-2 border-[#111111]">
              <tr>
                <th className="p-3">Defect Category</th>
                <th className="p-3 bg-[#FF6B6B]/25">Previous Draft Defect</th>
                <th className="p-3 bg-[#7BF1A8]/35">ccavatarstudio Resolution</th>
                <th className="p-3">Impact</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-[#111111]/15 bg-[#FFFFFF]">
              <tr>
                <td className="p-3 font-bold text-[#111111]">Torso-to-Legs Connection</td>
                <td className="p-3 text-[#444444]">Shirts ended in sharp horizontal lines pasted onto pants.</td>
                <td className="p-3 font-medium text-[#111111]">Curved bezier hemlines (Q120,245) with elliptical drop shadows cast onto trousers.</td>
                <td className="p-3 font-mono font-bold text-[#111111]">Depth &amp; Weight</td>
              </tr>
              <tr>
                <td className="p-3 font-bold text-[#111111]">Lower Body Variation</td>
                <td className="p-3 text-[#444444]">All characters shared identical khaki pants &amp; brown shoes.</td>
                <td className="p-3 font-medium text-[#111111]">Individualized trousers: cuffed chinos, tapered dress slacks, indigo jeans, cream trousers &amp; shoes.</td>
                <td className="p-3 font-mono font-bold text-[#111111]">Unique Stances</td>
              </tr>
              <tr>
                <td className="p-3 font-bold text-[#111111]">Hand &amp; Finger Anatomy</td>
                <td className="p-3 text-[#444444]">4 stubby fingers stacked vertically with black outlines or missing thumbs.</td>
                <td className="p-3 font-medium text-[#111111]">Lineless 5-finger hands with distinct abducted thumbs and cuff-locked wrist bridges.</td>
                <td className="p-3 font-mono font-bold text-[#111111]">Clean Hands</td>
              </tr>
              <tr>
                <td className="p-3 font-bold text-[#111111]">#02 Dr. Zainab Raza Persona</td>
                <td className="p-3 text-[#444444]">Had misaligned hair artifacts and lacked medical persona attire.</td>
                <td className="p-3 font-medium text-[#111111]">Draped modest hijab, gold pin, round tortoiseshell glasses, white lab coat &amp; stethoscope.</td>
                <td className="p-3 font-mono font-bold text-[#111111]">South Asian MD</td>
              </tr>
              <tr>
                <td className="p-3 font-bold text-[#111111]">#03 Barnaby Sterling Limbs</td>
                <td className="p-3 text-[#444444]">Left arm detached from torso corner with mismatched skin tones.</td>
                <td className="p-3 font-medium text-[#111111]">Seamless deltoid shoulder sockets, teal polo collar, ginger mustache, cuff-attached hand.</td>
                <td className="p-3 font-mono font-bold text-[#111111]">Joint Continuity</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. COLOR PALETTE SWATCHES */}
      <div className="nb-card p-5 bg-[#FFFFFF] space-y-4">
        <h3 className="text-xs font-mono font-bold text-[#111111] tracking-wider uppercase">
          Canonical Color Triads (Hex Specifications)
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
          <div className="nb-box p-4 bg-[#FFFDF7] space-y-2">
            <h4 className="font-bold text-[#111111] bg-[#FFDE59] inline-block px-1.5 border border-[#111111]">
              Reference Tile Backgrounds
            </h4>
            <div className="space-y-1.5 font-mono text-[11px] text-[#222222]">
              <div className="flex items-center gap-2"><span className="w-3.5 h-3.5 rounded-sm border border-[#111111] bg-[#52B467]" /> #52B467 (Tile Green)</div>
              <div className="flex items-center gap-2"><span className="w-3.5 h-3.5 rounded-sm border border-[#111111] bg-[#F6CA38]" /> #F6CA38 (Tile Yellow)</div>
              <div className="flex items-center gap-2"><span className="w-3.5 h-3.5 rounded-sm border border-[#111111] bg-[#3A94B0]" /> #3A94B0 (Tile Blue)</div>
              <div className="flex items-center gap-2"><span className="w-3.5 h-3.5 rounded-sm border border-[#111111] bg-[#F28D35]" /> #F28D35 (Tile Orange)</div>
            </div>
          </div>

          <div className="nb-box p-4 bg-[#FFFDF7] space-y-2">
            <h4 className="font-bold text-[#111111] bg-[#7BF1A8] inline-block px-1.5 border border-[#111111]">
              Skin Tone Triads
            </h4>
            <div className="space-y-1.5 font-mono text-[11px] text-[#222222]">
              <div className="flex items-center gap-2"><span className="w-3.5 h-3.5 rounded-sm border border-[#111111] bg-[#F3C39C]" /> Fair Ivory (#F3C39C / #D9A177)</div>
              <div className="flex items-center gap-2"><span className="w-3.5 h-3.5 rounded-sm border border-[#111111] bg-[#EBB282]" /> Golden Honey (#EBB282 / #D1925E)</div>
              <div className="flex items-center gap-2"><span className="w-3.5 h-3.5 rounded-sm border border-[#111111] bg-[#BA7242]" /> Rich Chestnut (#BA7242 / #99552A)</div>
              <div className="flex items-center gap-2"><span className="w-3.5 h-3.5 rounded-sm border border-[#111111] bg-[#9B5B30]" /> Deep Umber (#9B5B30 / #7D441E)</div>
            </div>
          </div>

          <div className="nb-box p-4 bg-[#FFFDF7] space-y-2">
            <h4 className="font-bold text-[#111111] bg-[#70D6FF] inline-block px-1.5 border border-[#111111]">
              Canvas &amp; Export Spec
            </h4>
            <div className="space-y-1 text-[#222222]">
              <div>Portrait Mode: <strong className="text-[#111111] font-mono">240 × 240px</strong></div>
              <div>Full-Body Mode: <strong className="text-[#111111] font-mono">240 × 380px</strong></div>
              <div>HD Export: <strong className="text-[#111111] font-mono">1920×1080 / 1080×1920</strong></div>
              <div>Head Pivot Origin: <strong className="text-[#111111] font-mono">(120, 165)</strong></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
