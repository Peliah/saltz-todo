const DUE = new Date('2026-05-01T18:00:00Z');

function friendly(ms) {
  const abs = Math.abs(ms);
  const mins = Math.floor(abs / 60000);
  const hrs = Math.floor(abs / 3600000);
  const days = Math.floor(abs / 86400000);
  if (abs < 60000) return 'Due now!';
  if (days === 0 && hrs === 0) return (ms < 0 ? 'Overdue by ' : 'Due in ') + mins + ' min' + (mins !== 1 ? 's' : '');
  if (days === 0) return (ms < 0 ? 'Overdue by ' : 'Due in ') + hrs + ' hr' + (hrs !== 1 ? 's' : '');
  if (days === 1) return ms < 0 ? 'Overdue by 1 day' : 'Due tomorrow';
  return (ms < 0 ? 'Overdue by ' : 'Due in ') + days + ' days';
}

function updateTimeRemaining() {
  const ms = DUE - Date.now();
  const el = document.getElementById('time-remaining');
  const chip = document.getElementById('time-remaining-chip');
  const dot = document.getElementById('urgency-dot');

  el.textContent = friendly(ms);

  if (ms < 0) {
    chip.classList.add('overdue');
    dot.style.background = '#ff4d4d';
  } else {
    chip.classList.remove('overdue');
    dot.style.background = ms < 86400000 ? '#ff4d4d' : '#2d5da1';
  }
}

function initToggle() {
  const toggle = document.querySelector('.todo-complete-toggle');
  const title = document.querySelector('.todo-title');
  const status = document.querySelector('.todo-status');

  toggle.addEventListener('change', () => {
    const done = toggle.checked;
    title.classList.toggle('done', done);
    status.textContent = done ? 'Done' : 'In Progress';
    status.classList.toggle('done', done);
    status.setAttribute('aria-label', 'Status: ' + (done ? 'Done' : 'In Progress'));
  });
}

updateTimeRemaining();
setInterval(updateTimeRemaining, 60000);
initToggle();