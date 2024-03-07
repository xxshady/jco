//! This file has been auto-generated, please do not modify manually
//! To regenerate this file re-run `cargo xtask generate tests` from the project root

use std::fs;
use tempdir::TempDir;
use xshell::{cmd, Shell};

#[test]
fn cli_stdio_write_flushes() -> anyhow::Result<()> {
    let sh = Shell::new()?;
    let file_name = "cli_stdio_write_flushes";
    let tempdir = TempDir::new("{file_name}")?;
    let wasi_file = test_utils::compile(&sh, &tempdir, &file_name)?;
    let _ = fs::remove_dir_all("./tests/rundir/cli_stdio_write_flushes");

    let cmd = cmd!(sh, "node ./src/jco.js run  --jco-dir ./tests/rundir/cli_stdio_write_flushes --jco-import ./tests/virtualenvs/base.js {wasi_file} hello this '' 'is an argument' 'with 🚩 emoji'");

    let cmd = cmd
        .env("JCO_RUN_PATH", "deno")
        .env("JCO_RUN_ARGS", "run --importmap importmap.json -A");
    cmd.run()?;
    Ok(())
}