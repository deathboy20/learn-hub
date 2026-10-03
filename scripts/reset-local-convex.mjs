#!/usr/bin/env node
/**
 * Wipes the local anonymous Convex SQLite database (stop `pnpm dev` first).
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const projectRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const localDir = path.join(projectRoot, '.convex', 'local', 'default')

function removeIfExists(target) {
  if (fs.existsSync(target)) {
    fs.rmSync(target, { recursive: true, force: true })
    console.log(`Removed ${path.relative(projectRoot, target)}`)
  }
}

removeIfExists(path.join(localDir, 'convex_local_backend.sqlite3'))
removeIfExists(path.join(localDir, 'convex_local_backend.sqlite3-wal'))
removeIfExists(path.join(localDir, 'convex_local_backend.sqlite3-shm'))
removeIfExists(path.join(localDir, 'convex_local_storage'))

console.log('')
console.log('Local Convex data wiped.')
console.log('1. Start (or restart) `pnpm dev` and wait until Convex functions are ready.')
console.log('2. Run `pnpm convex:bootstrap` to configure auth, env, and seed all roles.')
