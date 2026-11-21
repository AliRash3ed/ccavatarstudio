#!/usr/bin/env python3
"""
Toon Saz — Multilingual Edge Neural TTS with Per-Emotion Prosody (Pitch/Rate),
Tight Silence Control (<= 0.3s), Real Rhubarb Lip-Sync CLI, and Faster-Whisper Alignment.
Supports: English, Hindi (hi-IN), Urdu (ur-PK), Arabic (ar-SA/ar-EG), Japanese (ja-JP), Spanish (es-ES/es-MX).
"""

import argparse
import asyncio
import json
import os
import re
import shutil
import subprocess
import sys
import wave
from pathlib import Path

if hasattr(sys.stdout, "reconfigure") and (sys.stdout.encoding or "").lower() != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure") and (sys.stderr.encoding or "").lower() != "utf-8":
    sys.stderr.reconfigure(encoding="utf-8")

try:
    import edge_tts
except ImportError:
    edge_tts = None

try:
    from faster_whisper import WhisperModel
except ImportError:
    WhisperModel = None

FFMPEG_EXE = os.environ.get("FFMPEG_PATH") or shutil.which("ffmpeg") or "ffmpeg"
RHUBARB_EXE = (
    os.environ.get("RHUBARB_PATH")
    or (
        str(Path(__file__).resolve().parent.parent / "tools" / "rhubarb" / "rhubarb")
        if (Path(__file__).resolve().parent.parent / "tools" / "rhubarb" / "rhubarb").exists()
        else shutil.which("rhubarb")
    )
)

VOICE_REGISTRY = {
    ("en", "male", "andrew"): "en-US-AndrewMultilingualNeural",
    ("en", "female", "ava"): "en-US-AvaMultilingualNeural",
    ("en", "male", "ryan"): "en-GB-RyanNeural",
    ("en", "female", "sonia"): "en-GB-SoniaNeural",
    ("hi", "male", "madhur"): "hi-IN-MadhurNeural",
    ("hi", "female", "swara"): "hi-IN-SwaraNeural",
    ("ur", "male", "asad"): "ur-PK-AsadNeural",
    ("ur", "female", "uzma"): "ur-PK-UzmaNeural",
    ("ar", "male", "hamed"): "ar-SA-HamedNeural",
    ("ar", "female", "zariyah"): "ar-SA-ZariyahNeural",
    ("ar", "female", "salma"): "ar-EG-SalmaNeural",
    ("es", "male", "alvaro"): "es-ES-AlvaroNeural",
    ("es", "female", "elvira"): "es-ES-ElviraNeural",
    ("es", "female", "dalia"): "es-MX-DaliaNeural",
    ("ja", "male", "keita"): "ja-JP-KeitaNeural",
    ("ja", "female", "nanami"): "ja-JP-NanamiNeural",
    ("fr", "male", "henri"): "fr-FR-HenriNeural",
}

EMOTION_PROSODY = {
    "neutral": ("+0%", "+0Hz"),
    "warm": ("+2%", "+3Hz"),
    "empathetic": ("-6%", "-3Hz"),
    "shocked": ("+8%", "+8Hz"),
    "focused": ("-2%", "-1Hz"),
    "curious": ("+1%", "+4Hz"),
    "confident": ("+3%", "+2Hz"),
}


def resolve_lang_code(lang: str) -> str:
    l = lang.lower().strip()
    if l.startswith("hi"):
        return "hi"
    if l.startswith("ur"):
        return "ur"
    if l.startswith("ar"):
        return "ar"
    if l.startswith("es") or l.startswith("span"):
        return "es"
    if l.startswith("ja") or l.startswith("jp"):
        return "ja"
    if l.startswith("fr"):
        return "fr"
    if l.startswith("de") or l.startswith("ger"):
        return "de"
    if l.startswith("pt") or l.startswith("por"):
        return "pt"
    if l.startswith("tr") or l.startswith("tur"):
        return "tr"
    if l.startswith("ko") or l.startswith("kor"):
        return "ko"
    if l.startswith("zh") or l.startswith("chi") or l.startswith("man"):
        return "zh"
    if l.startswith("ru") or l.startswith("rus"):
        return "ru"
    if l.startswith("id") or l.startswith("ind"):
        return "id"
    if l.startswith("bn") or l.startswith("ben"):
        return "bn"
    if l.startswith("ta") or l.startswith("tam"):
        return "ta"
    if re.fullmatch(r"[a-z]{2}(-[a-z0-9]{2,4})?", l):
        return l.split("-")[0]
    return "en"


def resolve_voice(lang: str, gender: str, voice_pref: str | None = None) -> str:
    pref = (voice_pref or "").strip()
    if pref and "-" in pref and pref.endswith("Neural"):
        return pref

    code = resolve_lang_code(lang)
    gen = "female" if gender.lower().startswith("f") else "male"
    pref_key = pref.lower()
    if (code, gen, pref_key) in VOICE_REGISTRY:
        return VOICE_REGISTRY[(code, gen, pref_key)]

    for (c, g, _), full_name in VOICE_REGISTRY.items():
        if c == code and g == gen:
            return full_name
    for (c, _, _), full_name in VOICE_REGISTRY.items():
        if c == code:
            return full_name
    return "en-US-AndrewMultilingualNeural"


def strip_director_tags(text: str) -> str:
    return re.sub(r"\[[^\]]+\]\s*", " ", text).strip()


def split_into_tagged_phrases(text: str) -> list[tuple[str, str]]:
    """Splits script into (spoken_phrase, emotion_id) keeping [gesture|emotion] prosody context."""
    blocks = [b.strip() for b in re.split(r"(?=\[)|(?<=[.?!।؟。！？\n])\s+", text) if b.strip()]
    results: list[tuple[str, str]] = []
    current_emotion = "neutral"
    for block in blocks:
        m = re.match(r"^\[([^\]]+)\]\s*(.*)$", block, flags=re.S)
        if m:
            parts = [p.strip().lower() for p in m.group(1).split("|")]
            if len(parts) > 1 and parts[1] in EMOTION_PROSODY:
                current_emotion = parts[1]
            spoken = m.group(2).strip()
        else:
            spoken = block.strip()
        spoken = re.sub(r"\[[^\]]+\]\s*", "", spoken).strip()
        if spoken:
            results.append((spoken, current_emotion))
    return results


async def synthesize_phrase_to_mp3(
    text: str,
    voice: str,
    mp3_path: Path,
    rate: str = "+0%",
    pitch: str = "+0Hz",
):
    if edge_tts is None:
        raise RuntimeError("Python package 'edge-tts' is not installed. Run: pip install edge-tts")
    try:
        communicate = edge_tts.Communicate(text, voice, rate=rate, pitch=pitch)
        await communicate.save(str(mp3_path))
    except Exception:
        communicate = edge_tts.Communicate(text, voice, rate=rate)
        await communicate.save(str(mp3_path))


def convert_mp3_to_wav(mp3_path: Path, wav_path: Path):
    cmd = [
        FFMPEG_EXE, "-y", "-i", str(mp3_path),
        "-ar", "24000", "-ac", "1", "-c:a", "pcm_s16le",
        str(wav_path),
    ]
    subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)


def trim_edge_silence(wav_path: Path, trimmed_wav_path: Path):
    cmd = [
        FFMPEG_EXE, "-y", "-i", str(wav_path),
        "-af",
        "silenceremove=start_periods=1:start_duration=0.02:start_threshold=-40dB:detection=peak,"
        "areverse,"
        "silenceremove=start_periods=1:start_duration=0.02:start_threshold=-40dB:detection=peak,"
        "areverse",
        str(trimmed_wav_path),
    ]
    subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)


def concatenate_wavs_with_fixed_pause(wav_paths: list[Path], output_path: Path, pause_sec: float = 0.25):
    if not wav_paths:
        return
    with wave.open(str(wav_paths[0]), "rb") as first:
        params = first.getparams()
        sample_rate = params.framerate
        nchannels = params.nchannels
        sampwidth = params.sampwidth

    pause_frames = int(sample_rate * min(max(pause_sec, 0.02), 0.40))
    silence_bytes = b"\x00" * (pause_frames * nchannels * sampwidth)

    output_path.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(output_path), "wb") as out:
        out.setparams(params)
        for i, p in enumerate(wav_paths):
            with wave.open(str(p), "rb") as inf:
                out.writeframes(inf.readframes(inf.getnframes()))
            if i < len(wav_paths) - 1:
                out.writeframes(silence_bytes)


def generate_edge_voiceover(text: str, output_wav: Path, voice: str, max_pause_sec: float = 0.25) -> Path:
    tagged_phrases = split_into_tagged_phrases(text)
    temp_dir = output_wav.parent / f"_temp_edge_{output_wav.stem}"
    temp_dir.mkdir(parents=True, exist_ok=True)

    print(f"[*] Edge TTS synthesizing {len(tagged_phrases)} emotional phrase(s) with voice '{voice}'...")
    trimmed_wavs = []

    for i, (phrase, emo) in enumerate(tagged_phrases, 1):
        rate, pitch = EMOTION_PROSODY.get(emo, ("+0%", "+0Hz"))
        raw_mp3 = temp_dir / f"p_{i:03d}.mp3"
        raw_wav = temp_dir / f"p_{i:03d}_raw.wav"
        trim_wav = temp_dir / f"p_{i:03d}_trim.wav"

        asyncio.run(synthesize_phrase_to_mp3(phrase, voice, raw_mp3, rate=rate, pitch=pitch))
        convert_mp3_to_wav(raw_mp3, raw_wav)
        trim_edge_silence(raw_wav, trim_wav)
        trimmed_wavs.append(trim_wav)

    concatenate_wavs_with_fixed_pause(trimmed_wavs, output_wav, pause_sec=max_pause_sec)
    shutil.rmtree(temp_dir, ignore_errors=True)
    print(f"[+] Master voiceover generated: {output_wav}")
    return output_wav


def run_rhubarb_cli(audio_path: Path, recognizer: str = "phonetic", dialog_text: str | None = None) -> Path | None:
    if not RHUBARB_EXE:
        print("[!] Rhubarb CLI binary not found on PATH or tools/rhubarb/rhubarb; skipping Rhubarb step.")
        return None
    out_json = audio_path.with_suffix(".rhubarb.json")
    cmd = [str(RHUBARB_EXE), "-f", "json", "-r", recognizer, "-o", str(out_json)]
    dialog_file = None
    if dialog_text and recognizer == "pocketSphinx":
        dialog_file = audio_path.with_suffix(".dialog.txt")
        dialog_file.write_text(strip_director_tags(dialog_text), encoding="utf-8")
        cmd.extend(["-d", str(dialog_file)])
    cmd.append(str(audio_path))
    print(f"[*] Running Rhubarb Lip-Sync CLI ({recognizer}): {' '.join(cmd)}")
    subprocess.run(cmd, check=True)
    if dialog_file and dialog_file.exists():
        dialog_file.unlink()
    print(f"[+] Rhubarb mouthCues JSON saved: {out_json}")
    return out_json


def transcribe_word_level(audio_path: Path, language_code: str = "en", model_size: str = "base"):
    if WhisperModel is None:
        print("[!] faster-whisper not installed; skipping Faster-Whisper word-level alignment.")
        return None, None
    print(f"[*] Running Faster-Whisper ({model_size}, lang='{language_code}')...")
    model = WhisperModel(model_size, device="cpu", compute_type="int8")

    segments, info = model.transcribe(
        str(audio_path),
        language=language_code,
        beam_size=1,
        best_of=1,
        vad_filter=False,
        condition_on_previous_text=False,
        word_timestamps=True,
    )

    segment_rows = []
    word_lines = []
    for segment in segments:
        segment_rows.append({
            "start": round(float(segment.start), 2),
            "end": round(float(segment.end), 2),
            "text": segment.text.strip(),
        })
        for word in segment.words or []:
            if word.start is None or word.end is None:
                continue
            wtext = (word.word or "").strip()
            if wtext:
                word_lines.append(f"[{float(word.start):.2f}s -> {float(word.end):.2f}s] {wtext}")

    txt_path = audio_path.with_name(audio_path.stem + ".faster-whisper-word-level.txt")
    json_path = audio_path.with_name(audio_path.stem + ".faster-whisper-segments.json")
    txt_path.write_text("\n".join(word_lines), encoding="utf-8")
    json_path.write_text(
        json.dumps(
            {
                "duration": None if info.duration is None else round(float(info.duration), 2),
                "language": info.language,
                "segments": segment_rows,
            },
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )
    print(f"[+] Word-level transcript: {txt_path}")
    return txt_path, json_path


def main():
    parser = argparse.ArgumentParser(description="Toon Saz — Multilingual Edge TTS + Rhubarb + Faster-Whisper Pipeline")
    parser.add_argument("--text", type=str, help="Text to speak")
    parser.add_argument("--script", type=str, help="Path to text script file")
    parser.add_argument("--target-lang", type=str, default="English")
    parser.add_argument("--gender", type=str, default="male", choices=["male", "female"])
    parser.add_argument("--voice", type=str, help="Voice short key or full Neural voice ID")
    parser.add_argument("--output", type=str, default="edge_voiceover.wav")
    parser.add_argument("--max-pause", type=float, default=0.25)
    parser.add_argument("--recognizer", type=str, default="phonetic", choices=["phonetic", "pocketSphinx"])
    parser.add_argument("--skip-whisper", action="store_true")
    args = parser.parse_args()

    text = args.text or (Path(args.script).read_text(encoding="utf-8").strip() if args.script else "")
    if not text:
        print("[!] Error: Specify --text or --script")
        sys.exit(1)

    lang_code = resolve_lang_code(args.target_lang)
    voice = resolve_voice(args.target_lang, args.gender, args.voice)
    recognizer = "phonetic" if lang_code != "en" else args.recognizer

    out_path = Path(args.output).resolve()
    generate_edge_voiceover(text, out_path, voice=voice, max_pause_sec=args.max_pause)
    run_rhubarb_cli(out_path, recognizer=recognizer, dialog_text=text)
    if not args.skip_whisper:
        transcribe_word_level(out_path, language_code=lang_code)
    print("\n[SUCCESS] Toon Saz Edge TTS + Rhubarb pipeline completed!")


if __name__ == "__main__":
    main()
