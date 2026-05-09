const esbuild = require('esbuild');

const watch = process.argv.includes('--watch');

/** @type {import("esbuild").BuildOptions} */
const buildOptions = {
  entryPoints: ['src/extension.ts'],
  bundle: true,
  outfile: 'dist/extension.js',
  // 'prettier' and its sub-paths are marked external so they are NOT bundled.
  // node_modules/prettier is instead shipped directly in the VSIX (see .vscodeignore).
  // This avoids Prettier 3's ESM import.meta.url usage breaking when bundled to CJS.
  external: ['vscode', 'prettier', 'prettier/*'],
  format: 'cjs',
  platform: 'node',
  target: 'node20',
  sourcemap: true,
  minify: false,
};

if (watch) {
  esbuild
    .context(buildOptions)
    .then((ctx) => {
      ctx.watch();
      console.log('Watching for changes...');
    })
    .catch(() => process.exit(1));
} else {
  esbuild
    .build(buildOptions)
    .then(() => console.log('Build complete.'))
    .catch(() => process.exit(1));
}
