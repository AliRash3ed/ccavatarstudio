import React from 'react';
import {
  Github,
  Linkedin,
  Twitter,
  Instagram,
  Facebook,
  Heart,
  GitFork,
  Star,
  ExternalLink,
  Code2,
  Sparkles,
} from 'lucide-react';
import { CcAvatarLogo } from './CcAvatarLogo';

export const Footer: React.FC = () => {
  const socialLinks = [
    {
      name: 'GitHub',
      url: 'https://github.com/AliRash3ed',
      handle: '@AliRash3ed',
      icon: Github,
      color: 'hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800',
    },
    {
      name: 'LinkedIn',
      url: 'https://www.linkedin.com/in/alirasheedbhatti',
      handle: 'Ali Rasheed Bhatti',
      icon: Linkedin,
      color: 'hover:text-[#0A66C2] hover:bg-blue-50 dark:hover:bg-blue-950/40',
    },
    {
      name: 'X (Twitter)',
      url: 'https://x.com/AliRasheedBti',
      handle: '@AliRasheedBti',
      icon: Twitter,
      color: 'hover:text-sky-500 hover:bg-sky-50 dark:hover:bg-sky-950/40',
    },
    {
      name: 'Instagram',
      url: 'https://www.instagram.com/this_is_ali_r/',
      handle: '@this_is_ali_r',
      icon: Instagram,
      color: 'hover:text-pink-600 hover:bg-pink-50 dark:hover:bg-pink-950/40',
    },
    {
      name: 'Facebook',
      url: 'https://www.facebook.com/profile.php?id=61579456175357',
      handle: 'Ali Rasheed',
      icon: Facebook,
      color: 'hover:text-[#1877F2] hover:bg-blue-50 dark:hover:bg-blue-950/40',
    },
  ];

  return (
    <footer className="w-full bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 mt-12 py-10 px-4 lg:px-8 transition-colors">
      <div className="max-w-[1520px] mx-auto space-y-8">
        {/* Community Contribution & Creator Banner */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-50/80 via-white to-purple-50/60 dark:from-indigo-950/40 dark:via-slate-900 dark:to-purple-950/30 border border-indigo-100 dark:border-indigo-900/50 p-6 sm:p-8">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div className="space-y-3 max-w-3xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-100/80 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 text-xs font-semibold">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>100% Free &amp; Open Source</span>
                <span className="text-indigo-300 dark:text-indigo-600">•</span>
                <span>MIT License</span>
              </div>

              <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                Built by <span className="text-indigo-600 dark:text-indigo-400">Ali Rasheed Bhatti</span>
              </h3>

              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                I am a junior-level developer still in my learning phase, and I built{' '}
                <strong className="text-slate-900 dark:text-white font-semibold">ccavatarstudio</strong> to give
                creators worldwide access to free, offline cartoon presenter video generation without paid subscriptions.
                If you find bugs, have ideas, or want to improve the codebase,{' '}
                <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                  make sure to contribute and open pull requests
                </span>
                ! Every contribution, PR, and piece of feedback helps improve this tool for everyone.
              </p>
            </div>

            <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 shrink-0">
              <a
                href="https://github.com/AliRash3ed"
                target="_blank"
                rel="noopener noreferrer"
                className="h-10 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-sm flex items-center gap-2 transition cursor-pointer"
              >
                <GitFork className="w-4 h-4" />
                <span>Contribute on GitHub</span>
                <ExternalLink className="w-3.5 h-3.5 opacity-70" />
              </a>

              <a
                href="https://github.com/AliRash3ed"
                target="_blank"
                rel="noopener noreferrer"
                className="h-10 px-4 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs rounded-xl shadow-xs flex items-center gap-2 transition cursor-pointer"
              >
                <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                <span>Star on GitHub</span>
              </a>
            </div>
          </div>
        </div>

        {/* Lower Row: Brand Lockup & Social Links */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pt-2 border-t border-slate-100 dark:border-slate-800/80">
          <div className="flex items-center gap-3">
            <CcAvatarLogo size={28} />
            <div className="text-xs text-slate-500 dark:text-slate-400">
              <span>© {new Date().getFullYear()} ccavatarstudio • Crafted with </span>
              <Heart className="w-3.5 h-3.5 inline text-rose-500 fill-rose-500 mx-0.5" />
              <span> by </span>
              <a
                href="https://github.com/AliRash3ed"
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold text-slate-800 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 transition"
              >
                Ali Rasheed Bhatti
              </a>
            </div>
          </div>

          {/* Social Profiles Bar */}
          <div className="flex flex-wrap items-center gap-1.5">
            {socialLinks.map((item) => {
              const Icon = item.icon;
              return (
                <a
                  key={item.name}
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${item.name} - ${item.handle}`}
                  title={`${item.name}: ${item.handle}`}
                  className={`h-9 px-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 flex items-center gap-2 text-xs font-medium transition cursor-pointer shadow-xs ${item.color}`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="hidden md:inline">{item.name}</span>
                </a>
              );
            })}
          </div>
        </div>
      </div>
    </footer>
  );
};
