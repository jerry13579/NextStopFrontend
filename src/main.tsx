import { createRoot } from 'react-dom/client';
import App from './app/App.tsx';
import './styles/index.css';

const isIosDevice =
  /iPad|iPhone|iPod/.test(window.navigator.userAgent) ||
  (window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1);
const isNativeWebView = window.location.protocol === 'capacitor:' || window.location.protocol === 'ionic:';

if (isIosDevice) {
  document.documentElement.classList.add('ios-webview');
}

if (isNativeWebView) {
  document.documentElement.classList.add('native-webview');
}

const preventPageZoom = (event: Event) => {
  event.preventDefault();
};

document.addEventListener('gesturestart', preventPageZoom, { passive: false });
document.addEventListener('gesturechange', preventPageZoom, { passive: false });
document.addEventListener('gestureend', preventPageZoom, { passive: false });

createRoot(document.getElementById('root')!).render(<App />);
