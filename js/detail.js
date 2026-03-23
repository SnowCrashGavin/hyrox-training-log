import { getWorkout } from './github.js';
import { parseWorkout, parseDateFromTitle } from './parser.js';

export async function renderDetail(container, issueNumber, config) {
  container.innerHTML = '<div class="loading-state"><div class="spinner"></div></div>';

  try {
    const issue = await getWorkout(issueNumber);
    const parsed = parseWorkout(issue.body);
    const date = parseDateFromTitle(issue.title);
    const title = issue.title.replace(/Workout\s*—\s*\d{4}-\d{2}-\d{2}\s*—?\s*/, '').trim() || 'Workout';

    let html = '';

    // Summary card
    html += `
      <div class="detail-section">
        <h3>Summary</h3>
        <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
          <span>${title}</span>
          <span style="color:var(--text-muted)">${date || ''}</span>
        </div>
        <div class="progress-bar">
          <div class="progress-fill ${progressClass(parsed.completion)}" style="width: ${parsed.completion}%"></div>
        </div>
        <div style="margin-top:8px; font-size:0.85rem; color:var(--text-muted);">
          ${parsed.completedExercises}/${parsed.totalExercises} exercises completed (${parsed.completion}%)
          ${parsed.machine ? ` &middot; ${escapeHtml(parsed.machine)}` : ''}
        </div>
      </div>`;

    // Exercises grouped by section/round
    const groups = groupExercises(parsed.exercises);
    for (const [section, rounds] of Object.entries(groups)) {
      html += `<div class="detail-section"><h3>${escapeHtml(section)}</h3>`;

      for (const [round, exercises] of Object.entries(rounds)) {
        if (round && round !== '_default') {
          html += `<div class="round-header">${escapeHtml(round)}</div>`;
        }
        for (const ex of exercises) {
          html += `
            <div class="exercise-row">
              <div class="exercise-check ${ex.checked ? 'done' : 'pending'}">${ex.checked ? '&#10003;' : ''}</div>
              <div class="exercise-info">
                <div class="exercise-name">${escapeHtml(ex.text)}</div>
                ${ex.weight ? `<div class="exercise-detail">${ex.weight.value} ${ex.weight.unit}</div>` : ''}
              </div>
            </div>`;
        }
      }
      html += '</div>';
    }

    // Feedback
    if (parsed.feedback.length > 0) {
      html += '<div class="detail-section"><h3>Feedback</h3>';
      for (const f of parsed.feedback) {
        html += `
          <div class="feedback-item">
            <div class="feedback-question">${escapeHtml(f.question)}</div>
            <div class="feedback-answer ${f.answer ? '' : 'empty'}">${f.answer ? escapeHtml(f.answer) : 'Not answered'}</div>
          </div>`;
      }
      html += '</div>';
    }

    // Link to GitHub
    html += `<a class="detail-link" href="${issue.html_url}" target="_blank">View on GitHub &rarr;</a>`;

    container.innerHTML = html;

  } catch (err) {
    container.innerHTML = `<div class="empty-state"><h3>Error</h3><p>${escapeHtml(err.message)}</p></div>`;
  }
}

function groupExercises(exercises) {
  const groups = {};
  for (const ex of exercises) {
    const section = ex.section || 'Exercises';
    const round = ex.round || '_default';
    if (!groups[section]) groups[section] = {};
    if (!groups[section][round]) groups[section][round] = [];
    groups[section][round].push(ex);
  }
  return groups;
}

function progressClass(pct) {
  if (pct >= 75) return 'high';
  if (pct >= 40) return 'mid';
  return 'low';
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
