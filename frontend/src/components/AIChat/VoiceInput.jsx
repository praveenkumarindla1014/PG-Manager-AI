import React, { useState, useEffect } from 'react';
import { Mic, MicOff } from 'lucide-react';

export default function VoiceInput({ onSpeechResult, isListening, setIsListening }) {
  const [recognition, setRecognition] = useState(null);

  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = 'en-IN'; // Default to Indian English, supports natural Hindi/English mix

      rec.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        onSpeechResult(transcript);
        setIsListening(false);
      };

      rec.onerror = (event) => {
        console.error('Voice recognition error:', event.error);
        setIsListening(false);
      };

      rec.onend = () => {
        setIsListening(false);
      };

      setRecognition(rec);
    }
  }, [onSpeechResult, setIsListening]);

  const toggleListening = () => {
    if (!recognition) {
      alert('Voice Speech Recognition is not supported in this browser. Please use Chrome/Edge.');
      return;
    }

    if (isListening) {
      recognition.stop();
      setIsListening(false);
    } else {
      recognition.start();
      setIsListening(true);
    }
  };

  return (
    <button
      type="button"
      onClick={toggleListening}
      className={`btn ${isListening ? 'btn-danger' : 'btn-secondary'} btn-icon`}
      title={isListening ? 'Stop listening' : 'Start Voice Input (Feature #2)'}
      style={{
        boxShadow: isListening ? '0 0 20px rgba(244, 63, 94, 0.6)' : undefined,
        position: 'relative'
      }}
    >
      {isListening ? <MicOff size={18} /> : <Mic size={18} />}
    </button>
  );
}
