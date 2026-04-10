/* ============================================================
   Theme Exploration Dashboard — Gemini AI Integration
   ============================================================ */

const OPENROUTER_MODEL = 'google/gemini-2.0-pro-exp-0205:free';
const OPENROUTER_ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';

function getApiKey() {
  return localStorage.getItem('ted-gemini-key') || '';
}

// ---- AI Chat State ----
let aiDrawerEl = null;
let aiChatHistory = [];
let currentAITheme = null;

// ---- Create AI Drawer ----
function createAIDrawer() {
  if (aiDrawerEl) return;
  aiDrawerEl = document.createElement('div');
  aiDrawerEl.className = 'ai-drawer';
  aiDrawerEl.id = 'aiDrawer';
  aiDrawerEl.innerHTML = `
    <div class="ai-drawer-header">
      <h3>✨ AI Assistant</h3>
      <button class="modal-close" onclick="window.toggleAI()">×</button>
    </div>
    <div class="ai-messages" id="aiMessages"></div>
    <div class="ai-input-wrap">
      <input type="text" id="aiInput" placeholder="Ask about meeting notes, tasks..." />
      <button class="btn btn-primary btn-sm" id="aiSend">Send</button>
    </div>
  `;
  document.body.appendChild(aiDrawerEl);

  document.getElementById('aiSend').addEventListener('click', sendAIMessage);
  document.getElementById('aiInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') sendAIMessage();
  });

  renderAIMessages();
}

window.toggleAI = function () {
  createAIDrawer();
  aiDrawerEl.classList.toggle('open');
  if (aiDrawerEl.classList.contains('open')) {
    renderAIMessages();
    setTimeout(() => document.getElementById('aiInput')?.focus(), 300);
  }
};

function renderAIMessages() {
  const container = document.getElementById('aiMessages');
  if (!container) return;

  const apiKey = getApiKey();
  if (!apiKey) {
    container.innerHTML = `
      <div class="ai-no-key">
        <div style="font-size:2rem;margin-bottom:var(--space-4);">🔑</div>
        <p>To use the AI assistant, add your Gemini API key in Settings (⚙️).</p>
        <p style="margin-top:var(--space-2);">Get a free key from <a href="https://aistudio.google.com/apikey" target="_blank" style="color:var(--color-primary)">Google AI Studio</a>.</p>
      </div>
    `;
    return;
  }

  if (aiChatHistory.length === 0) {
    container.innerHTML = `
      <div class="ai-no-key">
        <div style="font-size:2rem;margin-bottom:var(--space-4);">✨</div>
        <p>Ask me about your meeting notes, exploration items, tasks, or anything related to your themes.</p>
        <p class="text-xs mt-2 text-muted">I have access to all your theme data.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = aiChatHistory.map(msg => `
    <div class="ai-message ${msg.role}">
      ${msg.role === 'assistant' ? formatAIResponse(msg.content) : escapeHtml(msg.content)}
    </div>
  `).join('');

  container.scrollTop = container.scrollHeight;
}

function formatAIResponse(text) {
  // Simple markdown-like formatting
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code style="background:var(--color-surface-muted);padding:1px 4px;border-radius:3px;">$1</code>')
    .replace(/\n- /g, '<br>• ')
    .replace(/\n\d+\. /g, (match) => `<br>${match.trim()} `)
    .replace(/\n/g, '<br>');
}

async function sendAIMessage() {
  const input = document.getElementById('aiInput');
  const query = input.value.trim();
  if (!query) return;

  const apiKey = getApiKey();
  if (!apiKey) return;

  input.value = '';
  aiChatHistory.push({ role: 'user', content: query });
  renderAIMessages();

  // Build context from theme data
  const context = buildThemeContext();

  try {
    const systemPrompt = `You are an AI assistant for a university marketing team's Theme Exploration Dashboard. You help the team understand their meeting notes, exploration logs, tasks, and recommendations across three themes: Design, Global/Honors, and Health.

Here is the current data from all themes:

${context}

Answer the user's question based on this data. Be concise, helpful, and specific. Reference specific items, dates, and people when relevant. If the data doesn't contain the answer, say so.`;

    const messages = [
      { role: 'user', parts: [{ text: systemPrompt }] },
      { role: 'model', parts: [{ text: 'I understand. I have access to all your theme data. How can I help?' }] }
    ];

    // Add chat history
    aiChatHistory.slice(0, -1).forEach(msg => {
      messages.push({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }]
      });
    });

    messages.push({ role: 'user', parts: [{ text: query }] });

    const openAiMessages = messages.map(m => ({
      role: m.role === 'model' ? 'assistant' : m.role,
      content: m.parts[0].text
    }));

    const response = await fetch(OPENROUTER_ENDPOINT, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': window.location.href, // Required by OpenRouter
        'X-Title': 'Theme Exploration Dashboard' // Required by OpenRouter
      },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        messages: openAiMessages,
        temperature: 0.7,
        max_tokens: 1024
      })
    });

    if (!response.ok) {
      const err = await response.json();
      if (response.status === 429) throw new Error('⏳ Rate limit reached — please wait a moment and try again.');
      throw new Error(err.error || 'API request failed');
    }

    const result = await response.json();
    const aiText = result.choices?.[0]?.message?.content || 'No response generated.';

    aiChatHistory.push({ role: 'assistant', content: aiText });
    renderAIMessages();
  } catch (error) {
    aiChatHistory.push({ role: 'assistant', content: `⚠️ Error: ${error.message}` });
    renderAIMessages();
  }
}

function buildThemeContext() {
  let context = '';
  const slugs = ['design', 'global', 'health'];

  for (const slug of slugs) {
    const meta = store.getThemeMeta(slug);
    const data = store.getThemeData(slug);
    if (!meta) continue;

    context += `\n## ${meta.name} Theme (Facilitator: ${meta.facilitator})\n`;
    context += `Status: ${meta.status}\n`;
    context += `Participants: ${(meta.participants || []).join(', ')}\n`;

    if (data.competitors?.length) context += `Competitors to benchmark against: ${data.competitors.join(', ')}\n`;
    if (data.keyMetrics?.length) context += `Key Metrics & Verified Claims: ${data.keyMetrics.join(', ')}\n`;
    if (data.partnerships?.length) context += `Targets & Partners: ${data.partnerships.join(', ')}\n`;


    if (data.explorationLog?.length) {
      context += `\n### Exploration Log:\n`;
      data.explorationLog.forEach(e => {
        context += `- [${e.type}] "${e.title}" (${e.status}, by ${e.raisedBy}, ${e.dateAdded}): ${e.details}\n`;
      });
    }

    if (data.meetingNotes?.length) {
      context += `\n### Meeting Notes:\n`;
      data.meetingNotes.forEach(m => {
        context += `- Meeting ${m.date} (${m.attendees}):\n`;
        if (m.keyPoints) context += `  Key Points: ${m.keyPoints}\n`;
        if (m.decisions) context += `  Decisions: ${m.decisions}\n`;
        if (m.questionsRaised) context += `  Questions: ${m.questionsRaised}\n`;
        if (m.actionItems) context += `  Action Items: ${m.actionItems}\n`;
      });
    }

    if (data.tasks?.length) {
      context += `\n### Tasks:\n`;
      data.tasks.forEach(t => {
        context += `- "${t.task}" (Owner: ${t.owner}, Due: ${t.dueDate}, Status: ${t.status}, Priority: ${t.priority})\n`;
      });
    }

    if (data.recommendations?.length) {
      context += `\n### Recommendations:\n`;
      data.recommendations.forEach(r => {
        context += `- "${r.title}" (${r.status}, by ${r.proposedBy}): ${r.rationale}\n`;
      });
    }

    if (data.themeNotes) {
      context += `\n### Theme Notes:\n${data.themeNotes}\n`;
    }
  }

  return context;
}

// ---- AI Extraction from Meeting Notes ----
async function extractFromMeetingNotes(meetingNote, themeSlug) {
  const apiKey = getApiKey();
  if (!apiKey) {
    alert('Please add your Gemini API key in Settings (⚙️) to use AI extraction.');
    return null;
  }

  const prompt = `Analyze the following meeting notes and extract structured items. Return ONLY valid JSON with no markdown formatting.

Meeting Date: ${meetingNote.date}
Attendees: ${meetingNote.attendees}
Key Points: ${meetingNote.keyPoints || ''}
Decisions: ${meetingNote.decisions || ''}
Questions Raised: ${meetingNote.questionsRaised || ''}
Action Items: ${meetingNote.actionItems || ''}

Return this JSON structure:
{
  "action_items": [{"task": "description", "owner": "name if mentioned", "priority": "High/Medium/Low"}],
  "open_questions": [{"title": "question text", "details": "any additional context"}],
  "goals": [{"title": "goal", "details": "context"}],
  "decisions": [{"title": "decision", "details": "context"}]
}

Be specific and extract only what is clearly stated or strongly implied. Keep items concise.`;

  try {
    const response = await fetch(OPENROUTER_ENDPOINT, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': window.location.href,
        'X-Title': 'Theme Exploration Dashboard'
      },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 1024
      })
    });

    if (!response.ok) {
      const err = await response.json();
      if (response.status === 429) throw new Error('Rate limit reached — please wait a moment and try again.');
      throw new Error(err.error || 'API request failed');
    }

    const result = await response.json();
    let text = result.choices?.[0]?.message?.content || '';

    // Clean up markdown code fences if present
    text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    return JSON.parse(text);
  } catch (error) {
    console.error('AI extraction error:', error);
    alert(`AI extraction failed: ${error.message}`);
    return null;
  }
}

function renderAISuggestions(extracted, meetingNote, themeSlug, containerEl) {
  if (!extracted) return;

  let html = '<div class="ai-suggestions"><h4 style="margin-bottom:var(--space-2);">✨ AI Suggestions</h4>';

  const allItems = [];

  (extracted.action_items || []).forEach(item => {
    allItems.push({ type: 'Task', text: item.task, detail: `Owner: ${item.owner || 'Unassigned'} | Priority: ${item.priority || 'Medium'}`, data: item, category: 'task' });
  });

  (extracted.open_questions || []).forEach(item => {
    allItems.push({ type: 'Question', text: item.title, detail: item.details || '', data: item, category: 'question' });
  });

  (extracted.goals || []).forEach(item => {
    allItems.push({ type: 'Goal', text: item.title, detail: item.details || '', data: item, category: 'goal' });
  });

  (extracted.decisions || []).forEach(item => {
    allItems.push({ type: 'Decision', text: item.title, detail: item.details || '', data: item, category: 'decision' });
  });

  if (allItems.length === 0) {
    html += '<p class="text-sm text-muted">No actionable items found in these notes.</p>';
  }

  allItems.forEach((item, idx) => {
    html += `
      <div class="ai-suggestion-card" id="suggestion-${idx}">
        <div class="suggestion-type">${item.type}</div>
        <div class="suggestion-text">${escapeHtml(item.text)}</div>
        ${item.detail ? `<div class="text-xs text-muted">${escapeHtml(item.detail)}</div>` : ''}
        <div class="ai-suggestion-actions mt-2">
          <button class="btn btn-sm btn-primary" onclick="acceptSuggestion('${themeSlug}', ${idx}, '${item.category}', this)">Accept</button>
          <button class="btn btn-sm btn-ghost" onclick="dismissSuggestion(${idx})">Dismiss</button>
        </div>
      </div>
    `;
  });

  html += '</div>';
  containerEl.innerHTML = html;

  // Store items for acceptance
  window._aiSuggestionItems = allItems;
  window._aiMeetingNote = meetingNote;
}

window.acceptSuggestion = function (themeSlug, idx, category, btnEl) {
  const item = window._aiSuggestionItems?.[idx];
  if (!item) return;

  const data = store.getThemeData(themeSlug);
  const meetingNote = window._aiMeetingNote;

  if (category === 'task') {
    data.tasks = data.tasks || [];
    data.tasks.push({
      id: generateId('task'),
      task: item.data.task,
      owner: item.data.owner || '',
      dueDate: '',
      status: 'Not Started',
      source: meetingNote ? `Meeting ${meetingNote.date}` : '',
      priority: item.data.priority || 'Medium'
    });
  } else if (category === 'question') {
    data.explorationLog = data.explorationLog || [];
    data.explorationLog.unshift({
      id: generateId('exp'),
      type: 'Question',
      title: item.data.title,
      details: item.data.details || '',
      raisedBy: 'AI Extracted',
      dateAdded: todayStr(),
      status: 'Active'
    });
  } else if (category === 'goal' || category === 'decision') {
    data.explorationLog = data.explorationLog || [];
    data.explorationLog.unshift({
      id: generateId('exp'),
      type: category === 'goal' ? 'Idea' : 'Open Thread',
      title: item.data.title,
      details: item.data.details || '',
      raisedBy: 'AI Extracted',
      dateAdded: todayStr(),
      status: category === 'decision' ? 'Converging' : 'Active'
    });
  }

  store.saveThemeData(themeSlug, data);

  // Mark as accepted visually
  const card = document.getElementById(`suggestion-${idx}`);
  if (card) {
    card.style.opacity = '0.5';
    card.innerHTML = `<div class="text-sm" style="color:var(--color-success)">✓ Added to ${category === 'task' ? 'Tasks' : 'Exploration Log'}</div>`;
  }
};

window.dismissSuggestion = function (idx) {
  const card = document.getElementById(`suggestion-${idx}`);
  if (card) {
    card.style.opacity = '0';
    setTimeout(() => card.remove(), 200);
  }
};

// Make available globally
window.extractFromMeetingNotes = extractFromMeetingNotes;
window.renderAISuggestions = renderAISuggestions;
window.geminiRequest = async function(messages) {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error('API key missing');
  
  const openAiMessages = messages.map(m => ({
    role: m.role === 'model' ? 'assistant' : m.role,
    content: m.parts[0].text
  }));

  const response = await fetch(OPENROUTER_ENDPOINT, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': window.location.href,
      'X-Title': 'Theme Exploration Dashboard'
    },
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
      messages: openAiMessages,
      temperature: 0.3,
      max_tokens: 1024
    })
  });
  if (!response.ok) {
    const err = await response.json();
    if (response.status === 429) throw new Error('Rate limit reached — please wait a moment and try again.');
    throw new Error(err.error?.message || 'API request failed');
  }
  return await response.json();
};
