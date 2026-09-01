import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { prefetchApiHealth } from './api/http'
import './index.css'

void prefetchApiHealth()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
