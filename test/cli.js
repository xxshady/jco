import { deepStrictEqual, ok, strictEqual } from 'node:assert';
import { readFile, rm } from 'node:fs/promises';
import { fileURLToPath } from 'url';
import { exec, jcoPath } from './helpers.js';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';

export async function cliTest (fixtures) {
  suite('CLI', () => {
    const outDir = resolve(tmpdir(), 'out-component-dir');
    const outFile = resolve(tmpdir(), 'out-component-file');

    async function cleanup() {
      try {
        await rm(outDir, { recursive: true });
        await rm(outFile);
      }
      catch {}
    }

    test('Transpile', async () => {
      try {
        const name = 'flavorful';
        const { stderr } = await exec(jcoPath, 'transpile', `test/fixtures/${name}.component.wasm`, '--name', name, '-o', outDir);
        strictEqual(stderr, '');
        const source = await readFile(`${outDir}/${name}.js`);
        ok(source.toString().includes('export { exports'));
      }
      finally {
        await cleanup();
      }
    });

    test('Transpile & Optimize & Minify', async () => {
      try {
        const name = 'flavorful';
        const { stderr } = await exec(jcoPath, 'transpile', `test/fixtures/${name}.component.wasm`, '--name', name, '--valid-lifting-optimization', '--tla-compat', '--optimize', '--minify', '--base64-cutoff=0', '-o', outDir);
        strictEqual(stderr, '');
        const source = await readFile(`${outDir}/${name}.js`);
        ok(source.toString().includes('as exports,'));
      }
      finally {
        await cleanup();
      }
    });

    test('Transpile to JS', async () => {
      try {
        const name = 'flavorful';
        const { stderr } = await exec(jcoPath, 'transpile', `test/fixtures/${name}.component.wasm`, '--name', name, '--map', 'testwasi=./wasi.js', '--valid-lifting-optimization', '--tla-compat', '--js', '--base64-cutoff=0', '-o', outDir);
        strictEqual(stderr, '');
        const source = await readFile(`${outDir}/${name}.js`, 'utf8');
        ok(source.includes('./wasi.js'));
        ok(source.includes('testwasi'));
        ok(source.includes('FUNCTION_TABLE'));
        ok(source.includes('export const $init'));
      }
      finally {
        await cleanup();
      }
    });

    test('Optimize', async () => {
      try {
        const component = await readFile(`test/fixtures/flavorful.component.wasm`);
        const { stderr, stdout } = await exec(jcoPath, 'opt', `test/fixtures/flavorful.component.wasm`, '-o', outFile);
        strictEqual(stderr, '');
        ok(stdout.includes('Core Module 1:'));
        const optimizedComponent = await readFile(outFile);
        ok(optimizedComponent.byteLength < component.byteLength);
      }
      finally {
        await cleanup();
      }
    });

    test('Print & Parse', async () => {
      try {
        const { stderr, stdout } = await exec(jcoPath, 'print', `test/fixtures/flavorful.component.wasm`);
        strictEqual(stderr, '');
        strictEqual(stdout.slice(0, 10), '(component');
        {
          const { stderr, stdout } = await exec(jcoPath, 'print', `test/fixtures/flavorful.component.wasm`, '-o', outFile);
          strictEqual(stderr, '');
          strictEqual(stdout, '');
        }
        {
          const { stderr, stdout } = await exec(jcoPath, 'parse', outFile, '-o', outFile);
          strictEqual(stderr, '');
          strictEqual(stdout, '');
          ok(await readFile(outFile));
        }
      }
      finally {
        await cleanup();
      }
    });

    test('Wit & New', async () => {
      try {
        const { stderr, stdout } = await exec(jcoPath, 'wit', `test/fixtures/flavorful.component.wasm`);
        strictEqual(stderr, '');
        ok(stdout.includes('world component {'));

        {
          const { stderr, stdout } = await exec(jcoPath, 'wit', `test/fixtures/flavorful.component.wasm`, '-o', outFile);
          strictEqual(stderr, '');
          strictEqual(stdout, '');
        }

        {
          const { stderr, stdout } = await exec(jcoPath, 'embed', '--dummy', '--wit', outFile, '-m', 'language=javascript', '-m', 'processed-by=dummy-gen@test', '-o', outFile);
          strictEqual(stderr, '');
          strictEqual(stdout, '');
        }

        {
          const { stderr, stdout } = await exec(jcoPath, 'print', outFile);
          strictEqual(stderr, '');
          strictEqual(stdout.slice(0, 7), '(module');
        }
        {
          const { stderr, stdout } = await exec(jcoPath, 'new', outFile, '-o', outFile);
          strictEqual(stderr, '');
          strictEqual(stdout, '');
        }
        {
          const { stderr, stdout } = await exec(jcoPath, 'print', outFile);
          strictEqual(stderr, '');
          strictEqual(stdout.slice(0, 10), '(component');
        }
        {
          const { stdout, stderr } = await exec(jcoPath, 'metadata-show', outFile, '--json');
          strictEqual(stderr, '');
          const meta = JSON.parse(stdout);
          deepStrictEqual(meta[0].metaType, { tag: 'component', val: 4 });
          deepStrictEqual(meta[1].producers, [
            ['processed-by', [['wit-component', '0.7.4'], ['dummy-gen', 'test']]],
            ['language', [['javascript', '']]],
          ]);
        }
      }
      finally {
        await cleanup();
      }
    });

    test('Component new adapt', async () => {
      try {
        const { stderr } = await exec(jcoPath,
            'new',
            'test/fixtures/exitcode.wasm',
            '--adapt',
            'wasi_snapshot_preview1=lib/wasi_snapshot_preview1.reactor.wasm',
            '-o', outFile);
        strictEqual(stderr, '');
        {
          const { stderr, stdout } = await exec(jcoPath, 'print', outFile);
          strictEqual(stderr, '');
          strictEqual(stdout.slice(0, 10), '(component');
        }
      }
      finally {
        await cleanup();
      }
    });

    test('Extract metadata', async () => {
      try {
        const { stdout, stderr } = await exec(jcoPath,
            'metadata-show',
            'test/fixtures/exitcode.wasm',
            '--json');
        strictEqual(stderr, '');
        deepStrictEqual(JSON.parse(stdout), [{
          metaType: { tag: 'module' },
          producers: [],
          name: null,
          range: [
            0,
            262
          ]
        }]);
      }
      finally {
        await cleanup();
      }
    });

    test('Componentize', async () => {
      try {
        const { stdout, stderr } = await exec(jcoPath,
            'componentize',
            'test/fixtures/source.js',
            '-w',
            'test/fixtures/source.wit',
            '-o',
            outFile);
        strictEqual(stderr, '');
        const outDir = fileURLToPath(new URL('./output/componentize', import.meta.url));
        {
          const { stderr } = await exec(jcoPath, 'transpile', outFile, '--name', 'componentize', '--wasi-shim', '-o', outDir);
          strictEqual(stderr, '');
        }
        const m = await import(`${outDir}/componentize.js`);
        strictEqual(m.hello(), 'world');
      }
      finally {
        await cleanup();
      }
    });
  });
}
