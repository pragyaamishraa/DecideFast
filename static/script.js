const dropzone = document.getElementById('dropzone');
const fileInput = document.getElementById('fileInput');
const browseBtn = document.getElementById('browseBtn');
const dropzoneInner = document.getElementById('dropzoneInner');
const datasetSummary = document.getElementById('datasetSummary');
const dsFilename = document.getElementById('dsFilename');
const dsRows = document.getElementById('dsRows');
const dsCols = document.getElementById('dsCols');
const previewWrap = document.getElementById('previewWrap');
const previewTable = document.getElementById('previewTable');
const questionInput = document.getElementById('questionInput');
const askBtn = document.getElementById('askBtn');
const askBtnLabel = document.getElementById('askBtnLabel');
const askForm = document.getElementById('askForm');
const answerZone = document.getElementById('answerZone');
const suggestions = document.getElementById('suggestions');
const gaugeNeedle = document.getElementById('gaugeNeedle');
const gaugeValue = document.getElementById('gaugeValue');
const gaugeLabel = document.getElementById('gaugeLabel');
const gaugeTicks = document.getElementById('gaugeTicks');
const gaugeTickLabels = document.getElementById('gaugeTickLabels');
const statusDot = document.getElementById('statusDot');
const statusText = document.getElementById('statusText');
const liveClock = document.getElementById('liveClock');
const uploadPanel = document.getElementById('uploadPanel');
const askPanel = document.getElementById('askPanel');
const canvas = document.getElementById('particleCanvas');
const ctx = canvas ? canvas.getContext('2d') : null;

let currentFileId = null;
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// --- Live clock ---
function tickClock() {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  if (liveClock) liveClock.textContent = `${hh}:${mm}:${ss}`;
}
tickClock();
setInterval(tickClock, 1000);

// --- Gauge control ---
function setNeedle(percent) {
  const clamped = Math.max(0, Math.min(100, percent));
  const deg = -90 + (clamped / 100) * 180;
  gaugeNeedle.style.transform = `rotate(${deg}deg)`;
  const glow = 4 + (clamped / 100) * 10;
  const opacity = 0.4 + (clamped / 100) * 0.5;
  gaugeNeedle.style.filter = `drop-shadow(0 0 ${glow}px rgba(255,180,84,${opacity.toFixed(2)}))`;
}

function setGaugeReadout(value, label) {
  gaugeValue.textContent = value;
  gaugeLabel.textContent = label;
}

function drawTicks() {
  const cx = 120, cy = 130, rOuter = 100, rInner = 92, rLabel = 82;
  let ticksHtml = '';
  let labelsHtml = '';
  for (let i = 0; i <= 10; i++) {
    const angleDeg = -90 + (i / 10) * 180;
    const rad = (angleDeg * Math.PI) / 180;
    const x1 = cx + rInner * Math.sin(rad);
    const y1 = cy - rInner * Math.cos(rad);
    const x2 = cx + rOuter * Math.sin(rad);
    const y2 = cy - rOuter * Math.cos(rad);
    ticksHtml += `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" />`;
    if (i % 2 === 0) {
      const lx = cx + rLabel * Math.sin(rad);
      const ly = cy - rLabel * Math.cos(rad) + 3;
      labelsHtml += `<text x="${lx.toFixed(1)}" y="${ly.toFixed(1)}">${i * 10}</text>`;
    }
  }
  gaugeTicks.innerHTML = ticksHtml;
  if (gaugeTickLabels) gaugeTickLabels.innerHTML = labelsHtml;
}
drawTicks();

function bootSequence() {
  setNeedle(0);
  setGaugeReadout('0', 'CALIBRATING');
  setTimeout(() => setNeedle(85), 150);
  setTimeout(() => setNeedle(15), 850);
  setTimeout(() => {
    setNeedle(12);
    setGaugeReadout('READY', 'DECISION VELOCITY');
  }, 1450);
}
window.addEventListener('load', bootSequence);

function setThinking(isThinking) {
  if (isThinking) {
    gaugeNeedle.classList.add('thinking');
    statusDot.classList.add('busy');
    statusText.textContent = 'PROCESSING';
  } else {
    gaugeNeedle.classList.remove('thinking');
    statusDot.classList.remove('busy');
    statusText.textContent = 'SYSTEM READY';
  }
}

// --- Odometer ---
function animateOdometer(el, targetValue, duration = 900) {
  const start = 0;
  const startTime = performance.now();
  function tick(now) {
    const elapsed = now - startTime;
    const progress = Math.min(1, elapsed / duration);
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = Math.round(start + (targetValue - start) * eased);
    el.textContent = current.toLocaleString();
    if (progress < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

// --- Particle field (ambient + burst) ---
let particles = [];
let ambientParticles = [];

function resizeCanvas() {
  if (!canvas) return;
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

function initAmbient() {
  if (!ctx || reducedMotion) return;
  ambientParticles = [];
  const count = Math.min(50, Math.floor((window.innerWidth * window.innerHeight) / 32000));
  for (let i = 0; i < count; i++) {
    ambientParticles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.12,
      vy: (Math.random() - 0.5) * 0.12,
      r: Math.random() * 1.2 + 0.4,
      hue: Math.random() > 0.5 ? '94,234,212' : '255,180,84',
      alpha: Math.random() * 0.25 + 0.05
    });
  }
}
initAmbient();
window.addEventListener('resize', initAmbient);

function burstBetween(fromEl, toEl, count = 16, color = '94,234,212') {
  if (!ctx || reducedMotion || !fromEl || !toEl) return;
  const fromRect = fromEl.getBoundingClientRect();
  const toRect = toEl.getBoundingClientRect();
  const startX = fromRect.right - 20;
  const startY = fromRect.top + fromRect.height * 0.35;
  const endX = toRect.left + 20;
  const endY = toRect.top + toRect.height * 0.35;

  for (let i = 0; i < count; i++) {
    const delay = i * 35;
    setTimeout(() => {
      particles.push({
        x: startX,
        y: startY + (Math.random() - 0.5) * 40,
        endX: endX,
        endY: endY + (Math.random() - 0.5) * 40,
        progress: 0,
        speed: 0.012 + Math.random() * 0.01,
        r: Math.random() * 1.8 + 1,
        color: color
      });
    }, delay);
  }
}

function animateParticles() {
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (!reducedMotion) {
    ambientParticles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0) p.x = canvas.width;
      if (p.x > canvas.width) p.x = 0;
      if (p.y < 0) p.y = canvas.height;
      if (p.y > canvas.height) p.y = 0;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${p.hue},${p.alpha})`;
      ctx.fill();
    });
  }

  particles = particles.filter(p => p.progress < 1);
  particles.forEach(p => {
    p.progress = Math.min(1, p.progress + p.speed);
    const ease = 1 - Math.pow(1 - p.progress, 2);
    const x = p.x + (p.endX - p.x) * ease;
    const y = p.y + (p.endY - p.y) * ease + Math.sin(p.progress * Math.PI) * -18;
    const alpha = p.progress < 0.85 ? 0.9 : (1 - p.progress) / 0.15 * 0.9;
    ctx.beginPath();
    ctx.arc(x, y, p.r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${p.color},${alpha.toFixed(2)})`;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x, y, p.r * 2.5, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${p.color},${(alpha * 0.15).toFixed(2)})`;
    ctx.fill();
  });

  requestAnimationFrame(animateParticles);
}
requestAnimationFrame(animateParticles);

// --- Panel tilt on mouse move ---
[uploadPanel, askPanel].forEach(panel => {
  if (!panel || reducedMotion) return;
  panel.addEventListener('mousemove', (e) => {
    const rect = panel.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    panel.style.transform = `perspective(900px) rotateX(${(-py * 2.5).toFixed(2)}deg) rotateY(${(px * 2.5).toFixed(2)}deg)`;
  });
  panel.addEventListener('mouseleave', () => {
    panel.style.transform = 'perspective(900px) rotateX(0deg) rotateY(0deg)';
  });
});

// --- Upload interactions ---
browseBtn.addEventListener('click', () => fileInput.click());
dropzone.addEventListener('click', () => fileInput.click());

['dragenter', 'dragover'].forEach(evt => {
  dropzone.addEventListener(evt, (e) => {
    e.preventDefault();
    dropzone.classList.add('dragover');
  });
});

['dragleave', 'drop'].forEach(evt => {
  dropzone.addEventListener(evt, (e) => {
    e.preventDefault();
    dropzone.classList.remove('dragover');
  });
});

dropzone.addEventListener('drop', (e) => {
  const file = e.dataTransfer.files[0];
  if (file) handleFile(file);
});

fileInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) handleFile(file);
});

async function handleFile(file) {
  if (!file.name.toLowerCase().endsWith('.csv')) {
    alert('Please upload a .csv file.');
    return;
  }

  dropzoneInner.innerHTML = `<p class="dz-title">Uploading ${escapeHtml(file.name)}…</p>`;
  setThinking(true);
  setNeedle(45);
  setGaugeReadout('...', 'READING FILE');

  const formData = new FormData();
  formData.append('file', file);

  try {
    const res = await fetch('/api/upload', { method: 'POST', body: formData });
    const data = await res.json();

    if (!res.ok) {
      dropzoneInner.innerHTML = `<p class="dz-title">Upload failed</p><p class="dz-sub">${escapeHtml(data.error || 'Unknown error')}</p>`;
      setThinking(false);
      setNeedle(0);
      setGaugeReadout('ERR', 'UPLOAD FAILED');
      return;
    }

    currentFileId = data.file_id;
    dropzoneInner.innerHTML = `<p class="dz-title">✓ ${escapeHtml(data.filename)} loaded</p><p class="dz-sub"><button type="button" id="browseAgainBtn" class="link-btn">upload a different file</button></p>`;
    document.getElementById('browseAgainBtn').addEventListener('click', (e) => {
      e.stopPropagation();
      fileInput.click();
    });

    dsFilename.textContent = data.filename;
    animateOdometer(dsRows, data.rows);
    dsCols.textContent = data.columns.length;
    datasetSummary.hidden = false;

    renderPreview(data.columns, data.preview);
    previewWrap.hidden = false;

    questionInput.disabled = false;
    askBtn.disabled = false;
    questionInput.focus();

    renderSuggestions();
    burstBetween(uploadPanel, askPanel, 18, '94,234,212');

    setThinking(false);
    setNeedle(55);
    setGaugeReadout('LOADED', 'DATASET READY');
    setTimeout(() => {
      setNeedle(15);
      setGaugeReadout('READY', 'DECISION VELOCITY');
    }, 1400);
  } catch (err) {
    dropzoneInner.innerHTML = `<p class="dz-title">Upload failed</p><p class="dz-sub">${escapeHtml(err.message)}</p>`;
    setThinking(false);
    setNeedle(0);
    setGaugeReadout('ERR', 'NETWORK ERROR');
  }
}

function renderPreview(columns, rows) {
  let html = '<thead><tr>';
  columns.forEach(col => html += `<th title="${escapeHtml(col)}">${escapeHtml(col)}</th>`);
  html += '</tr></thead><tbody>';
  rows.forEach(row => {
    html += '<tr>';
    columns.forEach(col => {
      const val = String(row[col] ?? '');
      html += `<td title="${escapeHtml(val)}">${escapeHtml(val)}</td>`;
    });
    html += '</tr>';
  });
  html += '</tbody>';
  previewTable.innerHTML = html;
}

function renderSuggestions() {
  const generic = [
    "What's the most important trend in this data?",
    "Where should I focus my attention first?",
    "What's one decision I should make based on this?"
  ];
  suggestions.innerHTML = '';
  generic.forEach(q => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'suggestion-chip';
    chip.textContent = q;
    chip.addEventListener('click', () => {
      questionInput.value = q;
      questionInput.focus();
    });
    suggestions.appendChild(chip);
  });
  suggestions.hidden = false;
}

// --- Ask flow ---
askForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const question = questionInput.value.trim();
  if (!question || !currentFileId) return;

  askBtn.disabled = true;
  askBtnLabel.textContent = 'Thinking…';
  answerZone.innerHTML = `<div class="loading-state"><span class="spinner"></span> Analyzing your data…</div>`;
  setThinking(true);
  setGaugeReadout('...', 'ANALYZING');

  const startTime = performance.now();

  try {
    const res = await fetch('/api/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ file_id: currentFileId, question })
    });
    const data = await res.json();
    const elapsedMs = Math.round(performance.now() - startTime);

    if (!res.ok) {
      answerZone.innerHTML = `<div class="error-card">${escapeHtml(data.error || 'Something went wrong.')}</div>`;
      setThinking(false);
      setNeedle(0);
      setGaugeReadout('ERR', 'REQUEST FAILED');
    } else {
      burstBetween(askForm, answerZone, 14, '255,180,84');
      renderAnswerDecoded(data.answer, elapsedMs);
      setThinking(false);
      const velocity = Math.max(20, Math.min(96, Math.round(100 - (elapsedMs / 60))));
      setNeedle(velocity);
      setGaugeReadout(velocity, 'DECISION VELOCITY');
    }
  } catch (err) {
    answerZone.innerHTML = `<div class="error-card">Network error: ${escapeHtml(err.message)}</div>`;
    setThinking(false);
    setNeedle(0);
    setGaugeReadout('ERR', 'NETWORK ERROR');
  } finally {
    askBtn.disabled = false;
    askBtnLabel.textContent = 'Get decision';
  }
});

function renderAnswerDecoded(text, elapsedMs) {
  let html = escapeHtml(text);
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  const paragraphs = html.split(/\n\n/).map(p => p.replace(/\n/g, '<br>'));

  const card = document.createElement('div');
  card.className = 'answer-card';
  answerZone.innerHTML = '';
  answerZone.appendChild(card);

  paragraphs.forEach((p, i) => {
    const pEl = document.createElement('p');
    pEl.innerHTML = p;
    pEl.classList.add('decode-in');
    pEl.style.animationDelay = reducedMotion ? '0ms' : `${i * 140}ms`;
    card.appendChild(pEl);
  });

  const meta = document.createElement('div');
  meta.className = 'answer-meta decode-in';
  meta.style.animationDelay = reducedMotion ? '0ms' : `${paragraphs.length * 140}ms`;
  meta.textContent = `Answered in ${(elapsedMs / 1000).toFixed(1)}s`;
  card.appendChild(meta);
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
