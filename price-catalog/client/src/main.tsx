import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// Инициализация user_id при первом запуске
import { getUserId } from './utils/localStorage'
getUserId()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
