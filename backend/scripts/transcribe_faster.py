#!/usr/bin/env python3
import sys
import os
from faster_whisper import WhisperModel


def format_time(t: float) -> str:
    h = int(t // 3600)
    m = int((t % 3600) // 60)
    s = int(t % 60)
    ms = int((t - int(t)) * 1000)
    return f"{h:02}:{m:02}:{s:02},{ms:03}"


def main():
    if len(sys.argv) < 3:
        print("Usage: python3 transcribe_faster.py input.wav output.srt [model] [language]")
        sys.exit(1)

    audio_file = sys.argv[1]
    srt_file = sys.argv[2]
    model_name = sys.argv[3] if len(sys.argv) > 3 else "small"
    language = sys.argv[4] if len(sys.argv) > 4 else "auto"

    device = os.environ.get("WHISPER_FASTER_DEVICE", "cpu")
    compute_type = os.environ.get("WHISPER_FASTER_COMPUTE_TYPE", "int8")

    if not os.path.exists(audio_file):
        print(f"Error: input file '{audio_file}' not found.")
        sys.exit(1)

    model = WhisperModel(model_name, device=device, compute_type=compute_type)

    if language and language != "auto":
        segments, _info = model.transcribe(audio_file, language=language)
    else:
        segments, _info = model.transcribe(audio_file)

    with open(srt_file, "w", encoding="utf-8") as f:
        for i, segment in enumerate(segments, start=1):
            start = format_time(segment.start)
            end = format_time(segment.end)
            text = segment.text.strip()
            f.write(f"{i}\n{start} --> {end}\n{text}\n\n")


if __name__ == "__main__":
    main()
