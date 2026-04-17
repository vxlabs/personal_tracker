import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { configureApiBaseUrl } from '@/api/client'
import { initializeRuntimeConfig } from '@/runtime/config'
import App from './App.tsx'

async function bootstrap() {
  const runtimeConfig = await initializeRuntimeConfig()
  configureApiBaseUrl(runtimeConfig.apiBaseUrl)

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

void bootstrap()
