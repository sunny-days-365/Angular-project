#!/usr/bin/env node

// dev-tools/run-sirv.mjs (ESM, verbose logging, cross-platform)
//
// 仕様:
// - dist/ 配下を再帰スキャンして "index.html" を含むディレクトリを候補とする
// - 候補が 1 個だけ見つかった場合のみ採用。0 or 複数ならエラー
// - --dist, --port を受け付ける（--port > ENV PORT > 4200）
// - Windows での .cmd/.ps1 呼び出しに対応するため shell:true
// - PATH に (cwd〜親へ遡って) node_modules/.bin を前置追加して sirv 解決性を高める
//
// Node: v18+ で動作確認想定

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const LOG_PREFIX = '[run-sirv]';

// [memo]
// Node.js 実行環境では console / process は組み込みグローバルだが、
// ESLint が Node 環境設定を認識していない場合に "no-undef" エラーとなるため明示宣言。
// （eslint-env が効かない構成対策）
//
/* global console, process */
const log = (...args) => console.log(LOG_PREFIX, ...args);
const warn = (...args) => console.warn(LOG_PREFIX, ...args);
const error = (...args) => console.error(LOG_PREFIX, ...args);

function parseArgs(argv) {
  // サポート: --port 1234 | --port=1234, --dist ./some/dir | --dist=./some/dir
  const args = { port: undefined, dist: undefined };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--port' && i + 1 < argv.length) {
      args.port = String(argv[++i]);
    } else if (a.startsWith('--port=')) {
      args.port = String(a.slice('--port='.length));
    } else if (a === '--dist' && i + 1 < argv.length) {
      args.dist = String(argv[++i]);
    } else if (a.startsWith('--dist=')) {
      args.dist = String(a.slice('--dist='.length));
    }
  }
  return args;
}

function getPort(argPort) {
  const p = argPort || process.env.PORT || '4200';
  const n = Number(p);
  if (!Number.isFinite(n) || n < 1 || n > 65535) {
    throw new Error(`不正なポート指定: "${p}"（1〜65535 の整数が必要）`);
  }
  return String(n);
}

function buildBinPathEnv(startDir) {
  // cwd から親へ遡って node_modules/.bin を PATH 先頭に積む
  const bins = [];
  let dir = startDir;
  while (true) {
    const bin = path.join(dir, 'node_modules', '.bin');
    if (fs.existsSync(bin)) bins.push(bin);
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  const sep = process.platform === 'win32' ? ';' : ':';
  const currentPath = process.env.PATH || '';
  const newPath = (bins.length ? bins.join(sep) + sep : '') + currentPath;
  return { bins, newPath };
}

function hasIndexHtml(dir) {
  try {
    const stat = fs.statSync(dir);
    if (!stat.isDirectory()) return false;
  } catch {
    return false;
  }
  const indexPath = path.join(dir, 'index.html');
  return fs.existsSync(indexPath) && fs.statSync(indexPath).isFile();
}

function scanForIndexHtmlDirs(distRoot) {
  const results = [];
  const stack = [distRoot];

  while (stack.length) {
    const dir = stack.pop();
    if (hasIndexHtml(dir)) results.push(dir);

    let entries = [];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const e of entries) {
      if (!e.isDirectory()) continue;
      if (e.name === '.' || e.name === '..') continue;
      if (e.name === 'node_modules') continue;
      stack.push(path.join(dir, e.name));
    }
  }

  return results;
}

function resolveDistDir(cwd, explicitDist) {
  const distRoot = path.join(cwd, 'dist');

  log('作業ディレクトリ (cwd):', cwd);
  log('dist ルート候補:', distRoot);

  if (explicitDist) {
    const abs = path.resolve(cwd, explicitDist);
    log('明示的指定 --dist:', explicitDist, '→ 絶対パス:', abs);

    if (!fs.existsSync(abs))
      throw new Error(`--dist で指定されたパスが存在しません: ${abs}`);
    if (!fs.statSync(abs).isDirectory())
      throw new Error(`--dist 指定はディレクトリである必要があります: ${abs}`);
    if (!hasIndexHtml(abs))
      throw new Error(
        `--dist 指定ディレクトリに index.html が見つかりません: ${abs}`,
      );

    log('→ --dist 指定のディレクトリを採用:', abs);
    return abs;
  }

  if (!fs.existsSync(distRoot) || !fs.statSync(distRoot).isDirectory()) {
    throw new Error(`dist ディレクトリが見つかりません: ${distRoot}`);
  }

  log('dist 配下を再帰スキャンして "index.html" を含む候補を探索します...');
  const candidates = scanForIndexHtmlDirs(distRoot);

  log('探索候補数:', candidates.length);
  for (const c of candidates) log('  候補:', c);

  if (candidates.length === 0) {
    throw new Error(
      'dist 配下に "index.html" を含むディレクトリが見つかりません。--dist で明示指定してください。',
    );
  }
  if (candidates.length > 1) {
    throw new Error(
      '候補が複数見つかりました。対象を 1 個に絞るか、--dist で明示指定してください。',
    );
  }

  const chosen = candidates[0];
  log('→ 採用ディレクトリ:', chosen);
  return chosen;
}

function findFirstExistingSirvBin(binDirs) {
  const isWin = process.platform === 'win32';
  const names = isWin ? ['sirv.cmd', 'sirv.ps1', 'sirv'] : ['sirv'];
  for (const dir of binDirs) {
    for (const n of names) {
      const p = path.join(dir, n);
      if (fs.existsSync(p)) return p;
    }
  }
  return null;
}

function run() {
  try {
    const cwd = process.cwd();
    const argv = process.argv;
    const parsed = parseArgs(argv);

    log('受け取った引数:', argv.slice(2).join(' ') || '(なし)');
    log('環境変数 PORT:', process.env.PORT ?? '(未設定)');

    const port = getPort(parsed.port);
    log('決定ポート:', port, '(優先順位: --port > ENV PORT > 4200)');

    const { bins, newPath } = buildBinPathEnv(cwd);
    log('PATH に前置する node_modules/.bin の候補:');
    if (bins.length === 0) {
      warn('  見つかりませんでした（グローバル or システム PATH に依存）。');
    } else {
      for (const b of bins) log('  -', b);
    }

    const env = { ...process.env, PATH: newPath };

    const probableSirv = findFirstExistingSirvBin(bins);
    if (probableSirv) {
      log('sirv 推定実体:', probableSirv);
    } else {
      warn(
        'sirv の実体が .bin で見つかりませんでした。shell 解決 or グローバル PATH に依存します。',
      );
      warn(
        '必要なら `npm i -D sirv-cli`（またはワークスペースルートにインストール）をご検討ください。',
      );
    }

    const distDir = resolveDistDir(cwd, parsed.dist);
    log('sirv に渡すルート:', distDir);

    const args = [
      distDir,
      '--single',
      '--host',
      '0.0.0.0',
      '--port',
      String(port),
    ];
    log('sirv 起動引数:', args.join(' '));

    const useShell = process.platform === 'win32';
    log('spawn 設定: shell =', useShell, ', stdio = inherit, cwd =', cwd);

    const child = spawn('sirv', args, {
      stdio: 'inherit',
      env,
      cwd,
      shell: useShell, // Windows で .cmd/.ps1 を OS に解決させる
    });

    child.on('error', (err) => {
      error('spawn エラー:', err && err.code ? err.code : err);
      if (err && (err.code === 'ENOENT' || err.code === 'EINVAL')) {
        error(
          'トラブルシューティング:\n' +
            '  1) sirv (sirv-cli) がこのプロジェクト or ワークスペースにインストールされているか\n' +
            '  2) PATH の先頭に node_modules/.bin を前置できているか（上記ログ参照）\n' +
            '  3) monorepo の場合はルートに .bin が生成されているか\n' +
            '  4) 代替として `npx sirv` を使う方法もあります\n',
        );
      }
      process.exit(1);
    });

    child.on('exit', (code, signal) => {
      if (signal) {
        error(`sirv 終了シグナル: ${signal}`);
        process.exit(1);
      }
      log('sirv プロセス終了。コード:', code ?? 0);
      process.exit(code ?? 0);
    });
  } catch (e) {
    error('初期化エラー:', e && e.message ? e.message : e);
    process.exit(1);
  }
}

run();
