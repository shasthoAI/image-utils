import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import App from './modules/App'
import { ThemeProvider } from './components/theme-provider'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider defaultTheme="system" storageKey="ui-theme">
      <App />
    </ThemeProvider>
  </React.StrictMode>,
)

