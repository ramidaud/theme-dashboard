/* ============================================================
   Theme Exploration Dashboard — Shared Application Logic
   ============================================================ */

// ---- Data Store ----
class DataStore {
  constructor() {
    this.cache = {};
    this.loaded = false;
  }

  async load() {
    if (this.loaded) return;

    // First load the core configuration files
    const coreFiles = ['themes', 'meetings', 'cross-patterns', 'unknowns', 'cross-tasks', 'people', 'general-notes'];
    
    await Promise.all(coreFiles.map(async (name) => {
      const lsKey = `ted-${name}`;
      const stored = localStorage.getItem(lsKey);
      if (stored) {
        this.cache[name] = JSON.parse(stored);
      } else {
        try {
          const res = await fetch(`data/${name}.json`);
          this.cache[name] = await res.json();
        } catch (e) {
          console.warn(`Could not load data/${name}.json`, e);
          this.cache[name] = name === 'themes' ? {} : [];
        }
      }
    }));

    // Now that themes are loaded, dynamically load theme-specific data files
    const themeKeys = Object.keys(this.cache['themes'] || {});
    await Promise.all(themeKeys.map(async (slug) => {
      const lsKey = `ted-${slug}`;
      const stored = localStorage.getItem(lsKey);
      if (stored) {
        this.cache[slug] = JSON.parse(stored);
      } else {
        try {
          // Attempt to load from JSON if it was one of the original seeds
          // For dynamically created themes, this fetch will fail and we'll fall back safely
          const res = await fetch(`data/${slug}.json`);
          if (res.ok) {
            this.cache[slug] = await res.json();
          } else {
            this.cache[slug] = { explorationLog: [], meetingNotes: [], tasks: [], recommendations: [], themeNotes: '' };
          }
        } catch (e) {
          this.cache[slug] = { explorationLog: [], meetingNotes: [], tasks: [], recommendations: [], themeNotes: '' };
        }
      }
    }));

    this.loaded = true;
  }

  get(collection) {
    return this.cache[collection];
  }

  save(collection, data) {
    this.cache[collection] = data;
    localStorage.setItem(`ted-${collection}`, JSON.stringify(data));
    window.dispatchEvent(
      new CustomEvent("data-changed", { detail: { collection } }),
    );
  }

  getThemeData(slug) {
    return (
      this.cache[slug] || {
        explorationLog: [],
        meetingNotes: [],
        tasks: [],
        recommendations: [],
        themeNotes: "",
      }
    );
  }

  saveThemeData(slug, data) {
    this.save(slug, data);
  }

  getThemeMeta(slug) {
    const themes = this.cache.themes || {};
    return themes[slug] || null;
  }

  getAllThemeSlugs() {
    return ["design", "global", "health"];
  }
}

const store = new DataStore();

// ---- Utility Functions ----
function generateId(prefix = "id") {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 5)}`;
}

function formatDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateShort(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  return {
    day: d.getDate(),
    month: d.toLocaleDateString("en-US", { month: "short" }).toUpperCase(),
  };
}

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

function escapeHtml(str) {
  if (!str) return "";
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function getThemeLabel(slug) {
  const labels = {
    design: "Design",
    global: "Global/Honors",
    health: "Health",
  };
  return labels[slug] || slug;
}

function getThemeAccent(slug) {
  const accents = { design: "#2C8ECD", global: "#EFAB00", health: "#E07A3A" };
  return accents[slug] || "#003976";
}

function getThemeBadgeClass(slug) {
  return `badge-theme-${slug}`;
}

function getStatusBadgeClass(status) {
  const map = {
    Active: "badge-blue",
    "Active Exploration": "badge-blue",
    Converging: "badge-green",
    Parked: "badge-yellow",
    "Needs Discussion": "badge-yellow",
    Paused: "badge-gray",
    "Not Started": "badge-gray",
    "In Progress": "badge-blue",
    Done: "badge-green",
    Draft: "badge-gray",
    "Ready for Discussion": "badge-yellow",
    "Agreed Upon": "badge-green",
    Low: "badge-gray",
    Medium: "badge-yellow",
    High: "badge-red",
  };
  return map[status] || "badge-gray";
}

function renderNav(activePage) {
  const currentTheme = new URLSearchParams(window.location.search).get("theme");
  const themeData = store.get('themes') || {};
  const themes = Object.keys(themeData).map(slug => ({
    slug,
    label: themeData[slug].name,
    accent: themeData[slug].accent
  }));

  const nav = document.createElement("aside");
  nav.className = "sidebar";
  nav.innerHTML = `
    <div class="sidebar-header">
      <a href="index.html" class="nav-brand">Theme Explorer</a>
    </div>
    <div class="sidebar-section">
      <div class="sidebar-section-title">Main</div>
      <ul class="nav-links">
        <li><a href="index.html" class="${activePage === "overview" ? "active" : ""}">Overview</a></li>
        <li><a href="people.html" class="${activePage === "people" ? "active" : ""}">People Directory</a></li>
      </ul>
    </div>
    
    <div class="sidebar-section">
      <div class="sidebar-section-title">Themes</div>
      <ul class="nav-links">
        ${themes
          .map(
            (t) => `
          <li>
            <a href="theme.html?theme=${t.slug}" class="${currentTheme === t.slug ? "active" : ""}">
              <span class="theme-dot" style="background:${t.accent}"></span>
              ${t.label}
            </a>
          </li>
        `,
          )
          .join("")}
      </ul>
    </div>
    
    <div class="sidebar-footer">
      <div class="nav-actions">
        <button class="nav-icon-btn" id="searchBtn" title="Search (⌘K)">🔍</button>
        <button class="nav-icon-btn" id="aiChatBtn" title="AI Assistant">✨</button>
        <button class="nav-icon-btn" id="settingsBtn" title="Settings">⚙️</button>
        <button class="nav-icon-btn" id="themeToggle" title="Toggle dark mode">🌙</button>
      </div>
    </div>
  `;
  document.body.prepend(nav);

  // Dark mode (Force Dark for V5 Command Center)
  localStorage.setItem("ted-theme", "dark");
  const savedTheme = "dark";
  document.documentElement.setAttribute("data-theme", savedTheme);
  const toggle = document.getElementById("themeToggle");
  toggle.textContent = savedTheme === "dark" ? "☀️" : "🌙";
  toggle.addEventListener("click", () => {
    const current = document.documentElement.getAttribute("data-theme");
    const next = current === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("ted-theme", next);
    toggle.textContent = next === "dark" ? "☀️" : "🌙";
  });

  // Search
  document.getElementById("searchBtn").addEventListener("click", openSearch);

  // Settings
  document
    .getElementById("settingsBtn")
    .addEventListener("click", openSettings);

  // AI Chat
  document
    .getElementById("aiChatBtn")
    .addEventListener("click", toggleAIDrawer);

  // Keyboard shortcut
  document.addEventListener("keydown", (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "k") {
      e.preventDefault();
      openSearch();
    }
    if (e.key === "Escape") {
      closeModal();
      closeSearch();
      closeSettings();
    }
  });
}

// ---- Modal System ----
let modalOverlay = null;

function openModal(title, bodyHTML, onSubmit) {
  if (!modalOverlay) {
    modalOverlay = document.createElement("div");
    modalOverlay.className = "modal-overlay";
    document.body.appendChild(modalOverlay);
  }

  modalOverlay.innerHTML = `
    <div class="modal">
      <div class="modal-header">
        <h3>${escapeHtml(title)}</h3>
        <button class="modal-close" onclick="closeModal()">×</button>
      </div>
      <div class="modal-body">${bodyHTML}</div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
        <button class="btn btn-primary" id="modalSubmit">Save</button>
      </div>
    </div>
  `;

  requestAnimationFrame(() => modalOverlay.classList.add("active"));

  document.getElementById("modalSubmit").addEventListener("click", () => {
    if (onSubmit) onSubmit();
  });

  modalOverlay.addEventListener("click", (e) => {
    if (e.target === modalOverlay) closeModal();
  });
}

function closeModal() {
  if (modalOverlay) {
    modalOverlay.classList.remove("active");
    setTimeout(() => {
      if (modalOverlay) modalOverlay.innerHTML = "";
    }, 200);
  }
}

// ---- Search System ----
let searchOverlay = null;

function openSearch() {
  if (!searchOverlay) {
    searchOverlay = document.createElement("div");
    searchOverlay.className = "search-overlay";
    document.body.appendChild(searchOverlay);
  }

  searchOverlay.innerHTML = `
    <div class="search-container">
      <div class="search-input-wrap">
        <span class="search-icon">🔍</span>
        <input type="text" id="searchInput" placeholder="Search across all themes..." autofocus>
        <button class="search-dismiss" onclick="closeSearch()">ESC</button>
      </div>
      <div class="search-results" id="searchResults">
        <div class="search-empty">Start typing to search across exploration logs, meeting notes, tasks, and recommendations.</div>
      </div>
    </div>
  `;

  requestAnimationFrame(() => searchOverlay.classList.add("active"));
  setTimeout(() => document.getElementById("searchInput")?.focus(), 100);

  document
    .getElementById("searchInput")
    .addEventListener("input", debounce(performSearch, 200));

  searchOverlay.addEventListener("click", (e) => {
    if (e.target === searchOverlay) closeSearch();
  });
}

function closeSearch() {
  if (searchOverlay) {
    searchOverlay.classList.remove("active");
  }
}

function performSearch() {
  const query = document
    .getElementById("searchInput")
    ?.value?.toLowerCase()
    .trim();
  const resultsEl = document.getElementById("searchResults");
  if (!query || query.length < 2) {
    resultsEl.innerHTML =
      '<div class="search-empty">Start typing to search across exploration logs, meeting notes, tasks, and recommendations.</div>';
    return;
  }

  const results = [];
  const slugs = ["design", "global", "health"];

  for (const slug of slugs) {
    const data = store.getThemeData(slug);
    const label = getThemeLabel(slug);

    // Exploration log
    (data.explorationLog || []).forEach((item) => {
      if (matchesSearch(item, ["title", "details", "raisedBy"], query)) {
        results.push({
          theme: slug,
          themeLabel: label,
          type: "Exploration",
          title: item.title,
          preview: item.details,
          link: `theme.html?theme=${slug}&section=exploration`,
        });
      }
    });

    // Meeting notes
    (data.meetingNotes || []).forEach((item) => {
      if (
        matchesSearch(
          item,
          [
            "keyPoints",
            "decisions",
            "questionsRaised",
            "actionItems",
            "attendees",
          ],
          query,
        )
      ) {
        results.push({
          theme: slug,
          themeLabel: label,
          type: "Meeting Notes",
          title: `Meeting — ${formatDate(item.date)}`,
          preview: item.keyPoints,
          link: `theme.html?theme=${slug}&section=meetings`,
        });
      }
    });

    // Tasks
    (data.tasks || []).forEach((item) => {
      if (matchesSearch(item, ["task", "owner", "notes", "source"], query)) {
        results.push({
          theme: slug,
          themeLabel: label,
          type: "Task",
          title: item.task,
          preview: `Owner: ${item.owner}`,
          link: `theme.html?theme=${slug}&section=tasks`,
        });
      }
    });

    // Recommendations
    (data.recommendations || []).forEach((item) => {
      if (matchesSearch(item, ["title", "rationale", "proposedBy"], query)) {
        results.push({
          theme: slug,
          themeLabel: label,
          type: "Recommendation",
          title: item.title,
          preview: item.rationale,
          link: `theme.html?theme=${slug}&section=recommendations`,
        });
      }
    });
  }

  if (results.length === 0) {
    resultsEl.innerHTML = '<div class="search-empty">No results found.</div>';
    return;
  }

  // Group by theme
  const grouped = {};
  results.forEach((r) => {
    if (!grouped[r.themeLabel]) grouped[r.themeLabel] = [];
    grouped[r.themeLabel].push(r);
  });

  let html = "";
  for (const [theme, items] of Object.entries(grouped)) {
    html += `<div class="search-group"><div class="search-group-title">${escapeHtml(theme)}</div>`;
    items.forEach((item) => {
      const highlighted = highlightMatch(item.preview || "", query);
      html += `
        <a href="${item.link}" class="search-result-item" style="display:block;text-decoration:none;color:inherit;">
          <div class="result-title"><span class="badge badge-gray" style="margin-right:6px;">${item.type}</span>${escapeHtml(item.title)}</div>
          <div class="result-preview">${highlighted}</div>
        </a>
      `;
    });
    html += `</div>`;
  }
  resultsEl.innerHTML = html;
}

function matchesSearch(obj, fields, query) {
  return fields.some((f) => (obj[f] || "").toLowerCase().includes(query));
}

function highlightMatch(text, query) {
  if (!text) return "";
  const truncated = text.substring(0, 150);
  const escaped = escapeHtml(truncated);
  const regex = new RegExp(
    `(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`,
    "gi",
  );
  return (
    escaped.replace(regex, "<mark>$1</mark>") + (text.length > 150 ? "…" : "")
  );
}

function debounce(fn, ms) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), ms);
  };
}

// ---- Settings Panel ----
let settingsOverlay = null;

function openSettings() {
  if (!settingsOverlay) {
    settingsOverlay = document.createElement("div");
    settingsOverlay.className = "settings-overlay";
    document.body.appendChild(settingsOverlay);
  }

  const apiKey = localStorage.getItem("ted-gemini-key") || "";
  const hasKey = !!apiKey;
  const nbLink = localStorage.getItem("ted-notebooklm-link") || "";

  settingsOverlay.innerHTML = `
    <div class="settings-panel">
      <div class="settings-header">
        <h3>Settings</h3>
        <button class="modal-close" onclick="closeSettings()">×</button>
      </div>
      <div class="settings-body">
        <div class="form-group">
          <label>Gemini API Key</label>
          ${
            hasKey
              ? `
            <div class="api-key-display">
              <span class="key-text">${apiKey.substring(0, 8)}${"•".repeat(20)}</span>
              <button class="btn btn-sm btn-danger" id="clearApiKey">Clear</button>
            </div>
          `
              : `
            <input type="password" class="form-input" id="apiKeyInput" placeholder="Paste your Gemini API key here" value="">
            <button class="btn btn-primary btn-sm mt-2" id="saveApiKey">Save Key</button>
          `
          }
          <p class="settings-info">
            Get a free API key from <a href="https://aistudio.google.com/apikey" target="_blank">Google AI Studio</a>.
            Your key is stored only in your browser and sent exclusively to Google's Gemini API.
          </p>
        </div>
        
        <div class="form-group" style="margin-top: var(--space-6); padding-top: var(--space-6); border-top: 1px solid var(--color-border-light);">
          <label>NotebookLM Integration</label>
          <p class="settings-info mb-2">Add a link to your NotebookLM Notebook to show a shortcut button on Theme pages.</p>
          <div style="display:flex;gap:var(--space-2);">
            <input type="url" class="form-input" id="nbLinkInput" placeholder="https://notebooklm.google.com/..." value="${escapeHtml(nbLink)}">
            <button class="btn btn-primary btn-sm" id="saveNbLink">Save</button>
          </div>
        </div>

        <div class="form-group" style="margin-top: var(--space-6); padding-top: var(--space-6); border-top: 1px solid var(--color-border-light);">
          <label>Data Management</label>
          <p class="settings-info mb-4">Reset live edits to reload from the original JSON files.</p>
          <button class="btn btn-sm btn-danger" id="resetData">Reset All Data</button>
        </div>
      </div>
    </div>
  `;

  requestAnimationFrame(() => settingsOverlay.classList.add("active"));

  if (hasKey) {
    document.getElementById("clearApiKey")?.addEventListener("click", () => {
      localStorage.removeItem("ted-gemini-key");
      window.location.reload();
    });
  } else {
    document.getElementById("saveApiKey")?.addEventListener("click", () => {
      const key = document.getElementById("apiKeyInput").value.trim();
      if (key) {
        localStorage.setItem("ted-gemini-key", key);
        window.location.reload();
      }
    });
  }

  document.getElementById("saveNbLink")?.addEventListener("click", () => {
    const link = document.getElementById("nbLinkInput").value.trim();
    localStorage.setItem('ted-notebooklm-link', link);
    openSettings();
  });

  document.getElementById("resetData")?.addEventListener("click", () => {
    if (
      confirm(
        "This will reset all live edits and reload data from the original JSON files. Continue?",
      )
    ) {
      const keys = Object.keys(localStorage).filter(
        (k) =>
          k.startsWith("ted-") && k !== "ted-theme" && k !== "ted-gemini-key",
      );
      keys.forEach((k) => localStorage.removeItem(k));
      location.reload();
    }
  });

  settingsOverlay.addEventListener("click", (e) => {
    if (e.target === settingsOverlay) closeSettings();
  });
}

function closeSettings() {
  if (settingsOverlay) {
    settingsOverlay.classList.remove("active");
  }
}

// ---- AI Drawer Toggle (implemented in ai.js) ----
function toggleAIDrawer() {
  if (typeof window.toggleAI === "function") {
    window.toggleAI();
  }
}

// ---- Markdown Export ----
function exportThemeToMarkdown(slug) {
  const meta = store.getThemeMeta(slug);
  const data = store.getThemeData(slug);
  if (!meta) return;

  let md = `# ${meta.name} — Theme Export\n\n`;
  md += `**Facilitator:** ${meta.facilitator}\n`;
  md += `**Participants:** ${(meta.participants || []).join(", ")}\n`;
  md += `**Status:** ${meta.status}\n`;
  md += `**Exported:** ${new Date().toLocaleString()}\n\n`;
  md += `---\n\n`;

  // Exploration Log
  md += `## Exploration Log\n\n`;
  (data.explorationLog || []).forEach((item) => {
    md += `### ${item.title}\n`;
    md += `- **Type:** ${item.type} | **Status:** ${item.status} | **Raised by:** ${item.raisedBy} | **Date:** ${item.dateAdded}\n`;
    if (item.details) md += `\n${item.details}\n`;
    md += `\n`;
  });

  // Meeting Notes
  md += `## Meeting Notes\n\n`;
  (data.meetingNotes || []).forEach((item) => {
    md += `### ${formatDate(item.date)}\n`;
    md += `**Attendees:** ${item.attendees}\n\n`;
    if (item.keyPoints) md += `**Key Points:**\n${item.keyPoints}\n\n`;
    if (item.decisions) md += `**Decisions:**\n${item.decisions}\n\n`;
    if (item.questionsRaised)
      md += `**Questions Raised:**\n${item.questionsRaised}\n\n`;
    if (item.actionItems) md += `**Action Items:**\n${item.actionItems}\n\n`;
    if (item.notesLink) md += `**Full Notes:** ${item.notesLink}\n`;
    md += `---\n\n`;
  });

  // Tasks
  md += `## Tasks\n\n`;
  md += `| Task | Owner | Due | Status | Priority |\n|---|---|---|---|---|\n`;
  (data.tasks || []).forEach((t) => {
    md += `| ${t.task} | ${t.owner} | ${t.dueDate} | ${t.status} | ${t.priority} |\n`;
  });
  md += `\n`;

  // Recommendations
  if ((data.recommendations || []).length > 0) {
    md += `## Recommendations\n\n`;
    data.recommendations.forEach((r) => {
      md += `### ${r.title}\n`;
      md += `- **Status:** ${r.status} | **Proposed by:** ${r.proposedBy} | **Date:** ${r.dateProposed}\n`;
      if (r.rationale) md += `\n${r.rationale}\n`;
      md += `\n`;
    });
  }

  // Theme Notes
  if (data.themeNotes) {
    md += `## Theme Notes\n\n${data.themeNotes}\n`;
  }

  // Download
  const blob = new Blob([md], { type: "text/markdown" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${slug}-theme-export.md`;
  a.click();
  URL.revokeObjectURL(url);
}

// Make functions globally available
window.store = store;
window.generateId = generateId;
window.formatDate = formatDate;
window.formatDateShort = formatDateShort;
window.todayStr = todayStr;
window.escapeHtml = escapeHtml;
window.getThemeLabel = getThemeLabel;
window.getThemeAccent = getThemeAccent;
window.getThemeBadgeClass = getThemeBadgeClass;
window.getStatusBadgeClass = getStatusBadgeClass;
window.renderNav = renderNav;
window.openModal = openModal;
window.closeModal = closeModal;
window.openSearch = openSearch;
window.closeSearch = closeSearch;
window.openSettings = openSettings;
window.closeSettings = closeSettings;
window.exportThemeToMarkdown = exportThemeToMarkdown;
