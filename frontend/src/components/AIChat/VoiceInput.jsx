import React, { useEffect, useRef, useState } from 'react';
import { Mic } from 'lucide-react';

const LANGS = [
  { code: 'en-IN', label: 'EN' },
  { code: 'hi-IN', label: 'हि' },
  { code: 'te-IN', label: 'తె' },
  { code: 'ta-IN', label: 'த' },
  { code: 'kn-IN', label: 'ಕ' }
];

/**
 * Speech-to-text with live transcript (Web Speech API — Chrome / Edge).
 */
export default function VoiceInput({ onInterim, onFinal, disabled }) {
  const [listening, setListening] = useState(false);
  const [lang, setLang] = useState(() => localStorage.getItem('pg_voice_lang') || 'en-IN');
  const recRef = useRef(null);
  const supported = typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);
  const handlers = useRef({ onInterim, onFinal });
  handlers.current = { onInterim, onFinal };

  useEffect(() => () => recRef.current?.abort(), []);

  const toggle = () => {
    if (listening) {
      recRef.current?.stop();
      return;
    }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new SR();
    rec.lang = lang;
    rec.interimResults = true;
    rec.continuous = false;
    rec.onresult = (e) => {
      let text = '';
      let final = false;
      for (const r of e.results) {
        text += r[0].transcript;
        if (r.isFinal) final = true;
      }
      handlers.current.onInterim?.(text);
      if (final) handlers.current.onFinal?.(text);
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    recRef.current = rec;
    rec.start();
    setListening(true);
  };

  if (!supported) return null;

  return (
    <div className="row-sm" style={{ gap: 4 }}>
      <select
        className="select"
        value={lang}
        onChange={e => { setLang(e.target.value); localStorage.setItem('pg_voice_lang', e.target.value); }}
        style={{ width: 54, height: 42, padding: '0 4px 0 8px', backgroundPosition: 'right 4px center', fontSize: '0.78rem', borderRadius: 12 }}
        title="Voice language"
        aria-label="Voice language"
      >
        {LANGS.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
      </select>
      <button
        type="button"
        className={`btn btn-icon ${listening ? 'btn-danger' : 'btn-secondary'}`}
        style={{ height: 42, width: 42, borderRadius: 12 }}
        onClick={toggle}
        disabled={disabled}
        title={listening ? 'Stop' : 'Speak'}
        aria-label={listening ? 'Stop listening' : 'Voice input'}
      >
        {listening ? <span className="voice-wave"><span /><span /><span /><span /></span> : <Mic size={18} />}
      </button>
    </div>
  );
}
