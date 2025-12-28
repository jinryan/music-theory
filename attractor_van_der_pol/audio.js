// Audio + pitch helpers for translating dynamical events into notes.

const scale = [0, 2, 3, 5, 7, 10]; // natural minor
const root = 60; // MIDI C4

let audioCtx = null;
let audioEnabled = true;

// Initialize audio context if not already done.
// Resume it if it's suspended.
function getAudioCtx() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    return audioCtx;
}

// Convert MIDI note number to frequency.
function midiToFrequency(note) {
    return 440 * Math.pow(2, (note - 69) / 12);
}

// Convert x position to MIDI note number.
function pitchFromX(x, range) {
    // normalize by the drawing range so we stay in [-1, 1]
    // xn is normalized x position
    const xn = Math.max(-1, Math.min(1, x / range));
    const u = (xn + 1) / 2;
    // i is the index of the note in the scale
    const i = Math.min(scale.length - 1, Math.floor(u * scale.length));
    // return the MIDI note number
    return root + scale[i];
}

// Send a MIDI note.
// velocity is a value that typically ranges from 0 to 127 and
// represents how "hard" or "soft" a note is played in MIDI terms
function sendMidiNote(note, velocity) {
    if (!audioEnabled) return;
    const ctx = getAudioCtx();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    const amp = Math.max(0, Math.min(1, velocity / 127)) * 0.4;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(amp, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);

    osc.frequency.setValueAtTime(midiToFrequency(note), now);
    osc.type = 'sine';
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.6);
}

function triggerNote(x, y, range) {
    const note = pitchFromX(x, range);
    const velocity = Math.min(1, Math.abs(y)) * 100;
    sendMidiNote(note, velocity);
}

function setAudioEnabled(enabled) {
    audioEnabled = enabled;
}

function isAudioEnabled() {
    return audioEnabled;
}
