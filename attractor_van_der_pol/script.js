const canvas = document.getElementById('attractor');
const ctx = canvas.getContext('2d');
const xInput = document.getElementById('x-init');
const yInput = document.getElementById('y-init');
const muInput = document.getElementById('mu-base');
const rerunButton = document.getElementById('rerun');

let x = 0.1;
let y = 0.0;
let mu_base = 1.5;
let t = 0;
const dt = 0.01; // integration step
const steps_per_frame = 10; // simulation speed

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
    clearCanvas();
}

function mu(time) {
    // slow breathing mu so shape of attractor gently changes
    return mu_base + 0.5 * Math.sin(time * 0.05);
}

// map x, y in [-R, R] to canvas pixels
const R = 4.0;
function toPxX(x) { return (x / (2 * R) + 0.5) * canvas.width; }
function toPxY(y) { return (0.5 - y / (2 * R)) * canvas.height; }

function step() {
    const m = mu(t);

    // Van der Pol
    const dx = y;
    const dy = m * (1 - x * x) * y - x;

    x += dx * dt;
    y += dy * dt;
    t += dt;
}

function drawPoint(px, py) {
    ctx.fillStyle = "rgba(0,0,0,0.05)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "white";
    ctx.beginPath();
    ctx.arc(px, py, 2, 0, Math.PI * 2);
    ctx.fill();
}

function frame() {
    for (let i = 0; i < steps_per_frame; i++) {
        step();
    }
    drawPoint(toPxX(x), toPxY(y));
    requestAnimationFrame(frame);
}

setCanvasSize();
resetSimulation();

rerunButton.addEventListener('click', resetSimulation);
window.addEventListener('resize', () => {
    setCanvasSize();
    clearCanvas();
});

frame();
