import { spawn } from 'node:child_process';
import esbuild from 'esbuild';

/**
 * Backend bundler. esbuild compiles src/index.ts into dist/, inlining imported
 * .sql files as strings via its text loader — so schema.sql ships in the build
 * with no copy step and no runtime file read. Type-checking stays with `tsc`
 * (see the `build` script); esbuild only transpiles + bundles.
 *
 *   node esbuild.mjs           one-shot build → dist/
 *   node esbuild.mjs --watch   rebuild on change and (re)start the server
 */
const options = {
  entryPoints: ['src/index.ts'],
  outdir: 'dist',
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node20',
  sourcemap: true,
  // Keep dependencies (incl. the native better-sqlite3) external — resolved
  // from node_modules at runtime rather than bundled in.
  packages: 'external',
  loader: { '.sql': 'text' },
};

if (process.argv.includes('--watch')) {
  const ctx = await esbuild.context({ ...options, plugins: [runOnRebuild()] });
  await ctx.watch();
} else {
  await esbuild.build(options);
}

/** Dev-only plugin: (re)start the server after each successful rebuild. */
function runOnRebuild() {
  let child;
  const stop = () => child?.kill();
  process.on('SIGINT', () => {
    stop();
    process.exit(0);
  });
  return {
    name: 'run-on-rebuild',
    setup(build) {
      build.onEnd((result) => {
        if (result.errors.length > 0) return;
        stop();
        child = spawn('node', ['--env-file-if-exists=.env', 'dist/index.js'], {
          stdio: 'inherit',
        });
      });
    },
  };
}
