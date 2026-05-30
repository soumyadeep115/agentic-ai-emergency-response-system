/**
 * OfflineSOS.jsx
 * ──────────────────────────────────────────────────────────────────────────
 * Offline emergency alert module for RoadSoS.
 *
 * HOW IT WORKS (no external hardware or third-party app needed):
 *
 *  1. Detects offline status via navigator.onLine + online/offline events
 *  2. Activates Speech Recognition (webkitSpeechRecognition) to capture
 *     a spoken emergency description from the user
 *  3. Parses the transcript into structured emergency data
 *     { incident_type, location, casualties, timestamp }
 *  4. Encodes data into a compact SMS string:
 *     ROADSOS|LOC:DADAR_STATION|CAS:2|TYPE:ACCIDENT|TIME:...
 *  5. Opens the device's native SMS app via sms: URI scheme with the
 *     emergency number and prefilled message body — user just presses Send
 *  6. Also posts the parsed alert to the backend (when online later or
 *     if partially connected) via POST /api/v1/offline-alert
 *
 * Drop-in usage inside UserPortal's SOSPanel — just render <OfflineSOS />
 * ──────────────────────────────────────────────────────────────────────────
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { postOfflineAlert } from '../services/api.js';

// ─── Configuration ────────────────────────────────────────────────────────────
// Emergency SMS recipient number (update to your control room number)
const EMERGENCY_SMS_NUMBER = '+911234567890';

// ─── Speech parsing helpers ───────────────────────────────────────────────────

/**
 * Extracts casualty count from transcript.
 * Handles: "two injured", "3 casualties", "one person", "4 people hurt" etc.
 */
function parseCasualties(text) {
    const wordMap = {
        one: 1, two: 2, three: 3, four: 4, five: 5,
        six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
    };

    // Try digit first: "3 injured", "4 casualties"
    const digitMatch = text.match(/(\d+)\s*(?:person|people|injured|casualties|hurt|dead|killed)/i);
    if (digitMatch) return parseInt(digitMatch[1], 10);

    // Try word number
    const wordMatch = text.match(
        /\b(one|two|three|four|five|six|seven|eight|nine|ten)\s*(?:person|people|injured|casualties|hurt|dead|killed)?/i
    );
    if (wordMatch) return wordMap[wordMatch[1].toLowerCase()] ?? 1;

    // Default
    return 1;
}

/**
 * Extracts incident type from transcript.
 * Returns one of the RoadSoS incident type strings.
 */
function parseIncidentType(text) {
    const t = text.toLowerCase();
    if (t.includes('fire') || t.includes('burn') || t.includes('blaze')) return 'fire';
    if (t.includes('flood') || t.includes('water') || t.includes('rain')) return 'flood';
    if (
        t.includes('medical') || t.includes('heart') || t.includes('breath') ||
        t.includes('unconscious') || t.includes('faint') || t.includes('seizure')
    ) return 'medical';
    if (
        t.includes('accident') || t.includes('crash') || t.includes('collision') ||
        t.includes('vehicle') || t.includes('car') || t.includes('bike') ||
        t.includes('truck') || t.includes('bus') || t.includes('road')
    ) return 'road_accident';
    return 'other';
}

/**
 * Extracts location string from transcript.
 * Strategy: remove filler phrases, return the remaining location-like text.
 */
function parseLocation(text) {
    let cleaned = text
        .replace(/\b(accident|crash|collision|fire|flood|medical|emergency|injured|hurt|dead|killed)\b/gi, '')
        .replace(/\b(there is|there are|i see|i saw|i am at|i'm at|near|at|in|on)\b/gi, '')
        .replace(/\b(one|two|three|four|five|six|seven|eight|nine|ten)\b/gi, '')
        .replace(/\b(person|people|casualties|injured|hurt)\b/gi, '')
        .replace(/[^\w\s]/g, '')
        .replace(/\s+/g, ' ')
        .trim();

    // Title-case the result
    return cleaned
        .split(' ')
        .filter(Boolean)
        .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ') || 'Unknown Location';
}

/**
 * Master parser: takes raw transcript and returns structured emergency object.
 */
function parseTranscript(transcript) {
    const text = transcript.trim();
    return {
        incident_type: parseIncidentType(text),
        location: parseLocation(text),
        casualties: parseCasualties(text),
        timestamp: new Date().toISOString(),
        raw_transcript: text,
    };
}

/**
 * Encodes structured emergency data into compact SMS format.
 * Format: ROADSOS|LOC:DADAR_STATION|CAS:2|TYPE:ACCIDENT|TIME:ISO
 */
function encodeSMS(parsed) {
    const loc = parsed.location.toUpperCase().replace(/\s+/g, '_');
    const type = parsed.incident_type.toUpperCase();
    const time = new Date(parsed.timestamp).toLocaleTimeString('en-IN', {
        hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Kolkata',
    });
    return `ROADSOS|LOC:${loc}|CAS:${parsed.casualties}|TYPE:${type}|TIME:${time}`;
}

/**
 * Opens the device's native SMS app with prefilled recipient and body.
 * The user only needs to press Send — no typing required.
 * Works on Android and iOS natively. On desktop, opens default mail/sms client.
 */
function triggerNativeSMS(message) {
    // sms: URI scheme — supported on Android, iOS, and most desktop OS
    const smsUri = `sms:${EMERGENCY_SMS_NUMBER}?body=${encodeURIComponent(message)}`;
    window.location.href = smsUri;
}

// ─── Incident type display config ─────────────────────────────────────────────
const TYPE_LABELS = {
    road_accident: { label: 'Road Accident', emoji: '🚗' },
    fire: { label: 'Fire', emoji: '🔥' },
    medical: { label: 'Medical', emoji: '🏥' },
    flood: { label: 'Flood', emoji: '🌊' },
    other: { label: 'Other', emoji: '⚠️' },
};

// ─── Main Component ───────────────────────────────────────────────────────────
export default function OfflineSOS() {
    // Online/offline detection
    const [isOnline, setIsOnline] = useState(navigator.onLine);

    // Speech recognition state
    const [phase, setPhase] = useState('idle');
    // phases: idle | listening | processing | preview | sending | done | error

    const [transcript, setTranscript] = useState('');
    const [parsed, setParsed] = useState(null);
    const [smsMessage, setSmsMessage] = useState('');
    const [errorMsg, setErrorMsg] = useState('');
    const [notification, setNotification] = useState(null); // { type, text }

    const recognitionRef = useRef(null);
    const notifTimerRef = useRef(null);

    // ── Online/offline listener ────────────────────────────────────────────
    useEffect(() => {
        const goOnline = () => setIsOnline(true);
        const goOffline = () => setIsOnline(false);
        window.addEventListener('online', goOnline);
        window.addEventListener('offline', goOffline);
        return () => {
            window.removeEventListener('online', goOnline);
            window.removeEventListener('offline', goOffline);
        };
    }, []);

    // ── Cleanup on unmount ─────────────────────────────────────────────────
    useEffect(() => {
        return () => {
            recognitionRef.current?.abort();
            clearTimeout(notifTimerRef.current);
        };
    }, []);

    // ── Notification helper ────────────────────────────────────────────────
    const showNotif = useCallback((type, text, duration = 4000) => {
        setNotification({ type, text });
        clearTimeout(notifTimerRef.current);
        notifTimerRef.current = setTimeout(() => setNotification(null), duration);
    }, []);

    // ── Start voice capture ────────────────────────────────────────────────
    const startListening = useCallback(() => {
        setErrorMsg('');
        setTranscript('');
        setParsed(null);
        setSmsMessage('');

        // Browser compatibility check
        const SpeechRecognition =
            window.SpeechRecognition || window.webkitSpeechRecognition;

        if (!SpeechRecognition) {
            setErrorMsg('Speech recognition is not supported in this browser. Please use Chrome or Edge.');
            setPhase('error');
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.lang = 'en-IN';   // Indian English for better accuracy
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        recognition.onstart = () => {
            setPhase('listening');
        };

        recognition.onresult = (event) => {
            const text = event.results[0][0].transcript;
            setTranscript(text);
            setPhase('processing');

            // Parse transcript into structured data
            const parsedData = parseTranscript(text);

            // Check for empty/unusable transcript
            if (!text.trim()) {
                setErrorMsg('No speech detected. Please try again.');
                setPhase('error');
                return;
            }

            setParsed(parsedData);
            setSmsMessage(encodeSMS(parsedData));
            setPhase('preview');
        };

        recognition.onerror = (event) => {
            if (event.error === 'network') {
                const fallbackParsed = {
                    incident_type: 'other',
                    location: 'User Reported Location',
                    casualties: 1,
                    timestamp: new Date().toISOString(),
                    raw_transcript: 'Offline emergency trigger'
                };

                setTranscript('Offline emergency trigger');
                setParsed(fallbackParsed);
                setSmsMessage(encodeSMS(fallbackParsed));
                setPhase('preview');
                return;
            }

            const errMessages = {
                'no-speech': 'No speech detected. Tap the button and speak clearly.',
                'audio-capture': 'Microphone not accessible.',
                'not-allowed': 'Microphone permission denied.',
                'aborted': 'Speech capture cancelled.'
            };

            setErrorMsg(errMessages[event.error] || `Speech error: ${event.error}`);
            setPhase('error');
        };

        recognition.onend = () => {
            if (
                phase !== 'preview' &&
                phase !== 'done' &&
                phase !== 'sending'
            ) {
                setPhase(prev => prev === 'listening' ? 'error' : prev);
            }
        };

        recognitionRef.current = recognition;
        recognition.start();
    }, []);

    // ── Cancel / reset ─────────────────────────────────────────────────────
    const handleReset = useCallback(() => {
        recognitionRef.current?.abort();
        setPhase('idle');
        setTranscript('');
        setParsed(null);
        setSmsMessage('');
        setErrorMsg('');
    }, []);

    // ── Send SMS ───────────────────────────────────────────────────────────
    const handleSendSMS = useCallback(async () => {
        if (!smsMessage || !parsed) return;
        setPhase('sending');

        try {
            // 1. Try to post to backend (may work if partially connected)
            try {
                // Open native SMS app (primary offline channel)
                triggerNativeSMS(smsMessage);
                await postOfflineAlert({
                    transcript: parsed.raw_transcript,
                    location_text: parsed.location,
                    incident_type: parsed.incident_type,
                    casualties: parsed.casualties,
                    sms_message: smsMessage,
                    timestamp: parsed.timestamp,
                });
            } catch {
                // Silently ignore — we're offline, SMS is the primary channel
                console.warn('[OfflineSOS] Backend unreachable — proceeding with SMS only');
            }

            setPhase('done');
            showNotif('success', 'SMS app opened. Press Send to alert emergency services.');

        } catch (err) {
            setErrorMsg(`Failed to open SMS app: ${err.message}`);
            setPhase('error');
            showNotif('error', 'SMS launch failed. Try manually texting the emergency number.');
        }
    }, [smsMessage, parsed, showNotif]);

    // ── Styles (matching RoadSoS dark theme) ──────────────────────────────
    const S = {
        container: {
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            fontFamily: "'JetBrains Mono', monospace",
        },

        // Offline status banner
        offlineBanner: (online) => ({
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 10px',
            borderRadius: '4px',
            background: online ? 'rgba(63,185,80,0.08)' : 'rgba(239,68,68,0.1)',
            border: `1px solid ${online ? 'rgba(63,185,80,0.3)' : 'rgba(239,68,68,0.4)'}`,
            fontSize: '9px',
            color: online ? '#3fb950' : '#ef4444',
            fontWeight: 700,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
        }),

        dot: (color) => ({
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            background: color,
            flexShrink: 0,
            boxShadow: `0 0 6px ${color}80`,
        }),

        // Main SOS button
        sosBtn: (phase) => ({
            width: '100%',
            padding: '12px',
            borderRadius: '4px',
            border: `1px solid ${phase === 'listening' ? '#ef4444' : '#7f1d1d'}`,
            background: phase === 'listening'
                ? 'rgba(239,68,68,0.2)'
                : '#7f1d1d',
            color: '#fff',
            fontSize: '11px',
            fontFamily: "'JetBrains Mono', monospace",
            fontWeight: 700,
            letterSpacing: '0.1em',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            transition: 'all 0.2s',
            boxShadow: phase === 'listening' ? '0 0 16px rgba(239,68,68,0.3)' : 'none',
        }),

        // Listening pulse indicator
        pulse: {
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: '#ef4444',
            animation: 'offline-sos-pulse 1s ease-in-out infinite',
        },

        // Transcript box
        transcriptBox: {
            padding: '10px',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid #21262d',
            borderRadius: '4px',
            fontSize: '11px',
            color: '#c9d1d9',
            lineHeight: 1.5,
            fontStyle: 'italic',
            minHeight: '48px',
        },

        // Parsed preview card
        previewCard: {
            background: '#161b22',
            border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: '4px',
            overflow: 'hidden',
        },

        previewHeader: {
            background: 'rgba(239,68,68,0.08)',
            borderBottom: '1px solid rgba(239,68,68,0.2)',
            padding: '6px 10px',
            fontSize: '9px',
            color: '#ef4444',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            fontWeight: 700,
        },

        previewRow: {
            display: 'flex',
            justifyContent: 'space-between',
            padding: '4px 10px',
            borderBottom: '1px solid #21262d10',
            fontSize: '10px',
        },

        previewLabel: { color: '#484f58' },
        previewValue: { color: '#e6edf3', fontWeight: 700 },

        // SMS preview box
        smsBox: {
            padding: '8px 10px',
            background: 'rgba(58,166,255,0.05)',
            border: '1px solid rgba(88,166,255,0.2)',
            borderRadius: '4px',
            fontSize: '10px',
            color: '#58a6ff',
            wordBreak: 'break-all',
            lineHeight: 1.6,
        },

        // Send button
        sendBtn: {
            width: '100%',
            padding: '10px',
            borderRadius: '4px',
            border: '1px solid rgba(239,68,68,0.5)',
            background: 'rgba(239,68,68,0.15)',
            color: '#ef4444',
            fontSize: '11px',
            fontFamily: "'JetBrains Mono', monospace",
            fontWeight: 700,
            letterSpacing: '0.1em',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
        },

        // Reset button
        resetBtn: {
            width: '100%',
            padding: '6px',
            borderRadius: '3px',
            border: '1px solid #21262d',
            background: 'transparent',
            color: '#484f58',
            fontSize: '9px',
            fontFamily: "'JetBrains Mono', monospace",
            letterSpacing: '0.08em',
            cursor: 'pointer',
        },

        // Error message
        errorBox: {
            padding: '8px 10px',
            background: 'rgba(239,68,68,0.08)',
            border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: '4px',
            fontSize: '10px',
            color: '#ef4444',
            lineHeight: 1.5,
        },

        // Notification toast
        notif: (type) => ({
            padding: '8px 10px',
            borderRadius: '4px',
            fontSize: '10px',
            background: type === 'success' ? 'rgba(63,185,80,0.1)' : 'rgba(239,68,68,0.1)',
            border: `1px solid ${type === 'success' ? 'rgba(63,185,80,0.4)' : 'rgba(239,68,68,0.4)'}`,
            color: type === 'success' ? '#3fb950' : '#ef4444',
        }),

        sectionLabel: {
            fontSize: '8px',
            color: '#484f58',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            fontWeight: 700,
        },

        doneBox: {
            padding: '12px 10px',
            textAlign: 'center',
            background: 'rgba(63,185,80,0.06)',
            border: '1px solid rgba(63,185,80,0.25)',
            borderRadius: '4px',
        },
    };

    // ── Inject pulse keyframes ────────────────────────────────────────────
    useEffect(() => {
        if (document.getElementById('offline-sos-styles')) return;
        const style = document.createElement('style');
        style.id = 'offline-sos-styles';
        style.textContent = `
      @keyframes offline-sos-pulse {
        0%, 100% { opacity: 1; transform: scale(1); }
        50% { opacity: 0.4; transform: scale(1.4); }
      }
    `;
        document.head.appendChild(style);
    }, []);

    // ── Render ─────────────────────────────────────────────────────────────
    const typeInfo = parsed ? (TYPE_LABELS[parsed.incident_type] ?? TYPE_LABELS.other) : null;

    return (
        <div style={S.container}>

            {/* Offline / Online status banner */}
            <div style={S.offlineBanner(isOnline)}>
                <div style={S.dot(isOnline ? '#3fb950' : '#ef4444')} />
                {isOnline
                    ? '● Online — SMS fallback available'
                    : '● Offline — SMS emergency mode active'}
            </div>

            {/* Section header */}
            <div style={S.sectionLabel}>Offline Voice SOS</div>

            {/* Notification toast */}
            {notification && (
                <div style={S.notif(notification.type)}>
                    {notification.type === 'success' ? '✓' : '✗'} {notification.text}
                </div>
            )}

            {/* ── IDLE / ERROR phase: show main button ── */}
            {(phase === 'idle' || phase === 'error') && (
                <>
                    <button
                        style={S.sosBtn('idle')}
                        onClick={startListening}
                    >
                        🎙 OFFLINE VOICE SOS
                    </button>
                    <div style={{ fontSize: '9px', color: '#484f58', textAlign: 'center' }}>
                        Speak your emergency — SMS will be prepared automatically
                    </div>
                    {phase === 'error' && errorMsg && (
                        <div style={S.errorBox}>⚠ {errorMsg}</div>
                    )}
                </>
            )}

            {/* ── LISTENING phase ── */}
            {phase === 'listening' && (
                <>
                    <button style={S.sosBtn('listening')} onClick={() => recognitionRef.current?.stop()}>
                        <div style={S.pulse} />
                        LISTENING… TAP TO STOP
                    </button>
                    <div style={{
                        textAlign: 'center',
                        fontSize: '10px',
                        color: '#ef4444',
                        fontFamily: "'JetBrains Mono', monospace",
                        animation: 'offline-sos-pulse 1.5s ease-in-out infinite',
                    }}>
                        Speak now: describe location, incident, casualties
                    </div>
                    <div style={{ fontSize: '9px', color: '#484f58', textAlign: 'center' }}>
                        e.g. "Accident near Dadar station, two injured"
                    </div>
                </>
            )}

            {/* ── PROCESSING phase ── */}
            {phase === 'processing' && (
                <div style={{ textAlign: 'center', padding: '12px', color: '#8b949e', fontSize: '10px' }}>
                    <div style={{ marginBottom: '8px', fontSize: '18px' }}>⟳</div>
                    Parsing emergency details…
                </div>
            )}

            {/* ── PREVIEW phase ── */}
            {phase === 'preview' && parsed && (
                <>
                    {/* Transcript */}
                    <div>
                        <div style={{ ...S.sectionLabel, marginBottom: '4px' }}>Captured Speech</div>
                        <div style={S.transcriptBox}>"{transcript}"</div>
                    </div>

                    {/* Parsed emergency card */}
                    <div>
                        <div style={{ ...S.sectionLabel, marginBottom: '4px' }}>Parsed Emergency Details</div>
                        <div style={S.previewCard}>
                            <div style={S.previewHeader}>⚠ Emergency Alert Preview</div>
                            <div style={S.previewRow}>
                                <span style={S.previewLabel}>Type</span>
                                <span style={S.previewValue}>{typeInfo.emoji} {typeInfo.label}</span>
                            </div>
                            <div style={S.previewRow}>
                                <span style={S.previewLabel}>Location</span>
                                <span style={S.previewValue}>{parsed.location}</span>
                            </div>
                            <div style={S.previewRow}>
                                <span style={S.previewLabel}>Casualties</span>
                                <span style={S.previewValue}>{parsed.casualties}</span>
                            </div>
                            <div style={{ ...S.previewRow, borderBottom: 'none' }}>
                                <span style={S.previewLabel}>Time</span>
                                <span style={{ ...S.previewValue, fontSize: '9px' }}>
                                    {new Date(parsed.timestamp).toLocaleTimeString('en-IN', {
                                        hour: '2-digit', minute: '2-digit', second: '2-digit',
                                        hour12: false, timeZone: 'Asia/Kolkata',
                                    })} IST
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* SMS message preview */}
                    <div>
                        <div style={{ ...S.sectionLabel, marginBottom: '4px' }}>SMS Message (auto-encoded)</div>
                        <div style={S.smsBox}>{smsMessage}</div>
                        <div style={{ fontSize: '8px', color: '#484f58', marginTop: '4px' }}>
                            Recipient: {EMERGENCY_SMS_NUMBER}
                        </div>
                    </div>

                    {/* Send SMS button */}
                    <button style={S.sendBtn} onClick={handleSendSMS}>
                        📱 SEND EMERGENCY SMS
                    </button>

                    {/* Retry voice */}
                    <button style={S.resetBtn} onClick={handleReset}>
                        ↺ Re-record speech
                    </button>
                </>
            )}

            {/* ── SENDING phase ── */}
            {phase === 'sending' && (
                <div style={{ textAlign: 'center', padding: '12px', color: '#8b949e', fontSize: '10px' }}>
                    <div style={{ marginBottom: '8px', fontSize: '18px' }}>📡</div>
                    Opening SMS app…
                </div>
            )}

            {/* ── DONE phase ── */}
            {phase === 'done' && (
                <>
                    <div style={S.doneBox}>
                        <div style={{ fontSize: '22px', marginBottom: '6px' }}>✓</div>
                        <div style={{ fontSize: '11px', color: '#3fb950', fontWeight: 700, marginBottom: '4px' }}>
                            SMS App Opened
                        </div>
                        <div style={{ fontSize: '9px', color: '#484f58', lineHeight: 1.5 }}>
                            Press <strong style={{ color: '#c9d1d9' }}>Send</strong> in your SMS app to alert emergency services.
                            <br />The message includes your location and emergency details.
                        </div>
                    </div>
                    <button style={S.resetBtn} onClick={handleReset}>
                        ↺ Send Another Alert
                    </button>
                </>
            )}

        </div>
    );
}