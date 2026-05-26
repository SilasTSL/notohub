// @ts-check
const esbuild = require("esbuild");
const path = require("path");

const isWatch = process.argv.includes("--watch");

/** Entry points → output file name mapping */
const entryPoints = {
  "handlers/articles": "handlers/articles",
  "handlers/sync": "handlers/sync",
};

/** @type {import("esbuild").BuildOptions} */
const baseOptions = {
  bundle: true,
  platform: "node",
  target: "node20",
  format: "cjs",
  sourcemap: true,
  minify: false,
  // Keep AWS SDK v3 as external — Lambda runtime provides it, so it doesn't
  // need to be bundled. Remove this if you need a specific version pinned.
  external: [],
  // Resolve the workspace shared package by pointing at the TS source directly
  alias: {
    "@notohub/shared": path.resolve(__dirname, "../shared/src/index.ts"),
  },
  outdir: path.resolve(__dirname, "dist"),
  tsconfig: path.resolve(__dirname, "tsconfig.json"),
};

async function build() {
  if (isWatch) {
    const ctx = await esbuild.context({
      ...baseOptions,
      entryPoints: Object.fromEntries(
        Object.entries(entryPoints).map(([k, v]) => [v, `./src/${k}.ts`])
      ),
    });
    await ctx.watch();
    console.log("👀  esbuild watching for changes…");
  } else {
    await esbuild.build({
      ...baseOptions,
      entryPoints: Object.fromEntries(
        Object.entries(entryPoints).map(([k, v]) => [v, `./src/${k}.ts`])
      ),
    });
    console.log("✅  Backend built successfully → dist/");
  }
}

build().catch((err) => {
  console.error(err);
  process.exit(1);
});
