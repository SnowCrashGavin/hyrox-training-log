/**
 * Parse a workout issue body (markdown) into structured data.
 */
export function parseWorkout(markdown) {
  if (!markdown) return { exercises: [], feedback: [], completion: 0, totalExercises: 0, completedExercises: 0 };

  const exercises = parseExercises(markdown);
  const feedback = parseFeedback(markdown);
  const energyLevel = parseEnergyLevel(feedback);
  const machine = parseMachine(markdown);

  const totalExercises = exercises.length;
  const completedExercises = exercises.filter(e => e.checked).length;
  const completion = totalExercises > 0 ? Math.round((completedExercises / totalExercises) * 100) : 0;

  return { exercises, feedback, energyLevel, machine, completion, totalExercises, completedExercises };
}

function parseExercises(md) {
  const exercises = [];
  const lines = md.split('\n');
  let currentSection = '';
  let currentRound = '';

  for (const line of lines) {
    // Track sections
    const h2 = line.match(/^## (.+)/);
    if (h2) { currentSection = h2[1].trim(); currentRound = ''; continue; }

    const h3 = line.match(/^### (.+)/);
    if (h3) { currentRound = h3[1].trim(); continue; }

    // Parse checkboxes
    const checkMatch = line.match(/^- \[([ xX])\] (.+)/);
    if (checkMatch) {
      const checked = checkMatch[1].toLowerCase() === 'x';
      const text = checkMatch[2].trim();

      // Try to extract weight
      const weightMatch = text.match(/weight:\s*(\d+[\d.]*)\s*(lbs|kg)?/i);
      const weight = weightMatch ? { value: parseFloat(weightMatch[1]), unit: weightMatch[2] || '' } : null;

      exercises.push({
        section: currentSection,
        round: currentRound,
        text,
        checked,
        weight,
      });
    }
  }

  return exercises;
}

function parseFeedback(md) {
  const feedbackSection = md.split('## Post-Workout Feedback')[1];
  if (!feedbackSection) return [];

  const feedback = [];
  const lines = feedbackSection.split('\n');
  let currentQuestion = null;
  let currentAnswer = [];

  for (const line of lines) {
    const questionMatch = line.match(/^\*\*(\d+\.\s*)?(.+?)\*\*$/);
    if (questionMatch) {
      if (currentQuestion) {
        feedback.push({ question: currentQuestion, answer: currentAnswer.join('\n').trim() });
      }
      currentQuestion = questionMatch[2].trim();
      currentAnswer = [];
    } else if (currentQuestion) {
      currentAnswer.push(line);
    }
  }

  if (currentQuestion) {
    feedback.push({ question: currentQuestion, answer: currentAnswer.join('\n').trim() });
  }

  return feedback;
}

function parseEnergyLevel(feedback) {
  const energyItem = feedback.find(f => f.question.toLowerCase().includes('energy'));
  if (!energyItem || !energyItem.answer) return null;
  const match = energyItem.answer.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}

function parseMachine(md) {
  const match = md.match(/\*\*Machine.*?:\*\*\s*(.+)/i);
  return match ? match[1].trim() : null;
}

/**
 * Parse the issue title to extract the date.
 */
export function parseDateFromTitle(title) {
  const match = title.match(/(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : null;
}

/**
 * Generate markdown from structured workout data (for creating/updating issues).
 */
export function generateMarkdown(workout) {
  const lines = [];

  for (const section of workout.sections) {
    lines.push(`## ${section.name}`);

    if (section.rounds) {
      for (const round of section.rounds) {
        lines.push(`### ${round.name}`);
        for (const ex of round.exercises) {
          const check = ex.checked ? 'x' : ' ';
          let text = ex.text;
          if (ex.weight !== undefined && ex.weight !== '') {
            text = text.replace(/weight:\s*___/, `weight: ${ex.weight}`);
          }
          lines.push(`- [${check}] ${text}`);
        }
        lines.push('');
      }
    } else if (section.exercises) {
      for (const ex of section.exercises) {
        const check = ex.checked ? 'x' : ' ';
        lines.push(`- [${check}] ${ex.text}`);
      }
      lines.push('');
    } else if (section.content) {
      lines.push(section.content);
      lines.push('');
    }
  }

  if (workout.feedback && workout.feedback.length > 0) {
    lines.push('---');
    lines.push('');
    lines.push('## Post-Workout Feedback');
    lines.push('_Fill this section out after your session (edit the issue or drop a comment):_');
    lines.push('');
    for (const f of workout.feedback) {
      lines.push(`**${f.question}**`);
      lines.push(f.answer || '');
      lines.push('');
    }
  }

  return lines.join('\n');
}
