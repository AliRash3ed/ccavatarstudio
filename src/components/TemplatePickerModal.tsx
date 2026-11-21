import React, { useState, useEffect, useRef } from 'react';
import { VIDEO_TEMPLATES, VideoTemplate, TemplateCategory } from '../data/templates';
import { Sparkles, Smartphone, Monitor, Square, ArrowRight, X } from 'lucide-react';

interface TemplatePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyTemplate: (template: VideoTemplate) => void;
}

export function TemplatePickerModal({ isOpen, onClose, onApplyTemplate }: TemplatePickerModalProps) {
  const [activeCategory, setActiveCategory] = useState<TemplateCategory | 'all'>('all');
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

  const filteredTemplates = activeCategory === 'all'
    ? VIDEO_TEMPLATES
    : VIDEO_TEMPLATES.filter((t) => t.category === activeCategory);

  const categories: { id: TemplateCategory | 'all'; label: string }[] = [
    { id: 'all', label: 'All Recipes' },
    { id: 'explainer', label: 'Tech Explainer' },
    { id: 'social', label: 'Shorts & Reels' },
    { id: 'education', label: 'Hinglish & Education' },
    { id: 'product', label: 'Product & SaaS' },
    { id: 'announcement', label: 'Social Square' },
  ];

  const getAspectIcon = (ratio: string) => {
    if (ratio === '9:16') return <Smartphone className="w-3.5 h-3.5" />;
    if (ratio === '1:1') return <Square className="w-3.5 h-3.5" />;
    return <Monitor className="w-3.5 h-3.5" />;
  };

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="template-modal-title"
      className="bg-white border border-slate-200 rounded-2xl shadow-xl p-6 text-slate-800 w-full max-w-4xl max-h-[90vh] overflow-y-auto backdrop:bg-slate-900/40 backdrop:backdrop-blur-sm"
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 id="template-modal-title" className="text-base font-bold text-slate-900">
              Video Recipes &amp; Templates
            </h2>
            <p className="text-xs text-slate-500">
              Instant starting points configured with presenter, script tags, aspect ratio, and stage background.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => dialogRef.current?.close()}
          aria-label="Close templates dialog"
          className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Category Filters */}
      <div className="flex flex-wrap items-center gap-1.5 py-4" role="tablist" aria-label="Template categories">
        {categories.map((c) => {
          const isActive = activeCategory === c.id;
          return (
            <button
              key={c.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveCategory(c.id)}
              className={`h-8 px-3 text-xs font-medium rounded-lg transition cursor-pointer ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200'
              }`}
            >
              {c.label}
            </button>
          );
        })}
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-2">
        {filteredTemplates.map((template) => (
          <div
            key={template.id}
            className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col justify-between space-y-3 hover:border-slate-300 shadow-xs transition"
          >
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-md">
                    {template.categoryLabel}
                  </span>
                  <h3 className="font-bold text-sm text-slate-900 mt-1.5">
                    {template.title}
                  </h3>
                </div>
                <div className="flex items-center gap-1 text-xs font-mono font-medium bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md border border-slate-200">
                  {getAspectIcon(template.aspectRatio)}
                  <span>{template.aspectRatio}</span>
                </div>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                {template.description}
              </p>

              {/* Script preview snippet */}
              <div className="p-2.5 bg-slate-50 border border-slate-200/80 rounded-lg text-xs font-mono text-slate-700 line-clamp-2">
                {template.scriptText}
              </div>

              {/* Presenter & Voice badges */}
              <div className="flex flex-wrap gap-1.5 pt-1 text-[11px]">
                <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200 font-medium">
                  {template.characterName}
                </span>
                <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200 font-mono">
                  {template.voiceId.split('-').slice(1).join('-')}
                </span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-400">
                {template.tags.map((tg) => (
                  <span key={tg}>#{tg}</span>
                ))}
              </div>
              <button
                type="button"
                onClick={() => {
                  onApplyTemplate(template);
                  dialogRef.current?.close();
                }}
                className="h-8 px-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-lg shadow-xs flex items-center gap-1.5 cursor-pointer transition"
              >
                <span>Use Recipe</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="pt-4 border-t border-slate-100 flex justify-end">
        <button
          type="button"
          onClick={() => dialogRef.current?.close()}
          className="h-9 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-lg cursor-pointer transition"
        >
          Close
        </button>
      </div>
    </dialog>
  );
}
