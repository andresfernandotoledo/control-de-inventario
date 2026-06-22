import { execSync } from 'child_process'
import { existsSync, cpSync, rmSync, mkdirSync, statSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const dist = join(root, 'dist')

function size(path) {
  try {
    const bytes = statSync(path).size
    return bytes > 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${(bytes / 1024).toFixed(0)} KB`
  } catch { return '?' }
}

console.log('=== 1. Building React client ===')
execSync('npx vite build', { cwd: join(root, 'client'), stdio: 'inherit' })

console.log('\n=== 2. Bundling server with esbuild ===')
mkdirSync(dist, { recursive: true })
execSync(
  `npx esbuild server/src/index.ts --bundle --platform=node --target=node18 ` +
  `--outfile=dist/inventario-server.cjs --external:sql.js --external:bcryptjs`,
  { cwd: root, stdio: 'inherit' }
)

console.log('\n=== 3. Copying sql.js WASM and node_modules for pkg ===')
const nodeModulesTarget = join(dist, 'node_modules')
if (!existsSync(nodeModulesTarget)) mkdirSync(nodeModulesTarget, { recursive: true })
;['sql.js', 'bcryptjs'].forEach(mod => {
  const src = join(root, 'node_modules', mod)
  const dst = join(nodeModulesTarget, mod)
  if (existsSync(dst)) rmSync(dst, { recursive: true })
  if (existsSync(src)) cpSync(src, dst, { recursive: true })
})

console.log('\n=== 4. Copying client dist ===')
const clientTarget = join(dist, 'client', 'dist')
if (existsSync(clientTarget)) rmSync(clientTarget, { recursive: true })
mkdirSync(join(dist, 'client'), { recursive: true })
cpSync(join(root, 'client', 'dist'), clientTarget, { recursive: true })

console.log('\n=== 5. Copying .env template ===')
const envSrc = join(root, '.env')
const envDst = join(dist, '.env')
if (existsSync(envSrc)) cpSync(envSrc, envDst)

console.log('\n=== 6. Creating .exe with pkg ===')
const pkgConfig = { assets: ['dist/client/**/*', 'dist/node_modules/**/*'], targets: ['node18-win-x64'] }
const configPath = join(dist, 'pkg-config.json')
writeFileSync(configPath, JSON.stringify(pkgConfig, null, 2))

try {
  execSync(
    `npx @yao-pkg/pkg dist/inventario-server.cjs --config dist/pkg-config.json --output dist/inventario-server.exe`,
    { cwd: root, stdio: 'inherit' }
  )
  console.log('\n✓ inventario-server.exe created in dist/')
} catch {
  console.log('\n⚠ pkg failed. Fallback is ready at dist/inventario-server.cjs')
} finally {
  if (existsSync(configPath)) rmSync(configPath)
}

  console.log('\n=== 7. Applying .exe icon ===')
  const exePath = join(dist, 'inventario-server.exe')
  if (existsSync(exePath)) {
    const icoPath = join(root, 'client', 'public', 'favicon.ico')
    try {
      execSync(`npx @yao-pkg/rcedit "${exePath}" --set-icon "${icoPath}"`, { cwd: root, stdio: 'pipe', timeout: 30000 })
      console.log('✓ Icon applied to .exe')
    } catch {
      console.log('⚠ rcedit not available. Icon not applied. Install: npm i -g @yao-pkg/rcedit')
    }
  }

  console.log('\n=== Build complete ===')
  console.log(`  - Server bundle: dist/inventario-server.cjs (${size(join(dist, 'inventario-server.cjs'))})`)
  console.log(`  - Client files:  dist/client/dist/`)
  if (existsSync(exePath)) {
    console.log(`  - Windows exe:   ${exePath} (${size(exePath)})`)
  }
