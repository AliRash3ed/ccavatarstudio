import React, { useEffect, useRef } from 'react';
import { X, ShieldCheck } from 'lucide-react';

interface ReferenceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ReferenceModal: React.FC<ReferenceModalProps> = ({ isOpen, onClose }) => {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    if (isOpen && !d.open) {
      d.showModal();
    } else if (!isOpen && d.open) {
      d.close();
    }
  }, [isOpen]);

  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    const handleClose = () => onClose();
    const handlePointerDown = (e: PointerEvent) => {
      const r = d.getBoundingClientRect();
      const isOutside = e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
      if (isOutside) {
        d.close();
      }
    };
    d.addEventListener('close', handleClose);
    d.addEventListener('pointerdown', handlePointerDown);
    return () => {
      d.removeEventListener('close', handleClose);
      d.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [onClose]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="reference-modal-title"
      className="bg-white border border-slate-200 rounded-2xl shadow-xl p-6 text-slate-800 w-full max-w-4xl max-h-[92vh] overflow-y-auto backdrop:bg-slate-900/40 backdrop:backdrop-blur-sm"
    >
      {/* Modal Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 id="reference-modal-title" className="text-base font-bold text-slate-900">
              Presenter Rig &amp; Anatomy Specifications
            </h3>
            <p className="text-xs text-slate-500">
              Verified vector proportions, hand-drawn gesture rigs, and viseme alignments.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => dialogRef.current?.close()}
          aria-label="Close Reference Modal"
          className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Audited Reference Areas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4 text-xs">
        <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-slate-900">#01 Aarav (Systems Lead)</h4>
            <span className="text-[10px] font-mono bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-md font-semibold">
              Verified
            </span>
          </div>
          <p className="text-slate-600 leading-relaxed">
            Deltoid shoulder sockets, fingertip steeple pose, cuff-locked wrist bridge, sky-blue glasses, and cuffed chinos.
          </p>
        </div>

        <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-slate-900">#02 Dr. Zainab Raza (Medical Lead)</h4>
            <span className="text-[10px] font-mono bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-md font-semibold">
              Verified
            </span>
          </div>
          <p className="text-slate-600 leading-relaxed">
            Draped modest hijab with chest shawl &amp; gold pin, clinical white lab coat over teal blouse, stethoscope prop, and empathy hands.
          </p>
        </div>

        <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-slate-900">#03 Barnaby Sterling (Mentor)</h4>
            <span className="text-[10px] font-mono bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-md font-semibold">
              Verified
            </span>
          </div>
          <p className="text-slate-600 leading-relaxed">
            Silver temple fade, corduroy elbow patches, tweed vest, gold-rim reading glasses, and open explanatory palms.
          </p>
        </div>

        <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-slate-900">#04 Mei-Ling Chen (Product Lead)</h4>
            <span className="text-[10px] font-mono bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-md font-semibold">
              Verified
            </span>
          </div>
          <p className="text-slate-600 leading-relaxed">
            Geometric bob haircut, matte navy blazer, smartphone prop, and precision pinch gesture.
          </p>
        </div>
      </div>

      <div className="pt-4 border-t border-slate-100 flex justify-end">
        <button
          type="button"
          onClick={() => dialogRef.current?.close()}
          className="h-9 px-4 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-lg cursor-pointer transition"
        >
          Close
        </button>
      </div>
    </dialog>
  );
};
