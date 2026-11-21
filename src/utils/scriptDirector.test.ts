import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseTag,
  autoAddDirectingCues,
  mapWordToVisemes,
  compileScriptTimeline,
  parseAlignmentInput,
  rhubarbCodeToMouthSprite,
  exportRhubarbJson,
  detectScriptLanguage,
  coalesceMouthCues,
  findMouthCueAtTime,
} from './scriptDirector';

test('parseTag extracts recognized gestures and emotions', () => {
  const tag1 = parseTag('[steeple|warm]');
  assert.equal(tag1.gesture, 'steeple');
  assert.equal(tag1.emotion, 'warm');

  const tag2 = parseTag('[wave|friendly]');
  assert.equal(tag2.gesture, 'wave');
  assert.equal(tag2.emotion, 'warm');

  const tag3 = parseTag('[empathy-chest|thoughtful]');
  assert.equal(tag3.gesture, 'empathy-chest');
  assert.equal(tag3.emotion, 'curious');
});

test('mapWordToVisemes tokenizes phonetic digraphs and produces smooth Rhubarb viseme sequences', () => {
  const visemesPop = mapWordToVisemes('pop', 0, 0.36);
  assert.equal(visemesPop[0].viseme, 'bmp'); // 'p' -> bilabial closed
  assert.equal(visemesPop[1].viseme, 'talk-o'); // 'o' -> rounded vowel
  assert.equal(visemesPop[2].viseme, 'bmp'); // 'p' -> bilabial closed

  const visemesPhone = mapWordToVisemes('phone', 0, 0.4);
  assert.equal(visemesPhone[0].viseme, 'fv'); // 'ph' digraph -> labiodental
  assert.equal(visemesPhone[1].viseme, 'talk-o'); // 'o'

  const visemesHello = mapWordToVisemes('hello', 0, 0.5);
  assert.ok(visemesHello.some((v) => v.viseme === 'l'));
  assert.equal(visemesHello[visemesHello.length - 1].viseme, 'talk-o');
});

test('parseAlignmentInput parses Rhubarb JSON, Rhubarb TSV, and Faster-Whisper timestamps with sub-word phonemes', () => {
  const rhubarbJson = JSON.stringify({
    mouthCues: [
      { start: 0.0, end: 0.15, value: 'X' },
      { start: 0.15, end: 0.35, value: 'C' },
      { start: 0.35, end: 0.55, value: 'G' },
    ],
  });
  const parsedJson = parseAlignmentInput(rhubarbJson);
  assert.equal(parsedJson.mode, 'rhubarb');
  assert.equal(parsedJson.cues.length, 3);
  assert.equal(parsedJson.cues[1].mouth, rhubarbCodeToMouthSprite('C'));
  assert.equal(parsedJson.cues[2].mouth, 'fv');

  const rhubarbTsv = `0.00\t0.10\tX\n0.10\t0.30\tA\n0.30\t0.55\tE`;
  const parsedTsv = parseAlignmentInput(rhubarbTsv);
  assert.equal(parsedTsv.mode, 'rhubarb');
  assert.equal(parsedTsv.cues.length, 3);
  assert.equal(parsedTsv.cues[1].mouth, 'bmp');
  assert.equal(parsedTsv.cues[2].mouth, 'talk-o');

  const whisperTxt = `[0.00s -> 0.60s] Welcome\n[0.60s -> 1.10s] team.`;
  const parsedWhisper = parseAlignmentInput(whisperTxt);
  assert.equal(parsedWhisper.mode, 'whisper');
  assert.equal(parsedWhisper.wordCount, 2);
  // Multi-phoneme expansion for "Welcome" produces more than 2 cues!
  assert.ok(parsedWhisper.cues.length > 3);
});

test('autoAddDirectingCues inserts tags for greeting and sequential discourse', () => {
  const input = 'Hello team. First, we review results. Second, we plan growth. Finally, questions?';
  const directed = autoAddDirectingCues(input);

  assert.ok(directed.includes('[wave|warm]'));
  assert.ok(directed.includes('[count-1|focused]'));
  assert.ok(directed.includes('[count-2|focused]'));
  assert.ok(directed.includes('[count-3|confident]'));
});

test('compileScriptTimeline generates Rhubarb cues, word cues, and valid Rhubarb JSON export', () => {
  const script = '[wave|warm] Hello world! [steeple|confident] Today we present our findings.';
  const compiled = compileScriptTimeline(script, 150, 0.25);

  assert.ok(compiled.totalDuration > 1);
  assert.ok(compiled.wordCues.length >= 7);
  assert.ok(compiled.timelineCues.length >= 2);
  assert.ok(compiled.rhubarbCues.length > compiled.wordCues.length);
  assert.equal(compiled.timelineCues[1].gesture, 'wave');

  const exported = JSON.parse(exportRhubarbJson(compiled.rhubarbCues, compiled.totalDuration));
  assert.ok(Array.isArray(exported.mouthCues));
  assert.equal(exported.mouthCues.length, compiled.rhubarbCues.length);
});

test('detectScriptLanguage and mapWordToVisemes support Hindi, Urdu, Arabic, Japanese, Spanish, French, Turkish, Korean, and Russian', () => {
  assert.equal(detectScriptLanguage('नमस्ते दोस्तों!'), 'hi');
  assert.equal(detectScriptLanguage('السلام علیکم دوستو!'), 'ur');
  assert.equal(detectScriptLanguage('مرحبا بكم في الاستوديو!'), 'ar');
  assert.equal(detectScriptLanguage('こんにちは！'), 'ja');
  assert.equal(detectScriptLanguage('¡Hola amigos! ¿Cómo están?'), 'es');
  assert.equal(detectScriptLanguage('Bonjour tout le monde, merci pour votre attention.'), 'fr');
  assert.equal(detectScriptLanguage('Merhaba arkadaşlar, teşekkür ederim.'), 'tr');
  assert.equal(detectScriptLanguage('안녕하세요 여러분!'), 'ko');
  assert.equal(detectScriptLanguage('Привет друзья!'), 'ru');

  const hiVisemes = mapWordToVisemes('नमस्ते', 0, 0.6);
  assert.ok(hiVisemes.length >= 2);
  assert.ok(hiVisemes.some((v) => v.viseme === 'bmp' || v.viseme === 'l'));

  const urVisemes = mapWordToVisemes('مرحبا', 0, 0.5);
  assert.ok(urVisemes.length >= 2);
  assert.equal(urVisemes[0].viseme, 'bmp'); // 'م' -> bilabial closed

  const jaVisemes = mapWordToVisemes('こんにちは', 0, 0.6);
  assert.ok(jaVisemes.length >= 2);
  assert.equal(jaVisemes[0].viseme, 'talk-o'); // 'こ' -> O vowel

  const directedHi = autoAddDirectingCues('नमस्ते दोस्तों। पहला कदम बहुत महत्वपूर्ण है।');
  assert.ok(directedHi.includes('[wave|warm]'));
  assert.ok(directedHi.includes('[count-1|focused]'));
});

test('coalesceMouthCues smooths adjacent duplicates and micro-glitches while findMouthCueAtTime performs binary lookup', () => {
  const raw = [
    { start: 0.0, end: 0.1, value: 'X' as const, mouth: 'neutral' as const },
    { start: 0.1, end: 0.2, value: 'X' as const, mouth: 'neutral' as const },
    { start: 0.2, end: 0.35, value: 'C' as const, mouth: 'aei' as const },
    { start: 0.35, end: 0.37, value: 'D' as const, mouth: 'ah' as const }, // 20ms flutter -> absorbed
    { start: 0.37, end: 0.55, value: 'E' as const, mouth: 'talk-o' as const },
  ];
  const coalesced = coalesceMouthCues(raw, 0.042);
  assert.equal(coalesced.length, 3);
  assert.equal(coalesced[0].end, 0.2);
  assert.equal(coalesced[1].end, 0.37);

  assert.equal(findMouthCueAtTime(coalesced, 0.05)?.value, 'X');
  assert.equal(findMouthCueAtTime(coalesced, 0.28)?.mouth, 'aei');
  assert.equal(findMouthCueAtTime(coalesced, 0.45)?.mouth, 'talk-o');
  assert.equal(findMouthCueAtTime(coalesced, 1.5), undefined);
});

test('autoAddDirectingCues splits long sentences into clauses and never emits consecutive identical tags', () => {
  const longScript =
    'Today we are going to explain how our full presenter studio helps creators publish videos quickly and smoothly without any robotic pauses or duplicate tags anywhere in the timeline.';
  const directed = autoAddDirectingCues(longScript);
  const tags = directed.match(/\[[^\]]+\]/g) || [];
  assert.ok(tags.length >= 2, 'Long sentence should split into multiple 1-5s clause cues');
  for (let i = 1; i < tags.length; i++) {
    assert.notEqual(tags[i], tags[i - 1], `Adjacent duplicate tag found at index ${i}: ${tags[i]}`);
  }
});

