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
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <div style={styles.logo}>
            <span style={styles.logoIcon}>🧠</span>
            <div>
              <h1 style={styles.headerTitle}>Brainrot Automation</h1>
              <p style={styles.headerSub}>Automated YouTube Content Generator</p>
            </div>
          </div>
          <div style={styles.headerStats}>
            <StatBadge label="Today" value={`${stats.todayVideos || 0} videos`} />
            <StatBadge label="Success" value={`${stats.successRate || 0}%`} />
            <StatBadge label="Next Upload" value={nextUpload()} color="#10b981" />
          </div>
        </div>
      </header>

      {message && (
        <div style={{
          ...styles.message,
          background: message.type === 'success' ? '#065f46' : message.type === 'error' ? '#7f1d1d' : '#1e3a5f',
        }}>
          {message.text}
        </div>
      )}

      <nav style={styles.nav}>
        {['overview', 'settings', 'jobs', 'api-keys'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{ ...styles.navBtn, ...(activeTab === tab ? styles.navBtnActive : {}) }}
          >
            {tab === 'overview' ? '📊 Overview' :
              tab === 'settings' ? '⚙️ Settings' :
              tab === 'jobs' ? '📋 Jobs' : '🔑 API Keys'}
          </button>
        ))}
      </nav>

      <main style={styles.main}>
        {activeTab === 'overview' && (
          <div>
            <div style={styles.grid3}>
              <StatCard label="Total Videos" value={stats.totalVideos || 0} icon="🎬" />
              <StatCard label="Today's Videos" value={`${stats.todayVideos || 0} / ${config.videosPerDay}`} icon="📅" />
              <StatCard label="Success Rate" value={`${stats.successRate || 0}%`} icon="✅" />
            </div>

            <div style={styles.card}>
              <h2 style={styles.cardTitle}>🚀 Manual Generation</h2>
              <p style={{ color: '#9ca3af', marginBottom: '20px' }}>
                Trigger a video generation right now. The automation also runs on its own schedule.
              </p>
              <div style={styles.buttonRow}>
                <button
                  onClick={triggerGeneration}
                  disabled={generating}
                  style={{ ...styles.btnPrimary, opacity: generating ? 0.7 : 1 }}
                >
                  {generating ? '⏳ Generating...' : '🎬 Generate Video Now'}
                </button>
              </div>
              {stats.lastVideoUrl && (
                <div style={{ marginTop: '16px', padding: '12px', background: '#1f2937', borderRadius: '8px' }}>
                  <p style={{ color: '#9ca3af', fontSize: '14px', margin: '0 0 4px' }}>Last upload:</p>
                  <a href={stats.lastVideoUrl} target="_blank" rel="noreferrer" style={{ color: '#60a5fa' }}>
                    {stats.lastVideoUrl}
                  </a>
                </div>
              )}
            </div>

            <div style={styles.card}>
              <h2 style={styles.cardTitle}>📅 Upload Schedule (Vercel Cron)</h2>
              <p style={{ color: '#9ca3af', marginBottom: '16px' }}>
                These times are configured in <code style={{ color: '#f59e0b' }}>vercel.json</code> and run automatically:
              </p>
              <div style={styles.scheduleGrid}>
                {['9:00 AM UTC', '11:00 AM UTC', '2:00 PM UTC', '7:00 PM UTC ⭐', '10:00 PM UTC'].map((time, i) => (
                  <div key={i} style={styles.scheduleItem}>
                    <span style={{ color: '#10b981', fontWeight: 'bold' }}>📤</span>
                    <span style={{ color: '#e5e7eb' }}>{time}</span>
                  </div>
                ))}
              </div>
              <p style={{ color: '#6b7280', fontSize: '13px', marginTop: '12px' }}>
                ⭐ 7 PM UTC = 2 PM EST — peak YouTube engagement time based on research
              </p>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div style={styles.card}>
            <h2 style={styles.cardTitle}>⚙️ Automation Settings</h2>

            <div style={styles.formGroup}>
              <label style={styles.label}>Videos Per Day: <strong style={{ color: '#f59e0b' }}>{config.videosPerDay}</strong></label>
              <input
                type="range"
                min="1"
                max="10"
                value={config.videosPerDay}
                onChange={e => setConfig(prev => ({ ...prev, videosPerDay: parseInt(e.target.value) }))}
                style={styles.range}
              />
              <div style={styles.rangeLabels}><span>1</span><span>5</span><span>10</span></div>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Preferred Upload Time (UTC)</label>
              <select
                value={config.preferredTime}
                onChange={e => setConfig(prev => ({ ...prev, preferredTime: e.target.value }))}
                style={styles.select}
              >
                {OPTIMAL_TIMES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
              <p style={styles.hint}>Vercel cron runs 5 times/day — adjust vercel.json for exact control</p>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Content Types</label>
              <div style={styles.checkboxGroup}>
                {['storytelling', 'dance', 'top5'].map(type => (
                  <label key={type} style={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={config.contentTypes?.includes(type)}
                      onChange={() => toggleContentType(type)}
                      style={{ marginRight: '8px' }}
                    />
                    {type === 'storytelling' ? '📖 Storytelling' : type === 'dance' ? '💃 Dance' : '🏆 Top 5'}
                  </label>
                ))}
              </div>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Voice</label>
              <select
                value={config.voiceId}
                onChange={e => setConfig(prev => ({ ...prev, voiceId: e.target.value }))}
                style={styles.select}
              >
                <option value="Rachel">Rachel (Female, Warm)</option>
                <option value="Domi">Domi (Female, Energetic)</option>
                <option value="Bella">Bella (Female, Soft)</option>
                <option value="Antoni">Antoni (Male, Deep)</option>
                <option value="Elli">Elli (Female, Young)</option>
              </select>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={config.uploadEnabled}
                  onChange={e => setConfig(prev => ({ ...prev, uploadEnabled: e.target.checked }))}
                  style={{ marginRight: '8px' }}
                />
                Auto-upload to YouTube (uncheck to generate only, no upload)
              </label>
            </div>

            <button onClick={saveConfig} disabled={loading} style={styles.btnPrimary}>
              {loading ? '⏳ Saving...' : '💾 Save Settings'}
            </button>
          </div>
        )}

        {activeTab === 'jobs' && (
          <div style={styles.card}>
            <h2 style={styles.cardTitle}>📋 Generation Jobs</h2>
            {jobs.length === 0 ? (
              <p style={{ color: '#6b7280', textAlign: 'center', padding: '40px' }}>
                No jobs yet. Generate your first video!
              </p>
            ) : (
              <div style={styles.jobsList}>
                {jobs.map(job => (
                  <div key={job.id} style={styles.jobItem}>
                    <div style={styles.jobHeader}>
                      <StatusBadge status={job.status} />
                      <span style={{ color: '#9ca3af', fontSize: '13px' }}>
                        {new Date(job.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p style={{ color: '#e5e7eb', margin: '8px 0 4px', fontWeight: '500' }}>
                      {job.title || `${job.type} - ${job.character}`}
                    </p>
                    <p style={{ color: '#6b7280', fontSize: '13px', margin: '0' }}>
                      Type: {job.type} | Character: {job.character}
                    </p>
                    {job.youtubeUrl && (
                      <a href={job.youtubeUrl} target="_blank" rel="noreferrer" style={{ color: '#60a5fa', fontSize: '13px', display: 'block', marginTop: '6px' }}>
                        ▶ Watch on YouTube
                      </a>
                    )}
                    {job.error && (
                      <p style={{ color: '#f87171', fontSize: '13px', marginTop: '6px' }}>
                        Error: {job.error}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'api-keys' && (
          <div>
            <div style={styles.card}>
              <h2 style={styles.cardTitle}>🔑 Required API Keys (All Free)</h2>
              <p style={{ color: '#9ca3af', marginBottom: '20px' }}>
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
                <div key={key.name} style={styles.apiKeyItem}>
                  <div style={{ ...styles.apiKeyDot, background: key.color }} />
                  <div style={{ flex: 1 }}>
                    <p style={{ color: '#e5e7eb', fontWeight: '600', margin: '0 0 2px' }}>{key.label}</p>
                    <code style={{ color: '#f59e0b', fontSize: '12px' }}>{key.name}</code>
                    <p style={{ color: '#6b7280', fontSize: '13px', margin: '2px 0 0' }}>{key.desc}</p>
                  </div>
                  {key.url && (
                    <a href={key.url} target="_blank" rel="noreferrer" style={styles.btnSmall}>
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
    <div style={styles.statCard}>
      <span style={{ fontSize: '32px' }}>{icon}</span>
      <div>
        <p style={{ color: '#9ca3af', fontSize: '14px', margin: '0' }}>{label}</p>
        <p style={{ color: '#e5e7eb', fontSize: '28px', fontWeight: 'bold', margin: '4px 0 0' }}>{value}</p>
      </div>
    </div>
  );
}

function StatBadge({ label, value, color }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <p style={{ color: '#6b7280', fontSize: '11px', margin: '0' }}>{label}</p>
      <p style={{ color: color || '#e5e7eb', fontSize: '14px', fontWeight: 'bold', margin: '0' }}>{value}</p>
    </div>
  );
}

function StatusBadge({ status }) {
  const colors = {
    completed: { bg: '#065f46', color: '#34d399' },
    processing: { bg: '#1e3a5f', color: '#60a5fa' },
    pending: { bg: '#374151', color: '#9ca3af' },
    failed: { bg: '#7f1d1d', color: '#f87171' },
  };
  const c = colors[status] || colors.pending;
  return (
    <span style={{ background: c.bg, color: c.color, padding: '2px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '600' }}>
      {status}
    </span>
  );
}

const styles = {
  container: { minHeight: '100vh', background: '#0f1117', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' },
  header: { background: '#1a1d27', borderBottom: '1px solid #2d2f3e', padding: '16px 24px' },
  headerContent: { maxWidth: '1100px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' },
  logo: { display: 'flex', alignItems: 'center', gap: '12px' },
  logoIcon: { fontSize: '36px' },
  headerTitle: { color: '#e5e7eb', margin: '0', fontSize: '22px', fontWeight: '800' },
  headerSub: { color: '#6b7280', margin: '2px 0 0', fontSize: '13px' },
  headerStats: { display: 'flex', gap: '24px', alignItems: 'center' },
  message: { maxWidth: '1100px', margin: '16px auto 0', padding: '12px 20px', borderRadius: '8px', color: '#e5e7eb', fontWeight: '500' },
  nav: { maxWidth: '1100px', margin: '24px auto 0', padding: '0 24px', display: 'flex', gap: '4px', borderBottom: '1px solid #2d2f3e' },
  navBtn: { background: 'none', border: 'none', color: '#6b7280', padding: '10px 18px', cursor: 'pointer', fontSize: '14px', fontWeight: '500', borderBottom: '2px solid transparent', transition: 'all 0.2s' },
  navBtnActive: { color: '#60a5fa', borderBottomColor: '#3b82f6' },
  main: { maxWidth: '1100px', margin: '24px auto', padding: '0 24px 40px' },
  grid3: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '20px' },
  card: { background: '#1a1d27', border: '1px solid #2d2f3e', borderRadius: '12px', padding: '24px', marginBottom: '20px' },
  cardTitle: { color: '#e5e7eb', fontSize: '18px', fontWeight: '700', margin: '0 0 16px' },
  statCard: { background: '#1a1d27', border: '1px solid #2d2f3e', borderRadius: '12px', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' },
  formGroup: { marginBottom: '20px' },
  label: { display: 'block', color: '#d1d5db', fontSize: '14px', fontWeight: '600', marginBottom: '8px' },
  range: { width: '100%', accentColor: '#3b82f6' },
  rangeLabels: { display: 'flex', justifyContent: 'space-between', color: '#6b7280', fontSize: '12px', marginTop: '4px' },
  select: { width: '100%', background: '#0f1117', border: '1px solid #374151', color: '#e5e7eb', padding: '10px 12px', borderRadius: '8px', fontSize: '14px' },
  hint: { color: '#6b7280', fontSize: '12px', marginTop: '6px' },
  checkboxGroup: { display: 'flex', gap: '20px', flexWrap: 'wrap' },
  checkboxLabel: { color: '#d1d5db', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center' },
  btnPrimary: { background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', color: '#fff', border: 'none', padding: '12px 28px', borderRadius: '8px', fontSize: '15px', fontWeight: '700', cursor: 'pointer' },
  btnSmall: { background: '#1f2937', color: '#60a5fa', border: '1px solid #374151', padding: '6px 14px', borderRadius: '6px', fontSize: '13px', textDecoration: 'none', whiteSpace: 'nowrap' },
  buttonRow: { display: 'flex', gap: '12px', flexWrap: 'wrap' },
  jobsList: { display: 'flex', flexDirection: 'column', gap: '12px' },
  jobItem: { background: '#0f1117', border: '1px solid #2d2f3e', borderRadius: '8px', padding: '16px' },
  jobHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' },
  scheduleGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' },
  scheduleItem: { background: '#0f1117', border: '1px solid #2d2f3e', borderRadius: '8px', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '10px' },
  apiKeyItem: { display: 'flex', alignItems: 'flex-start', gap: '14px', padding: '14px 0', borderBottom: '1px solid #1f2937' },
  apiKeyDot: { width: '10px', height: '10px', borderRadius: '50%', marginTop: '6px', flexShrink: 0 },
};