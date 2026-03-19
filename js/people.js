/* ============================================================
   Theme Exploration Dashboard — People Directory Logic
   ============================================================ */

document.addEventListener('DOMContentLoaded', async () => {
  await store.load();
  renderNav('people');
  renderDirectory();

  window.addEventListener('data-changed', (e) => {
    if (e.detail.collection === 'people') {
      renderDirectory();
    }
  });
});

function renderDirectory() {
  const section = document.getElementById('peopleDirectorySection');
  const people = store.get('people') || [];

  let html = `
    <div class="card" style="padding: var(--space-6); min-height: 500px; box-shadow: var(--shadow-xl);">
      <div class="section-header" style="margin-bottom: var(--space-6);">
        <h2 style="margin:0;">All Team Members</h2>
        <button class="btn btn-primary" onclick="openAddPersonModal()">+ Add Person</button>
      </div>
  `;

  if (people.length === 0) {
    html += `<div class="empty-state"><div class="empty-icon">👥</div><p>No people in the directory yet.</p></div>`;
  } else {
    // Sort people alphabetically
    const sortedPeople = [...people].sort((a, b) => a.name.localeCompare(b.name));

    html += `<div class="grid-3 stagger-children" style="gap: var(--space-5);">`;
    sortedPeople.forEach(p => {
      // Map theme affiliations to badges
      const themeBadges = (p.themes || []).map(t => {
        let label = t;
        if(t === 'design') label = 'Design';
        if(t === 'global') label = 'Global/Honors';
        if(t === 'health') label = 'Health';
        return `<span class="badge ${getThemeBadgeClass(t)}" style="font-size:10px; padding:2px 8px;">${label}</span>`;
      }).join('');

      html += `
        <div class="card" style="padding: var(--space-5); display:flex; flex-direction:column; gap: var(--space-3); position:relative; box-shadow: var(--shadow-sm); transition: transform var(--transition-base), box-shadow var(--transition-base);">
          <div style="position:absolute; top: var(--space-2); right: var(--space-2); display:flex; gap: 4px;">
            <button class="btn btn-icon btn-ghost" onclick="openEditPerson('${p.id}')" style="color: var(--color-text-tertiary); width:28px; height:28px; font-size:14px;" title="Edit Profile">✏️</button>
            <button class="btn btn-icon btn-ghost" onclick="deletePerson('${p.id}')" style="color: var(--color-text-tertiary); width:28px; height:28px;" title="Remove Person">×</button>
          </div>
          
          <div style="display:flex; align-items:center; gap: var(--space-3);">
            <div style="width:48px; height:48px; border-radius:50%; background:var(--color-primary-light); color:var(--color-primary); display:flex; align-items:center; justify-content:center; font-weight:bold; font-size:var(--text-lg); flex-shrink:0;">
              ${p.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div style="font-weight:600; font-size:var(--text-lg); color:var(--color-text-primary);">${escapeHtml(p.name)}</div>
              <div style="font-size:var(--text-sm); color:var(--color-text-secondary); line-height:1.2;">${escapeHtml(p.role)}</div>
            </div>
          </div>
          
          <div style="font-size:var(--text-sm); color:var(--color-text-tertiary); display:flex; align-items:center; gap:var(--space-2); margin-top:var(--space-1);">
            ✉️ <a href="mailto:${escapeHtml(p.email)}" style="color:inherit; text-decoration:none;">${escapeHtml(p.email)}</a>
          </div>
          
          <div style="margin-top:auto; padding-top:var(--space-4); border-top:1px solid var(--color-border-light); display:flex; gap:6px; flex-wrap:wrap;">
            ${themeBadges}
          </div>
        </div>
      `;
    });
    html += `</div>`;
  }
  
  html += `</div>`;
  section.innerHTML = html;
}

window.openAddPersonModal = function() {
  const formHTML = `
    <div class="form-group">
      <label>Full Name</label>
      <input type="text" class="form-input" id="personName" placeholder="e.g. Jane Doe">
    </div>
    <div class="form-group">
      <label>Role / Position</label>
      <input type="text" class="form-input" id="personRole" placeholder="e.g. Senior Content Strategist">
    </div>
    <div class="form-group">
      <label>Email</label>
      <input type="email" class="form-input" id="personEmail" placeholder="jane@kent.edu">
    </div>
    <div class="form-group">
      <label>Theme Affiliations</label>
      <div class="checkbox-group" style="margin-top:var(--space-2);">
        <label class="checkbox-label"><input type="checkbox" name="personThemes" value="design"> Design</label>
        <label class="checkbox-label"><input type="checkbox" name="personThemes" value="global"> Global/Honors</label>
        <label class="checkbox-label"><input type="checkbox" name="personThemes" value="health"> Health</label>
      </div>
    </div>
  `;

  openModal('Add Team Member', formHTML, () => {
    const name = document.getElementById('personName').value.trim();
    if (!name) return;

    const themes = [];
    document.querySelectorAll('input[name="personThemes"]:checked').forEach(cb => themes.push(cb.value));

    const people = store.get('people') || [];
    people.push({
      id: generateId('p'),
      name,
      role: document.getElementById('personRole').value,
      email: document.getElementById('personEmail').value,
      themes
    });

    store.save('people', people);
    closeModal();
    renderDirectory();
  });
};

window.deletePerson = function(id) {
  if(!confirm('Remove this person from the directory?')) return;
  const people = store.get('people') || [];
  store.save('people', people.filter(p => p.id !== id));
  renderDirectory();
};

window.openEditPerson = function(id) {
  const people = store.get('people') || [];
  const person = people.find(p => p.id === id);
  if (!person) return;

  const formHTML = `
    <div class="form-group">
      <label>Full Name</label>
      <input type="text" class="form-input" id="editPersonName" value="${escapeHtml(person.name)}">
    </div>
    <div class="form-group">
      <label>Role / Position</label>
      <input type="text" class="form-input" id="editPersonRole" value="${escapeHtml(person.role || '')}">
    </div>
    <div class="form-group">
      <label>Email</label>
      <input type="email" class="form-input" id="editPersonEmail" value="${escapeHtml(person.email || '')}">
    </div>
    <div class="form-group">
      <label>Theme Affiliations</label>
      <div class="checkbox-group" style="margin-top:var(--space-2);">
        <label class="checkbox-label"><input type="checkbox" name="editPersonThemes" value="design" ${(person.themes || []).includes('design') ? 'checked' : ''}> Design</label>
        <label class="checkbox-label"><input type="checkbox" name="editPersonThemes" value="global" ${(person.themes || []).includes('global') ? 'checked' : ''}> Global/Honors</label>
        <label class="checkbox-label"><input type="checkbox" name="editPersonThemes" value="health" ${(person.themes || []).includes('health') ? 'checked' : ''}> Health</label>
      </div>
    </div>
  `;

  openModal('Edit Team Member', formHTML, () => {
    const name = document.getElementById('editPersonName').value.trim();
    if (!name) return;

    const newThemes = [];
    document.querySelectorAll('input[name="editPersonThemes"]:checked').forEach(cb => newThemes.push(cb.value));

    const idx = people.findIndex(p => p.id === id);
    if (idx !== -1) {
      people[idx] = {
        ...people[idx],
        name,
        role: document.getElementById('editPersonRole').value,
        email: document.getElementById('editPersonEmail').value,
        themes: newThemes
      };
      store.save('people', people);
      closeModal();
      renderDirectory();
    }
  });
};
