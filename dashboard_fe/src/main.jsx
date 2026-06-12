import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { initConfig } from './utils/config.js'


await initConfig();
const { default: App } = await import('./App.jsx');

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

