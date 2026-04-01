/**
 * build.js — Homecoming 2026 versioning & deployment script
 *
 * Usage:
 *   node build.js              — deploy with auto-generated timestamp version
 *   node build.js v1.2.3      — deploy with specific version
 *   node build.js --check      — just show which files need updating
 *
 * What it does:
 *   1. Stamps a version into all HTML files so browsers get fresh assets after deploy
 *   2. Restarts the server cleanly (kills old process, starts fresh)
 *   3. Writes a VERSION file so you know what's running
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const PROJECT = __dirname;
const PUBLIC = path.join(PROJECT, 'public');
const SERVER_PID_FILE = path.join(PROJECT, '.server.pid');
const VERSION_FILE = path.join(PROJECT, '.version');

const VERSION = process.argv[2] || `v${Date.now()}`;
const IS_CHECK = process.argv.includes('--check');

// ─── Find all HTML files in public/ ──────────────────────────────────────────
function findHtmlFiles() {
  return fs.readdirSync(PUBLIC)
    .filter(f => f.endsWith('.html'))
    .map(f => path.join(PUBLIC, f));
}

// ─── Assets that need versioning (local only, not external/CDN) ───────────────
const ASSET_PATTERNS = [
  // Match local CSS and JS refs — skip if already versioned, replace if not
  { pattern: /href="(\/css\/[^\?"]+)"/g,    replacement: `href="$1?v=${VERSION}"` },
  { pattern: /href="(\/js\/[^\?"]+)"/g,     replacement: `href="$1?v=${VERSION}"` },
  { pattern: /src="(\/js\/[^\?"]+)"/g,     replacement: `src="$1?v=${VERSION}"` },
];

// ─── Rewrite an HTML file, adding version to local CSS/JS ─────────────────────
function versionFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;
  for (const { pattern, replacement } of ASSET_PATTERNS) {
    const newContent = content.replace(pattern, replacement);
    if (newContent !== content) {
      content = newContent;
      changed = true;
    }
  }
  if (changed) {
    fs.writeFileSync(filePath, content, 'utf8');
    return path.basename(filePath);
  }
  return null;
}

// ─── Kill the old server process ──────────────────────────────────────────────
function stopServer() {
  try {
    const pid = parseInt(fs.readFileSync(SERVER_PID_FILE, 'utf8').trim());
    process.kill(pid, 'SIGTERM');
    console.log(`  Stopped old server (PID ${pid})`);
    fs.unlinkSync(SERVER_PID_FILE);
  } catch (e) {
    if (e.code === 'ENOENT') {
      // No PID file — try finding process on port 3000
      try {
        const out = execSync(`netstat -ano | findstr ":3000" | findstr "LISTEN"`, { encoding: 'utf8' });
        const match = out.match(/LISTENING\s+(\d+)/m) || out.match(/(\d+)\s*$/m);
        if (match) {
          const pid = parseInt(match[1]);
          process.kill(pid, 'SIGTERM');
          console.log(`  Stopped old server on port 3000 (PID ${pid})`);
        }
      } catch {}
    } else {
      console.log(`  Could not stop old server: ${e.message}`);
    }
  }
}

// ─── Start the server fresh ────────────────────────────────────────────────────
function startServer() {
  // Give OS time to free the port
  execSync('powershell -Command "Start-Sleep -Seconds 1"', { stdio: 'ignore' });
  const child = require('child_process').spawn(
    process.execPath,
    [path.join(PROJECT, 'server.js')],
    { detached: true, stdio: 'ignore', cwd: PROJECT }
  );
  child.unref();
  const pid = child.pid;
  fs.writeFileSync(SERVER_PID_FILE, String(pid), 'utf8');
  console.log(`  Server started (PID ${pid})`);
}

// ─── Show which files are outdated ───────────────────────────────────────────
function check() {
  const unversioned = [];
  for (const file of findHtmlFiles()) {
    const content = fs.readFileSync(file, 'utf8');
    const bases = [
      '/css/style.css', '/js/app.js', '/js/booking.js'
    ];
    for (const base of bases) {
      if (!content.includes(`${base}?v=`) && content.includes(`"${base}"`)) {
        unversioned.push(`${path.basename(file)}: ${base} — needs ?v= stamp`);
      }
    }
  }
  if (unversioned.length === 0) {
    console.log('All assets are versioned.');
  } else {
    console.log('Needs versioning:');
    unversioned.forEach(u => console.log('  ' + u));
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  if (IS_CHECK) {
    check();
    return;
  }

  console.log(`\n🏗  Homecoming 2026 Build — ${VERSION}`);
  console.log('─'.repeat(40));

  // 1. Stamp all HTML files
  const stamped = [];
  for (const file of findHtmlFiles()) {
    const name = versionFile(file);
    if (name) stamped.push(name);
  }
  if (stamped.length > 0) {
    console.log(`  Stamped: ${stamped.join(', ')}`);
  } else {
    console.log('  No files needed updating (already versioned)');
  }

  // 2. Save version
  fs.writeFileSync(VERSION_FILE, `${VERSION} | ${new Date().toISOString()}\n`, 'utf8');
  console.log(`  Version: ${VERSION}`);

  // 3. Restart server
  console.log('\n🔄  Restarting server...');
  stopServer();
  startServer();

  console.log('\n✅  Deployed! http://localhost:3000');
  console.log(`   Version: ${VERSION}`);
  console.log('');
}

main().catch(err => {
  console.error('Build failed:', err);
  process.exit(1);
});
