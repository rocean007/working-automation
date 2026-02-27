"use client";

import { useState, useEffect, useCallback } from 'react';

const OPTIMAL_TIMES = [
  { label: '9:00 AM UTC (Best for Asia)', value: '09:00' },
  { label: '11:00 AM UTC (Morning peak)', value: '11:00' },
  { label: '2:00 PM UTC (Afternoon peak)', value: '14:00' },
  { label: '7:00 PM UTC (Evening peak ★)', value: '19:00' },
  { label: '10:00 PM UTC (Night peak)', value: '22:00' },
];

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [config, setConfig] = useState({
    videosPerDay: 5,
    uploadEnabled: true,
    contentTypes: ['storytelling', 'dance', 'top5'],
    preferredTime: '19:00',
    voiceId: 'Rachel',
  });
  const [jobs, setJobs] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [generating, setGenerating] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [configRes, jobsRes, statsRes] = await Promise.all([
        fetch('/api/config'),
        fetch('/api/jobs'),
        fetch('/api/stats'),
      ]);
      if (configRes.ok) {
        const cfg = await configRes.json();
        setConfig(prev => ({ ...prev, ...cfg }));
      }
      if (jobsRes.ok) {
        const data = await jobsRes.json();
        setJobs(data.jobs || []);
      }
      if (statsRes.ok) setStats(await statsRes.json());
    } catch (err) {
      console.error('Fetch error:', err);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, [fetchData]);

  async function saveConfig() {
    setLoading(true);
    try {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      if (res.ok) showMessage('✅ Settings saved!', 'success');
      else showMessage('❌ Failed to save', 'error');
    } catch (err) {
      showMessage('❌ Error: ' + err.message, 'error');
    }
    setLoading(false);
  }

  async function triggerGeneration() {
    setGenerating(true);
    showMessage('🎬 Starting video generation...', 'info');
    try {
      const res = await fetch('/api/trigger', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        showMessage(`✅ Video created! ${data.youtubeUrl ? '→ ' + data.youtubeUrl : ''}`, 'success');
        fetchData();
      } else {
        showMessage('❌ ' + (data.error || 'Generation failed'), 'error');
      }
    } catch (err) {
      showMessage('❌ Error: ' + err.message, 'error');
    }
    setGenerating(false);
  }

  function showMessage(msg, type) {
    setMessage({ text: msg, type });
    setTimeout(() => setMessage(''), 5000);
  }

  const toggleContentType = (type) => {
    setConfig(prev => ({
      ...prev,
      contentTypes: prev.contentTypes.includes(type)
        ? prev.contentTypes.filter(t => t !== type)
        : [...prev.contentTypes, type],
    }));
  };

  const nextUpload = () => {
    const [h, m] = (config.preferredTime || '19:00').split(':').map(Number);
    const now = new Date();
    const next = new Date();
    next.setUTCHours(h, m, 0, 0);
    if (next <= now) next.setUTCDate(next.getUTCDate() + 1);
    const diff = next - now;
    const hours = Math.floor(diff / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    return `${hours}h ${mins}m`;
  };

  return (
    <div className="container">
      <header className="header">
        <div className="headerContent">
          <div className="logo">
            <span className="logoIcon">🧠</span>
            <div>
              <h1 className="headerTitle">Brainrot Automation</h1>
              <p className="headerSub">Automated YouTube Content Generator</p>
            </div>
          </div>
          <div className="headerStats">
            <StatBadge label="Today" value={`${stats.todayVideos || 0} videos`} />
            <StatBadge label="Success" value={`${stats.successRate || 0}%`} />
            <StatBadge label="Next Upload" value={nextUpload()} color="green" />
          </div>
        </div>
      </header>

      {message && (
        <div className={`message message--${message.type}`} style={{ maxWidth: 1200, margin: '20px auto 0', padding: '14px 20px' }}>
          {message.text}
        </div>
      )}

      <nav className="nav">
        {['overview', 'settings', 'jobs', 'api-keys'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`navBtn ${activeTab === tab ? 'navBtn--active' : ''}`}
          >
            {tab === 'overview' ? '📊 Overview' :
              tab === 'settings' ? '⚙️ Settings' :
              tab === 'jobs' ? '📋 Jobs' : '🔑 API Keys'}
          </button>
        ))}
      </nav>

      <main className="main">
        {activeTab === 'overview' && (
          <div>
            <div className="grid3">
              <StatCard label="Total Videos" value={stats.totalVideos || 0} icon="🎬" />
              <StatCard label="Today's Videos" value={`${stats.todayVideos || 0} / ${config.videosPerDay}`} icon="📅" />
              <StatCard label="Success Rate" value={`${stats.successRate || 0}%`} icon="✅" />
            </div>

            <div className="card">
              <h2 className="cardTitle">🚀 Manual Generation</h2>
              <p className="descText">
                Trigger a video generation right now. The automation also runs on its own schedule.
              </p>
              <div className="buttonRow">
                <button
                  onClick={triggerGeneration}
                  disabled={generating}
                  className="btnPrimary"
                >
                  {generating ? '⏳ Generating...' : '🎬 Generate Video Now'}
                </button>
              </div>
              {stats.lastVideoUrl && (
                <div className="lastUpload">
                  <p>Last upload</p>
                  <a href={stats.lastVideoUrl} target="_blank" rel="noreferrer">
                    {stats.lastVideoUrl}
                  </a>
                </div>
              )}
            </div>

            <div className="card">
              <h2 className="cardTitle">📅 Upload Schedule (Vercel Cron)</h2>
              <p className="descText">
                These times are configured in <code style={{ color: '#f59e0b', fontFamily: 'JetBrains Mono, monospace', fontSize: 13 }}>vercel.json</code> and run automatically:
              </p>
              <div className="scheduleGrid">
                {['9:00 AM UTC', '11:00 AM UTC', '2:00 PM UTC', '7:00 PM UTC ⭐', '10:00 PM UTC'].map((time, i) => (
                  <div key={i} className="scheduleItem">
                    <span style={{ color: '#10b981', fontWeight: 'bold' }}>📤</span>
                    <span>{time}</span>
                  </div>
                ))}
              </div>
              <p className="noteText">
                ⭐ 7 PM UTC = 2 PM EST — peak YouTube engagement time based on research
              </p>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="card">
            <h2 className="cardTitle">⚙️ Automation Settings</h2>

            <div className="formGroup">
              <label className="label">
                Videos Per Day: <strong>{config.videosPerDay}</strong>
              </label>
              <input
                type="range"
                min="1"
                max="10"
                value={config.videosPerDay}
                onChange={e => setConfig(prev => ({ ...prev, videosPerDay: parseInt(e.target.value) }))}
                className="range"
              />
              <div className="rangeLabels"><span>1</span><span>5</span><span>10</span></div>
            </div>

            <div className="formGroup">
              <label className="label">Preferred Upload Time (UTC)</label>
              <select
                value={config.preferredTime}
                onChange={e => setConfig(prev => ({ ...prev, preferredTime: e.target.value }))}
                className="select"
              >
                {OPTIMAL_TIMES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
              <p className="hint">Vercel cron runs 5 times/day — adjust vercel.json for exact control</p>
            </div>

            <div className="formGroup">
              <label className="label">Content Types</label>
              <div className="checkboxGroup">
                {['storytelling', 'dance', 'top5'].map(type => (
                  <label key={type} className="checkboxLabel">
                    <input
                      type="checkbox"
                      checked={config.contentTypes?.includes(type)}
                      onChange={() => toggleContentType(type)}
                    />
                    {type === 'storytelling' ? '📖 Storytelling' : type === 'dance' ? '💃 Dance' : '🏆 Top 5'}
                  </label>
                ))}
              </div>
            </div>

            <div className="formGroup">
              <label className="label">Voice</label>
              <select
                value={config.voiceId}
                onChange={e => setConfig(prev => ({ ...prev, voiceId: e.target.value }))}
                className="select"
              >
                <option value="Rachel">Rachel (Female, Warm)</option>
                <option value="Domi">Domi (Female, Energetic)</option>
                <option value="Bella">Bella (Female, Soft)</option>
                <option value="Antoni">Antoni (Male, Deep)</option>
                <option value="Elli">Elli (Female, Young)</option>
              </select>
            </div>

            <div className="formGroup">
              <label className="checkboxLabel" style={{ background: 'none', border: 'none', padding: 0 }}>
                <input
                  type="checkbox"
                  checked={config.uploadEnabled}
                  onChange={e => setConfig(prev => ({ ...prev, uploadEnabled: e.target.checked }))}
                />
                Auto-upload to YouTube (uncheck to generate only, no upload)
              </label>
            </div>

            <button onClick={saveConfig} disabled={loading} className="btnPrimary">
              {loading ? '⏳ Saving...' : '💾 Save Settings'}
            </button>
          </div>
        )}

        {activeTab === 'jobs' && (
          <div className="card">
            <h2 className="cardTitle">📋 Generation Jobs</h2>
            {jobs.length === 0 ? (
              <p className="emptyState">No jobs yet. Generate your first video!</p>
            ) : (
              <div className="jobsList">
                {jobs.map(job => (
                  <div key={job.id} className="jobItem">
                    <div className="jobHeader">
                      <StatusBadge status={job.status} />
                      <span className="jobTime">
                        {new Date(job.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="jobTitle">
                      {job.title || `${job.type} - ${job.character}`}
                    </p>
                    <p className="jobMeta">
                      Type: {job.type} · Character: {job.character}
                    </p>
                    {job.youtubeUrl && (
                      <a href={job.youtubeUrl} target="_blank" rel="noreferrer" className="jobLink">
                        ▶ Watch on YouTube
                      </a>
                    )}
                    {job.error && (
                      <p className="jobError">Error: {job.error}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'api-keys' && (
          <div>
            <div className="card">
              <h2 className="cardTitle">🔑 Required API Keys (All Free)</h2>
              <p className="descText">
                Set these in your Vercel dashboard under Settings → Environment Variables
              </p>
              {[
                {
                  name: 'MONGODB_URI',
                  label: 'MongoDB Atlas',
                  desc: 'Free M0 cluster (512MB)',
                  url: 'https://mongodb.com/cloud/atlas',
                  color: '#10b981',
                },
                {
                  name: 'YOUTUBE_CLIENT_ID + YOUTUBE_CLIENT_SECRET + YOUTUBE_REFRESH_TOKEN',
                  label: 'YouTube Data API v3',
                  desc: 'Free — 10,000 units/day',
                  url: 'https://console.cloud.google.com',
                  color: '#ef4444',
                },
                {
                  name: 'HUGGINGFACE_API_KEY',
                  label: 'HuggingFace (Image Gen)',
                  desc: 'Free — unlimited (rate limited)',
                  url: 'https://huggingface.co/settings/tokens',
                  color: '#f59e0b',
                },
                {
                  name: 'ELEVENLABS_API_KEY',
                  label: 'ElevenLabs TTS',
                  desc: 'Free — 10k chars/month',
                  url: 'https://elevenlabs.io',
                  color: '#8b5cf6',
                },
                {
                  name: 'OPENROUTER_API_KEY',
                  label: 'OpenRouter (Script Gen)',
                  desc: 'Free tier — Mistral-7B free',
                  url: 'https://openrouter.ai',
                  color: '#06b6d4',
                },
                {
                  name: 'CRON_SECRET',
                  label: 'Cron Secret',
                  desc: 'Generate: openssl rand -hex 32',
                  url: null,
                  color: '#6b7280',
                },
              ].map(key => (
                <div key={key.name} className="apiKeyItem">
                  <div className="apiKeyDot" style={{ background: key.color, color: key.color }} />
                  <div style={{ flex: 1 }}>
                    <p className="apiKeyLabel">{key.label}</p>
                    <code className="apiKeyCode">{key.name}</code>
                    <p className="apiKeyDesc">{key.desc}</p>
                  </div>
                  {key.url && (
                    <a href={key.url} target="_blank" rel="noreferrer" className="btnSmall">
                      Get Key →
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function StatCard({ label, value, icon }) {
  return (
    <div className="statCard">
      <span className="statCard__icon">{icon}</span>
      <div>
        <p className="statCard__label">{label}</p>
        <p className="statCard__value">{value}</p>
      </div>
    </div>
  );
}

function StatBadge({ label, value, color }) {
  return (
    <div className="statBadge">
      <span className="statBadge__label">{label}</span>
      <span className={`statBadge__value${color === 'green' ? ' statBadge__value--green' : ''}`}>
        {value}
      </span>
    </div>
  );
}

function StatusBadge({ status }) {
  return (
    <span className={`statusBadge statusBadge--${status || 'pending'}`}>
      {status}
    </span>
  );
}