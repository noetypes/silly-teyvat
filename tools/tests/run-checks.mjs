#!/usr/bin/env node
// Run every check that needs no browser or SillyTavern server, in parallel, and print one line each:
// `node --check` on every extension module, then tools/tests/test-*.mjs (except *-browser.mjs) and
// test-*.py. Exits 1 if any fails, after printing the end of its output.
//
//   node tools/tests/run-checks.mjs            # everything
//   node tools/tests/run-checks.mjs tcg trust  # only checks whose file name contains one of these words
import {spawn} from 'node:child_process';
import {readdirSync} from 'node:fs';
import {cpus} from 'node:os';
import {dirname, join, relative} from 'node:path';
import {fileURLToPath} from 'node:url';

const tests = dirname(fileURLToPath(import.meta.url));
const repo = join(tests, '..', '..');
const extension = join(repo, 'extension', 'genshin-dialogue-ui');
const filters = process.argv.slice(2);
const wanted = name => !filters.length || filters.some(word => name.includes(word));

const checks = readdirSync(tests).sort()
    .filter(name => /^test-.*\.(mjs|py)$/.test(name) && !name.endsWith('-browser.mjs') && wanted(name))
    .map(name => ({name, command: name.endsWith('.py') ? 'python3' : process.execPath, args: [join(tests, name)]}));
const modules = readdirSync(extension).filter(name => name.endsWith('.js')).sort();
if (!filters.length || filters.includes('syntax'))
    checks.unshift({name: `node --check (${modules.length} extension modules)`, command: process.execPath,
        args: ['-e', `for (const f of ${JSON.stringify(modules)}) require('node:child_process').execFileSync(process.execPath, ['--check', f], {cwd: ${JSON.stringify(extension)}, stdio: 'inherit'})`]});

function run({name, command, args}) {
    return new Promise(resolve => {
        const started = Date.now();
        const child = spawn(command, args, {cwd: repo, stdio: ['ignore', 'pipe', 'pipe']});
        let output = '';
        child.stdout.on('data', chunk => output += chunk);
        child.stderr.on('data', chunk => output += chunk);
        // A hung check must not block the run (macOS has no `timeout`).
        const timer = setTimeout(() => { output += '\nTimed out after 5 minutes.'; child.kill('SIGKILL'); }, 300_000);
        child.on('close', code => {
            clearTimeout(timer);
            resolve({name, ok: code === 0, seconds: (Date.now() - started) / 1000, output: output.trim()});
        });
    });
}

const results = [];
const queue = [...checks];
await Promise.all(Array.from({length: Math.max(1, Math.min(cpus().length, 8))}, async () => {
    for (let check = queue.shift(); check; check = queue.shift()) {
        const result = await run(check);
        results.push(result);
        console.log(`${result.ok ? 'ok  ' : 'FAIL'} ${result.seconds.toFixed(1).padStart(5)}s  ${result.name}`);
    }
}));
const failed = results.filter(result => !result.ok);
for (const {name, output} of failed)
    console.log(`\n--- ${name} ---\n${output.split('\n').slice(-25).join('\n')}`);
console.log(`\n${results.length - failed.length} of ${results.length} checks passed.${checks.length ? '' : ` No check matched: ${filters.join(' ')}`}`);
console.log(`Browser checks (tools/tests/*-browser.mjs, the preview suites) are not included; see ${relative(repo, join(repo, 'docs/development/DEVELOPMENT.md'))}.`);
process.exitCode = failed.length || !checks.length ? 1 : 0;
