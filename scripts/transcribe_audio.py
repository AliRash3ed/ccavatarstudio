#!/usr/bin/env python3
"""
Transcribe local audio or extracted video audio using faster-whisper with word timestamps.
Outputs JSON: { "text": "...", "language": "...", "words": [{ "word": "...", "start": 0.0, "end": 0.25 }] }
"""
import argparse
import json
import math
import os
import re
import sys
from pathlib import Path


def parse_args():
    parser = argparse.ArgumentParser(
        description="Transcribe local Toon Saz audio with faster-whisper word timestamps."
    )
    parser.add_argument("--audio", required=True, help="Local audio or voiced-video file")
    parser.add_argument("--output", required=True, help="Destination JSON file")
    parser.add_argument(
        "--language",
        default="auto",
        help="ISO language code or 'auto' detection (default: auto)",
    )
    return parser.parse_args()


def transcribe(audio_path: Path, language: str):
    try:
        from faster_whisper import WhisperModel
    except ImportError as error:
        raise RuntimeError(
            "faster-whisper is not installed for Python. Run `pip install faster-whisper` locally."
        ) from error

    model_name = os.environ.get("AVATAR_WHISPER_MODEL", "base").strip() or "base"
    try:
        model = WhisperModel(model_name, device="cpu", compute_type="int8")
    except Exception as error:
        raise RuntimeError(
            f"Unable to load faster-whisper model {model_name!r}: {error}"
        ) from error

    segments, info = model.transcribe(
        str(audio_path),
        language=None if language == "auto" else language,
        beam_size=5,
        temperature=0.0,
        word_timestamps=True,
        vad_filter=False,
        condition_on_previous_text=True,
    )
    segments = list(segments)

    words = []
    previous_end = 0.0
    for segment in segments:
        for item in segment.words or ():
            word = (item.word or "").strip()
            try:
                start = float(item.start)
                end = float(item.end)
            except (TypeError, ValueError):
                continue
            if not word or not math.isfinite(start) or not math.isfinite(end):
                continue
            start = max(0.0, previous_end, start)
            if end <= start:
                continue
            words.append({"word": word, "start": round(start, 4), "end": round(end, 4)})
            previous_end = end

    if not words:
        raise RuntimeError("No timestamped speech was detected in the supplied audio.")

    text = "".join(segment.text or "" for segment in segments).strip() or " ".join(w["word"] for w in words)
    return {
        "text": text,
        "language": str(getattr(info, "language", None) or language),
        "words": words,
    }


def main():
    args = parse_args()
    if args.language != "auto" and not re.fullmatch(r"[a-z]{2,3}", args.language):
        raise RuntimeError("Language must be 'auto' or a two/three letter ISO language code.")

    audio_path = Path(args.audio).expanduser().resolve()
    output_path = Path(args.output).expanduser().resolve()
    if not audio_path.is_file():
        raise RuntimeError(f"Audio input is not readable: {audio_path}")

    result = transcribe(audio_path, args.language)
    output_path.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(f"transcribe_audio: {error}", file=sys.stderr)
        raise SystemExit(1)
