import test from 'node:test';
import assert from 'node:assert/strict';
import {
  analyzeScriptConversion,
  detectScript,
  looksEnglish,
  romanToDevanagari,
  toDevanagari,
  urduToDevanagari,
} from './transliterate';

test('romanToDevanagari converts Hinglish & Roman Urdu cleanly while preserving director tags and acronyms', () => {
  const input = '[wave|warm] Assalamualaikum dosto! Aaj hum AI technology ke baare mein baat karenge.';
  const out = romanToDevanagari(input);
  assert.ok(out.startsWith('[wave|warm] '));
  assert.ok(out.includes('अस्सलामुअलैकुम'));
  assert.ok(out.includes('दोस्तो'));
  assert.ok(out.includes('एआई'));
  assert.ok(out.includes('टेक्नोलॉजी'));
  assert.ok(out.includes('करेंगे'));
});

test('urduToDevanagari converts Urdu Perso-Arabic script and normalises Urdu punctuation', () => {
  const input = '[wave|warm] السلام علیکم دوستو۔ آپ کیسے ہیں؟';
  const out = urduToDevanagari(input);
  assert.ok(out.startsWith('[wave|warm] '));
  assert.ok(out.includes('अस्सलाम अलैकुम दोस्तो।'));
  assert.ok(out.includes('आप कैसे हैं?'));
});

test('looksEnglish avoids misconverting genuine English sentences under auto-detect', () => {
  const english = 'Hello friends, today we welcome you to this presenter studio.';
  assert.equal(looksEnglish(english), true);
  assert.equal(toDevanagari(english), english);

  const hinglish = 'Assalamualaikum dosto, aaj hum naya system samajhte hain.';
  assert.equal(looksEnglish(hinglish), false);
  const converted = toDevanagari(hinglish);
  assert.ok(converted.includes('अस्सलामुअलैकुम'));
  assert.ok(converted.includes('हैं'));
});

test('analyzeScriptConversion reports script kind, word count, and needsConversion flag', () => {
  const info = analyzeScriptConversion('Aaj hum baat karenge');
  assert.equal(info.script, 'latin');
  assert.equal(info.words, 4);
  assert.equal(info.needsConversion, true);
  assert.equal(info.recommendedVoice, 'hi-IN');

  const urInfo = analyzeScriptConversion('آپ کیسے ہیں');
  assert.equal(urInfo.script, 'arabic');
  assert.equal(detectScript('آپ کیسے ہیں'), 'arabic');
  assert.equal(urInfo.recommendedVoice, 'ur-PK');
});
