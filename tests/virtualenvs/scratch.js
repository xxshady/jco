import { _setArgs, _setEnv } from "@bytecodealliance/preview2-shim/cli";
import { _setPreopens } from "@bytecodealliance/preview2-shim/filesystem";
import { mkdtemp } from 'node:fs/promises';
import { rmdirSync } from 'node:fs';
import { platform } from 'node:process';

const isWindows = platform === 'win32';

const env = {
  FS_TIME_PRECISION: "2000",
  NO_DANGLING_FILESYSTEM: "1",
};

if (isWindows) {
  env.NO_RENAME_DIR_TO_EMPTY_DIR = "1";
}

_setEnv(env);

_setArgs(['_', '/']);

export const testDir = await mkdtemp('./tests/output/');

_setPreopens({ '/': testDir });

process.on('exit', () => {
  try {
    rmdirSync(testDir, { recursive: true });
  } catch {}
});
