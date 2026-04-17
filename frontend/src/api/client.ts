import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
})

export function configureApiBaseUrl(baseURL: string) {
  api.defaults.baseURL = baseURL
}

export default api
