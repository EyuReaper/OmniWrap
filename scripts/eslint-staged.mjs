/**
 * Pre-commit ESLint runner for lint-staged.
 *
 * lint-staged v17 executes commands WITHOUT a shell, so `cd X && eslint ...`
 * is impossible inline. This wrapper reproduces `npm run lint` semantics:
 * it runs the workspace ESLint binary from apps/web (where the flat config,
 * plugins, and Next's page-directory detection all live), converting the
 * repo-root-relative paths lint-staged appends into absolute ones.
 *
 * Usage (from any cwd): node scripts/eslint-staged.mjs <file> [<file>...]
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const webRoot = path.join(repoRoot, 'apps', 'web');
const eslintBin = path.join(webRoot, 'node_modules', '.bin', 'eslint');

const absolute = (f) => (path.isAbsolute(f) ? f : path.join(process.cwd(), f));

const result = spawnSync(
  eslintBin,
  ['--fix', '--no-warn-ignored', '--max-warnings', '0', ...process.argv.slice(2).map(absolute)],
  { cwd: webRoot, stdio: 'inherit' },
);

process.exit(result.status ?? 1);
