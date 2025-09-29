const esbuild = require('esbuild');

async function build() {
  try {
    const ctx = await esbuild.context({
      entryPoints: ['src/app.js'],
      bundle: true,
      outfile: 'dist/bundle.js',
      format: 'esm',
      platform: 'browser',
      target: ['es2020'],
      minify: true,
      sourcemap: true,
    });

    // First build
    await ctx.rebuild();
    console.log('Build completed successfully!');

    // Watch mode
    await ctx.watch();
    console.log('Watching for changes...');
  } catch (err) {
    console.error('Build failed:', err.message);
    process.exit(1);
  }
}

build();