#!/usr/bin/env python3
"""
Toon Saz — OmniVoice Voice Clone, Real Rhubarb Lip-Sync & Faster-Whisper Pipeline
Supports dual Hugging Face tokens (HF_TOKEN primary + HF_TOKEN_2 fallback) for ZeroGPU quota resilience.
"""

import argparse
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
    from gradio_client import Client, handle_file
except ImportError:
    Client = None
    handle_file = None

try:
    from faster_whisper import WhisperModel
except ImportError:
    WhisperModel = None

RHUBARB_EXE = (
    os.environ.get("RHUBARB_PATH")
    or (
        str(Path(__file__).resolve().parent.parent / "tools" / "rhubarb" / "rhubarb")
        if (Path(__file__).resolve().parent.parent / "tools" / "rhubarb" / "rhubarb").exists()
        else shutil.which("rhubarb")
    )
)


def collect_hf_tokens(primary: str | None = None, fallback: str | None = None) -> list[str]:
    """Collect deduplicated HF tokens in priority order: CLI -> HF_TOKEN -> HF_TOKEN_2."""
    candidates = [
        primary,
        fallback,
        os.environ.get("HF_TOKEN"),
        os.environ.get("HF_TOKEN_2"),
        os.environ.get("HF_TOKEN_FALLBACK"),
    ]
    seen: set[str] = set()
    ordered: list[str] = []
    for raw in candidates:
        tok = (raw or "").strip()
        if tok and tok not in seen:
            seen.add(tok)
            ordered.append(tok)
    return ordered


def concatenate_wavs(wav_paths: list[Path], output_path: Path, silence_sec: float = 0.25):
    if not wav_paths:
        return
    with wave.open(str(wav_paths[0]), "rb") as first_wav:
        params = first_wav.getparams()
        sample_rate = params.framerate
        nchannels = params.nchannels
        sampwidth = params.sampwidth

    silence_frames = int(sample_rate * silence_sec)
    silence_bytes = b"\x00" * (silence_frames * nchannels * sampwidth)

    output_path.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(output_path), "wb") as outfile:
        outfile.setparams(params)
        for i, p in enumerate(wav_paths):
            with wave.open(str(p), "rb") as infile:
                outfile.writeframes(infile.readframes(infile.getnframes()))
            if i < len(wav_paths) - 1 and silence_sec > 0:
                outfile.writeframes(silence_bytes)


def _predict_single(
    text: str,
    lang: str,
    ref_audio: str,
    ref_text: str,
    speed: float,
    token: str | None,
):
    client = Client("k2-fsa/OmniVoice", token=token, verbose=False)
    return client.predict(
        text=text,
        lang=lang,
        ref_aud=handle_file(ref_audio),
        ref_text=ref_text,
        instruct="",
        ns=32,
        gs=2.0,
        dn=True,
        sp=speed,
        du=0.0,
        pp=True,
        po=True,
        api_name="/_clone_fn",
    )


def predict_omnivoice(
    text: str,
    lang: str,
    ref_audio: str,
    ref_text: str,
    speed: float = 1.0,
    hf_token: str | None = None,
    hf_token_2: str | None = None,
):
    if Client is None or handle_file is None:
        raise RuntimeError("Install gradio_client first: pip install gradio_client")

    tokens = collect_hf_tokens(hf_token, hf_token_2)
    attempts: list[str | None] = tokens if tokens else [None]
    last_err: Exception | None = None

    for idx, tok in enumerate(attempts):
        label = f"Token #{idx + 1}" if tok else "Anonymous"
        try:
            res = _predict_single(text, lang, ref_audio, ref_text, speed, tok)
            temp_wav = res[0] if isinstance(res, (tuple, list)) else res
            if not temp_wav or not os.path.exists(str(temp_wav)):
                raise RuntimeError(f"OmniVoice returned empty output ({label})")
            print(f"[+] OmniVoice synthesis succeeded via {label}")
            return res
        except Exception as err:
            last_err = err
            print(f"[!] OmniVoice attempt via {label} failed: {err}", file=sys.stderr)
            if idx + 1 < len(attempts):
                print(f"[*] Falling back to Token #{idx + 2}...", file=sys.stderr)

    raise RuntimeError(f"All HF tokens failed for OmniVoice: {last_err}")


def main():
    parser = argparse.ArgumentParser(description="Toon Saz — OmniVoice Voice Clone + Rhubarb Pipeline")
    parser.add_argument("--text", type=str, help="Text to speak")
    parser.add_argument("--script", type=str, help="Script text file")
    parser.add_argument("--target-lang", type=str, default="English")
    parser.add_argument("--output", type=str, default="voiceover.wav")
    parser.add_argument("--speed", type=float, default=1.0)
    parser.add_argument("--ref-audio", type=str, required=True, help="Path to reference voice WAV/MP3")
    parser.add_argument("--ref-text", type=str, default="", help="Transcript of reference audio")
    parser.add_argument("--hf-token", type=str, default=None, help="Primary HF token override")
    parser.add_argument("--hf-token-2", type=str, default=None, help="Fallback HF token override")
    parser.add_argument("--recognizer", type=str, default="phonetic", choices=["phonetic", "pocketSphinx"])
    args = parser.parse_args()

    raw_text = args.text or (Path(args.script).read_text(encoding="utf-8").strip() if args.script else "")
    clean_text = re.sub(r"\[[^\]]+\]\s*", " ", raw_text).strip()
    if not clean_text:
        print("[!] Error: Provide --text or --script")
        sys.exit(1)

    tokens = collect_hf_tokens(args.hf_token, args.hf_token_2)
    print(f"[*] Hugging Face tokens configured: {len(tokens)} (primary + automatic fallback enabled)")

    out_wav = Path(args.output).resolve()
    out_wav.parent.mkdir(parents=True, exist_ok=True)
    temp_wav, status = predict_omnivoice(
        clean_text,
        args.target_lang,
        args.ref_audio,
        args.ref_text,
        args.speed,
        hf_token=args.hf_token,
        hf_token_2=args.hf_token_2,
    )
    if not temp_wav or not os.path.exists(temp_wav):
        raise RuntimeError(f"OmniVoice error: {status}")
    shutil.copyfile(temp_wav, out_wav)
    print(f"[+] Synthesized cloned audio: {out_wav}")

    if RHUBARB_EXE:
        rhubarb_json = out_wav.with_suffix(".rhubarb.json")
        subprocess.run(
            [str(RHUBARB_EXE), "-f", "json", "-r", args.recognizer, "-o", str(rhubarb_json), str(out_wav)],
            check=True,
        )
        print(f"[+] Rhubarb mouthCues JSON: {rhubarb_json}")


if __name__ == "__main__":
    main()
