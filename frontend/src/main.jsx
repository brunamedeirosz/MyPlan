import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './planner.css'
import App from './PersonalApp.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
