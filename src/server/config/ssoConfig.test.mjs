import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const root = new URL('../../../../', import.meta.url);
const clients = [
  'baksa-unusu/src/client/services/ssoConfig.ts',
  'baksi-unusu/src/client/services/ssoConfig.ts',
  'esurat-unusu/src/client/lib/ssoConfig.ts',
  'lpm-unusu/src/client/lib/ssoConfig.ts',
  'lppm-unusu/src/client/lib/ssoConfig.ts',
  'prodi-unusu/src/client/services/ssoConfig.ts',
  'unusu-akreditasi/src/services/ssoConfig.js',
  'unusu-lms/src/services/ssoConfig.js',
  'unusu-sarpras/src/services/ssoConfig.js',
];
for (const file of clients) {
  const source = readFileSync(new URL(file, root), 'utf8').replace('export const', 'const').replaceAll('import.meta.env', 'env');
  const evaluate = (env) => runInNewContext(`${source}\nONE_UNUSU_URL`, { env, URL });
  assert.equal(evaluate({ DEV: true }), 'http://localhost:5173', file);
  assert.throws(() => evaluate({ DEV: false }), /VITE_ONE_UNUSU_URL/, file);
  assert.throws(() => evaluate({ DEV: false, VITE_ONE_UNUSU_URL: 'javascript:alert(1)' }), /HTTP/, file);
  assert.throws(() => evaluate({ DEV: false, VITE_ONE_UNUSU_URL: '/authorize' }), /Invalid URL/, file);
  assert.equal(evaluate({ DEV: false, VITE_ONE_UNUSU_URL: 'https://portal.example/sso' }), 'https://portal.example/sso', file);
}
for (const app of ['baksa-unusu', 'baksi-unusu', 'esurat-unusu', 'lpm-unusu', 'lppm-unusu']) {
  const source = readFileSync(new URL(`${app}/src/server/index.ts`, root), 'utf8');
  const guard = source.slice(source.indexOf('dotenv.config();') + 'dotenv.config();'.length, source.indexOf('const app ='));
  const evaluate = (env) => runInNewContext(`${guard}\nSSO_BASE_URL`, { process: { env }, URL });
  assert.throws(() => evaluate({ NODE_ENV: 'production' }), /SSO_BASE_URL/, app);
  assert.throws(() => evaluate({ NODE_ENV: 'production', SSO_BASE_URL: ' ' }), /SSO_BASE_URL/, app);
  assert.throws(() => evaluate({ SSO_BASE_URL: 'file:///tmp/portal' }), /HTTP/, app);
  assert.equal(evaluate({ NODE_ENV: 'production', SSO_BASE_URL: 'http://localhost:5000' }), 'http://localhost:5000', app);
  assert.match(evaluate({ NODE_ENV: 'development' }), /^http:\/\/localhost:5000/, app);
  assert.equal((source.match(/process\.env\.SSO_BASE_URL\s*\|\|/g) || []).length, 1, app);
}
const configSource = readFileSync(new URL('./index.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(configSource, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const evaluateConfig = (env) => {
  const exports = {};
  runInNewContext(compiled, { exports, process: { env: { DATABASE_URL: 'unused', JWT_SECRET: 'unused', ...env } }, URL });
  return exports.config;
};
assert.equal(evaluateConfig({ NODE_ENV: 'development' }).sso.baseUrl, 'http://localhost:5173');
assert.throws(() => evaluateConfig({ NODE_ENV: 'production' }), /SSO_BASE_URL/);
assert.throws(() => evaluateConfig({ NODE_ENV: 'production', SSO_BASE_URL: 'http://localhost:5000' }), /SSO_PORTAL_URL/);
assert.throws(() => evaluateConfig({ SSO_BASE_URL: 'file:///tmp/portal' }), /HTTP/);
assert.equal(evaluateConfig({ NODE_ENV: 'production', SSO_BASE_URL: 'http://localhost:5000', SSO_PORTAL_URL: 'https://portal.example' }).sso.baseUrl, 'http://localhost:5000');
console.log('SSO config checks passed: 9 clients, 5 backend startup guards, Prodi config.');
