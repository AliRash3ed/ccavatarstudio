import React from 'react';
import { Stamp } from 'lucide-react';
import { WatermarkConfig, WatermarkPosition } from '../../types/character';

interface WatermarkPanelProps {
  watermark: WatermarkConfig;
  onChange: (patch: Partial<WatermarkConfig>) => void;
}

export const WatermarkPanel: React.FC<WatermarkPanelProps> = React.memo(({ watermark, onChange }) => {
  return (
    <div className="nb-card p-4 bg-[#FFFFFF] space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs font-extrabold text-[#111111]">
          <Stamp className="w-4 h-4" />
          <span>Creator Watermark &amp; Authoring</span>
        </div>

        <button
          type="button"
          onClick={() => onChange({ enabled: !watermark.enabled })}
          aria-pressed={watermark.enabled}
          className={`nb-btn h-8 px-3 text-[11px] font-mono uppercase cursor-pointer ${
            watermark.enabled ? 'nb-btn-mint' : 'bg-[#F4F0EA]'
          }`}
        >
          Watermark: {watermark.enabled ? 'ON' : 'OFF'}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
        <div>
          <label htmlFor="author-name-input" className="text-[10px] font-mono font-bold uppercase text-[#444444] block mb-1">
            Creator / Author Name
          </label>
          <input
            id="author-name-input"
            type="text"
            value={watermark.authorName}
            onChange={(e) => onChange({ authorName: e.target.value })}
            placeholder="e.g. Ali Rasheed"
            className="nb-input w-full h-8 px-2.5 text-xs font-medium"
          />
        </div>

        <div>
          <label htmlFor="watermark-text-input" className="text-[10px] font-mono font-bold uppercase text-[#444444] block mb-1">
            Watermark Label / Handle
          </label>
          <input
            id="watermark-text-input"
            type="text"
            value={watermark.text}
            onChange={(e) => onChange({ text: e.target.value })}
            placeholder="@PersonaStudio"
            className="nb-input w-full h-8 px-2.5 text-xs font-mono"
          />
        </div>

        <div>
          <label htmlFor="watermark-position-select" className="text-[10px] font-mono font-bold uppercase text-[#444444] block mb-1">
            Corner Position
          </label>
          <select
            id="watermark-position-select"
            value={watermark.position}
            onChange={(e) => onChange({ position: e.target.value as WatermarkPosition })}
            className="nb-input w-full h-8 px-2 text-xs font-medium"
          >
            <option value="top-left">Top Left</option>
            <option value="top-right">Top Right</option>
            <option value="bottom-left">Bottom Left</option>
            <option value="bottom-right">Bottom Right</option>
          </select>
        </div>

        <div>
          <div className="flex justify-between text-[10px] font-mono font-bold uppercase text-[#444444] mb-1">
            <span>Opacity</span>
            <span className="tabular-nums">{Math.round(watermark.opacity * 100)}%</span>
          </div>
          <input
            type="range"
            min="0.2"
            max="1"
            step="0.05"
            value={watermark.opacity}
            onChange={(e) => onChange({ opacity: Number(e.target.value) })}
            className="w-full accent-[#111111] mt-1.5 cursor-pointer"
          />
        </div>
      </div>

      <p className="text-[11px] text-[#444444]">
        Authoring metadata is embedded into saved Project Snapshots, and the badge burns cleanly onto rendered MP4, WebM, and PNG outputs when enabled.
      </p>
    </div>
  );
});
