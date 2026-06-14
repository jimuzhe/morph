import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = new URL('..', import.meta.url).pathname
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
const version = pkg.version
const out = join(root, `htmlppt-editor-v${version}.zip`)

execSync(`cd dist && zip -r "${out}" . -x "*.DS_Store"`, { stdio: 'inherit' })
console.log(`\n✓ ${out}`)
