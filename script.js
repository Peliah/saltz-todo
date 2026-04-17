(function () {
  'use strict';

  const DESCR_COLLAPSE_THRESHOLD = 100;
  const TIME_UPDATE_MS = 45000;

  /** @type {{ title: string, description: string, priority: 'Low'|'Medium'|'High', due: Date, status: 'Pending'|'In Progress'|'Done', expanded: boolean }} */
  let state = {
    title: 'Redesign onboarding flow',
    description:
      'Map out the full user journey from signup to first value moment. Include edge cases for mobile and low-bandwidth scenarios.',
    priority: 'High',
    due: new Date('2026-05-01T18:00:00Z'),
    status: 'In Progress',
    expanded: false,
  };

  let snapshot = null;
  let timeIntervalId = null;

  const view = document.getElementById('todo-card-view');
  const form = document.getElementById('todo-edit-form');
  const card = document.querySelector('.todo-card');

  const checkbox = document.querySelector('.todo-complete-toggle');
  const statusSelect = document.getElementById('todo-status-control');
  const titleEl = document.querySelector('.todo-title');
  const priorityIndicator = document.querySelector('[data-testid="test-todo-priority-indicator"]');
  const priorityLabel = document.querySelector('[data-todo-priority-label]');
  const priorityGroup = document.querySelector('[data-priority-group]');
  const descriptionEl = document.querySelector('.todo-description');
  const expandBtn = document.getElementById('todo-expand-toggle');
  const collapsible = document.getElementById('todo-collapsible-section');
  const dueDateEl = document.querySelector('.todo-due-date');
  const timeRemainingEl = document.getElementById('time-remaining');
  const overdueIndicator = document.getElementById('todo-overdue-indicator');
  const timeChip = document.getElementById('time-remaining-chip');
  const urgencyDot = document.getElementById('urgency-dot');
  const editBtn = document.getElementById('todo-edit-button');
  const cancelBtn = document.getElementById('todo-cancel-button');

  const titleInput = document.getElementById('todo-edit-title-input');
  const descriptionInput = document.getElementById('todo-edit-description-input');
  const priorityInput = document.getElementById('todo-edit-priority-select');
  const dueInput = document.getElementById('todo-edit-due-date-input');

  function toDateTimeLocalValue(d) {
    const pad = (n) => String(n).padStart(2, '0');
    return (
      `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T` +
      `${pad(d.getHours())}:${pad(d.getMinutes())}`
    );
  }

  function formatDueChip(d) {
    return `Due ${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`;
  }

  /**
   * @param {number} ms dueDate - now
   * @param {boolean} isDone
   */
  function friendlyTimeRemaining(ms, isDone) {
    if (isDone) return 'Completed';

    const past = ms < 0;
    const abs = Math.abs(ms);
    const mins = Math.floor(abs / 60000);
    const hrs = Math.floor(abs / 3600000);
    const days = Math.floor(abs / 86400000);

    if (past) {
      if (abs < 60000) return 'Overdue by less than a minute';
      if (days >= 1) return `Overdue by ${days} day${days === 1 ? '' : 's'}`;
      if (hrs >= 1) return `Overdue by ${hrs} hour${hrs === 1 ? '' : 's'}`;
      return `Overdue by ${mins} minute${mins === 1 ? '' : 's'}`;
    }

    if (abs < 60000) return 'Due in less than a minute';
    if (days >= 2) return `Due in ${days} days`;
    if (days === 1) return 'Due tomorrow';
    if (hrs >= 1) return `Due in ${hrs} hour${hrs === 1 ? '' : 's'}`;
    return `Due in ${mins} minute${mins === 1 ? '' : 's'}`;
  }

  function stopTimeUpdates() {
    if (timeIntervalId !== null) {
      clearInterval(timeIntervalId);
      timeIntervalId = null;
    }
  }

  function startTimeUpdates() {
    stopTimeUpdates();
    updateTimeRemaining();
    timeIntervalId = window.setInterval(updateTimeRemaining, TIME_UPDATE_MS);
  }

  function updateTimeRemaining() {
    const isDone = state.status === 'Done';
    const ms = state.due.getTime() - Date.now();

    timeRemainingEl.textContent = friendlyTimeRemaining(ms, isDone);
    timeRemainingEl.setAttribute('datetime', state.due.toISOString());

    const overdue = !isDone && ms < 0;
    overdueIndicator.hidden = !overdue;
    timeChip.classList.toggle('overdue', overdue);
    timeChip.classList.toggle('completed-time', isDone);

    if (urgencyDot) {
      if (isDone) {
        urgencyDot.style.background = '#888';
      } else if (overdue) {
        urgencyDot.style.background = '#ff4d4d';
      } else {
        urgencyDot.style.background = ms < 86400000 ? '#ff4d4d' : '#2d5da1';
      }
    }

    if (isDone) {
      stopTimeUpdates();
    }
  }

  function setPriorityIndicatorClass(el) {
    el.classList.remove('priority-low', 'priority-medium', 'priority-high');
    const p = state.priority;
    if (p === 'Low') el.classList.add('priority-low');
    else if (p === 'Medium') el.classList.add('priority-medium');
    else el.classList.add('priority-high');
  }

  function applyCardVisualState() {
    const done = state.status === 'Done';
    const inProgress = state.status === 'In Progress';

    titleEl.classList.toggle('done', done);
    card.classList.toggle('todo-card--done', done);
    card.classList.toggle('todo-card--in-progress', inProgress && !done);
    card.classList.toggle('todo-card--overdue', !done && state.due.getTime() < Date.now());

    checkbox.checked = done;
    statusSelect.value = state.status;

    titleEl.textContent = state.title;
    descriptionEl.textContent = state.description;

    setPriorityIndicatorClass(priorityIndicator);
    priorityLabel.textContent = state.priority;
    if (priorityGroup) {
      priorityGroup.setAttribute('aria-label', `Priority: ${state.priority}`);
      priorityGroup.classList.remove(
        'priority-accent-low',
        'priority-accent-medium',
        'priority-accent-high'
      );
      const accent =
        state.priority === 'Low'
          ? 'priority-accent-low'
          : state.priority === 'Medium'
            ? 'priority-accent-medium'
            : 'priority-accent-high';
      priorityGroup.classList.add(accent);
    }

    dueDateEl.textContent = formatDueChip(state.due);
    dueDateEl.setAttribute('datetime', state.due.toISOString());

    refreshCollapsibleUi();
  }

  function refreshCollapsibleUi() {
    const long = state.description.length > DESCR_COLLAPSE_THRESHOLD;
    const needsToggle = long;

    expandBtn.hidden = !needsToggle;
    if (!needsToggle) {
      collapsible.classList.remove('is-clamped');
      expandBtn.setAttribute('aria-expanded', 'true');
      return;
    }

    const expanded = state.expanded;
    collapsible.classList.toggle('is-clamped', !expanded);
    expandBtn.setAttribute('aria-expanded', expanded ? 'true' : 'false');
    expandBtn.textContent = expanded ? 'Show less' : 'Show more';
  }

  function syncCheckboxFromStatus() {
    checkbox.checked = state.status === 'Done';
  }

  function syncStatusFromCheckbox() {
    if (checkbox.checked) {
      state.status = 'Done';
    } else {
      state.status = 'Pending';
    }
    statusSelect.value = state.status;
    applyCardVisualState();
    if (state.status === 'Done') {
      updateTimeRemaining();
    } else {
      startTimeUpdates();
    }
  }

  function syncFromStatusSelect() {
    state.status = /** @type {typeof state.status} */ (statusSelect.value);
    syncCheckboxFromStatus();
    applyCardVisualState();
    if (state.status === 'Done') {
      updateTimeRemaining();
    } else {
      startTimeUpdates();
    }
  }

  function openEdit() {
    snapshot = {
      title: state.title,
      description: state.description,
      priority: state.priority,
      due: new Date(state.due.getTime()),
      status: state.status,
    };

    titleInput.value = state.title;
    descriptionInput.value = state.description;
    priorityInput.value = state.priority;
    dueInput.value = toDateTimeLocalValue(state.due);

    view.hidden = true;
    form.hidden = false;

    if (view.inert !== undefined) view.inert = true;
    form.inert = false;

    titleInput.focus();

    document.addEventListener('keydown', onEditFormKeydown);
  }

  function closeEdit() {
    form.hidden = true;
    view.hidden = false;
    if (view.inert !== undefined) view.inert = false;

    document.removeEventListener('keydown', onEditFormKeydown);
    editBtn.focus();
  }

  function onEditFormKeydown(e) {
    if (e.key !== 'Escape') return;
    e.preventDefault();
    cancelEdit();
  }

  function focusTrapHandler(e) {
    if (e.key !== 'Tab' || form.hidden) return;

    const focusables = form.querySelectorAll(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled])'
    );
    const list = Array.from(focusables);
    if (list.length < 2) return;

    const first = list[0];
    const last = list[list.length - 1];

    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  function cancelEdit() {
    if (snapshot) {
      state.title = snapshot.title;
      state.description = snapshot.description;
      state.priority = snapshot.priority;
      state.due = snapshot.due;
      state.status = snapshot.status;
      applyCardVisualState();
      syncCheckboxFromStatus();
    }
    snapshot = null;
    closeEdit();
    if (state.status !== 'Done') startTimeUpdates();
    else updateTimeRemaining();
  }

  function saveEdit(e) {
    e.preventDefault();

    state.title = titleInput.value.trim() || state.title;
    state.description = descriptionInput.value;
    state.priority = /** @type {typeof state.priority} */ (priorityInput.value);

    const parsed = new Date(dueInput.value);
    if (!Number.isNaN(parsed.getTime())) {
      state.due = parsed;
    }

    if (state.description.length <= DESCR_COLLAPSE_THRESHOLD) {
      state.expanded = false;
    }

    snapshot = null;
    applyCardVisualState();
    syncCheckboxFromStatus();

    closeEdit();

    if (state.status !== 'Done') startTimeUpdates();
    else updateTimeRemaining();
  }

  checkbox.addEventListener('change', syncStatusFromCheckbox);
  statusSelect.addEventListener('change', syncFromStatusSelect);

  expandBtn.addEventListener('click', () => {
    state.expanded = !state.expanded;
    refreshCollapsibleUi();
  });

  editBtn.addEventListener('click', openEdit);
  cancelBtn.addEventListener('click', cancelEdit);
  form.addEventListener('submit', saveEdit);
  form.addEventListener('keydown', focusTrapHandler);

  document.querySelector('.todo-delete-button')?.addEventListener('click', () => {
    window.alert('Delete clicked');
  });

  applyCardVisualState();
  syncCheckboxFromStatus();
  startTimeUpdates();
})();
