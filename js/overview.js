/* ============================================================
   Theme Exploration Dashboard — Overview Page Logic
   ============================================================ */

document.addEventListener('DOMContentLoaded', async () => {
  try {
    await store.load();
    renderNav('overview');
    renderThemeCards();
    renderMeetings();
    renderGlobalMeetingNotes();
    renderPatterns();
    renderUnknowns();
    renderCrossTasks();
    renderOverviewAI();

    window.addEventListener('data-changed', () => {
      renderThemeCards();
      renderMeetings();
      renderGlobalMeetingNotes();
      renderPatterns();
      renderUnknowns();
      renderCrossTasks();
      // AI doesn't strictly need re-rendering on every data-change, but okay
    });
  } catch (err) {
    console.error('Overview init error:', err);
    document.getElementById('app').innerHTML = `<div class="empty-state"><p>Error loading: ${err.message}</p></div>`;
  }
});

// ---- Theme Status Cards ----
function renderThemeCards() {
  const section = document.getElementById('themeCards');
  const themes = store.get('themes') || {};
  const slugs = Object.keys(themes).sort((a,b) => themes[a].name.localeCompare(themes[b].name));

  let html = `
    <div class="section-header">
      <h2>🗂️ Themes</h2>
      <button class="btn btn-primary btn-sm" onclick="openAddTheme()">+ New Theme</button>
    </div>
    <div class="grid-3 stagger-children">
  `;

  slugs.forEach(slug => {
    const t = themes[slug];
    if (!t) return;
    const data = store.getThemeData(slug);
    const explorationCount = (data.explorationLog || []).filter(e => e.status === 'Active').length;
    const taskCount = (data.tasks || []).filter(e => e.status !== 'Done').length;
    const statusClass = getStatusBadgeClass(t.status);

    html += `
      <a href="theme.html?theme=${slug}" class="card card-accent theme-card" style="--accent-color:${t.accent}; text-decoration:none;">
        <div class="theme-name">${escapeHtml(t.name)}</div>
        <div class="facilitator">Facilitated by ${escapeHtml(t.facilitator)}</div>
        <div>
          <select class="form-inline-select ${statusClass}" onchange="updateThemeStatus('${slug}', this.value); event.preventDefault(); event.stopPropagation();" onclick="event.preventDefault(); event.stopPropagation();">
            ${['Active Exploration', 'Converging', 'Needs Discussion', 'Paused'].map(s =>
              `<option value="${s}" ${t.status === s ? 'selected' : ''}>${s}</option>`
            ).join('')}
          </select>
        </div>
        <div class="stats">
          <div class="stat">
            <div class="stat-value">${explorationCount}</div>
            <div class="stat-label">Explorations</div>
          </div>
          <div class="stat">
            <div class="stat-value">${taskCount}</div>
            <div class="stat-label">Open Tasks</div>
          </div>
        </div>
      </a>
    `;
  });

  html += '</div>';
  section.innerHTML = html;
}

window.openAddTheme = function() {
  const formHTML = `
    <div class="form-group">
      <label>Theme Name</label>
      <input type="text" class="form-input" id="newThemeName" placeholder="e.g. Student Success">
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>Facilitator (Optional)</label>
        <input type="text" class="form-input" id="newThemeFacilitator" placeholder="Name">
      </div>
      <div class="form-group">
        <label>Accent Color</label>
        <div style="display:flex; gap:8px;">
          <input type="color" class="form-input" id="newThemeColor" value="#3B82F6" style="padding:0; height:40px; width:40px;">
          <div class="text-xs text-muted" style="align-self:center;">Pick a brand-aligned color</div>
        </div>
      </div>
    </div>
  `;

  openModal('Create New Theme', formHTML, () => {
    const name = document.getElementById('newThemeName').value.trim();
    if (!name) return;
    
    // Generate a crude slug from the name
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    if (!slug) return;
    
    const themes = store.get('themes') || {};
    if (themes[slug]) {
      alert('A theme with a similar name already exists.');
      return;
    }
    
    themes[slug] = {
      name,
      accent: document.getElementById('newThemeColor').value,
      facilitator: document.getElementById('newThemeFacilitator').value || 'Unassigned',
      status: 'Active Exploration',
      participants: [],
      stakeholders: []
    };
    
    store.save('themes', themes);
    
    // Initialize the data layer for this new theme
    store.saveThemeData(slug, {
      explorationLog: [], meetingNotes: [], tasks: [], recommendations: [], themeNotes: ''
    });
    
    closeModal();
    // Dispatch event so nav updates too
    window.dispatchEvent(new CustomEvent('data-changed', { detail: { collection: 'themes' } }));
    
    // Redirect immediately to the new theme
    window.location.href = `theme.html?theme=${slug}`;
  });
};

window.updateThemeStatus = function (slug, newStatus) {
  const themes = store.get('themes');
  if (themes[slug]) {
    themes[slug].status = newStatus;
    store.save('themes', themes);
    renderThemeCards();
  }
};

// ---- Upcoming Meetings ----
function renderMeetings() {
  const section = document.getElementById('meetingsSection');
  const meetings = store.get('meetings') || [];

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const nextWeek = new Date(today);
  nextWeek.setDate(nextWeek.getDate() + 7);

  const upcoming = meetings
    .filter(m => {
      const d = new Date(m.date + 'T00:00:00');
      return d >= today && d <= nextWeek;
    })
    .sort((a, b) => a.date.localeCompare(b.date));

  let html = `
    <div class="section-header">
      <h2>🗓️ Upcoming Meetings</h2>
      <button class="btn btn-primary btn-sm" onclick="openAddMeeting()">+ Add Meeting</button>
    </div>
  `;

  if (upcoming.length === 0) {
    html += '<div class="empty-state"><div class="empty-icon">📅</div><p>No meetings in the next 7 days.</p></div>';
  } else {
    html += '<div class="meeting-list stagger-children">';
    upcoming.forEach(m => {
      const ds = formatDateShort(m.date);
      html += `
        <div class="meeting-item">
          <div class="meeting-date">
            <span class="day">${ds.day}</span>
            <span class="month">${ds.month}</span>
          </div>
          <div class="meeting-info">
            <div class="meeting-title">${escapeHtml(m.title)}</div>
            <div class="meeting-meta">${escapeHtml(m.time)} · ${escapeHtml(m.location || '')}</div>
          </div>
          <span class="badge ${getThemeBadgeClass(m.theme)}">${getThemeLabel(m.theme)}</span>
          <button class="btn btn-icon btn-ghost" onclick="deleteMeeting('${m.id}')" title="Delete">🗑</button>
        </div>
      `;
    });
    html += '</div>';
  }

  section.innerHTML = html;
}

window.openAddMeeting = function () {
  const formHTML = `
    <div class="form-group">
      <label>Title</label>
      <input type="text" class="form-input" id="mtgTitle" placeholder="Meeting title">
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>Date</label>
        <input type="date" class="form-input" id="mtgDate" value="${todayStr()}">
      </div>
      <div class="form-group">
        <label>Time</label>
        <input type="text" class="form-input" id="mtgTime" placeholder="e.g. 10:00 AM">
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>Theme</label>
        <select class="form-select" id="mtgTheme">
          <option value="design">Design</option>
          <option value="global">Global/Honors</option>
          <option value="health">Health</option>
        </select>
      </div>
      <div class="form-group">
        <label>Location/Link</label>
        <input type="text" class="form-input" id="mtgLocation" placeholder="Room or URL">
      </div>
    </div>
  `;

  openModal('Add Meeting', formHTML, () => {
    const title = document.getElementById('mtgTitle').value.trim();
    if (!title) return;
    const meetings = store.get('meetings') || [];
    meetings.push({
      id: generateId('mtg'),
      title,
      date: document.getElementById('mtgDate').value,
      time: document.getElementById('mtgTime').value,
      theme: document.getElementById('mtgTheme').value,
      location: document.getElementById('mtgLocation').value
    });
    store.save('meetings', meetings);
    closeModal();
    renderMeetings();
  });
};

window.deleteMeeting = function (id) {
  let meetings = store.get('meetings') || [];
  meetings = meetings.filter(m => m.id !== id);
  store.save('meetings', meetings);
  renderMeetings();
};

// ---- General / Facilitator Meeting Notes ----
function renderGlobalMeetingNotes() {
  const section = document.getElementById('globalMeetingNotesSection');
  if (!section) return;
  const notes = store.get('general-notes') || [];
  notes.sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  let html = `
    <div class="section-header">
      <h2>📝 General / Facilitator Meeting Notes</h2>
      <button class="btn btn-primary btn-sm" onclick="openAddGlobalMeetingNote()">+ Add Notes</button>
    </div>
  `;

  if (notes.length === 0) {
    html += '<div class="empty-state"><div class="empty-icon">📝</div><p>No general meeting notes yet. This is for cross-functional or planning meetings.</p></div>';
  } else {
    html += '<div class="stagger-children">';
    notes.forEach(note => {
      html += `
        <div class="meeting-note-entry" id="gmn-${note.id}">
          <div class="meeting-note-header" onclick="toggleGlobalMeetingNote('${note.id}')">
            <div>
              <span class="date">${formatDate(note.date)}</span>
              <span class="attendees-preview">${escapeHtml(note.title || note.attendees)}</span>
            </div>
            <div style="display:flex;align-items:center;gap:var(--space-2);">
              <span class="chevron">▾</span>
            </div>
          </div>
          <div class="meeting-note-body" id="gmnBody-${note.id}">
            ${note.keyPoints ? `<div class="meeting-note-section"><h4>Key Discussion Points</h4><div class="content">\n${escapeHtml(note.keyPoints).replace(/\\n/g, '<br>')}</div></div>` : ''}
            ${note.decisions ? `<div class="meeting-note-section"><h4>Decisions Made</h4><div class="content">\n${escapeHtml(note.decisions).replace(/\\n/g, '<br>')}</div></div>` : ''}
            ${note.questionsRaised ? `<div class="meeting-note-section"><h4>New Questions Raised</h4><div class="content">\n${escapeHtml(note.questionsRaised).replace(/\\n/g, '<br>')}</div></div>` : ''}
            ${note.actionItems ? `<div class="meeting-note-section"><h4>Action Items</h4><div class="content">\n${escapeHtml(note.actionItems).replace(/\\n/g, '<br>')}</div></div>` : ''}
            ${note.notesLink ? `<div class="meeting-note-section"><h4>Full Notes</h4><a href="${escapeHtml(note.notesLink)}" target="_blank">${escapeHtml(note.notesLink)}</a></div>` : ''}
            <div style="margin-top:var(--space-4);display:flex;gap:var(--space-2);">
              <button class="btn btn-sm btn-ghost btn-danger" onclick="deleteGlobalMeetingNote('${note.id}')">Delete</button>
            </div>
          </div>
        </div>
      `;
    });
    html += '</div>';
  }
  section.innerHTML = html;
}

window.toggleGlobalMeetingNote = function (id) {
  const body = document.getElementById(`gmnBody-${id}`);
  const header = body?.previousElementSibling;
  if (body) {
    body.classList.toggle('open');
    header?.classList.toggle('expanded');
  }
};

window.openAddGlobalMeetingNote = function () {
  const formHTML = `
    <div class="form-row">
      <div class="form-group">
        <label>Date</label>
        <input type="date" class="form-input" id="gmnDate" value="${todayStr()}">
      </div>
      <div class="form-group">
        <label>Meeting Title / Type</label>
        <input type="text" class="form-input" id="gmnTitle" placeholder="e.g. Facilitator Sync">
      </div>
    </div>
    
    <div class="form-group" style="margin-bottom: var(--space-6); padding-bottom: var(--space-6); border-bottom: 1px solid var(--color-border-light);">
      <label style="display:flex; justify-content:space-between; align-items:flex-end;">
        Raw Meeting Notes / Transcript
        <button type="button" class="btn btn-sm" style="background:var(--ksu-gold); color:#000; font-weight:bold; box-shadow:var(--shadow-sm); border-radius:var(--radius-full);" onclick="inlineGlobalAIExtract()">✨ Analyze & Extract</button>
      </label>
      <p class="text-xs text-muted mb-2">Paste rough notes here, then let AI organize them into the fields below.</p>
      <textarea class="form-textarea" id="gmnRawNotes" rows="6" placeholder="Paste rough notes, transcriptions, or thoughts here..."></textarea>
      <div id="inlineGlobalAILoading" style="display:none; font-size:var(--text-xs); color:var(--color-primary); font-weight:bold; margin-top:var(--space-2);">✨ Analyzing notes with Gemini...</div>
    </div>

    <div class="grid-2">
      <div class="form-group">
        <label>Key Discussion Points</label>
        <textarea class="form-textarea" id="gmnKeyPoints" rows="4" placeholder="Main topics discussed"></textarea>
      </div>
      <div class="form-group">
        <label>Decisions Made</label>
        <textarea class="form-textarea" id="gmnDecisions" rows="4" placeholder="Even tentative ones"></textarea>
      </div>
    </div>
    
    <div class="grid-2">
      <div class="form-group">
        <label>New Questions Raised</label>
        <textarea class="form-textarea" id="gmnQuestions" rows="4" placeholder="Things to explore"></textarea>
      </div>
      <div class="form-group">
        <label>Action Items</label>
        <textarea class="form-textarea" id="gmnActions" rows="4" placeholder="Tasks from this meeting"></textarea>
      </div>
    </div>
    
    <div class="form-group">
      <label>Link to Full Notes</label>
      <input type="url" class="form-input" id="gmnLink" placeholder="Google Doc URL, NotebookLM, etc.">
    </div>
  `;

  openModal('Add General Meeting Notes', formHTML, () => {
    const date = document.getElementById('gmnDate').value;
    if (!date) return;
    const notes = store.get('general-notes') || [];
    notes.push({
      id: generateId('gmn'),
      date,
      title: document.getElementById('gmnTitle').value,
      keyPoints: document.getElementById('gmnKeyPoints').value,
      decisions: document.getElementById('gmnDecisions').value,
      questionsRaised: document.getElementById('gmnQuestions').value,
      actionItems: document.getElementById('gmnActions').value,
      notesLink: document.getElementById('gmnLink').value
    });
    store.save('general-notes', notes);
    closeModal();
    renderGlobalMeetingNotes();
  }, { width: '800px' });
};

window.inlineGlobalAIExtract = async function() {
  const rawText = document.getElementById('gmnRawNotes').value.trim();
  if (!rawText) return;
  
  const loading = document.getElementById('inlineGlobalAILoading');
  loading.style.display = 'block';

  try {
    const prompt = `Extract structured information from the following general meeting notes/transcript.
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
        result = result.replace(/^\\*\\*.*?\\*\\*\\s*/gm, ''); // clean up bold headers
        if (result.startsWith('- ')) result = result; // preserve lists
        return result;
      };
      
      const k = extractSection('KEY POINTS');
      const d = extractSection('DECISIONS');
      const q = extractSection('QUESTIONS');
      const a = extractSection('ACTION ITEMS');
      
      if(k) document.getElementById('gmnKeyPoints').value = k;
      if(d) document.getElementById('gmnDecisions').value = d;
      if(q) document.getElementById('gmnQuestions').value = q;
      if(a) document.getElementById('gmnActions').value = a;
      
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

window.deleteGlobalMeetingNote = function (id) {
  if (!confirm('Delete these general meeting notes?')) return;
  let notes = store.get('general-notes') || [];
  notes = notes.filter(n => n.id !== id);
  store.save('general-notes', notes);
  renderGlobalMeetingNotes();
};

// ---- Cross-Theme Patterns ----
function renderPatterns() {
  const section = document.getElementById('patternsSection');
  const patterns = store.get('cross-patterns') || [];

  let html = `
    <div class="section-header">
      <h2>🔗 Cross-Theme Patterns</h2>
      <button class="btn btn-primary btn-sm" onclick="openAddPattern()">+ Add Observation</button>
    </div>
  `;

  if (patterns.length === 0) {
    html += '<div class="empty-state"><div class="empty-icon">🔗</div><p>No cross-theme observations yet. Add one when an idea spans multiple themes.</p></div>';
  } else {
    html += '<div class="stagger-children">';
    patterns.forEach(p => {
      html += `
        <div class="pattern-card" style="--accent-color:${getThemeAccent(p.sourceTheme)}">
          <div class="pattern-text">${escapeHtml(p.observation)}</div>
          <div class="pattern-meta">
            <div class="pattern-themes">
              ${(p.relevantTo || []).map(t => `<span class="badge ${getThemeBadgeClass(t)}">${getThemeLabel(t)}</span>`).join(' ')}
            </div>
            <span class="pattern-author">${escapeHtml(p.addedBy)} · ${formatDate(p.dateAdded)}</span>
          </div>
          <button class="btn btn-sm btn-ghost btn-danger mt-2" onclick="deletePattern('${p.id}')">Remove</button>
        </div>
      `;
    });
    html += '</div>';
  }

  section.innerHTML = html;
}

window.openAddPattern = function () {
  const formHTML = `
    <div class="form-group">
      <label>Observation</label>
      <textarea class="form-textarea" id="patObs" rows="3" placeholder="What pattern or connection did you notice?"></textarea>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>Source Theme</label>
        <select class="form-select" id="patSource">
          <option value="design">Design</option>
          <option value="global">Global/Honors</option>
          <option value="health">Health</option>
        </select>
      </div>
      <div class="form-group">
        <label>Added By</label>
        <input type="text" class="form-input" id="patAuthor" placeholder="Your name">
      </div>
    </div>
    <div class="form-group">
      <label>Relevant To</label>
      <div class="checkbox-group">
        <label class="checkbox-label"><input type="checkbox" value="design" checked> Design</label>
        <label class="checkbox-label"><input type="checkbox" value="global"> Global/Honors</label>
        <label class="checkbox-label"><input type="checkbox" value="health"> Health</label>
      </div>
    </div>
  `;

  openModal('Add Cross-Theme Observation', formHTML, () => {
    const obs = document.getElementById('patObs').value.trim();
    if (!obs) return;
    const relevantTo = Array.from(document.querySelectorAll('.checkbox-group input:checked')).map(c => c.value);
    const patterns = store.get('cross-patterns') || [];
    patterns.push({
      id: generateId('cp'),
      observation: obs,
      sourceTheme: document.getElementById('patSource').value,
      relevantTo,
      dateAdded: todayStr(),
      addedBy: document.getElementById('patAuthor').value || 'Unknown'
    });
    store.save('cross-patterns', patterns);
    closeModal();
    renderPatterns();
  });
};

window.deletePattern = function (id) {
  let patterns = store.get('cross-patterns') || [];
  patterns = patterns.filter(p => p.id !== id);
  store.save('cross-patterns', patterns);
  renderPatterns();
};

// ---- Open Unknowns ----
function renderUnknowns() {
  const section = document.getElementById('unknownsSection');
  const unknowns = store.get('unknowns') || [];

  let html = `
    <div class="section-header">
      <h2>❓ Open Unknowns</h2>
      <button class="btn btn-primary btn-sm" onclick="openAddUnknown()">+ Add Unknown</button>
    </div>
  `;

  if (unknowns.length === 0) {
    html += `<div class="empty-state"><div class="empty-icon">❓</div><p>No open unknowns. Add one when there's a question above the team's level.</p></div>`;
  } else {
    html += '<div class="stagger-children">';
    unknowns.forEach(u => {
      html += `
        <div class="unknown-item">
          <div class="unknown-question">${escapeHtml(u.question)}</div>
          <div class="unknown-meta">
            <span>Raised ${formatDate(u.dateRaised)}</span>
            <span>Affects: ${(u.themesAffected || []).map(t => getThemeLabel(t)).join(', ')}</span>
            ${u.updates ? `<span>Update: ${escapeHtml(u.updates)}</span>` : ''}
          </div>
          <button class="btn btn-sm btn-ghost btn-danger mt-2" onclick="deleteUnknown('${u.id}')">Remove</button>
        </div>
      `;
    });
    html += '</div>';
  }

  section.innerHTML = html;
}

window.openAddUnknown = function () {
  const formHTML = `
    <div class="form-group">
      <label>Question / Unknown</label>
      <textarea class="form-textarea" id="unkQuestion" rows="2" placeholder="What can't the team resolve on its own?"></textarea>
    </div>
    <div class="form-group">
      <label>Themes Affected</label>
      <div class="checkbox-group">
        <label class="checkbox-label"><input type="checkbox" value="design" checked> Design</label>
        <label class="checkbox-label"><input type="checkbox" value="global"> Global/Honors</label>
        <label class="checkbox-label"><input type="checkbox" value="health"> Health</label>
      </div>
    </div>
    <div class="form-group">
      <label>Any Updates</label>
      <input type="text" class="form-input" id="unkUpdates" placeholder="Optional context">
    </div>
  `;

  openModal('Add Unknown', formHTML, () => {
    const question = document.getElementById('unkQuestion').value.trim();
    if (!question) return;
    const affected = Array.from(document.querySelectorAll('.checkbox-group input:checked')).map(c => c.value);
    const unknowns = store.get('unknowns') || [];
    unknowns.push({
      id: generateId('unk'),
      question,
      dateRaised: todayStr(),
      themesAffected: affected,
      updates: document.getElementById('unkUpdates').value
    });
    store.save('unknowns', unknowns);
    closeModal();
    renderUnknowns();
  });
};

window.deleteUnknown = function (id) {
  let unknowns = store.get('unknowns') || [];
  unknowns = unknowns.filter(u => u.id !== id);
  store.save('unknowns', unknowns);
  renderUnknowns();
};

// ---- Cross-Theme Tasks ----
function renderCrossTasks() {
  const section = document.getElementById('crossTasksSection');
  const tasks = store.get('cross-tasks') || [];

  let html = `
    <div class="section-header">
      <h2>📋 Emerging Cross-Theme Tasks</h2>
      <button class="btn btn-primary btn-sm" onclick="openAddCrossTask()">+ Add Task</button>
    </div>
  `;

  if (tasks.length === 0) {
    html += '<div class="empty-state"><div class="empty-icon">📋</div><p>No cross-theme tasks yet.</p></div>';
  } else {
    html += `
      <div style="overflow-x:auto;">
        <table class="data-table">
          <thead>
            <tr>
              <th>Task</th>
              <th>Owner</th>
              <th>Due</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody class="stagger-children">
    `;
    tasks.forEach(t => {
      html += `
        <tr>
          <td class="task-name">${escapeHtml(t.task)}</td>
          <td>${escapeHtml(t.owner)}</td>
          <td>${formatDate(t.dueDate)}</td>
          <td>
            <select class="form-inline-select ${getStatusBadgeClass(t.status)}" onchange="updateCrossTaskStatus('${t.id}', this.value)">
              ${['Not Started', 'In Progress', 'Done'].map(s =>
                `<option value="${s}" ${t.status === s ? 'selected' : ''}>${s}</option>`
              ).join('')}
            </select>
          </td>
          <td><button class="btn btn-icon btn-ghost" onclick="deleteCrossTask('${t.id}')" title="Delete">🗑</button></td>
        </tr>
      `;
    });
    html += '</tbody></table></div>';
  }

  section.innerHTML = html;
}

window.openAddCrossTask = function () {
  const formHTML = `
    <div class="form-group">
      <label>Task</label>
      <input type="text" class="form-input" id="ctTask" placeholder="Task description">
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>Owner</label>
        <input type="text" class="form-input" id="ctOwner" placeholder="Who's responsible?">
      </div>
      <div class="form-group">
        <label>Due Date</label>
        <input type="date" class="form-input" id="ctDue">
      </div>
    </div>
    <div class="form-group">
      <label>Notes</label>
      <input type="text" class="form-input" id="ctNotes" placeholder="Optional notes">
    </div>
  `;

  openModal('Add Cross-Theme Task', formHTML, () => {
    const task = document.getElementById('ctTask').value.trim();
    if (!task) return;
    const tasks = store.get('cross-tasks') || [];
    tasks.push({
      id: generateId('ct'),
      task,
      owner: document.getElementById('ctOwner').value,
      dueDate: document.getElementById('ctDue').value,
      status: 'Not Started',
      notes: document.getElementById('ctNotes').value
    });
    store.save('cross-tasks', tasks);
    closeModal();
    renderCrossTasks();
  });
};

window.updateCrossTaskStatus = function (id, status) {
  const tasks = store.get('cross-tasks') || [];
  const task = tasks.find(t => t.id === id);
  if (task) {
    task.status = status;
    store.save('cross-tasks', tasks);
    renderCrossTasks();
  }
};

window.deleteCrossTask = function (id) {
  let tasks = store.get('cross-tasks') || [];
  tasks = tasks.filter(t => t.id !== id);
  store.save('cross-tasks', tasks);
  renderCrossTasks();
};

// ---- Embedded AI Card ----
let embeddedAiChatHistory = [];

function renderOverviewAI() {
  const section = document.getElementById('overviewAICard');
  if (!section) return;

  const apiKey = localStorage.getItem('ted-gemini-key') || '';

  let html = `
    <div style="background: rgba(0,0,0,0.2); padding: var(--space-4) var(--space-6); border-bottom: 1px solid var(--color-border); display: flex; align-items: center; justify-content: space-between;">
      <h2 style="margin: 0; font-size: var(--text-lg); display: flex; align-items: center; gap: 8px;">✨ Dashboard Assistant</h2>
    </div>
    <div id="embeddedAiMessages" style="flex: 1; padding: var(--space-6); overflow-y: auto; display: flex; flex-direction: column; gap: var(--space-4); max-height: 350px;">
  `;

  if (!apiKey) {
    html += `
      <div class="ai-no-key">
        <div style="font-size:2.5rem;margin-bottom:var(--space-2);">🔑</div>
        <h3 style="margin-bottom:var(--space-2);">API Key Required</h3>
        <p>Add your Gemini API key in Settings (⚙️) to activate the assistant.</p>
      </div>
    `;
  } else if (embeddedAiChatHistory.length === 0) {
    html += `
      <div class="ai-no-key">
        <div style="font-size:2.5rem;margin-bottom:var(--space-2);">✨</div>
        <h3 style="margin-bottom:var(--space-2);">Ready to Help</h3>
        <p style="color:var(--color-text-secondary);font-size:var(--text-sm);">The assistant has context of your <strong>Meetings</strong>, <strong>Tasks</strong>, and active <strong>Themes</strong>.</p>
        <button class="btn btn-secondary btn-sm" onclick="document.getElementById('embeddedAiInput').value = 'Summarize our open cross-theme tasks'; document.getElementById('embeddedAiSend').click();">
          Brief me on open tasks
        </button>
      </div>
    `;
  } else {
    html += embeddedAiChatHistory.map(msg => `
      <div class="ai-message ${msg.role}">
        ${msg.role === 'assistant' ? formatEmbeddedAIResponse(msg.content) : escapeHtml(msg.content)}
      </div>
    `).join('');
  }

  html += `
    </div>
    <div style="padding: var(--space-4); border-top: 1px solid var(--color-border); background: var(--color-surface); display: flex; gap: var(--space-2); margin-top: auto;">
      <input type="text" id="embeddedAiInput" style="flex: 1; background: rgba(0,0,0,0.2); border: 1px solid var(--color-border); color: #fff; padding: var(--space-2) var(--space-3); border-radius: var(--radius-md);" placeholder="Message Assistant..." ${!apiKey ? 'disabled' : ''} />
      <button class="btn btn-primary" id="embeddedAiSend" ${!apiKey ? 'disabled' : ''}>Send</button>
    </div>
  `;

  section.innerHTML = html;

  const container = document.getElementById('embeddedAiMessages');
  if (container) container.scrollTop = container.scrollHeight;

  const inputEl = document.getElementById('embeddedAiInput');
  const sendBtn = document.getElementById('embeddedAiSend');

  if (sendBtn) {
    sendBtn.addEventListener('click', sendEmbeddedAIMessage);
  }
  if (inputEl) {
    inputEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') sendEmbeddedAIMessage();
    });
  }
}

function formatEmbeddedAIResponse(text) {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/\\n- /g, '<br>• ')
    .replace(/\\n\\d+\\. /g, (match) => `<br>${match.trim()} `)
    .replace(/\\n/g, '<br>');
}

async function sendEmbeddedAIMessage() {
  const input = document.getElementById('embeddedAiInput');
  if (!input) return;
  const query = input.value.trim();
  if (!query) return;

  const apiKey = localStorage.getItem('ted-gemini-key') || '';
  if (!apiKey) return;

  input.value = '';
  embeddedAiChatHistory.push({ role: 'user', content: query });
  renderOverviewAI();

  try {
    // We'll lean on the global geminiRequest defined in ai.js
    if (typeof window.geminiRequest !== 'function') {
      throw new Error('AI Engine not initialized.');
    }

    // Build the system prompt
    // We can fetch data manually here or assume we have access to themes
    let context = "You are a dashboard assistant. ";
    if (window.store) {
      const themes = store.get('themes') || {};
      const slugs = Object.keys(themes);
      context += "You have the following themes active: " + slugs.map(s => themes[s].name).join(', ') + ". ";
      
      const meetings = store.get('meetings') || [];
      const tasks = store.get('cross-tasks') || [];
      context += "Upcoming meetings: " + meetings.length + ". ";
      context += "Open cross-theme tasks: " + tasks.length + ". ";
    }
    context += "Be brief and helpful to the team exploring these themes.";

    const messages = [
      { role: 'user', parts: [{ text: context }] },
      { role: 'model', parts: [{ text: 'I understand.' }] }
    ];

    embeddedAiChatHistory.slice(0, -1).forEach(msg => {
      messages.push({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }]
      });
    });

    messages.push({ role: 'user', parts: [{ text: query }] });

    const result = await window.geminiRequest(messages);
    const aiText = result.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated.';

    embeddedAiChatHistory.push({ role: 'assistant', content: aiText });
    renderOverviewAI();
  } catch (error) {
    embeddedAiChatHistory.push({ role: 'assistant', content: "⚠️ Error: " + error.message });
    renderOverviewAI();
  }
}
