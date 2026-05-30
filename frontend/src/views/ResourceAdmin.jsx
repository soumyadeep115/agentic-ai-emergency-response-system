import React, { useState, useEffect } from 'react';
import LocationPicker from '../components/LocationPicker';

const BASE = import.meta.env.VITE_API_BASE || "http://127.0.0.1:8000";

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

// ── Empty entry shapes per resource type ─────────────────────────────────────
const EMPTY_ENTRIES = {
  hospitals: {
    id: '', name: '', latitude: '', longitude: '',
    available_beds: '', icu_readiness: '', trauma_score: '',
  },
  police: {
    id: '', name: '', latitude: '', longitude: '',
    eta: '', clearance_capacity: '', status: 'available',
  },
  ambulances: {
    id: '', name: '', latitude: '', longitude: '',
    eta: '', equipment_score: '', status: 'available',
  },
  repair_shops: {
    id: '', name: '', latitude: '', longitude: '', status: 'available',
  },
  tow_services: {
    id: '', name: '', latitude: '', longitude: '', status: 'available',
  },
};

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

// ── Per-type form fields renderer ─────────────────────────────────────────────
function TypeFields({ typeKey, form, setForm, locationMethod }) {
  const f = (field) => (v) => setForm(p => ({ ...p, [field]: v }));

  if (typeKey === 'hospitals') {
    return (
      <>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          <Field id="h-id" label="ID" value={form.id} onChange={f('id')} placeholder="e.g. HOSP_001" required />
          <Field id="h-name" label="Name" value={form.name} onChange={f('name')} placeholder="e.g. Fortis Mulund" required />
          {locationMethod === "manual" && (
            <>
              <Field
                id="h-lat"
                label="Latitude"
                value={form.latitude}
                onChange={f('latitude')}
                placeholder="e.g. 19.1748"
                type="number"
                required
              />
              <Field
                id="h-lng"
                label="Longitude"
                value={form.longitude}
                onChange={f('longitude')}
                placeholder="e.g. 73.0243"
                type="number"
                required
              />
            </>
          )}
          <Field id="h-beds" label="Available Beds" value={form.available_beds} onChange={f('available_beds')} placeholder="e.g. 80" type="number" required />
          <Field id="h-icu" label="ICU Readiness" value={form.icu_readiness} onChange={f('icu_readiness')} placeholder="e.g. 90" type="number" required />
        </div>
        <Field id="h-trauma" label="Trauma Score" value={form.trauma_score} onChange={f('trauma_score')} placeholder="e.g. 85" type="number" required />
      </>
    );
  }

  if (typeKey === 'police') {
    return (
      <>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          <Field id="p-id" label="ID" value={form.id} onChange={f('id')} placeholder="e.g. POL_001" required />
          <Field id="p-name" label="Name" value={form.name} onChange={f('name')} placeholder="e.g. Mumbai Police HQ" required />
          {locationMethod === "manual" && (
            <>
              <Field
                id="p-lat"
                label="Latitude"
                value={form.latitude}
                onChange={f('latitude')}
                placeholder="e.g. 19.0760"
                type="number"
                required
              />
              <Field
                id="p-lng"
                label="Longitude"
                value={form.longitude}
                onChange={f('longitude')}
                placeholder="e.g. 72.8777"
                type="number"
                required
              />
            </>
          )}
          <Field id="p-eta" label="ETA (min)" value={form.eta} onChange={f('eta')} placeholder="e.g. 5" type="number" required />
          <Field id="p-cap" label="Clearance Capacity" value={form.clearance_capacity} onChange={f('clearance_capacity')} placeholder="e.g. 95" type="number" required />
        </div>
        <div className="flex flex-col gap-1">
          <label style={{ fontSize: '9px', color: '#8b949e', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600 }}>
            Status
          </label>
          <select
            value={form.status}
            onChange={(e) => setForm(p => ({ ...p, status: e.target.value }))}
            style={{
              background: '#0d1117', border: '1px solid #30363d', borderRadius: '3px',
              color: '#e6edf3', fontSize: '11px', padding: '6px 8px', outline: 'none',
              fontFamily: "'JetBrains Mono', monospace", cursor: 'pointer',
            }}
          >
            {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </>
    );
  }

  if (typeKey === 'ambulances') {
    return (
      <>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          <Field id="a-id" label="ID" value={form.id} onChange={f('id')} placeholder="e.g. AMB_001" required />
          <Field id="a-name" label="Hub Name" value={form.name} onChange={f('name')} placeholder="e.g. Central Ambulance" required />
          {locationMethod === "manual" && (
            <>
              <Field
                id="a-lat"
                label="Latitude"
                value={form.latitude}
                onChange={f('latitude')}
                placeholder="e.g. 19.0760"
                type="number"
                required
              />
              <Field
                id="a-lng"
                label="Longitude"
                value={form.longitude}
                onChange={f('longitude')}
                placeholder="e.g. 72.8777"
                type="number"
                required
              />
            </>
          )}
          <Field id="a-eta" label="ETA (min)" value={form.eta} onChange={f('eta')} placeholder="e.g. 4" type="number" required />
          <Field id="a-equip" label="Equipment Score" value={form.equipment_score} onChange={f('equipment_score')} placeholder="e.g. 90" type="number" required />
        </div>
        <div className="flex flex-col gap-1">
          <label style={{ fontSize: '9px', color: '#8b949e', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600 }}>
            Status
          </label>
          <select
            value={form.status}
            onChange={(e) => setForm(p => ({ ...p, status: e.target.value }))}
            style={{
              background: '#0d1117', border: '1px solid #30363d', borderRadius: '3px',
              color: '#e6edf3', fontSize: '11px', padding: '6px 8px', outline: 'none',
              fontFamily: "'JetBrains Mono', monospace", cursor: 'pointer',
            }}
          >
            {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </>
    );
  }

  // repair_shops + tow_services — unchanged layout
  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
        <Field id={`${typeKey}-id`} label="ID" value={form.id} onChange={f('id')} placeholder="e.g. RS_001" required />
        <Field id={`${typeKey}-name`} label="Name" value={form.name} onChange={f('name')} placeholder="e.g. Quick Auto" required />
        {locationMethod === "manual" && (
          <>
            <Field
              id={`${typeKey}-lat`}
              label="Latitude"
              value={form.latitude}
              onChange={f('latitude')}
              placeholder="e.g. 19.1748"
              type="number"
              required
            />
            <Field
              id={`${typeKey}-lng`}
              label="Longitude"
              value={form.longitude}
              onChange={f('longitude')}
              placeholder="e.g. 73.0243"
              type="number"
              required
            />
          </>
        )}
      </div>
      <div className="flex flex-col gap-1">
        <label style={{ fontSize: '9px', color: '#8b949e', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600 }}>
          Status
        </label>
        <select
          value={form.status}
          onChange={(e) => setForm(p => ({ ...p, status: e.target.value }))}
          style={{
            background: '#0d1117', border: '1px solid #30363d', borderRadius: '3px',
            color: '#e6edf3', fontSize: '11px', padding: '6px 8px', outline: 'none',
            fontFamily: "'JetBrains Mono', monospace", cursor: 'pointer',
          }}
        >
          {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
    </>
  );
}

// ── Build JSON entry per type ─────────────────────────────────────────────────
function buildEntry(typeKey, form) {
  const lat = parseFloat(form.latitude);
  const lng = parseFloat(form.longitude);

  if (typeKey === 'hospitals') {
    return {
      id: form.id.trim(),
      name: form.name.trim(),
      latitude: lat,
      longitude: lng,
      available_beds: Number(form.available_beds),
      icu_readiness: Number(form.icu_readiness),
      trauma_score: Number(form.trauma_score),
    };
  }

  if (typeKey === 'police') {
    return {
      id: form.id.trim(),
      name: form.name.trim(),
      latitude: lat,
      longitude: lng,
      eta: Number(form.eta),
      clearance_capacity: Number(form.clearance_capacity),
      status: form.status,
    };
  }

  if (typeKey === 'ambulances') {
    return {
      id: form.id.trim(),
      name: form.name.trim(),
      latitude: lat,
      longitude: lng,
      eta: Number(form.eta),
      equipment_score: Number(form.equipment_score),
      status: form.status,
    };
  }

  // repair_shops + tow_services
  return {
    id: form.id.trim(),
    name: form.name.trim(),
    latitude: lat,
    longitude: lng,
    status: form.status,
  };
}

// ── Populate form from existing record for editing ────────────────────────────
function entryToForm(typeKey, r) {
  if (typeKey === 'hospitals') {
    return {
      id: r.id ?? '',
      name: r.name ?? '',
      latitude: String(r.latitude ?? ''),
      longitude: String(r.longitude ?? ''),
      available_beds: String(r.available_beds ?? ''),
      icu_readiness: String(r.icu_readiness ?? ''),
      trauma_score: String(r.trauma_score ?? ''),
    };
  }
  if (typeKey === 'police') {
    return {
      id: r.id ?? '',
      name: r.name ?? '',
      latitude: String(r.latitude ?? ''),
      longitude: String(r.longitude ?? ''),
      eta: String(r.eta ?? ''),
      clearance_capacity: String(r.clearance_capacity ?? ''),
      status: r.status ?? 'available',
    };
  }
  if (typeKey === 'ambulances') {
    return {
      id: r.id ?? '',
      name: r.name ?? '',
      latitude: String(r.latitude ?? ''),
      longitude: String(r.longitude ?? ''),
      eta: String(r.eta ?? ''),
      equipment_score: String(r.equipment_score ?? ''),
      status: r.status ?? 'available',
    };
  }
  return {
    id: r.id ?? '',
    name: r.name ?? '',
    latitude: String(r.latitude ?? ''),
    longitude: String(r.longitude ?? ''),
    status: r.status ?? 'available',
  };
}

// ── Validate form has required coordinate fields ──────────────────────────────
function validateForm(typeKey, form) {
  const lat = parseFloat(form.latitude);
  const lng = parseFloat(form.longitude);
  if (!form.id.trim() || !form.name.trim() || isNaN(lat) || isNaN(lng)) {
    return 'Fill all fields with valid coordinates';
  }
  if (typeKey === 'hospitals') {
    if (!form.available_beds || !form.icu_readiness || !form.trauma_score) {
      return 'Fill all hospital operational fields';
    }
  }
  if (typeKey === 'police') {
    if (!form.eta || !form.clearance_capacity) {
      return 'Fill all police operational fields';
    }
  }
  if (typeKey === 'ambulances') {
    if (!form.eta || !form.equipment_score) {
      return 'Fill all ambulance operational fields';
    }
  }
  return null;
}

// Location input :

function LocationInput({ form, setForm, locationMethod, setLocationMethod }) {
  const updateCoords = (lat, lng) => {
    setForm(prev => ({
      ...prev,
      latitude: lat.toFixed(6),
      longitude: lng.toFixed(6)
    }));
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      <div>
        <label
          style={{
            fontSize: "9px",
            color: "#8b949e",
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            fontWeight: 600
          }}
        >
          Location Input Method
        </label>

        <div style={{ display: "flex", gap: "18px", marginTop: "8px" }}>
          <label style={{ color: "#e6edf3", fontSize: "11px" }}>
            <input
              type="radio"
              checked={locationMethod === "manual"}
              onChange={() => setLocationMethod("manual")}
            /> Enter Coordinates
          </label>

          <label style={{ color: "#e6edf3", fontSize: "11px" }}>
            <input
              type="radio"
              checked={locationMethod === "map"}
              onChange={() => setLocationMethod("map")}
            /> Pick on Map
          </label>
        </div>
      </div>

      {locationMethod === "map" && (
        <LocationPicker
          latitude={form.latitude}
          longitude={form.longitude}
          onLocationSelect={updateCoords}
        />
      )}
    </div>
  );
}

// ── Resource form panel ───────────────────────────────────────────────────────
function ResourceForm({ type, resources, onSave }) {
  const [form, setForm] = useState({ ...EMPTY_ENTRIES[type.key] });
  const [editIdx, setEditIdx] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [locationMethod, setLocationMethod] = useState("manual");

  // Reset form when tab changes
  useEffect(() => {
    setForm({ ...EMPTY_ENTRIES[type.key] });
    setEditIdx(null);
    setFeedback(null);
    setLocationMethod("manual");
  }, [type.key]);

  const flash = (msg, ok = true) => {
    setFeedback({ msg, ok });
    setTimeout(() => setFeedback(null), 2800);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const error = validateForm(type.key, form);
    if (error) { flash(error, false); return; }

    const entry = buildEntry(type.key, form);
    const updated = [...resources];

    if (editIdx !== null) {
      updated[editIdx] = entry;
      flash('Updated successfully');
      setEditIdx(null);
    } else {
      if (updated.find(r => r.id === entry.id)) {
        flash(`ID "${entry.id}" already exists`, false);
        return;
      }
      updated.push(entry);
      flash('Added successfully');
    }

    onSave(updated);
    setForm({ ...EMPTY_ENTRIES[type.key] });
  };

  const handleEdit = (idx) => {
    setForm(entryToForm(type.key, resources[idx]));
    setEditIdx(idx);
  };

  const handleDelete = (idx) => {
    const updated = resources.filter((_, i) => i !== idx);
    onSave(updated);
    if (editIdx === idx) { setForm({ ...EMPTY_ENTRIES[type.key] }); setEditIdx(null); }
    flash('Entry removed');
  };

  const handleCancel = () => {
    setForm({ ...EMPTY_ENTRIES[type.key] });
    setEditIdx(null);
  };

  const t = type;
  const isEditing = editIdx !== null;

  return (
    <div style={{ background: '#161b22', border: `1px solid ${t.color}30`, borderRadius: '4px', overflow: 'hidden' }}>
      {/* Panel header */}
      <div style={{
        background: `${t.accent}0.08)`, borderBottom: `1px solid ${t.color}25`,
        padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '8px',
      }}>
        <span style={{ fontSize: '14px' }}>{t.icon}</span>
        <span style={{ fontSize: '11px', fontWeight: 700, color: t.color, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          {t.label}
        </span>
        <span style={{
          marginLeft: 'auto', fontSize: '9px', fontFamily: 'monospace',
          background: `${t.accent}0.12)`, color: t.color,
          border: `1px solid ${t.color}40`, borderRadius: '2px', padding: '2px 6px',
        }}>
          {resources.length} RECORDS
        </span>
      </div>

      <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <LocationInput
            form={form}
            setForm={setForm}
            locationMethod={locationMethod}
            setLocationMethod={setLocationMethod}
          />

          <TypeFields
            typeKey={t.key}
            form={form}
            setForm={setForm}
            locationMethod={locationMethod}
          />

          {/* Buttons + feedback */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="submit"
              style={{
                fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em',
                textTransform: 'uppercase', padding: '6px 16px', borderRadius: '3px',
                border: `1px solid ${t.color}60`, background: `${t.accent}0.12)`,
                color: t.color, cursor: 'pointer',
                transition: 'background 0.15s, border-color 0.15s', fontFamily: 'monospace',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = `${t.accent}0.25)`; e.currentTarget.style.borderColor = `${t.color}90`; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = `${t.accent}0.12)`; e.currentTarget.style.borderColor = `${t.color}60`; }}
            >
              {isEditing ? '↻ Update' : '+ Save'}
            </button>

            {isEditing && (
              <button type="button" onClick={handleCancel} style={{
                fontSize: '10px', fontWeight: 600, letterSpacing: '0.08em',
                textTransform: 'uppercase', padding: '6px 12px', borderRadius: '3px',
                border: '1px solid #30363d', background: 'transparent',
                color: '#8b949e', cursor: 'pointer', fontFamily: 'monospace',
              }}>
                Cancel
              </button>
            )}

            {feedback && (
              <span style={{ fontSize: '10px', fontFamily: 'monospace', color: feedback.ok ? '#3fb950' : '#ef4444', display: 'flex', alignItems: 'center', gap: '4px' }}>
                {feedback.ok ? '✓' : '✗'} {feedback.msg}
              </span>
            )}
          </div>
        </form>

        {/* Records table */}
        {resources.length > 0 && (
          <div style={{ borderTop: '1px solid #21262d', paddingTop: '12px' }}>
            <div style={{ fontSize: '9px', color: '#484f58', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>
              Saved Records
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '180px', overflowY: 'auto' }}>
              {resources.map((r, idx) => (
                <div
                  key={r.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    padding: '6px 8px',
                    background: editIdx === idx ? `${t.accent}0.08)` : '#0d1117',
                    border: `1px solid ${editIdx === idx ? t.color + '40' : '#21262d'}`,
                    borderRadius: '3px', transition: 'background 0.15s',
                  }}
                >
                  <span style={{
                    width: '6px', height: '6px', borderRadius: '50%', flexShrink: 0,
                    background: r.status === 'available' ? '#3fb950' : r.status === 'busy' ? '#f97316' : '#484f58',
                  }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '11px', color: '#e6edf3', fontWeight: 600, fontFamily: 'monospace' }}>
                      {r.name}
                    </div>
                    <div style={{ fontSize: '9px', color: '#484f58', fontFamily: 'monospace' }}>
                      {r.id} · {r.latitude != null ? `${r.latitude}, ${r.longitude}` : '—'} · {r.status ?? '—'}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                    <button onClick={() => handleEdit(idx)} style={{ fontSize: '9px', padding: '3px 7px', borderRadius: '2px', border: '1px solid #30363d', background: 'transparent', color: '#8b949e', cursor: 'pointer', fontFamily: 'monospace' }}>
                      Edit
                    </button>
                    <button onClick={() => handleDelete(idx)} style={{ fontSize: '9px', padding: '3px 7px', borderRadius: '2px', border: '1px solid #30363d', background: 'transparent', color: '#ef4444', cursor: 'pointer', fontFamily: 'monospace' }}>
                      ✕
                    </button>
                  </div>
                </div>
              ))}
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
          onClick={handleCopy}
          style={{
            fontSize: '9px', padding: '3px 8px', borderRadius: '2px',
            border: '1px solid #30363d',
            background: copied ? 'rgba(63,185,80,0.12)' : 'transparent',
            color: copied ? '#3fb950' : '#8b949e',
            cursor: 'pointer', fontFamily: 'monospace', transition: 'all 0.15s',
          }}
        >
          {copied ? '✓ Copied' : 'Copy JSON'}
        </button>
      </div>
      <pre style={{
        margin: 0, padding: '12px 14px', fontSize: '10px',
        fontFamily: "'JetBrains Mono', monospace", color: '#8b949e',
        background: '#0d1117', overflowX: 'auto', maxHeight: '260px',
        overflowY: 'auto', lineHeight: 1.6,
      }}>
        {json}
      </pre>
    </div>
  );
}

// ── Main ResourceAdmin view ───────────────────────────────────────────────────
export default function ResourceAdmin() {
  const [resources, setResources] = useState(loadResources);
  const [activeTab, setActiveTab] = useState('hospitals');

  useEffect(() => {
    const fetchResources = async () => {
      try {
        const res = await fetch(`${BASE}/api/v1/resources`);
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
    const newResources = { ...resources, [key]: updated };
    setResources(newResources);
    localStorage.setItem("roadsos_resources", JSON.stringify(newResources));

    fetch(`${BASE}/api/v1/save-resources`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newResources),
    })
      .then(res => res.json())
      .then(data => console.log("Backend response:", data))
      .catch(err => console.error("Save failed:", err));
  };

  const activeType = RESOURCE_TYPES.find(t => t.key === activeTab);
  const totalRecords = Object.values(resources).reduce((s, a) => s + a.length, 0);

  return (
    <div className="h-full overflow-y-auto" style={{ background: '#0d1117', padding: '0' }}>
      {/* Sticky header */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 10, background: '#0d1117',
        borderBottom: '1px solid #21262d', padding: '12px 24px',
        display: 'flex', alignItems: 'center', gap: '12px',
      }}>
        <div>
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#e6edf3', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            Resource Manager
          </div>
          <div style={{ fontSize: '9px', color: '#484f58', fontFamily: 'monospace', marginTop: '2px' }}>
            Define locations → saved to resources.json schema
          </div>
        </div>
        <div style={{
          marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px',
          background: 'rgba(63,185,80,0.08)', border: '1px solid rgba(63,185,80,0.25)',
          borderRadius: '3px', padding: '4px 10px',
        }}>
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
          <div style={{
            display: 'flex', gap: '4px', marginBottom: '14px',
            background: '#161b22', border: '1px solid #21262d',
            borderRadius: '4px', padding: '4px', flexWrap: 'wrap',
          }}>
            {RESOURCE_TYPES.map(t => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                style={{
                  fontSize: '9px', fontWeight: 700, letterSpacing: '0.1em',
                  textTransform: 'uppercase', padding: '5px 10px', borderRadius: '3px',
                  border: 'none', cursor: 'pointer', transition: 'all 0.15s',
                  fontFamily: 'monospace', display: 'flex', alignItems: 'center', gap: '4px',
                  background: activeTab === t.key ? `${t.accent}0.15)` : 'transparent',
                  color: activeTab === t.key ? t.color : '#484f58',
                  boxShadow: activeTab === t.key ? `inset 0 0 0 1px ${t.color}40` : 'none',
                }}
              >
                <span style={{ fontSize: '11px' }}>{t.icon}</span>
                {t.label}
                <span style={{
                  background: `${t.accent}0.2)`, color: t.color,
                  borderRadius: '2px', padding: '0 4px', fontSize: '8px',
                  minWidth: '14px', textAlign: 'center',
                }}>
                  {resources[t.key]?.length ?? 0}
                </span>
              </button>
            ))}
          </div>

          {activeType && (
            <ResourceForm
              type={activeType}
              resources={resources[activeType.key] ?? []}
              onSave={(updated) => handleSave(activeType.key, updated)}
            />
          )}
        </div>

        {/* Right: JSON export preview + summary */}
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
                    borderRadius: '4px', padding: '10px 12px', cursor: 'pointer', transition: 'all 0.15s',
                  }}
                >
                  <div style={{ fontSize: '18px', marginBottom: '6px' }}>{t.icon}</div>
                  <div style={{ fontSize: '20px', fontWeight: 700, color: t.color, fontFamily: 'monospace', lineHeight: 1 }}>{count}</div>
                  <div style={{ fontSize: '8px', color: '#484f58', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: '3px' }}>{t.label}</div>
                  <div style={{ fontSize: '8px', color: '#3fb950', fontFamily: 'monospace', marginTop: '2px' }}>{available} avail</div>
                </div>
              );
            })}
          </div>

          {/* Instructions card */}
          <div style={{
            background: 'rgba(88,166,255,0.04)', border: '1px solid rgba(88,166,255,0.2)',
            borderRadius: '4px', padding: '12px 14px',
          }}>
            <div style={{ fontSize: '9px', color: '#58a6ff', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700, marginBottom: '8px' }}>
              ℹ How It Works
            </div>
            <ul style={{ fontSize: '10px', color: '#8b949e', fontFamily: 'monospace', lineHeight: 1.8, margin: 0, paddingLeft: '14px' }}>
              <li>Fill the form and click <strong style={{ color: '#e6edf3' }}>+ Save</strong> to add a resource entry</li>
              <li>All resource types now store <strong style={{ color: '#e6edf3' }}>lat/lng coordinates</strong> for live map plotting</li>
              <li>Hospitals and police include operational scoring fields for dispatch agents</li>
              <li>The User Tactical Map reads from <code style={{ color: '#58a6ff' }}>GET /api/v1/resources</code> and plots live markers</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}