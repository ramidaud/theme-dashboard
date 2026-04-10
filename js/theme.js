/* ============================================================
   Theme Exploration Dashboard — Theme Breakout Page Logic
   ============================================================ */

let currentTheme = null;
let explorationFilter = 'All';

document.addEventListener('DOMContentLoaded', async () => {
  const params = new URLSearchParams(window.location.search);
  currentTheme = params.get('theme');

  if (!currentTheme || !['design', 'global', 'health'].includes(currentTheme)) {
    window.location.href = 'index.html';
    return;
  }

  await store.load();
  renderNav('theme');

  document.title = `${getThemeLabel(currentTheme)} — Theme Exploration Dashboard`;

  renderHeader();
  renderPeople();
  renderExplorationLog();
  renderMeetingNotes();
  renderTasks();
  renderRecommendations();
  renderThemeNotes();

  window.addEventListener('data-changed', (e) => {
    if (e.detail.collection === currentTheme || e.detail.collection === 'themes') {
      renderHeader();
      renderPeople();
      renderExplorationLog();
      renderMeetingNotes();
      renderTasks();
      renderRecommendations();
    }
  });
});

// ---- Header (with proof point badges) ----
function renderHeader() {
  const meta = store.getThemeMeta(currentTheme);
  if (!meta) return;
  const header = document.getElementById('themeHeader');
  const data = store.getThemeData(currentTheme);
  
  header.style.backgroundImage = `url('images/${currentTheme}-header.jpg')`;

  const nbLink = localStorage.getItem('ted-notebooklm-link') || '';

  // Build proof point badges for the header
  const metrics = data.keyMetrics || [];
  const partners = data.partnerships || [];
  const competitors = data.competitors || [];
  let badgesHtml = '';
  if (metrics.length || partners.length || competitors.length) {
    badgesHtml = `<div class="hero-badges">`;
    metrics.forEach(m => badgesHtml += `<span class="hero-badge hero-badge--metric">🏆 ${escapeHtml(m)}</span>`);
    partners.forEach(p => badgesHtml += `<span class="hero-badge hero-badge--partner">🎯 ${escapeHtml(p)}</span>`);
    competitors.forEach(c => badgesHtml += `<span class="hero-badge hero-badge--competitor">⚔️ ${escapeHtml(c)}</span>`);
    badgesHtml += `</div>`;
  }

  header.innerHTML = `
    <div class="container">
      <div style="display:flex;align-items:flex-end;justify-content:space-between;gap:var(--space-4);flex-wrap:wrap;width:100%;">
        <div style="flex:1;">
          <h1 class="hero-title" style="display:flex;align-items:center;gap:var(--space-3);">
            <span style="width:16px;height:16px;border-radius:50%;background:${meta.accent};flex-shrink:0;box-shadow:0 2px 4px rgba(0,0,0,0.3);"></span>
            ${escapeHtml(meta.name)}
          </h1>
          <p class="hero-subtitle">Facilitated by ${escapeHtml(meta.facilitator)}</p>
          ${badgesHtml}
        </div>
        <div style="display:flex;gap:var(--space-2);margin-bottom:var(--space-2);">
          ${nbLink ? `<a href="${escapeHtml(nbLink)}" target="_blank" class="btn btn-secondary btn-sm" style="background:rgba(255,255,255,0.9);color:var(--color-primary);border:none;box-shadow:var(--shadow-sm);">📓 NotebookLM</a>` : ''}
          <button class="btn btn-primary btn-sm" style="box-shadow:var(--shadow-sm);" onclick="exportThemeToMarkdown('${currentTheme}')">📥 Export</button>
        </div>
      </div>
    </div>
  `;
}

// ---- People (compact pills) ----
function renderPeople() {
  const section = document.getElementById('peopleSection');
  const allPeople = store.get('people') || [];
  const themePeople = allPeople.filter(p => (p.themes || []).includes(currentTheme));
  
  themePeople.sort((a,b) => a.name.localeCompare(b.name));

  let html = `
    <div class="section-header">
      <div style="display:flex;align-items:center;gap:var(--space-3);">
        <h2 style="margin-bottom:0;">People</h2>
      </div>
      <a href="people.html" class="btn btn-secondary btn-sm" style="box-shadow:var(--shadow-sm);">Manage Directory</a>
    </div>
  `;
    
  if (themePeople.length === 0) {
    html += `<div class="empty-state"><div class="empty-icon">👥</div><p>No people assigned to this theme.</p></div>`;
  } else {
    html += `<div class="people-pill-row">`;
    themePeople.forEach(p => {
      html += `
        <div class="people-pill" title="${escapeHtml(p.role)}">
          <span class="pill-avatar">${p.name.charAt(0).toUpperCase()}</span>
          ${escapeHtml(p.name)}
        </div>
      `;
    });
    html += `</div>`;
  }
  
  section.innerHTML = html;
}

function renderProofPoints() {
  const section = document.getElementById('proofPointsSection');
  const data = store.getThemeData(currentTheme);
  
  const competitors = data.competitors || [];
  const keyMetrics = data.keyMetrics || [];
  const partnerships = data.partnerships || [];

  if (competitors.length === 0 && keyMetrics.length === 0 && partnerships.length === 0) {
    section.innerHTML = ``;
    return;
  }

  let html = `
    <div class="section-header">
      <h2>Strategic Proof Points</h2>
    </div>
    <div class="grid-3 stagger-children" style="margin-bottom:var(--space-8);">
  `;

  if (keyMetrics.length > 0) {
    html += `
      <div class="card" style="padding: var(--space-4); border-top: 3px solid var(--color-success);">
        <h4 style="margin-bottom: var(--space-3); display: flex; align-items: center; gap: 8px;">🏆 Key Metrics</h4>
        <div style="display: flex; flex-direction: column; gap: var(--space-2);">
          ${keyMetrics.map(m => `<div style="background: var(--color-surface-muted); padding: var(--space-2) var(--space-3); border-radius: var(--radius-sm); font-size: var(--text-sm);">${escapeHtml(m)}</div>`).join('')}
        </div>
      </div>
    `;
  }

  if (partnerships.length > 0) {
    html += `
      <div class="card" style="padding: var(--space-4); border-top: 3px solid var(--color-primary);">
        <h4 style="margin-bottom: var(--space-3); display: flex; align-items: center; gap: 8px;">🎯 Targets & Partners</h4>
        <div style="display: flex; flex-wrap: wrap; gap: var(--space-2);">
          ${partnerships.map(p => `<span class="badge badge-blue">${escapeHtml(p)}</span>`).join('')}
        </div>
      </div>
    `;
  }

  if (competitors.length > 0) {
    html += `
      <div class="card" style="padding: var(--space-4); border-top: 3px solid var(--color-danger);">
        <h4 style="margin-bottom: var(--space-3); display: flex; align-items: center; gap: 8px;">⚔️ Competitors</h4>
        <div style="display: flex; flex-direction: column; gap: var(--space-2);">
          ${competitors.map(c => `<div style="border-left: 2px solid var(--color-danger); padding-left: var(--space-2); font-size: var(--text-sm);">${escapeHtml(c)}</div>`).join('')}
        </div>
      </div>
    `;
  }

  html += `</div>`;
  section.innerHTML = html;
}

// ---- Exploration Log ----
function renderExplorationLog() {
  const section = document.getElementById('explorationSection');
  const data = store.getThemeData(currentTheme);
  let items = (data.explorationLog || []).sort((a, b) => (b.dateAdded || '').localeCompare(a.dateAdded || ''));

  if (explorationFilter !== 'All') {
    items = items.filter(i => i.status === explorationFilter);
  }

  const allItems = data.explorationLog || [];
  const counts = {
    All: allItems.length,
    Active: allItems.filter(i => i.status === 'Active').length,
    Converging: allItems.filter(i => i.status === 'Converging').length,
    Parked: allItems.filter(i => i.status === 'Parked').length
  };

  section.innerHTML = `
    <div class="section-header">
      <h2>Exploration Log</h2>
      <button class="btn btn-primary btn-sm" onclick="openAddExploration()">+ Add Entry</button>
    </div>
    <div class="filter-bar">
      ${Object.entries(counts).map(([status, count]) => `
        <button class="filter-btn ${explorationFilter === status ? 'active' : ''}" onclick="setExplorationFilter('${status}')">
          ${status} <span style="opacity:0.7">(${count})</span>
        </button>
      `).join('')}
    </div>
    ${items.length === 0 ? `
      <div class="empty-state"><div class="empty-icon">🔭</div><p>No exploration items${explorationFilter !== 'All' ? ' matching this filter' : ''}. Start by adding a question, idea, or open thread.</p></div>
    ` : `<div class="timeline stagger-children">` + items.map(item => {
      const typeBadge = item.type === 'Question' ? 'badge-blue' : item.type === 'Idea' ? 'badge-green' : 'badge-gold';
      const statusBadge = getStatusBadgeClass(item.status);
      return `
        <div class="exploration-item" id="exp-${item.id}">
          <div class="exploration-header">
            <div class="exploration-title">${escapeHtml(item.title)}</div>
            <div class="badges">
              <span class="badge ${typeBadge}">${item.type}</span>
              <select class="form-inline-select ${statusBadge}" onchange="updateExplorationStatus('${item.id}', this.value)">
                ${['Active', 'Converging', 'Parked'].map(s =>
                  `<option value="${s}" ${item.status === s ? 'selected' : ''}>${s}</option>`
                ).join('')}
              </select>
            </div>
          </div>
          <div class="exploration-meta">
            ${escapeHtml(item.raisedBy)} · ${formatDate(item.dateAdded)}
            <button class="btn btn-icon btn-ghost btn-sm" onclick="deleteExploration('${item.id}')" title="Delete" style="margin-left:auto;">🗑</button>
          </div>
          ${item.details ? `
            <button class="exploration-expand" onclick="toggleDetails('${item.id}')">Show details ▾</button>
            <div class="exploration-details" id="details-${item.id}">${escapeHtml(item.details)}</div>
          ` : ''}
        </div>
      `;
    }).join('') + '</div>'}
  `;
}

window.setExplorationFilter = function (filter) {
  explorationFilter = filter;
  renderExplorationLog();
};

window.toggleDetails = function (id) {
  const details = document.getElementById(`details-${id}`);
  const btn = details?.previousElementSibling;
  if (details) {
    details.classList.toggle('open');
    if (btn) btn.textContent = details.classList.contains('open') ? 'Hide details ▴' : 'Show details ▾';
  }
};

window.updateExplorationStatus = function (id, status) {
  const data = store.getThemeData(currentTheme);
  const item = (data.explorationLog || []).find(e => e.id === id);
  if (item) {
    item.status = status;
    store.saveThemeData(currentTheme, data);
    renderExplorationLog();
  }
};

window.deleteExploration = function (id) {
  const data = store.getThemeData(currentTheme);
  data.explorationLog = (data.explorationLog || []).filter(e => e.id !== id);
  store.saveThemeData(currentTheme, data);
  renderExplorationLog();
};

window.openAddExploration = function () {
  const formHTML = `
    <div class="form-group">
      <label>Type</label>
      <select class="form-select" id="expType">
        <option value="Question">Question</option>
        <option value="Idea">Idea</option>
        <option value="Open Thread">Open Thread</option>
      </select>
    </div>
    <div class="form-group">
      <label>Title</label>
      <input type="text" class="form-input" id="expTitle" placeholder="Short description">
    </div>
    <div class="form-group">
      <label>Details</label>
      <textarea class="form-textarea" id="expDetails" rows="3" placeholder="Longer explanation (optional)"></textarea>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>Raised By</label>
        <input type="text" class="form-input" id="expBy" placeholder="Name">
      </div>
      <div class="form-group">
        <label>Status</label>
        <select class="form-select" id="expStatus">
          <option value="Active">Active</option>
          <option value="Converging">Converging</option>
          <option value="Parked">Parked</option>
        </select>
      </div>
    </div>
  `;

  openModal('Add Exploration Entry', formHTML, () => {
    const title = document.getElementById('expTitle').value.trim();
    if (!title) return;
    const data = store.getThemeData(currentTheme);
    data.explorationLog = data.explorationLog || [];
    data.explorationLog.unshift({
      id: generateId('exp'),
      type: document.getElementById('expType').value,
      title,
      details: document.getElementById('expDetails').value,
      raisedBy: document.getElementById('expBy').value || 'Unknown',
      dateAdded: todayStr(),
      status: document.getElementById('expStatus').value
    });
    store.saveThemeData(currentTheme, data);
    closeModal();
    renderExplorationLog();
  });
};

// ---- Meeting Notes ----
function renderMeetingNotes() {
  const section = document.getElementById('meetingNotesSection');
  const data = store.getThemeData(currentTheme);
  const notes = (data.meetingNotes || []).sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  let html = `
    <div class="section-header">
      <h2>Meeting Notes</h2>
      <button class="btn btn-primary btn-sm" onclick="openAddMeetingNote()">+ Add Notes</button>
    </div>
  `;

  if (notes.length === 0) {
    html += '<div class="empty-state"><div class="empty-icon">📝</div><p>No meeting notes yet. Add notes after your next theme meeting.</p></div>';
  } else {
    html += '<div class="meeting-list stagger-children">';
    notes.forEach(note => {
      html += `
        <div class="meeting-note-entry" id="mn-${note.id}">
          <div class="meeting-note-header" onclick="toggleMeetingNote('${note.id}')">
            <div>
              <span class="date">${formatDate(note.date)}</span>
              <span class="attendees-preview">${escapeHtml(note.attendees)}</span>
            </div>
            <div style="display:flex;align-items:center;gap:var(--space-2);">
              <button class="btn btn-sm btn-secondary" onclick="event.stopPropagation(); aiExtractFromNote('${note.id}')" title="Extract action items with AI">✨ Extract</button>
              <span class="chevron">▾</span>
            </div>
          </div>
          <div class="meeting-note-body" id="mnBody-${note.id}">
            ${note.keyPoints ? `<div class="meeting-note-section"><h4>Key Discussion Points</h4><div class="content">\n${escapeHtml(note.keyPoints).replace(/\\n/g, '<br>')}</div></div>` : ''}
            ${note.decisions ? `<div class="meeting-note-section"><h4>Decisions Made</h4><div class="content">\n${escapeHtml(note.decisions).replace(/\\n/g, '<br>')}</div></div>` : ''}
            ${note.questionsRaised ? `<div class="meeting-note-section"><h4>New Questions Raised</h4><div class="content">\n${escapeHtml(note.questionsRaised).replace(/\\n/g, '<br>')}</div></div>` : ''}
            ${note.actionItems ? `<div class="meeting-note-section"><h4>Action Items</h4><div class="content">\n${escapeHtml(note.actionItems).replace(/\\n/g, '<br>')}</div></div>` : ''}
            ${note.notesLink ? `<div class="meeting-note-section"><h4>Full Notes</h4><a href="${escapeHtml(note.notesLink)}" target="_blank">${escapeHtml(note.notesLink)}</a></div>` : ''}
            <div style="margin-top:var(--space-4);display:flex;gap:var(--space-2);">
              <button class="btn btn-sm btn-ghost btn-danger" onclick="deleteMeetingNote('${note.id}')">Delete</button>
            </div>
          </div>
        </div>
      `;
    });
    html += '</div>';
  }

  section.innerHTML = html;
}

window.toggleMeetingNote = function (id) {
  const body = document.getElementById(`mnBody-${id}`);
  const header = body?.previousElementSibling;
  if (body) {
    body.classList.toggle('open');
    header?.classList.toggle('expanded');
  }
};

window.aiExtractFromNote = async function (noteId) {
  const data = store.getThemeData(currentTheme);
  const note = (data.meetingNotes || []).find(n => n.id === noteId);
  if (!note) return;

  const container = document.getElementById(`aiSuggestions-${noteId}`);
  container.innerHTML = '<p class="text-sm text-muted" style="padding:var(--space-3);">✨ Analyzing meeting notes...</p>';

  // Make sure body is open
  const body = document.getElementById(`mnBody-${noteId}`);
  if (body && !body.classList.contains('open')) {
    body.classList.add('open');
    body.previousElementSibling?.classList.add('expanded');
  }

  const extracted = await extractFromMeetingNotes(note, currentTheme);
  renderAISuggestions(extracted, note, currentTheme, container);
};

window.openAddMeetingNote = function () {
  const formHTML = `
    <div class="form-row">
      <div class="form-group">
        <label>Date</label>
        <input type="date" class="form-input" id="mnDate" value="${todayStr()}">
      </div>
      <div class="form-group">
        <label>Attendees</label>
        <input type="text" class="form-input" id="mnAttendees" placeholder="Names, comma-separated">
      </div>
    </div>
    
    <div class="form-group" style="margin-bottom: var(--space-6); padding-bottom: var(--space-6); border-bottom: 1px solid var(--color-border-light);">
      <label style="display:flex; justify-content:space-between; align-items:flex-end;">
        Raw Meeting Notes / Transcript
        <button type="button" class="btn btn-sm" style="background:var(--ksu-gold); color:#000; font-weight:bold; box-shadow:var(--shadow-sm); border-radius:var(--radius-full);" onclick="inlineAIExtract()">✨ Analyze & Extract</button>
      </label>
      <p class="text-xs text-muted mb-2">Paste rough notes here, then let AI organize them into the fields below.</p>
      <textarea class="form-textarea" id="mnRawNotes" rows="6" placeholder="Paste rough notes, transcriptions, or thoughts here..."></textarea>
      <div id="inlineAILoading" style="display:none; font-size:var(--text-xs); color:var(--color-primary); font-weight:bold; margin-top:var(--space-2);">✨ Analyzing notes with Gemini...</div>
    </div>

    <div class="grid-2">
      <div class="form-group">
        <label>Key Discussion Points</label>
        <textarea class="form-textarea" id="mnKeyPoints" rows="4" placeholder="Main topics discussed"></textarea>
      </div>
      <div class="form-group">
        <label>Decisions Made</label>
        <textarea class="form-textarea" id="mnDecisions" rows="4" placeholder="Even tentative ones"></textarea>
      </div>
    </div>
    
    <div class="grid-2">
      <div class="form-group">
        <label>New Questions Raised</label>
        <textarea class="form-textarea" id="mnQuestions" rows="4" placeholder="Could become Exploration Log entries"></textarea>
      </div>
      <div class="form-group">
        <label>Action Items</label>
        <textarea class="form-textarea" id="mnActions" rows="4" placeholder="Tasks from this meeting"></textarea>
      </div>
    </div>
    
    <div class="form-group">
      <label>Link to Full Notes</label>
      <input type="url" class="form-input" id="mnLink" placeholder="Google Doc URL, NotebookLM, etc.">
    </div>
  `;

  openModal('Add Meeting Notes', formHTML, () => {
    const date = document.getElementById('mnDate').value;
    if (!date) return;
    const data = store.getThemeData(currentTheme);
    data.meetingNotes = data.meetingNotes || [];
    data.meetingNotes.push({
      id: generateId('mn'),
      date,
      attendees: document.getElementById('mnAttendees').value,
      keyPoints: document.getElementById('mnKeyPoints').value,
      decisions: document.getElementById('mnDecisions').value,
      questionsRaised: document.getElementById('mnQuestions').value,
      actionItems: document.getElementById('mnActions').value,
      notesLink: document.getElementById('mnLink').value
    });
    store.saveThemeData(currentTheme, data);
    closeModal();
    renderMeetingNotes();
  }, { width: '800px' });
};

window.inlineAIExtract = async function() {
  const rawText = document.getElementById('mnRawNotes').value.trim();
  if (!rawText) return;
  
  const loading = document.getElementById('inlineAILoading');
  loading.style.display = 'block';

  try {
    const prompt = `Extract structured information from the following meeting notes/transcript.
    Break it down into these exactly named sections:
    KEY POINTS:
    DECISIONS:
    QUESTIONS:
    ACTION ITEMS:
    
    Notes:
    ${rawText}`;
    
    if (typeof window.geminiRequest === 'function') {
      const resp = await window.geminiRequest([{"role": "user", "parts": [{"text": prompt}]}]);
      const text = resp.candidates[0].content.parts[0].text;
      
      const extractSection = (header) => {
        const regex = new RegExp(`${header}:\\s*([\\s\\S]*?)(?=(KEY POINTS:|DECISIONS:|QUESTIONS:|ACTION ITEMS:|$))`, 'i');
        const match = text.match(regex);
        let result = match ? match[1].trim() : '';
        result = result.replace(/^\\*\\*.*?\\*\\*\\s*/gm, ''); // clean up bold headers if gemini adds them
        if (result.startsWith('- ')) result = result; // preserve lists
        return result;
      };
      
      const k = extractSection('KEY POINTS');
      const d = extractSection('DECISIONS');
      const q = extractSection('QUESTIONS');
      const a = extractSection('ACTION ITEMS');
      
      if(k) document.getElementById('mnKeyPoints').value = k;
      if(d) document.getElementById('mnDecisions').value = d;
      if(q) document.getElementById('mnQuestions').value = q;
      if(a) document.getElementById('mnActions').value = a;
      
      loading.textContent = '✨ Analysis complete! Review fields below.';
    } else {
      loading.textContent = '❌ AI integration (ai.js) not available.';
    }
  } catch(e) {
    console.error(e);
    loading.textContent = '❌ Error analyzing notes. Check API key.';
  } finally {
    setTimeout(() => { loading.style.display = 'none'; loading.textContent = '✨ Analyzing notes with Gemini...'; }, 4000);
  }
};

window.deleteMeetingNote = function (id) {
  if (!confirm('Delete these meeting notes?')) return;
  const data = store.getThemeData(currentTheme);
  data.meetingNotes = (data.meetingNotes || []).filter(n => n.id !== id);
  store.saveThemeData(currentTheme, data);
  renderMeetingNotes();
};

// ---- Tasks ----
let taskSort = 'dueDate';

function renderTasks() {
  const section = document.getElementById('tasksSection');
  const data = store.getThemeData(currentTheme);
  let tasks = [...(data.tasks || [])];

  // Sort
  if (taskSort === 'dueDate') {
    tasks.sort((a, b) => (a.dueDate || 'z').localeCompare(b.dueDate || 'z'));
  } else if (taskSort === 'status') {
    const order = { 'Not Started': 0, 'In Progress': 1, 'Done': 2 };
    tasks.sort((a, b) => (order[a.status] || 0) - (order[b.status] || 0));
  } else if (taskSort === 'priority') {
    const order = { 'High': 0, 'Medium': 1, 'Low': 2 };
    tasks.sort((a, b) => (order[a.priority] || 1) - (order[b.priority] || 1));
  }

  let html = `
    <div class="section-header">
      <h2>Tasks</h2>
      <div style="display:flex;gap:var(--space-2);align-items:center;">
        <span class="text-xs text-muted">Sort:</span>
        <select class="form-inline-select" onchange="setTaskSort(this.value)" style="border:1px solid var(--color-border);">
          <option value="dueDate" ${taskSort === 'dueDate' ? 'selected' : ''}>Due Date</option>
          <option value="status" ${taskSort === 'status' ? 'selected' : ''}>Status</option>
          <option value="priority" ${taskSort === 'priority' ? 'selected' : ''}>Priority</option>
        </select>
        <button class="btn btn-primary btn-sm" onclick="openAddTask()">+ Add Task</button>
      </div>
    </div>
  `;

  if (tasks.length === 0) {
    html += '<div class="empty-state"><div class="empty-icon">✅</div><p>No tasks yet. Add one or extract from meeting notes with AI.</p></div>';
  } else {
    html += `
      <div style="overflow-x:auto;">
        <table class="data-table">
          <thead><tr>
            <th>Task</th>
            <th>Owner</th>
            <th>Due</th>
            <th>Status</th>
            <th>Priority</th>
            <th>Source</th>
            <th></th>
          </tr></thead>
          <tbody class="stagger-children">
    `;
    tasks.forEach(t => {
      html += `
        <tr>
          <td class="task-name">${escapeHtml(t.task)}</td>
          <td>${escapeHtml(t.owner)}</td>
          <td>${formatDate(t.dueDate)}</td>
          <td>
            <select class="form-inline-select ${getStatusBadgeClass(t.status)}" onchange="updateTaskStatus('${t.id}', this.value)">
              ${['Not Started', 'In Progress', 'Done'].map(s =>
                `<option value="${s}" ${t.status === s ? 'selected' : ''}>${s}</option>`
              ).join('')}
            </select>
          </td>
          <td><span class="badge ${getStatusBadgeClass(t.priority)}">${t.priority}</span></td>
          <td class="text-xs text-muted">${escapeHtml(t.source || '')}</td>
          <td><button class="btn btn-icon btn-ghost" onclick="deleteTask('${t.id}')" title="Delete">🗑</button></td>
        </tr>
      `;
    });
    html += '</tbody></table></div>';
  }

  section.innerHTML = html;
}

window.setTaskSort = function (sort) {
  taskSort = sort;
  renderTasks();
};

window.updateTaskStatus = function (id, status) {
  const data = store.getThemeData(currentTheme);
  const task = (data.tasks || []).find(t => t.id === id);
  if (task) {
    task.status = status;
    store.saveThemeData(currentTheme, data);
    renderTasks();
  }
};

window.deleteTask = function (id) {
  const data = store.getThemeData(currentTheme);
  data.tasks = (data.tasks || []).filter(t => t.id !== id);
  store.saveThemeData(currentTheme, data);
  renderTasks();
};

window.openAddTask = function () {
  const formHTML = `
    <div class="form-group">
      <label>Task Description</label>
      <input type="text" class="form-input" id="taskDesc" placeholder="What needs to be done?">
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>Owner</label>
        <input type="text" class="form-input" id="taskOwner" placeholder="Who's responsible?">
      </div>
      <div class="form-group">
        <label>Due Date</label>
        <input type="date" class="form-input" id="taskDue">
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>Priority</label>
        <select class="form-select" id="taskPriority">
          <option value="Medium">Medium</option>
          <option value="High">High</option>
          <option value="Low">Low</option>
        </select>
      </div>
      <div class="form-group">
        <label>Source</label>
        <input type="text" class="form-input" id="taskSource" placeholder="Which meeting or discussion?">
      </div>
    </div>
  `;

  openModal('Add Task', formHTML, () => {
    const desc = document.getElementById('taskDesc').value.trim();
    if (!desc) return;
    const data = store.getThemeData(currentTheme);
    data.tasks = data.tasks || [];
    data.tasks.push({
      id: generateId('task'),
      task: desc,
      owner: document.getElementById('taskOwner').value,
      dueDate: document.getElementById('taskDue').value,
      status: 'Not Started',
      source: document.getElementById('taskSource').value,
      priority: document.getElementById('taskPriority').value
    });
    store.saveThemeData(currentTheme, data);
    closeModal();
    renderTasks();
  });
};

// ---- Recommendations ----
function renderRecommendations() {
  const section = document.getElementById('recommendationsSection');
  const data = store.getThemeData(currentTheme);
  const recs = data.recommendations || [];

  let html = `
    <div class="section-header">
      <h2>Recommendations</h2>
      <button class="btn btn-primary btn-sm" onclick="openAddRecommendation()">+ Add Recommendation</button>
    </div>
  `;

  if (recs.length === 0) {
    html += '<div class="empty-state"><div class="empty-icon">💡</div><p>No recommendations yet. This section is for when exploration items start solidifying into proposals.</p></div>';
  } else {
    recs.forEach(r => {
      html += `
        <div class="recommendation-card">
          <div class="rec-title">${escapeHtml(r.title)}</div>
          <div class="rec-rationale">${escapeHtml(r.rationale || '')}</div>
          <div class="rec-meta">
            <div>
              <select class="form-inline-select ${getStatusBadgeClass(r.status)}" onchange="updateRecStatus('${r.id}', this.value)">
                ${['Draft', 'Ready for Discussion', 'Agreed Upon'].map(s =>
                  `<option value="${s}" ${r.status === s ? 'selected' : ''}>${s}</option>`
                ).join('')}
              </select>
            </div>
            <span>${escapeHtml(r.proposedBy || '')} · ${formatDate(r.dateProposed)}</span>
          </div>
          <button class="btn btn-sm btn-ghost btn-danger mt-2" onclick="deleteRecommendation('${r.id}')">Remove</button>
        </div>
      `;
    });
  }

  section.innerHTML = html;
}

window.updateRecStatus = function (id, status) {
  const data = store.getThemeData(currentTheme);
  const rec = (data.recommendations || []).find(r => r.id === id);
  if (rec) {
    rec.status = status;
    store.saveThemeData(currentTheme, data);
    renderRecommendations();
  }
};

window.deleteRecommendation = function (id) {
  const data = store.getThemeData(currentTheme);
  data.recommendations = (data.recommendations || []).filter(r => r.id !== id);
  store.saveThemeData(currentTheme, data);
  renderRecommendations();
};

window.openAddRecommendation = function () {
  const formHTML = `
    <div class="form-group">
      <label>Recommendation Title</label>
      <input type="text" class="form-input" id="recTitle" placeholder="What do you recommend?">
    </div>
    <div class="form-group">
      <label>Supporting Rationale</label>
      <textarea class="form-textarea" id="recRationale" rows="3" placeholder="Why this approach?"></textarea>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>Proposed By</label>
        <input type="text" class="form-input" id="recBy" placeholder="Name">
      </div>
      <div class="form-group">
        <label>Status</label>
        <select class="form-select" id="recStatus">
          <option value="Draft">Draft</option>
          <option value="Ready for Discussion">Ready for Discussion</option>
          <option value="Agreed Upon">Agreed Upon</option>
        </select>
      </div>
    </div>
  `;

  openModal('Add Recommendation', formHTML, () => {
    const title = document.getElementById('recTitle').value.trim();
    if (!title) return;
    const data = store.getThemeData(currentTheme);
    data.recommendations = data.recommendations || [];
    data.recommendations.push({
      id: generateId('rec'),
      title,
      rationale: document.getElementById('recRationale').value,
      status: document.getElementById('recStatus').value,
      dateProposed: todayStr(),
      proposedBy: document.getElementById('recBy').value || 'Unknown'
    });
    store.saveThemeData(currentTheme, data);
    closeModal();
    renderRecommendations();
  });
};

// ---- Theme Notes (rendered markdown with edit toggle) ----
let noteSaveTimer = null;
let notesEditMode = false;

function simpleMarkdown(text) {
  if (!text) return '<p class="text-muted">No notes yet.</p>';
  let html = escapeHtml(text);
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');
  html = html.replace(/^\- (.+)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
  html = html.replace(/\n\n/g, '</p><p>');
  html = html.replace(/\n/g, '<br>');
  if (!html.startsWith('<')) html = '<p>' + html + '</p>';
  return html;
}

function renderThemeNotes() {
  const section = document.getElementById('themeNotesSection');
  const data = store.getThemeData(currentTheme);

  if (notesEditMode) {
    section.innerHTML = `
      <div class="section-header">
        <h2>Theme Notes</h2>
        <div style="display:flex;align-items:center;gap:var(--space-2);">
          <span class="text-xs text-muted" id="notesSaveStatus"></span>
          <button class="btn btn-secondary btn-sm" onclick="toggleNotesEdit()">Done</button>
        </div>
      </div>
      <textarea class="scratchpad" id="themeNotesArea" placeholder="Freeform notes, ideas, links...">${escapeHtml(data.themeNotes || '')}</textarea>
    `;

    document.getElementById('themeNotesArea').addEventListener('input', (e) => {
      clearTimeout(noteSaveTimer);
      document.getElementById('notesSaveStatus').textContent = 'Saving...';
      noteSaveTimer = setTimeout(() => {
        const data = store.getThemeData(currentTheme);
        data.themeNotes = e.target.value;
        store.saveThemeData(currentTheme, data);
        document.getElementById('notesSaveStatus').textContent = 'Saved ✓';
        setTimeout(() => {
          const el = document.getElementById('notesSaveStatus');
          if (el) el.textContent = '';
        }, 2000);
      }, 500);
    });
  } else {
    section.innerHTML = `
      <div class="section-header">
        <h2>Theme Notes</h2>
        <button class="btn btn-secondary btn-sm" onclick="toggleNotesEdit()">✏️ Edit</button>
      </div>
      <div class="rendered-notes">${simpleMarkdown(data.themeNotes || '')}</div>
    `;
  }
}

window.toggleNotesEdit = function() {
  notesEditMode = !notesEditMode;
  renderThemeNotes();
};
