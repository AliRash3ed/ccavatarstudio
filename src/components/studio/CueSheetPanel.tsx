import React from 'react';
import { ChevronDown, ChevronRight, X } from 'lucide-react';
import { CueSheetRow, EmotionPreset, HandGesture } from '../../types/character';
import { EMOTIONS_LIST, HAND_GESTURES } from '../../data/characters';

interface CueSheetPanelProps {
  isOpen: boolean;
  onToggleOpen: () => void;
  cueDraftRows: CueSheetRow[];
  cueDirty: boolean;
  cueNotice: string;
  exportWidth: number;
  exportHeight: number;
  exportFps: number;
  exportFormat: 'mp4' | 'webm';
  onUpdateCueDraft: (idx: number, patch: Partial<CueSheetRow>) => void;
  onDeleteCueRow: (idx: number) => void;
  onAddCueRow: () => void;
  onUseAutomaticCues: () => void;
  onSaveCuesForRender: () => void;
}

export const CueSheetPanel: React.FC<CueSheetPanelProps> = React.memo(({
  isOpen,
  onToggleOpen,
  cueDraftRows,
  cueDirty,
  cueNotice,
  exportWidth,
  exportHeight,
  exportFps,
  exportFormat,
  onUpdateCueDraft,
  onDeleteCueRow,
  onAddCueRow,
  onUseAutomaticCues,
  onSaveCuesForRender,
}) => {
  return (
    <div className="nb-card bg-[#FFFFFF] overflow-hidden">
      <button
        type="button"
        onClick={onToggleOpen}
        aria-expanded={isOpen}
        className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-[#FFFDF7] transition cursor-pointer"
      >
        <div className="flex items-center gap-2 text-xs font-bold text-[#111111]">
          {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          <span>Edit Cue Sheet Timeline</span>
          <span className="font-mono text-[11px] px-1.5 py-0.5 bg-[#F4F0EA] border border-[#111111] tabular-nums">
            {cueDraftRows.length} cues
          </span>
        </div>
        <span
          className={`text-[11px] font-mono font-bold px-2 py-0.5 border border-[#111111] ${
            cueDirty ? 'bg-[#FFDE59]' : 'bg-[#7BF1A8]'
          }`}
        >
          {cueDirty ? 'Unsaved Edits' : 'Synced'}
        </span>
      </button>

      {isOpen && (
        <div className="px-4 pb-4 pt-3 border-t-2 border-[#111111] space-y-3 bg-[#FFFDF7]">
          <p className="text-[11px] text-[#333333]">
            Start and end are in seconds. Saving applies custom gestures and emotions smoothly across transitions without regenerating audio.
          </p>

          <div className="overflow-x-auto bg-[#FFFFFF] border-2 border-[#111111] rounded">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b-2 border-[#111111] bg-[#F4F0EA] text-[10px] font-mono font-bold uppercase tracking-wider text-[#111111]">
                  <th className="py-2 px-2.5 w-24">Start (s)</th>
                  <th className="py-2 px-2.5 w-24">End (s)</th>
                  <th className="py-2 px-2.5">Gesture</th>
                  <th className="py-2 px-2.5">Emotion</th>
                  <th className="py-2 px-2 w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[#111111]/15">
                {cueDraftRows.map((row, idx) => (
                  <tr key={row.id}>
                    <td className="py-1.5 px-2">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={row.start}
                        onChange={(e) => onUpdateCueDraft(idx, { start: Number(e.target.value) })}
                        aria-label={`Cue ${idx + 1} start`}
                        className="nb-input w-20 h-8 px-2 font-mono text-xs tabular-nums"
                      />
                    </td>
                    <td className="py-1.5 px-2">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={row.end}
                        onChange={(e) => onUpdateCueDraft(idx, { end: Number(e.target.value) })}
                        aria-label={`Cue ${idx + 1} end`}
                        className="nb-input w-20 h-8 px-2 font-mono text-xs tabular-nums"
                      />
                    </td>
                    <td className="py-1.5 px-2">
                      <select
                        value={row.gesture}
                        onChange={(e) => onUpdateCueDraft(idx, { gesture: e.target.value as HandGesture })}
                        aria-label={`Cue ${idx + 1} gesture`}
                        className="nb-input w-full h-8 px-2 text-xs font-medium"
                      >
                        {HAND_GESTURES.map((g) => (
                          <option key={g.id} value={g.id}>
                            {g.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-1.5 px-2">
                      <select
                        value={row.emotion}
                        onChange={(e) => onUpdateCueDraft(idx, { emotion: e.target.value as EmotionPreset })}
                        aria-label={`Cue ${idx + 1} emotion`}
                        className="nb-input w-full h-8 px-2 text-xs font-medium"
                      >
                        {EMOTIONS_LIST.map((em) => (
                          <option key={em.id} value={em.id}>
                            {em.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-1.5 px-2 text-right">
                      <button
                        type="button"
                        onClick={() => onDeleteCueRow(idx)}
                        aria-label={`Delete cue ${idx + 1}`}
                        className="h-7 w-7 border border-[#111111] bg-[#FFFFFF] hover:bg-[#FF6B6B] inline-flex items-center justify-center rounded cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <div className="flex items-center gap-3 text-xs">
              <button
                type="button"
                onClick={onAddCueRow}
                className="nb-btn bg-[#FFFFFF] h-8 px-3 text-xs cursor-pointer"
              >
                + Add Cue
              </button>
              <button
                type="button"
                onClick={onUseAutomaticCues}
                className="text-xs font-bold underline text-[#111111] hover:text-[#333333] cursor-pointer"
              >
                Reset to Automatic Cues
              </button>
            </div>

            <button
              type="button"
              onClick={onSaveCuesForRender}
              className="nb-btn nb-btn-primary h-9 px-3.5 text-xs cursor-pointer"
            >
              Save Cues for Render
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-[#444444] pt-1">
            <span>{cueNotice}</span>
            <span className="uppercase tabular-nums font-bold">
              {exportWidth}×{exportHeight} · {exportFps} FPS · {exportFormat === 'webm' ? 'ALPHA WEBM' : 'H.264 MP4'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
});
