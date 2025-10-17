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

    // Build once and exit
    await ctx.rebuild();
    console.log('Build completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Build failed:', err.message);
    process.exit(1);
  }
}

build();