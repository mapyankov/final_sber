#!/usr/bin/env node
/**
 * Dev launcher: sets up Python venv, installs backend deps,
 * starts FastAPI + Vite, opens browser.
 */
const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');

const ROOT = __dirname;
const BACKEND = path.join(ROOT, 'backend');
const FRONTEND = path.join(ROOT, 'frontend');
const VENV = path.join(BACKEND, 'venv');
const isWin = process.platform === 'win32';

function log(msg) {
  console.log(`[dev] ${msg}`);
}

function pythonCmd() {
  if (isWin) return path.join(VENV, 'Scripts', 'python.exe');
  return path.join(VENV, 'bin', 'python');
}

function pipCmd() {
  if (isWin) return path.join(VENV, 'Scripts', 'pip.exe');
  return path.join(VENV, 'bin', 'pip');
}

function findSystemPython() {
  const candidates = isWin
    ? ['py -3.11', 'py -3', 'python', 'python3']
    : ['python3.11', 'python3', 'python'];
  for (const cmd of candidates) {
    try {
      const out = execSync(`${cmd} --version`, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
      if (/3\.(9|[1-9][0-9])/.test(out) && !/3\.0\./.test(out)) {
        return cmd.split(' ')[0] === 'py' ? 'py -3' : cmd;
      }
    } catch {
      /* try next */
    }
  }
  return null;
}

function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      stdio: 'inherit',
      shell: isWin,
      ...opts,
    });
    child.on('error', reject);
    child.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`Exit ${code}`))));
  });
}

function runSync(cmd, args, opts = {}) {
  execSync([cmd, ...args].join(' '), {
    stdio: 'inherit',
    shell: true,
    cwd: opts.cwd || ROOT,
    env: { ...process.env, ...opts.env },
  });
}

async function setupBackend() {
  const py = findSystemPython();
  if (!py) {
    console.error('Python 3.11+ not found. Install from https://www.python.org/downloads/');
    process.exit(1);
  }
  log(`Using system Python: ${py}`);

  if (!fs.existsSync(VENV)) {
    log('Creating virtual environment...');
    runSync(py, ['-m', 'venv', VENV]);
  }

  const pip = pipCmd();
  const python = pythonCmd();

  log('Installing backend dependencies...');
  runSync(pip, ['install', '-q', '-r', 'requirements.txt'], { cwd: BACKEND });

  log('Downloading NLTK data...');
  try {
    runSync(python, ['-c', `
import nltk
for r in ('punkt', 'punkt_tab', 'stopwords'):
    try:
        nltk.download(r, quiet=True)
    except Exception:
        pass
`], { cwd: BACKEND });
  } catch (e) {
    log('NLTK download warning (non-fatal)');
  }

  try {
    execSync(`"${python}" -c "import spacy"`, { stdio: 'ignore', cwd: BACKEND });
    log('Checking spaCy models (optional)...');
    try {
      runSync(python, ['-m', 'spacy', 'download', 'ru_core_news_sm'], { cwd: BACKEND });
    } catch { /* optional */ }
    try {
      runSync(python, ['-m', 'spacy', 'download', 'en_core_web_sm'], { cwd: BACKEND });
    } catch { /* optional */ }
  } catch {
    log('spaCy not installed — using NLTK + regex NER');
  }
}

function waitForUrl(url, maxAttempts = 60) {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    const tick = () => {
      attempts++;
      const req = http.get(url, (res) => {
        res.resume();
        if (res.statusCode && res.statusCode < 500) resolve();
        else if (attempts < maxAttempts) setTimeout(tick, 500);
        else reject(new Error('Timeout'));
      });
      req.on('error', () => {
        if (attempts < maxAttempts) setTimeout(tick, 500);
        else reject(new Error('Timeout'));
      });
    };
    tick();
  });
}

function openBrowser(url) {
  const cmd = isWin ? `start "" "${url}"` : process.platform === 'darwin' ? `open "${url}"` : `xdg-open "${url}"`;
  try {
    execSync(cmd, { shell: true, stdio: 'ignore' });
  } catch {
    log(`Open manually: ${url}`);
  }
}

async function main() {
  log('Test Generator — starting dev environment');

  if (!fs.existsSync(path.join(FRONTEND, 'node_modules'))) {
    log('Installing frontend dependencies...');
    runSync('npm', ['install'], { cwd: FRONTEND });
  }

  await setupBackend();

  const python = pythonCmd();
  const backendProc = spawn(
    python,
    ['-m', 'uvicorn', 'app.main:app', '--host', '127.0.0.1', '--port', '8000', '--reload'],
    {
      cwd: BACKEND,
      stdio: 'inherit',
      shell: false,
      env: { ...process.env, PYTHONPATH: BACKEND },
    },
  );

  const frontendProc = spawn(isWin ? 'npm.cmd' : 'npm', ['run', 'dev'], {
    cwd: FRONTEND,
    stdio: 'inherit',
    shell: isWin,
  });

  const cleanup = () => {
    backendProc.kill();
    frontendProc.kill();
    process.exit(0);
  };
  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);

  try {
    await Promise.race([
      waitForUrl('http://127.0.0.1:8000/api/health'),
      new Promise((r) => setTimeout(r, 8000)),
    ]);
  } catch {
    log('Backend health check pending...');
  }

  try {
    await waitForUrl('http://127.0.0.1:5173');
    openBrowser('http://127.0.0.1:5173');
  } catch {
    log('Frontend starting — open http://127.0.0.1:5173 when ready');
  }

  log('Running. Press Ctrl+C to stop.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
