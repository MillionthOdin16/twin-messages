let messages = [];
let tasks = [];
let agents = [];
let stats = {};
let currentMsgFilter = 'all';
let currentTaskFilter = 'all';

document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById(tab.dataset.tab).classList.add('active');
    });
});

function showError(msg) {
    const banner = document.getElementById('error-banner');
    banner.textContent = msg;
    banner.classList.toggle('show', !!msg);
}

function updateTimestamp() {
    document.getElementById('last-update').textContent = new Date().toLocaleTimeString();
}

async function init() {
    try {
        await Promise.all([fetchStats(), fetchMessages(), fetchTasks(), fetchAgents()]);
        showError('');
    } catch (e) {
        showError('Error: ' + e.message);
    }

    setInterval(async () => {
        try {
            await Promise.all([fetchStats(), fetchMessages(), fetchTasks()]);
        } catch (e) {
            showError('Update failed: ' + e.message);
        }
    }, 15000);
}

async function fetchStats() {
    try {
        const res = await fetch(`${API_URL}/stats`);
        if (!res.ok) throw new Error('Stats failed');
        stats = await res.json();
        renderStats();

        document.getElementById('status-dot').classList.remove('error');
        document.getElementById('status-text').textContent = 'Connected';
    } catch (e) {
        document.getElementById('status-dot').classList.add('error');
        document.getElementById('status-text').textContent = 'Error';
    }
}

function renderStats() {
    document.getElementById('stat-messages').textContent = stats.messages?.total || 0;
    document.getElementById('stat-tasks').textContent = stats.tasks?.active || 0;
    document.getElementById('stat-agents').textContent = stats.agents?.webhooks || 0;
    document.getElementById('stat-webhooks').textContent = stats.agents?.webhooks || 0;
    document.getElementById('sys-apikeys').textContent = stats.agents?.apiKeys || 0;
    document.getElementById('sys-connected').textContent = (stats.agents?.connected || []).join(', ') || 'None';

    const lastActivity = stats.agents?.lastActivity || {};
    document.getElementById('badger-last').textContent = lastActivity['badger-1'] ? formatTimeAgo(lastActivity['badger-1']) : 'Never';
    document.getElementById('ratchet-last').textContent = lastActivity['ratchet'] ? formatTimeAgo(lastActivity['ratchet']) : 'Never';

    updateTimestamp();
}

async function fetchMessages() {
    try {
        const res = await fetch(`${API_URL}/messages/all?limit=50`);
        if (!res.ok) throw new Error('Messages failed');
        const data = await res.json();
        messages = data.messages || [];
        renderMessages();
    } catch (e) {
        document.getElementById('messages-container').innerHTML = '<div class="empty-state"><div class="empty-icon">⚠️</div><p>Failed to load</p></div>';
    }
}

function renderMessages() {
    const container = document.getElementById('messages-container');
    const filtered = messages.filter(m => currentMsgFilter === 'all' || m.from === currentMsgFilter);

    if (!filtered.length) {
        container.innerHTML = '<div class="empty-state"><div class="empty-icon">💬</div><p>No messages</p></div>';
        return;
    }

    container.innerHTML = filtered.map(m => `
        <div class="message">
            <div class="message-header">
                <div class="message-avatar ${m.from === 'badger-1' ? 'badger' : 'ratchet'}">${m.from === 'badger-1' ? '🦡' : '🔧'}</div>
                <span class="message-author">${m.from}</span>
                <span class="message-time">${formatTime(m.timestamp)}</span>
            </div>
            <div class="message-body">${escapeHtml(m.content?.text || '')}</div>
            <div class="message-meta"><span>To: ${m.to}</span><span>${m.type}</span></div>
        </div>
    `).join('');
}

function filterMessages(filter) {
    currentMsgFilter = filter;
    renderMessages();
    document.querySelectorAll('#messages .btn').forEach(b => b.classList.remove('active'));
    event.target.classList.add('active');
}

async function fetchTasks() {
    try {
        const res = await fetch(`${API_URL}/tasks?limit=50&apiKey=${API_KEY}`);
        if (!res.ok) throw new Error('Tasks failed');
        const data = await res.json();
        tasks = data.tasks || [];
        renderTasks();
    } catch (e) {
        document.getElementById('tasks-container').innerHTML = '<div class="empty-state"><div class="empty-icon">⚠️</div><p>Failed to load</p></div>';
    }
}

function renderTasks() {
    const container = document.getElementById('tasks-container');
    const filtered = tasks.filter(t => currentTaskFilter === 'all' || t.status?.state === currentTaskFilter);

    if (!filtered.length) {
        container.innerHTML = '<div class="empty-state"><div class="empty-icon">📋</div><p>No tasks</p></div>';
        return;
    }

    container.innerHTML = filtered.map(t => `
        <div class="task-card ${t.status?.state || 'submitted'}">
            <div class="task-header">
                <span class="task-type">${t.type || 'action'}</span>
                <span class="task-state ${t.status?.state}">${t.status?.state || 'submitted'}</span>
            </div>
            <div class="task-id">ID: ${(t.id || '').slice(0, 12)}...</div>
            <div class="task-input">${escapeHtml(JSON.stringify(t.input || {}))}</div>
            <div class="task-meta"><span>From: ${t.createdBy}</span><span>To: ${t.agentId}</span></div>
        </div>
    `).join('');
}

function filterTasks(filter) {
    currentTaskFilter = filter;
    renderTasks();
    document.querySelectorAll('#tasks .btn').forEach(b => b.classList.remove('active'));
    event.target.classList.add('active');
}

async function fetchAgents() {
    try {
        const [badger, ratchet] = await Promise.all([
            fetch(`${API_URL}/agents/badger-1`).then(r => r.json()).catch(() => null),
            fetch(`${API_URL}/agents/ratchet`).then(r => r.json()).catch(() => null)
        ]);

        agents = [badger, ratchet].filter(Boolean);
        renderAgents();
    } catch (e) {
        console.error('Agents error:', e);
    }
}

function renderAgents() {
    const lastActivity = stats.agents?.lastActivity || {};

    const overview = document.getElementById('agent-grid');
    overview.innerHTML = agents.map(a => `
        <div class="agent-card ${a.agentId === 'badger-1' ? 'badger' : 'ratchet'}">
            <div class="agent-header">
                <div class="agent-avatar">${a.agentId === 'badger-1' ? '🦡' : '🔧'}</div>
                <div class="agent-info">
                    <h3>${a.agentId}</h3>
                    <span class="agent-status ${a.status}">${a.status || 'offline'}</span>
                </div>
            </div>
            <div class="agent-stats">
                <div class="agent-stat">
                    <div class="agent-stat-value">${messages.filter(m => m.from === a.agentId).length}</div>
                    <div class="agent-stat-label">Msgs</div>
                </div>
                <div class="agent-stat">
                    <div class="agent-stat-value">${tasks.filter(t => t.agentId === a.agentId).length}</div>
                    <div class="agent-stat-label">Tasks</div>
                </div>
                <div class="agent-stat">
                    <div class="agent-stat-value">${a.hasApiKey ? '✓' : '✗'}</div>
                    <div class="agent-stat-label">API Key</div>
                </div>
            </div>
            <div class="last-activity">Last activity: <span id="${a.agentId}-last">${lastActivity[a.agentId] ? formatTimeAgo(lastActivity[a.agentId]) : 'Unknown'}</span></div>
        </div>
    `).join('');

    const agentsTab = document.getElementById('agents-container');
    agentsTab.innerHTML = agents.map(a => `
        <div class="agent-card ${a.agentId === 'badger-1' ? 'badger' : 'ratchet'}">
            <div class="agent-header">
                <div class="agent-avatar">${a.agentId === 'badger-1' ? '🦡' : '🔧'}</div>
                <div class="agent-info">
                    <h3>${a.agentId}</h3>
                    <span class="agent-status ${a.status}">${a.status}</span>
                </div>
            </div>
            <div class="agent-stats">
                <div class="agent-stat"><div class="agent-stat-value">${a.isConnected ? 'Yes' : 'No'}</div><div class="agent-stat-label">WebSocket</div></div>
                <div class="agent-stat"><div class="agent-stat-value">${a.hasWebhook ? '✓' : '✗'}</div><div class="agent-stat-label">Webhook</div></div>
                <div class="agent-stat"><div class="agent-stat-value">${a.hasApiKey ? '✓' : '✗'}</div><div class="agent-stat-label">API Key</div></div>
            </div>
            <div class="last-activity">Last activity: <span>${a.lastActivity ? formatTimeAgo(a.lastActivity) : 'Unknown'}</span></div>
        </div>
    `).join('');
}

function formatTime(ts) {
    if (!ts) return '';
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatTimeAgo(ts) {
    if (!ts) return 'Unknown';
    const diff = Date.now() - new Date(ts).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
}

async function sendMessage() {
    const to = document.getElementById('compose-to').value;
    const text = document.getElementById('compose-text').value.trim();
    const successEl = document.getElementById('compose-success');
    const btn = document.querySelector('.send-btn');

    if (!text) return;

    btn.disabled = true;
    btn.textContent = 'Sending...';

    try {
        const res = await fetch(`${API_URL}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                from: 'badger-1',
                to: to,
                content: { text: text }
            })
        });

        if (res.ok) {
            successEl.classList.add('show');
            document.getElementById('compose-text').value = '';
            setTimeout(() => successEl.classList.remove('show'), 2000);
            fetchMessages(); // Refresh
        }
    } catch (e) {
        alert('Failed to send: ' + e.message);
    }

    btn.disabled = false;
    btn.textContent = 'Send';
}

async function createTask() {
    const agentId = document.getElementById('task-agent').value;
    const type = document.getElementById('task-type').value;
    const inputText = document.getElementById('task-input').value.trim();
    const successEl = document.getElementById('task-success');
    const btn = document.querySelector('#tasks .compose-btn');

    let input;
    try {
        input = JSON.parse(inputText);
    } catch {
        input = { description: inputText };
    }

    btn.disabled = true;
    btn.textContent = 'Creating...';

    try {
        const res = await fetch(`${API_URL}/tasks?apiKey=${API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                agentId: agentId,
                type: type,
                input: input,
                createdBy: 'badger-1'
            })
        });

        if (res.ok) {
            successEl.classList.add('show');
            document.getElementById('task-input').value = '';
            setTimeout(() => successEl.classList.remove('show'), 2000);
            fetchTasks();
        }
    } catch (e) {
        alert('Failed to create task: ' + e.message);
    }

    btn.disabled = false;
    btn.textContent = 'Create Task';
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    // Ignore if typing in textarea
    if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT') return;

    const tabs = ['overview', 'messages', 'tasks', 'agents', 'system'];
    if (e.key >= '1' && e.key <= '5') {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        document.querySelector(`.tab[data-tab="${tabs[parseInt(e.key)-1]}"]`).classList.add('active');
        document.getElementById(tabs[parseInt(e.key)-1]).classList.add('active');
    }
    if (e.key.toLowerCase() === 'r') {
        fetchStats(); fetchMessages(); fetchTasks();
    }
    if (e.key.toLowerCase() === 'c') {
        document.querySelector(`.tab[data-tab="messages"]`).click();
        document.getElementById('compose-text').focus();
    }
    if (e.key.toLowerCase() === 't') {
        document.querySelector(`.tab[data-tab="tasks"]`).click();
        document.getElementById('task-input').focus();
    }
});

init();
