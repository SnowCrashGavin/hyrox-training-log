import { listWorkouts } from './github.js';
import { parseWorkout, parseDateFromTitle } from './parser.js';

export async function renderDashboard(container, onSelectWorkout) {
  container.innerHTML = '<div class="loading-state"><div class="spinner"></div></div>';

  try {
    const issues = await listWorkouts();

    if (!issues || issues.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <h3>No workouts yet</h3>
          <p>Tap the + tab to log your first workout.</p>
        </div>`;
      return;
    }

    const html = `
      <div class="workout-list">
        ${issues.map(issue => {
          const parsed = parseWorkout(issue.body);
          const date = parseDateFromTitle(issue.title);
          const displayDate = date ? formatDate(date) : '';
          const title = issue.title.replace(/Workout\s*—\s*\d{4}-\d{2}-\d{2}\s*—?\s*/, '').trim() || 'Workout';

          return `
            <div class="workout-card" data-issue="${issue.number}">
              <div class="workout-card-header">
                <span class="workout-card-title">${escapeHtml(title || 'Workout')}</span>
                <span class="workout-card-date">${displayDate}</span>
              </div>
              <div class="progress-bar">
                <div class="progress-fill ${progressClass(parsed.completion)}" style="width: ${parsed.completion}%"></div>
              </div>
              <div class="workout-card-meta">
                <span>${parsed.completedExercises}/${parsed.totalExercises} exercises</span>
                ${parsed.energyLevel ? `<span>Energy: ${parsed.energyLevel}/10</span>` : ''}
                ${parsed.machine ? `<span>${escapeHtml(parsed.machine)}</span>` : ''}
              </div>
            </div>`;
        }).join('')}
      </div>`;

    container.innerHTML = html;

    container.querySelectorAll('.workout-card').forEach(card => {
      card.addEventListener('click', () => {
        const issueNum = parseInt(card.dataset.issue, 10);
        onSelectWorkout(issueNum);
      });
    });

  } catch (err) {
    container.innerHTML = `<div class="empty-state"><h3>Error loading workouts</h3><p>${escapeHtml(err.message)}</p></div>`;
  }
}

function progressClass(pct) {
  if (pct >= 75) return 'high';
  if (pct >= 40) return 'mid';
  return 'low';
}

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
