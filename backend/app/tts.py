import io
import subprocess
import tempfile
from pathlib import Path

import numpy as np
import scipy.io.wavfile
from pocket_tts import TTSModel

VOICE_SAMPLE_PATH = Path(__file__).resolve().parent.parent / "data" / "voice-sample.mp3"

_tts_model: TTSModel | None = None
_voice_state: dict | None = None


def _get_model() -> TTSModel:
    global _tts_model
    if _tts_model is None:
        _tts_model = TTSModel.load_model()
    return _tts_model


def _get_voice_state() -> dict:
    global _voice_state
    if _voice_state is None:
        model = _get_model()
        _voice_state = model.get_state_for_audio_prompt(str(VOICE_SAMPLE_PATH))
    return _voice_state


def generate_audio(text: str) -> tuple[bytes, float]:
    model = _get_model()
    voice_state = _get_voice_state()

    audio_tensor = model.generate_audio(voice_state, text)
    audio_np = audio_tensor.numpy()

    if audio_np.ndim == 1:
        audio_np = audio_np.reshape(1, -1)

    peak = np.max(np.abs(audio_np))
    if peak > 0:
        audio_np = audio_np / peak * 0.95

    wav_buf = io.BytesIO()
    scipy.io.wavfile.write(wav_buf, model.sample_rate, audio_np.T)
    wav_bytes = wav_buf.getvalue()

    n_samples = audio_np.shape[-1]
    duration = n_samples / model.sample_rate

    mp3_bytes = _wav_to_mp3(wav_bytes)

    return mp3_bytes, duration


def _wav_to_mp3(wav_bytes: bytes) -> bytes:
    with tempfile.TemporaryDirectory() as tmpdir:
        wav_path = Path(tmpdir) / "audio.wav"
        mp3_path = Path(tmpdir) / "audio.mp3"
        wav_path.write_bytes(wav_bytes)

        cmd = [
            "ffmpeg", "-y",
            "-i", str(wav_path),
            "-codec:a", "libmp3lame",
            "-b:a", "128k",
            str(mp3_path),
        ]
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
        if result.returncode != 0:
            raise RuntimeError(f"ffmpeg mp3 conversion failed: {result.stderr[-300:]}")

        return mp3_path.read_bytes()
