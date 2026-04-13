type ToneOptions = {
  volume: number;
  frequencies: number[];
  durationMs: number;
  type?: OscillatorType;
  gapMs?: number;
};

let audioContext: AudioContext | null = null;

function getAudioContext() {
  if (typeof window === "undefined") {
    return null;
  }

  const AudioContextClass = window.AudioContext;
  if (!AudioContextClass) {
    return null;
  }

  if (!audioContext) {
    audioContext = new AudioContextClass();
  }

  if (audioContext.state === "suspended") {
    void audioContext.resume();
  }

  return audioContext;
}

function playToneSequence({
  volume,
  frequencies,
  durationMs,
  type = "square",
  gapMs = 28,
}: ToneOptions) {
  const context = getAudioContext();
  if (!context || volume <= 0 || frequencies.length === 0) {
    return;
  }

  const gain = context.createGain();
  gain.connect(context.destination);

  const safeVolume = Math.min(volume / 100, 1) * 0.045;
  const now = context.currentTime;
  const noteDuration = durationMs / 1000;
  const gapDuration = gapMs / 1000;

  gain.gain.setValueAtTime(0.0001, now);

  frequencies.forEach((frequency, index) => {
    const noteStart = now + index * (noteDuration + gapDuration);
    const noteEnd = noteStart + noteDuration;
    const oscillator = context.createOscillator();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, noteStart);
    oscillator.connect(gain);

    gain.gain.setValueAtTime(0.0001, noteStart);
    gain.gain.exponentialRampToValueAtTime(safeVolume, noteStart + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, noteEnd);

    oscillator.start(noteStart);
    oscillator.stop(noteEnd + 0.01);
  });
}

export function playNavigateTone(volume: number) {
  playToneSequence({
    volume,
    frequencies: [440, 554.37],
    durationMs: 50,
    type: "square",
  });
}

export function playConfirmTone(volume: number) {
  playToneSequence({
    volume,
    frequencies: [523.25, 659.25, 783.99],
    durationMs: 58,
    type: "triangle",
    gapMs: 18,
  });
}

export function playBackTone(volume: number) {
  playToneSequence({
    volume,
    frequencies: [659.25, 523.25],
    durationMs: 60,
    type: "sawtooth",
    gapMs: 20,
  });
}
