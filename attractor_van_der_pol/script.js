// Van der Pol attractor visualization with zero-crossing rhythm extraction.
const canvas = document.getElementById('attractor');
const ctx = canvas.getContext('2d');
const xInput = document.getElementById('x-init');
const yInput = document.getElementById('y-init');
const muInput = document.getElementById('mu-base');
const rerunButton = document.getElementById('rerun');
const toggleAudioButton = document.getElementById('toggle-audio');

let x = 0.1;
let y = 0.0;
let mu_base = 1.5;
let t = 0;

// timing / rhythm state (tracks oscillator phase for note gating)
let time = 0;
let prevX = x;
let lastNoteTime = 0;
const minInterval = 0.15; // seconds

// integration
const maxStep = 0.005; // seconds per integration slice to keep Euler stable if frames spike

function setCanvasSize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

function clearCanvas() {
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function parseInput(input, fallback) {
    const v = parseFloat(input.value);
    return Number.isFinite(v) ? v : fallback;
}

function resetSimulation() {
    x = parseInput(xInput, 0.1);
    y = parseInput(yInput, 0.0);
    mu_base = parseInput(muInput, 1.5);
    t = 0;
    time = 0;
    lastNoteTime = 0;
    prevX = x;
    clearCanvas();
}

function mu(time) {
    // slow breathing mu so shape of attractor gently changes
    return mu_base + 0.8 * Math.sin(time * 0.1);
}

// map x, y in [-R, R] to canvas pixels
const R = 5.0;
function toPxX(x) { return (x / (2 * R) + 0.5) * canvas.width; }
function toPxY(y) { return (0.5 - y / (2 * R)) * canvas.height; }

// Advance oscillator by a small dt and emit a note on upward zero-crossing.
function step(dtSeconds) {
    const m = mu(t);

    // Van der Pol
    const dx = y;
    const dy = m * (1 - x * x) * y - x;

    x += dx * dtSeconds;
    y += dy * dtSeconds;
    t += dtSeconds;
    time += dtSeconds;

    // event detection: upward zero-crossing with minimum spacing
    const crossingUp = prevX < 0 && x >= 0;
    const modulatedInterval = minInterval + 0.2 * Math.sin(time * 0.1);
    const canTrigger = (time - lastNoteTime) > modulatedInterval;

    if (crossingUp && canTrigger) {
        triggerNote(x, y, R);
        lastNoteTime = time;
    }

    prevX = x;
}

function drawPoint(px, py) {
    // lighter fade so the historic path stays more visible
    ctx.fillStyle = "rgba(0,0,0,0.02)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    drawAxesAndLabels();

    ctx.fillStyle = "white";
    ctx.beginPath();
    ctx.arc(px, py, 2.5, 0, Math.PI * 2);
    ctx.fill();

    drawHUD();
}

let lastFrame = null;
// Animation loop: turn variable frame timings into small fixed integration slices.
function frame(timestamp) {
    if (lastFrame === null) {
        lastFrame = timestamp;
        requestAnimationFrame(frame);
        return;
    }

    let dtSeconds = (timestamp - lastFrame) / 1000;
    // clamp huge gaps when tab is suspended
    dtSeconds = Math.min(dtSeconds, 0.1);
    lastFrame = timestamp;

    // integrate in small, fixed slices for stability
    while (dtSeconds > 0) {
        const stepDt = Math.min(dtSeconds, maxStep);
        step(stepDt);
        dtSeconds -= stepDt;
    }

    drawPoint(toPxX(x), toPxY(y));
    requestAnimationFrame(frame);
}

function drawAxesAndLabels() {
    ctx.save();
    ctx.strokeStyle = "rgba(255,255,255,0.5)";
    ctx.lineWidth = 1;

    // axes through origin
    ctx.beginPath();
    ctx.moveTo(0, toPxY(0));
    ctx.lineTo(canvas.width, toPxY(0));
    ctx.moveTo(toPxX(0), 0);
    ctx.lineTo(toPxX(0), canvas.height);
    ctx.stroke();

    // ticks and labels at integer steps within [-R, R]
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.font = "12px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";

    for (let v = -Math.floor(R); v <= Math.floor(R); v++) {
        const px = toPxX(v);
        const py = toPxY(v);

        // x-axis ticks
        ctx.beginPath();
        ctx.moveTo(px, toPxY(0) - 4);
        ctx.lineTo(px, toPxY(0) + 4);
        ctx.stroke();
        ctx.fillText(v.toString(), px, toPxY(0) + 6);

        // y-axis ticks
        ctx.beginPath();
        ctx.moveTo(toPxX(0) - 4, py);
        ctx.lineTo(toPxX(0) + 4, py);
        ctx.stroke();
        if (v !== 0) { // avoid double labeling origin
            ctx.save();
            ctx.translate(toPxX(0) - 8, py);
            ctx.textAlign = "right";
            ctx.textBaseline = "middle";
            ctx.fillText(v.toString(), 0, 0);
            ctx.restore();
        }
    }

    // axis labels
    ctx.fillText("x", canvas.width - 12, toPxY(0) + 6);
    ctx.textBaseline = "bottom";
    ctx.fillText("y", toPxX(0) + 12, 12);

    ctx.restore();
}

function drawHUD() {
    ctx.save();
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.font = "14px Menlo, Consolas, monospace";
    ctx.textAlign = "right";
    ctx.textBaseline = "top";
    const pad = 12;
    const fmt = (v) => v.toFixed(2).padStart(7); // fixed width so numbers don't jitter
    ctx.fillText(`x: ${fmt(x)}  y: ${fmt(y)}`, canvas.width - pad, pad);
    ctx.restore();
}

setCanvasSize();
resetSimulation();

rerunButton.addEventListener('click', resetSimulation);
window.addEventListener('resize', () => {
    setCanvasSize();
    clearCanvas();
});

// keep audio happy after user interaction
rerunButton.addEventListener('click', () => getAudioCtx());
toggleAudioButton.addEventListener('click', () => {
    const next = !isAudioEnabled();
    setAudioEnabled(next);
    toggleAudioButton.textContent = `Audio: ${next ? "on" : "off"}`;
    if (next) getAudioCtx();
});

frame();
