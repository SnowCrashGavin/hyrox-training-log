import { createWorkout, updateWorkout, getWorkout } from './github.js';

const WORKOUT_TEMPLATE = {
  warmup: [
    '2 min easy row',
    '10 bodyweight squats',
    '10 leg swings each side',
    '10 cat-cows',
  ],
  cardio: {
    intervals: 5,
    duration: '2 min hard / 90s easy',
    defaultMachine: 'rower',
  },
  stations: {
    rounds: 3,
    exercises: [
      { name: 'DB Thrusters', reps: 'x 12', hasWeight: true },
      { name: 'Farmer carry', reps: 'x 30m', hasWeight: true },
      { name: 'Burpees (step-back)', reps: 'x 10', hasWeight: false },
      { name: 'Bent-over DB rows', reps: 'x 15', hasWeight: true },
    ],
  },
  cooldown: [
    'Easy row, 2 min',
    'Hip flexor stretch, 30s each side',
    'Child\'s pose, 30s',
    'Pigeon stretch, 30s each side',
  ],
  feedback: [
    'Lower back — better, same, or worse than last time?',
    'Farmer carry at new weight — grip hold the whole 30m?',
    'Rower — how did it feel on the hips?',
    'Step-back burpees — did that help the lower back?',
    'Energy level (1-10):',
    'Anything to change for next time?',
  ],
};

export function renderLogger(container, onSaved) {
  const today = new Date().toISOString().split('T')[0];
  const state = buildInitialState();

  let html = `<div class="logger-form">`;

  // Title
  html += `
    <div class="logger-section">
      <h3>Workout Info</h3>
      <input type="text" id="log-title" placeholder="Session name (optional)" value="Intro Session">
      <div style="margin-top:8px; font-size:0.85rem; color:var(--text-muted);">Date: ${today}</div>
    </div>`;

  // Warm-up
  html += `
    <div class="logger-section">
      <h3>Warm-up</h3>
      ${WORKOUT_TEMPLATE.warmup.map((ex, i) => checkRow(`warmup-${i}`, ex)).join('')}
    </div>`;

  // Cardio
  html += `
    <div class="logger-section">
      <h3>Cardio Block</h3>
      <div style="margin-bottom:8px;">
        <select id="log-machine" style="width:100%">
          <option value="">Select machine...</option>
          <option value="assault bike">Assault Bike</option>
          <option value="rower" selected>Rower</option>
          <option value="spin bike">Spin Bike</option>
        </select>
      </div>
      <div style="margin-bottom:12px;">
        <input type="text" id="log-resistance" placeholder="Damper / resistance setting">
      </div>
      ${Array.from({ length: WORKOUT_TEMPLATE.cardio.intervals }, (_, i) =>
        checkRow(`cardio-${i}`, `Interval ${i + 1} — ${WORKOUT_TEMPLATE.cardio.duration}`)
      ).join('')}
    </div>`;

  // Stations
  html += `<div class="logger-section"><h3>Station Block</h3>`;
  for (let r = 0; r < WORKOUT_TEMPLATE.stations.rounds; r++) {
    // Rest timer between rounds
    if (r > 0) {
      html += `
        <div class="rest-timer" id="rest-timer-${r}">
          <div class="rest-timer-label">Rest between rounds</div>
          <div class="rest-timer-display" id="rest-display-${r}">1:30</div>
          <button class="btn rest-timer-btn" id="rest-btn-${r}">Start 90s Rest</button>
        </div>`;
    }
    html += `<div class="round-header">Round ${r + 1}</div>`;
    for (let e = 0; e < WORKOUT_TEMPLATE.stations.exercises.length; e++) {
      const ex = WORKOUT_TEMPLATE.stations.exercises[e];
      const id = `station-${r}-${e}`;
      html += `
        <div class="check-row" data-id="${id}">
          <div class="checkbox" id="cb-${id}"></div>
          <span class="check-label">${ex.name} ${ex.reps}</span>
          ${ex.hasWeight ? `<input type="number" class="weight-input" id="wt-${id}" placeholder="lbs" inputmode="numeric">` : ''}
        </div>`;
    }
  }
  html += `</div>`;

  // Cooldown
  html += `
    <div class="logger-section">
      <h3>Cooldown</h3>
      ${WORKOUT_TEMPLATE.cooldown.map((ex, i) => checkRow(`cooldown-${i}`, ex)).join('')}
    </div>`;

  // Feedback
  html += `
    <div class="logger-section">
      <h3>Post-Workout Feedback</h3>
      ${WORKOUT_TEMPLATE.feedback.map((q, i) => `
        <div class="feedback-field">
          <label for="fb-${i}">${q}</label>
          <textarea id="fb-${i}" rows="2"></textarea>
        </div>
      `).join('')}
    </div>`;

  // Actions
  html += `
    <div class="btn-row">
      <button class="btn primary" id="log-save">Save Workout</button>
    </div>
    <p id="log-status" style="text-align:center; margin-top:8px; font-size:0.85rem; color:var(--text-muted);"></p>
  </div>`;

  container.innerHTML = html;

  // Bind checkbox taps
  container.querySelectorAll('.check-row').forEach(row => {
    row.addEventListener('click', (e) => {
      if (e.target.tagName === 'INPUT') return; // don't toggle when tapping weight input
      const id = row.dataset.id;
      const cb = row.querySelector('.checkbox');
      cb.classList.toggle('checked');
      if (cb.classList.contains('checked')) {
        cb.innerHTML = '&#10003;';
      } else {
        cb.innerHTML = '';
      }
    });
  });

  // Rest timer buttons
  container.querySelectorAll('.rest-timer-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const id = btn.id.replace('rest-btn-', '');
      startRestTimer(container, id);
    });
  });

  // Save
  container.querySelector('#log-save').addEventListener('click', async () => {
    const btn = container.querySelector('#log-save');
    const status = container.querySelector('#log-status');
    btn.disabled = true;
    status.textContent = 'Saving...';

    try {
      const markdown = buildMarkdown(container);
      const sessionName = container.querySelector('#log-title').value.trim();
      const title = `Workout — ${today}${sessionName ? ` — ${sessionName}` : ''}`;
      await createWorkout(title, markdown);
      status.textContent = 'Saved!';
      status.style.color = 'var(--green)';
      setTimeout(() => onSaved(), 1000);
    } catch (err) {
      status.textContent = `Error: ${err.message}`;
      status.style.color = 'var(--red)';
      btn.disabled = false;
    }
  });
}

function checkRow(id, label) {
  return `
    <div class="check-row" data-id="${id}">
      <div class="checkbox" id="cb-${id}"></div>
      <span class="check-label">${label}</span>
    </div>`;
}

function buildInitialState() {
  return { checked: new Set() };
}

function buildMarkdown(container) {
  const lines = [];

  // Warm-up
  lines.push('## Warm-up (5 min)');
  WORKOUT_TEMPLATE.warmup.forEach((ex, i) => {
    const checked = isChecked(container, `warmup-${i}`);
    lines.push(`- [${checked ? 'x' : ' '}] ${ex}`);
  });
  lines.push('');

  // Cardio
  lines.push('## Cardio Block (20 min)');
  const machine = container.querySelector('#log-machine').value;
  const resistance = container.querySelector('#log-resistance').value.trim();
  lines.push(`**Machine:** ${machine || '—'}`);
  lines.push(`**Effort:** 7/10 — breathing hard, choppy conversation`);
  lines.push('');
  lines.push('| Interval | 2 min hard | 90s easy | Notes |');
  lines.push('|---|---|---|---|');
  for (let i = 0; i < WORKOUT_TEMPLATE.cardio.intervals; i++) {
    const checked = isChecked(container, `cardio-${i}`);
    lines.push(`| ${i + 1} | [${checked ? 'x' : ' '}] | [${checked ? 'x' : ' '}] | |`);
  }
  lines.push('');
  lines.push(`**Damper/resistance used:** ${resistance || '—'}`);
  lines.push('');

  // Stations
  lines.push('## Station Block (20 min — 3 rounds, 90s rest between)');
  lines.push('');
  for (let r = 0; r < WORKOUT_TEMPLATE.stations.rounds; r++) {
    lines.push(`### Round ${r + 1}`);
    WORKOUT_TEMPLATE.stations.exercises.forEach((ex, e) => {
      const id = `station-${r}-${e}`;
      const checked = isChecked(container, id);
      const weightEl = container.querySelector(`#wt-${id}`);
      const weight = weightEl ? weightEl.value.trim() : '';
      let text = `${ex.name} ${ex.reps}`;
      if (ex.hasWeight) {
        text += ` — weight: ${weight || '___'} lbs`;
      }
      lines.push(`- [${checked ? 'x' : ' '}] ${text}`);
    });
    lines.push('');
  }

  // Cooldown
  lines.push('## Cooldown (5 min)');
  WORKOUT_TEMPLATE.cooldown.forEach((ex, i) => {
    const checked = isChecked(container, `cooldown-${i}`);
    lines.push(`- [${checked ? 'x' : ' '}] ${ex}`);
  });
  lines.push('');

  // Feedback
  lines.push('---');
  lines.push('');
  lines.push('## Post-Workout Feedback');
  lines.push('_Fill this section out after your session (edit the issue or drop a comment):_');
  lines.push('');
  WORKOUT_TEMPLATE.feedback.forEach((q, i) => {
    const answer = container.querySelector(`#fb-${i}`).value.trim();
    lines.push(`**${q}**`);
    lines.push(answer || '');
    lines.push('');
  });

  return lines.join('\n');
}

function isChecked(container, id) {
  const cb = container.querySelector(`#cb-${id}`);
  return cb && cb.classList.contains('checked');
}

const activeTimers = {};

function startRestTimer(container, id) {
  const display = container.querySelector(`#rest-display-${id}`);
  const btn = container.querySelector(`#rest-btn-${id}`);
  const timerEl = container.querySelector(`#rest-timer-${id}`);

  // If already running, reset
  if (activeTimers[id]) {
    clearInterval(activeTimers[id]);
    delete activeTimers[id];
  }

  let remaining = 90;
  btn.textContent = 'Reset';
  timerEl.classList.add('running');
  display.textContent = formatTime(remaining);

  activeTimers[id] = setInterval(() => {
    remaining--;
    display.textContent = formatTime(remaining);

    if (remaining <= 0) {
      clearInterval(activeTimers[id]);
      delete activeTimers[id];
      timerEl.classList.remove('running');
      timerEl.classList.add('done');
      display.textContent = 'GO!';
      btn.textContent = 'Restart';

      // Vibrate if available (mobile)
      if (navigator.vibrate) {
        navigator.vibrate([200, 100, 200, 100, 400]);
      }
    }
  }, 1000);
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}
