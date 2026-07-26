export type Language = 'en' | 'kn';

export const COPILOT_TEXT: Record<Language, {
  placeholder: string;
  askAnything: string;
  askSubtext: string;
  analysing: string;
  thinking: string;
  listening: string;
  dockLabel: string;
  voiceLang: string;
  toggleLabel: string;
}> = {
  en: {
    placeholder: 'Ask about FIRs, districts, patterns...',
    askAnything: 'Ask me anything',
    askSubtext: 'about crime patterns, cases, districts, or predictions.',
    analysing: 'Analysing 4 divisions · 31 districts · 906 stations',
    thinking: 'Analysing...',
    listening: 'Listening...',
    dockLabel: 'AI Copilot  ·  Ask anything',
    voiceLang: 'en-IN',
    toggleLabel: 'ಕನ್ನಡ',
  },
  kn: {
    placeholder: 'ಎಫ್ಐಆರ್, ಜಿಲ್ಲೆಗಳ ಬಗ್ಗೆ ಕೇಳಿ...',
    askAnything: 'ಏನನ್ನಾದರೂ ಕೇಳಿ',
    askSubtext: 'ಅಪರಾಧ ಮಾದರಿಗಳು, ಪ್ರಕರಣಗಳು, ಜಿಲ್ಲೆಗಳ ಬಗ್ಗೆ.',
    analysing: '4 ವಿಭಾಗಗಳು · 31 ಜಿಲ್ಲೆಗಳು · 906 ಠಾಣೆಗಳು ವಿಶ್ಲೇಷಿಸಲಾಗುತ್ತಿದೆ',
    thinking: 'ವಿಶ್ಲೇಷಿಸಲಾಗುತ್ತಿದೆ...',
    listening: 'ಆಲಿಸಲಾಗುತ್ತಿದೆ...',
    dockLabel: 'AI ಸಹಾಯಕ  ·  ಕೇಳಿ',
    voiceLang: 'kn-IN',
    toggleLabel: 'English',
  },
};
