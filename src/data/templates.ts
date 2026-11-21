import { AspectRatioType, FramingMode, StageBackgroundType, ScriptLanguageCode } from '../types/character';

export type TemplateCategory = 'explainer' | 'social' | 'product' | 'education' | 'announcement';

export interface VideoTemplate {
  id: string;
  title: string;
  description: string;
  category: TemplateCategory;
  categoryLabel: string;
  characterId: number;
  characterName: string;
  aspectRatio: AspectRatioType;
  framing: FramingMode;
  stageBg: StageBackgroundType;
  language: ScriptLanguageCode;
  voiceId: string;
  scriptText: string;
  tags: string[];
}

export const VIDEO_TEMPLATES: VideoTemplate[] = [
  {
    id: 'ai-news-explainer',
    title: 'AI Tech Explainer',
    description: 'Tech presenter breakdown for weekly AI updates, product launches or changelogs.',
    category: 'explainer',
    categoryLabel: 'Tech Explainer',
    characterId: 1, // Lucas
    characterName: 'Lucas Bennett',
    aspectRatio: '16:9',
    framing: 'portrait',
    stageBg: 'grid',
    language: 'en',
    voiceId: 'en-US-AndrewNeural',
    scriptText: '[wave|warm] Welcome back to the weekly AI briefing! [point-up|confident] Today we are unveiling our open-source 2D avatar pipeline. [open-palms|confident] Every frame renders completely offline on your own PC with zero subscription fees.',
    tags: ['Tech', 'Changelog', 'Wide', '16:9'],
  },
  {
    id: 'tiktok-reel-hook',
    title: 'Shorts / TikTok Viral Hook',
    description: 'Fast-paced vertical reel format with high energy gestures for mobile feeds.',
    category: 'social',
    categoryLabel: 'Viral Shorts',
    characterId: 2, // Maya
    characterName: 'Maya Lin',
    aspectRatio: '9:16',
    framing: 'full',
    stageBg: 'sky',
    language: 'en',
    voiceId: 'en-US-AvaNeural',
    scriptText: '[look-up-think|curious] Stop scrolling! You need to know this cartoon AI trick. [steeple|confident] You can turn any text into an animated cartoon character in under 30 seconds. [thumbs-up|confident] Hit follow for more free offline creator tools!',
    tags: ['Shorts', 'Reels', 'Vertical', '9:16'],
  },
  {
    id: 'hinglish-course-intro',
    title: 'Desi / Hinglish Course Intro',
    description: 'Authentic Roman Urdu/Hinglish intro ready for Urdu & Hindi tech creators.',
    category: 'education',
    categoryLabel: 'Course Intro',
    characterId: 15, // Dr. Sarah Walker
    characterName: 'Dr. Sarah Walker',
    aspectRatio: '16:9',
    framing: 'portrait',
    stageBg: 'cream',
    language: 'hi',
    voiceId: 'hi-IN-MadhurNeural',
    scriptText: '[wave|warm] Assalam-o-Alaikum dosto! Aaj ke is tutorial mein hum seekhenge cartoon animation banana. [steeple|confident] First step bilkul simple aur fast hai, koi expensive cloud API ki zaroorat nahi hai.',
    tags: ['Hinglish', 'Urdu', 'Hindi', 'Education'],
  },
  {
    id: 'product-saas-launch',
    title: 'SaaS Product Showcase',
    description: 'Crisp corporate announcement template for SaaS founders and marketers.',
    category: 'product',
    categoryLabel: 'Product Demo',
    characterId: 3, // Barnaby
    characterName: 'Barnaby Sterling',
    aspectRatio: '16:9',
    framing: 'portrait',
    stageBg: 'original-white',
    language: 'en',
    voiceId: 'en-GB-RyanNeural',
    scriptText: '[wave|warm] Good day everyone! I am thrilled to introduce Persona Studio. [point-up|confident] Designed for product marketing teams who want animated video presenters without studio booking costs.',
    tags: ['SaaS', 'Marketing', 'Corporate'],
  },
  {
    id: 'social-square-announcement',
    title: 'Square Social Announcement',
    description: 'Clean 1:1 square video crafted for LinkedIn, Instagram feed, and Twitter.',
    category: 'announcement',
    categoryLabel: 'Social Post',
    characterId: 7, // Kofi
    characterName: 'Kofi Mensah',
    aspectRatio: '1:1',
    framing: 'portrait',
    stageBg: 'card',
    language: 'en',
    voiceId: 'en-US-BrianNeural',
    scriptText: '[open-palms|confident] Big news from our creative team! [steeple|focused] We have completely redesigned our vector puppet engine for crisp 1080p exports. [thumbs-up|confident] Try it out today!',
    tags: ['LinkedIn', 'Instagram', 'Square', '1:1'],
  },
  {
    id: 'medical-health-tip',
    title: 'Health & Wellness Briefing',
    description: 'Calm and empathetic health or educational briefing format with medical framing.',
    category: 'education',
    categoryLabel: 'Health Tip',
    characterId: 15, // Zainab
    characterName: 'Dr. Zainab Raza',
    aspectRatio: '16:9',
    framing: 'portrait',
    stageBg: 'original-white',
    language: 'en',
    voiceId: 'en-US-JennyNeural',
    scriptText: '[wave|warm] Hello, here is your daily health reminder. [empathy-chest|empathetic] Take a short two-minute break, stretch your shoulders, and hydrate. [warm-smile|warm] Your well-being matters every single day.',
    tags: ['Healthcare', 'Empathetic', 'Wellness'],
  },
];
