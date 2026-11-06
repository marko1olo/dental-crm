import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

export default defineConfig({
	test: {
		pool: "forks",
		poolOptions: {
			forks: {
				singleFork: true,
				execArgv: ["--max-old-space-size=2048"],
			},
		},
		testTimeout: 10000,
		hookTimeout: 10000,
		teardownTimeout: 10000,
		isolate: true,
		restoreMocks: true,
		clearMocks: true,
		mockReset: true,
		exclude: [
			"**/node_modules/**",
			"**/.data/**",
			"**/scratch/**",
			"**/artifacts/**",
			"**/screenshots/**",
			"**/dist/**",
		],
		alias: {
			"node:test": fileURLToPath(new URL("./scripts/vitestNodeTestShim.ts", import.meta.url)),
		},
	},
});
