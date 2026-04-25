import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import jsyaml from 'js-yaml'

// fetch config.yaml
async function initConfig() {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000); // Chỉ đợi tối đa 5 giây

  try {
    const res = await fetch('/config.yaml', { signal: controller.signal });
    clearTimeout(timeoutId);
    if (res.ok) {
      const text = await res.text();
      window.__ENV__ = jsyaml.load(text);
    } else {
      window.__ENV__ = {};
    }
  } catch (e) {
    console.warn("Failed to load config.yaml", e);
    window.__ENV__ = {};
  }
};

await initConfig();
const { default: App } = await import('./App.jsx');

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

