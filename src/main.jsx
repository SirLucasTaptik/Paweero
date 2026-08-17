import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'

// Yayındaki sürümü üç yerden okunabilir kıl: sayfa kaynağında <meta>, konsolda
// tek satır, ve konsola yazmadan bakmak için window.__BUILD__.
window.__BUILD__ = __BUILD_INFO__
const meta = document.createElement('meta')
meta.name = 'build'
meta.content = `${__BUILD_INFO__.commit} · ${__BUILD_INFO__.branch} · ${__BUILD_INFO__.at}`
document.head.appendChild(meta)
console.info('Paweero build:', meta.content)

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
