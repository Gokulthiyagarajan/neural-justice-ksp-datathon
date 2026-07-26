import { api } from './client';

export interface VoiceClientOptions {
  lang?: string;
  onTranscript?: (text: string, isFinal: boolean) => void;
  onError?: (message: string) => void;
  onStateChange?: (listening: boolean) => void;
}

/**
 * Browser-native voice client (no extra dependencies).
 *
 * STT uses the Web Speech API (SpeechRecognition). TTS first asks the
 * backend `/api/v1/voice/tts` endpoint for audio and, when the server
 * cannot synthesize (no pyttsx3 / Zia), transparently falls back to the
 * browser SpeechSynthesis API so the judge-facing demo always speaks.
 */
export class VoiceClient {
  private recognition: any = null;
  private listening = false;
  private lang: string;
  private onTranscript?: (text: string, isFinal: boolean) => void;
  private onError?: (message: string) => void;
  private onStateChange?: (listening: boolean) => void;

  constructor(opts: VoiceClientOptions = {}) {
    this.lang = opts.lang || 'en-IN';
    this.onTranscript = opts.onTranscript;
    this.onError = opts.onError;
    this.onStateChange = opts.onStateChange;

    if (typeof window === 'undefined') {return;}
    const SR: any =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SR) {
      this.recognition = new SR();
      this.recognition.lang = this.lang;
      this.recognition.interimResults = true;
      this.recognition.continuous = false;
      this.recognition.onresult = (event: any) => {
        let interim = '';
        let final = '';
        for (let i = 0; i < event.results.length; i++) {
          const res = event.results[i];
          if (res.isFinal) {final += res[0].transcript;}
          else {interim += res[0].transcript;}
        }
        if (final) {this.onTranscript?.(final.trim(), true);}
        else if (interim) {this.onTranscript?.(interim.trim(), false);}
      };
      this.recognition.onerror = (e: any) => {
        this.onError?.(e?.error || 'speech-error');
        this._setListening(false);
      };
      this.recognition.onend = () => this._setListening(false);
    }
  }

  get isSupported(): boolean {
    return !!this.recognition;
  }

  get isListening(): boolean {
    return this.listening;
  }

  private _setListening(value: boolean) {
    this.listening = value;
    this.onStateChange?.(value);
  }

  start() {
    if (!this.recognition) {
      this.onError?.('Speech recognition is not supported in this browser.');
      return;
    }
    try {
      this.recognition.start();
      this._setListening(true);
    } catch {
      /* already started */
    }
  }

  stop() {
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch {
        /* noop */
      }
    }
    this._setListening(false);
  }

  /** Ask the backend TTS endpoint for audio; fall back to browser TTS. */
  async speak(text: string, lang?: string): Promise<void> {
    const payloadLang = (lang || this.lang).split('-')[0];
    try {
      const res = await fetch('/api/v1/voice/tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(localStorage.getItem('auth_token')
            ? { Authorization: `Bearer ${localStorage.getItem('auth_token')}` }
            : {}),
        },
        body: JSON.stringify({ text, language: payloadLang }),
      });
      const ct = res.headers.get('content-type') || '';
      if (res.ok && ct.startsWith('audio/')) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audio.play().catch(() => this._browserSpeak(text, lang));
        return;
      }
    } catch {
      /* fall through to browser TTS */
    }
    this._browserSpeak(text, lang);
  }

  private _browserSpeak(text: string, lang?: string) {
    if (typeof window === 'undefined' || !window.speechSynthesis) {return;}
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang || this.lang;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }
}

/** Server-side STT fallback helper (used only if Web Speech API missing). */
export async function transcribeViaServer(
  audioBlob: Blob,
  language = 'en',
): Promise<{ text: string; transcribed: boolean }> {
  const form = new FormData();
  form.append('audio', audioBlob, 'speech.webm');
  form.append('language', language);
  const data = await api.post<{ text: string; transcribed: boolean }>(
    '/v1/voice/transcribe',
    form,
  );
  return { text: data.text || '', transcribed: !!data.transcribed };
}
