const { spawnSync } = require("child_process");
const path = require("path");

const configPath = path.resolve(__dirname, "test_biome_config.json");

const result = spawnSync("npx", ["biome", "check", `--config-path=${configPath}`, "--files-ignore-unknown=true", "--max-diagnostics=100"], {
  cwd: path.resolve(__dirname, "../.."),
  encoding: "utf8",
  shell: true,
  env: { ...process.env, NO_COLOR: "1" }
});

const output = (result.stdout || "") + "\n" + (result.stderr || "");

const lines = output.split("\n");
lines.forEach(l => {
  if (l.includes("useBiomeIgnoreFolder") || l.includes("biome") || l.includes("lint/")) {
    console.log(l);
  }
});
