import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(__dirname, '..')
const webDistDir = path.join(projectRoot, 'dist')
const desktopDistDir = path.resolve(projectRoot, '../widget/dist/frontend')

if (!fs.existsSync(webDistDir)) {
  throw new Error(`Web build output not found at ${webDistDir}`)
}

fs.rmSync(desktopDistDir, { recursive: true, force: true })
fs.mkdirSync(desktopDistDir, { recursive: true })

for (const entry of ['assets', 'favicon.svg', 'icon-192.svg', 'icons.svg']) {
  const source = path.join(webDistDir, entry)
  if (!fs.existsSync(source)) {
    continue
  }

  const destination = path.join(desktopDistDir, entry)
  fs.cpSync(source, destination, { recursive: true })
}

const webIndexHtml = fs.readFileSync(path.join(webDistDir, 'index.html'), 'utf8')
const desktopIndexHtml = webIndexHtml
  .replace(/<link rel="manifest"[^>]+>/, '')
  .replace(/<script id="vite-plugin-pwa:register-sw"[^<]*<\/script>/, '')
  .replace(/(href|src)="\/(?!\/)/g, '$1="./')

fs.writeFileSync(path.join(desktopDistDir, 'index.html'), desktopIndexHtml)
