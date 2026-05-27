import React, { useState, useEffect } from 'react';

// ── Resource type config ─────────────────────────────────────────────────────
const RESOURCE_TYPES = [
  {
    key: 'hospitals',
    label: 'Hospitals',
    icon: '✚',
    color: '#3fb950',
    accent: 'rgba(63,185,80,',
    dot: 'dot-green',
  },
  {
    key: 'police',
    label: 'Police Stations',
    icon: '🔵',
    color: '#58a6ff',
    accent: 'rgba(88,166,255,',
    dot: 'dot-blue',
  },
  {
    key: 'ambulances',
    label: 'Ambulance Hubs',
    icon: '🚑',
    color: '#f97316',
    accent: 'rgba(249,115,22,',
    dot: 'dot-amber',
  },
  {
    key: 'repair_shops',
    label: 'Repair Shops',
    icon: '🔧',
    color: '#d29922',
    accent: 'rgba(210,153,34,',
    dot: 'dot-amber',
  },
  {
    key: 'tow_services',
    label: 'Tow Services',
    icon: '🚛',
    color: '#8b5cf6',
    accent: 'rgba(139,92,246,',
    dot: 'dot-blue',
  },
];

const STATUS_OPTIONS = ['available', 'busy', 'offline'];

const EMPTY_ENTRY = { id: '', name: '', latitude: '', longitude: '', status: 'available' };

// ── Persists resources to localStorage (mirrors resources.json schema) ────────
const LS_KEY = 'roadsos_resources';

function loadResources() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return JSON.parse(raw);
  } catch { }
  return { hospitals: [], police: [], ambulances: [], repair_shops: [], tow_services: [] };
}

// ── Inline input component ────────────────────────────────────────────────────
function Field({ id, label, type = 'text', value, onChange, placeholder, required }) {
  return (
    <div className="flex flex-col gap-1">
      <label
        htmlFor={id}
        style={{ fontSize: '9px', color: '#8b949e', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600 }}
      >
        {label}
      </label>
      <input
        id={id}
        type={type}
        step={type === 'number' ? 'any' : undefined}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid #30363d',
          borderRadius: '3px',
          color: '#e6edf3',
          fontSize: '11px',
          padding: '6px 8px',
          outline: 'none',
          fontFamily: "'JetBrains Mono', monospace",
          width: '100%',
          transition: 'border-color 0.15s',
        }}
        onFocus={(e) => { e.target.style.borderColor = '#58a6ff'; }}
        onBlur={(e) => { e.target.style.borderColor = '#30363d'; }}
      />
    </div>
  );
}

// ── Resource form panel ───────────────────────────────────────────────────────
function ResourceForm({ type, resources, onSave }) {
  const [form, setForm] = useState({ ...EMPTY_ENTRY });
  const [editIdx, setEditIdx] = useState(null);
  const [feedback, setFeedback] = useState(null);

  const flash = (msg, ok = true) => {
    setFeedback({ msg, ok });
    setTimeout(() => setFeedback(null), 2800);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const lat = parseFloat(form.latitude);
    const lng = parseFloat(form.longitude);
    if (!form.id.trim() || !form.name.trim() || isNaN(lat) || isNaN(lng)) {
      flash('Fill all fields with valid coordinates', false);
      return;
    }

    const buildEntry = () => {
      if (type.key === "hospitals") {
        return {
          hospital_id: form.id.trim(),
          available_beds: Number(form.latitude),
          icu_readiness: Number(form.longitude),
          trauma_score: Number(form.name)
        };
      }

      if (type.key === "police") {
        return {
          unit_id: form.id.trim(),
          eta: Number(form.latitude),
          clearance_capacity: Number(form.longitude),
          status: form.status
        };
      }

      if (type.key === "ambulances") {
        return {
          ambulance_id: form.id.trim(),
          eta: Number(form.latitude),
          equipment_score: Number(form.longitude),
          status: form.status,
          location: form.name.trim()
        };
      }

      return {
        id: form.id.trim(),
        name: form.name.trim(),
        latitude: lat,
        longitude: lng,
        status: form.status
      };
    };

    const entry = buildEntry();

    const updated = [...resources];
    if (editIdx !== null) {
      updated[editIdx] = entry;
      flash(`Updated successfully`);
      setEditIdx(null);
    } else {
      if (updated.find(
        r =>
          r.id === entry.id ||
          r.hospital_id === entry.hospital_id ||
          r.unit_id === entry.unit_id ||
          r.ambulance_id === entry.ambulance_id
      )) {
        flash(`ID "${entry.id}" already exists`, false);
        return;
      }
      updated.push(entry);
      flash(`Added successfully`);
    }
    onSave(updated);
    setForm({ ...EMPTY_ENTRY });
  };

  const handleEdit = (idx) => {
    const r = resources[idx];

    if (type.key === "hospitals") {
      setForm({
        id: r.hospital_id,
        name: String(r.trauma_score),
        latitude: String(r.available_beds),
        longitude: String(r.icu_readiness),
        status: "available"
      });
    } else if (type.key === "police") {
      setForm({
        id: r.unit_id,
        name: "",
        latitude: String(r.eta),
        longitude: String(r.clearance_capacity),
        status: r.status
      });
    } else if (type.key === "ambulances") {
      setForm({
        id: r.ambulance_id,
        name: r.location,
        latitude: String(r.eta),
        longitude: String(r.equipment_score),
        status: r.status
      });
    } else {
      setForm({
        id: r.id,
        name: r.name,
        latitude: String(r.latitude),
        longitude: String(r.longitude),
        status: r.status
      });
    }

    setEditIdx(idx);
  };

  const handleDelete = (idx) => {
    const updated = resources.filter((_, i) => i !== idx);
    onSave(updated);
    if (editIdx === idx) { setForm({ ...EMPTY_ENTRY }); setEditIdx(null); }
    flash('Entry removed');
  };

  const handleCancel = () => { setForm({ ...EMPTY_ENTRY }); setEditIdx(null); };

  const t = type;
  const isEditing = editIdx !== null;

  return (
    <div
      style={{
        background: '#161b22',
        border: `1px solid ${t.color}30`,
        borderRadius: '4px',
        overflow: 'hidden',
      }}
    >
      {/* Panel header */}
      <div
        style={{
          background: `${t.accent}0.08)`,
          borderBottom: `1px solid ${t.color}25`,
          padding: '10px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        <span style={{ fontSize: '14px' }}>{t.icon}</span>
        <span style={{ fontSize: '11px', fontWeight: 700, color: t.color, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          {t.label}
        </span>
        <span
          style={{
            marginLeft: 'auto',
            fontSize: '9px',
            fontFamily: 'monospace',
            background: `${t.accent}0.12)`,
            color: t.color,
            border: `1px solid ${t.color}40`,
            borderRadius: '2px',
            padding: '2px 6px',
          }}
        >
          {resources.length} RECORDS
        </span>
      </div>

      <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <Field
              id={`${t.key}-id`}
              label="ID"
              value={form.id}
              onChange={(v) => setForm(p => ({ ...p, id: v }))}
              placeholder="e.g. HOSP_001"
              required
            />
            <Field
              id={`${t.key}-name`}
              label="Name"
              value={form.name}
              onChange={(v) => setForm(p => ({ ...p, name: v }))}
              placeholder="e.g. Fortis Mulund"
              required
            />
            <Field
              id={`${t.key}-lat`}
              label="Latitude"
              type="number"
              value={form.latitude}
              onChange={(v) => setForm(p => ({ ...p, latitude: v }))}
              placeholder="e.g. 19.1748"
              required
            />
            <Field
              id={`${t.key}-lng`}
              label="Longitude"
              type="number"
              value={form.longitude}
              onChange={(v) => setForm(p => ({ ...p, longitude: v }))}
              placeholder="e.g. 73.0243"
              required
            />
          </div>

          {/* Status select */}
          <div className="flex flex-col gap-1">
            <label
              htmlFor={`${t.key}-status`}
              style={{ fontSize: '9px', color: '#8b949e', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600 }}
            >
              Status
            </label>
            <select
              id={`${t.key}-status`}
              value={form.status}
              onChange={(e) => setForm(p => ({ ...p, status: e.target.value }))}
              style={{
                background: '#0d1117',
                border: '1px solid #30363d',
                borderRadius: '3px',
                color: '#e6edf3',
                fontSize: '11px',
                padding: '6px 8px',
                outline: 'none',
                fontFamily: "'JetBrains Mono', monospace",
                cursor: 'pointer',
              }}
            >
              {STATUS_OPTIONS.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Buttons + feedback */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              id={`${t.key}-save`}
              type="submit"
              style={{
                fontSize: '10px',
                fontWeight: 700,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                padding: '6px 16px',
                borderRadius: '3px',
                border: `1px solid ${t.color}60`,
                background: `${t.accent}0.12)`,
                color: t.color,
                cursor: 'pointer',
                transition: 'background 0.15s, border-color 0.15s',
                fontFamily: 'monospace',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = `${t.accent}0.25)`;
                e.currentTarget.style.borderColor = `${t.color}90`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = `${t.accent}0.12)`;
                e.currentTarget.style.borderColor = `${t.color}60`;
              }}
            >
              {isEditing ? '↻ Update' : '+ Save'}
            </button>

            {isEditing && (
              <button
                type="button"
                onClick={handleCancel}
                style={{
                  fontSize: '10px',
                  fontWeight: 600,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  padding: '6px 12px',
                  borderRadius: '3px',
                  border: '1px solid #30363d',
                  background: 'transparent',
                  color: '#8b949e',
                  cursor: 'pointer',
                  fontFamily: 'monospace',
                }}
              >
                Cancel
              </button>
            )}

            {feedback && (
              <span
                style={{
                  fontSize: '10px',
                  fontFamily: 'monospace',
                  color: feedback.ok ? '#3fb950' : '#ef4444',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                {feedback.ok ? '✓' : '✗'} {feedback.msg}
              </span>
            )}
          </div>
        </form>

        {/* Records table */}
        {resources.length > 0 && (
          <div style={{ borderTop: '1px solid #21262d', paddingTop: '12px' }}>
            <div
              style={{ fontSize: '9px', color: '#484f58', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}
            >
              Saved Records
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '180px', overflowY: 'auto' }}>
              {resources.map((r, idx) => {
                const displayName =
                  r.name || r.location || r.hospital_id || r.unit_id || r.ambulance_id;

                const displayId =
                  r.id || r.hospital_id || r.unit_id || r.ambulance_id;

                const displayMeta =
                  r.latitude || r.available_beds || r.eta;

                return (
                  <div
                    key={displayId}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '6px 8px',
                      background: editIdx === idx ? `${t.accent}0.08)` : '#0d1117',
                      border: `1px solid ${editIdx === idx ? t.color + '40' : '#21262d'}`,
                      borderRadius: '3px',
                      transition: 'background 0.15s',
                    }}
                  >
                    <span
                      style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        flexShrink: 0,
                        background:
                          r.status === 'available'
                            ? '#3fb950'
                            : r.status === 'busy'
                              ? '#f97316'
                              : '#484f58',
                      }}
                    />

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: '11px',
                          color: '#e6edf3',
                          fontWeight: 600,
                          fontFamily: 'monospace',
                        }}
                      >
                        {displayName}
                      </div>

                      <div
                        style={{
                          fontSize: '9px',
                          color: '#484f58',
                          fontFamily: 'monospace',
                        }}
                      >
                        {displayId} · {displayMeta} · {r.status}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                      <button
                        onClick={() => handleEdit(idx)}
                        style={{
                          fontSize: '9px',
                          padding: '3px 7px',
                          borderRadius: '2px',
                          border: '1px solid #30363d',
                          background: 'transparent',
                          color: '#8b949e',
                          cursor: 'pointer',
                          fontFamily: 'monospace',
                        }}
                      >
                        Edit
                      </button>

                      <button
                        onClick={() => handleDelete(idx)}
                        style={{
                          fontSize: '9px',
                          padding: '3px 7px',
                          borderRadius: '2px',
                          border: '1px solid #30363d',
                          background: 'transparent',
                          color: '#ef4444',
                          cursor: 'pointer',
                          fontFamily: 'monospace',
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── JSON export panel ─────────────────────────────────────────────────────────
function ExportPanel({ resources }) {
  const [copied, setCopied] = useState(false);
  const json = JSON.stringify(resources, null, 2);

  const handleCopy = () => {
    navigator.clipboard.writeText(json).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const totalCount = Object.values(resources).reduce((s, arr) => s + arr.length, 0);

  return (
    <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: '4px', overflow: 'hidden' }}>
      <div style={{ padding: '10px 14px', borderBottom: '1px solid #21262d', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#484f58" strokeWidth="2">
          <polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" />
        </svg>
        <span style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.12em', color: '#8b949e', fontWeight: 600 }}>
          resources.json Preview
        </span>
        <span style={{ marginLeft: 'auto', fontSize: '9px', fontFamily: 'monospace', color: '#484f58' }}>
          {totalCount} total records
        </span>
        <button
          id="export-copy-btn"
          onClick={handleCopy}
          style={{
            fontSize: '9px',
            padding: '3px 8px',
            borderRadius: '2px',
            border: '1px solid #30363d',
            background: copied ? 'rgba(63,185,80,0.12)' : 'transparent',
            color: copied ? '#3fb950' : '#8b949e',
            cursor: 'pointer',
            fontFamily: 'monospace',
            transition: 'all 0.15s',
          }}
        >
          {copied ? '✓ Copied' : 'Copy JSON'}
        </button>
      </div>
      <pre
        style={{
          margin: 0,
          padding: '12px 14px',
          fontSize: '10px',
          fontFamily: "'JetBrains Mono', monospace",
          color: '#8b949e',
          background: '#0d1117',
          overflowX: 'auto',
          maxHeight: '260px',
          overflowY: 'auto',
          lineHeight: 1.6,
        }}
      >
        {json}
      </pre>
    </div>
  );
}

// ── Main ResourceAdmin view ───────────────────────────────────────────────────
export default function ResourceAdmin() {
  const [resources, setResources] = useState(loadResources);
  const [activeTab, setActiveTab] = useState('hospitals');

  // Persist to localStorage whenever resources change
  useEffect(() => {
    const fetchResources = async () => {
      try {
        const res = await fetch("http://127.0.0.1:8000/api/v1/resources");
        const data = await res.json();
        setResources(data);
        localStorage.setItem("roadsos_resources", JSON.stringify(data));
      } catch (error) {
        console.error("Failed to load resources:", error);
      }
    };

    fetchResources();
  }, []);

  const handleSave = (key, updated) => {
    const newResources = {
      ...resources,
      [key]: updated
    };

    console.log("Saving:", newResources);

    setResources(newResources);
    localStorage.setItem("roadsos_resources", JSON.stringify(newResources));

    fetch("http://127.0.0.1:8000/api/v1/save-resources", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(newResources)
    })
      .then(res => res.json())
      .then(data => console.log("Backend response:", data))
      .catch(err => console.error("Save failed:", err));
  };

  const activeType = RESOURCE_TYPES.find(t => t.key === activeTab);
  const totalRecords = Object.values(resources).reduce((s, a) => s + a.length, 0);

  return (
    <div
      className="h-full overflow-y-auto"
      style={{ background: '#0d1117', padding: '0' }}
    >
      {/* Sticky header */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 10,
          background: '#0d1117',
          borderBottom: '1px solid #21262d',
          padding: '12px 24px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}
      >
        <div>
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#e6edf3', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            Resource Manager
          </div>
          <div style={{ fontSize: '9px', color: '#484f58', fontFamily: 'monospace', marginTop: '2px' }}>
            Define locations → saved to resources.json schema
          </div>
        </div>
        <div
          style={{
            marginLeft: 'auto',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: 'rgba(63,185,80,0.08)',
            border: '1px solid rgba(63,185,80,0.25)',
            borderRadius: '3px',
            padding: '4px 10px',
          }}
        >
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#3fb950', display: 'inline-block' }} />
          <span style={{ fontSize: '10px', fontFamily: 'monospace', color: '#3fb950', fontWeight: 600 }}>
            {totalRecords} RESOURCES DEFINED
          </span>
        </div>
      </div>

      <div style={{ padding: '20px 24px', display: 'flex', gap: '20px' }}>
        {/* Left: tab nav + form */}
        <div style={{ flex: '0 0 420px', minWidth: 0 }}>
          {/* Tab bar */}
          <div
            style={{
              display: 'flex',
              gap: '4px',
              marginBottom: '14px',
              background: '#161b22',
              border: '1px solid #21262d',
              borderRadius: '4px',
              padding: '4px',
              flexWrap: 'wrap',
            }}
          >
            {RESOURCE_TYPES.map(t => (
              <button
                key={t.key}
                id={`tab-${t.key}`}
                onClick={() => setActiveTab(t.key)}
                style={{
                  fontSize: '9px',
                  fontWeight: 700,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  padding: '5px 10px',
                  borderRadius: '3px',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  fontFamily: 'monospace',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  background: activeTab === t.key ? `${t.accent}0.15)` : 'transparent',
                  color: activeTab === t.key ? t.color : '#484f58',
                  boxShadow: activeTab === t.key ? `inset 0 0 0 1px ${t.color}40` : 'none',
                }}
              >
                <span style={{ fontSize: '11px' }}>{t.icon}</span>
                {t.label}
                <span
                  style={{
                    background: `${t.accent}0.2)`,
                    color: t.color,
                    borderRadius: '2px',
                    padding: '0 4px',
                    fontSize: '8px',
                    minWidth: '14px',
                    textAlign: 'center',
                  }}
                >
                  {resources[t.key]?.length ?? 0}
                </span>
              </button>
            ))}
          </div>

          {/* Active form */}
          {activeType && (
            <ResourceForm
              type={activeType}
              resources={resources[activeType.key] ?? []}
              onSave={(updated) => handleSave(activeType.key, updated)}
            />
          )}
        </div>

        {/* Right: JSON export preview */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <ExportPanel resources={resources} />

          {/* Quick summary grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px' }}>
            {RESOURCE_TYPES.map(t => {
              const count = resources[t.key]?.length ?? 0;
              const available = resources[t.key]?.filter(r => r.status === 'available').length ?? 0;
              return (
                <div
                  key={t.key}
                  onClick={() => setActiveTab(t.key)}
                  style={{
                    background: activeTab === t.key ? `${t.accent}0.08)` : '#161b22',
                    border: `1px solid ${activeTab === t.key ? t.color + '40' : '#21262d'}`,
                    borderRadius: '4px',
                    padding: '10px 12px',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  <div style={{ fontSize: '18px', marginBottom: '6px' }}>{t.icon}</div>
                  <div style={{ fontSize: '20px', fontWeight: 700, color: t.color, fontFamily: 'monospace', lineHeight: 1 }}>
                    {count}
                  </div>
                  <div style={{ fontSize: '8px', color: '#484f58', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: '3px' }}>
                    {t.label}
                  </div>
                  <div style={{ fontSize: '8px', color: '#3fb950', fontFamily: 'monospace', marginTop: '2px' }}>
                    {available} avail
                  </div>
                </div>
              );
            })}
          </div>

          {/* Instructions card */}
          <div
            style={{
              background: 'rgba(88,166,255,0.04)',
              border: '1px solid rgba(88,166,255,0.2)',
              borderRadius: '4px',
              padding: '12px 14px',
            }}
          >
            <div style={{ fontSize: '9px', color: '#58a6ff', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700, marginBottom: '8px' }}>
              ℹ How It Works
            </div>
            <ul style={{ fontSize: '10px', color: '#8b949e', fontFamily: 'monospace', lineHeight: 1.8, margin: 0, paddingLeft: '14px' }}>
              <li>Fill the form and click <strong style={{ color: '#e6edf3' }}>+ Save</strong> to add a resource entry</li>
              <li>All entries persist in <code style={{ color: '#58a6ff' }}>localStorage</code> matching the <code style={{ color: '#58a6ff' }}>resources.json</code> schema</li>
              <li>Click <strong style={{ color: '#e6edf3' }}>Copy JSON</strong> to export and paste into <code style={{ color: '#58a6ff' }}>frontend/src/data/resources.json</code></li>
              <li>The User Portal reads from <code style={{ color: '#58a6ff' }}>GET /api/v1/resources</code> and displays live map markers</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
