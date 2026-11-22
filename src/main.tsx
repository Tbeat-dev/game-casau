import { createRoot } from 'react-dom/client';
import '@fontsource/be-vietnam-pro/vietnamese-400.css';
import '@fontsource/be-vietnam-pro/vietnamese-600.css';
import '@fontsource/be-vietnam-pro/vietnamese-700.css';
import '@fontsource/be-vietnam-pro/vietnamese-800.css';
import '@fontsource/be-vietnam-pro/latin-400.css';
import '@fontsource/be-vietnam-pro/latin-600.css';
import '@fontsource/be-vietnam-pro/latin-700.css';
import '@fontsource/be-vietnam-pro/latin-800.css';
import '@fontsource/noto-serif/vietnamese-700.css';
import '@fontsource/noto-serif/vietnamese-800.css';
import '@fontsource/noto-serif/latin-700.css';
import '@fontsource/noto-serif/latin-800.css';
import App from './App.tsx';
import './index.css';
import './ui/theme.css';

createRoot(document.getElementById('root')!).render(<App />);
