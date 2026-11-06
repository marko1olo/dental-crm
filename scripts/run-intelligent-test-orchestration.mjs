#!/usr/bin/env node
/**
 * scripts/run-intelligent-test-orchestration.mjs
 *
 * DENTE CRM — Intelligent Test Orchestration & Saboteur-Free Test Runner
 * Mandate 8aj (Axis #7: Runtime verification over source regex)
 * Mandate 8af (Test isolation & fast feedback loop)
 * Mandate 8t / 8wx (Host memory safety, sub-second execution targets)
 */

import { spawn } from "node:child_process";
import { performance } from "node:perf_hooks";
import process from "node:process";

const TEST_DOMAINS = [
	{
		name: "Shared Clinical Catalogs & Math",
		domain: "@dental/shared:clinical",
		command: "npx",
		args: [
			"tsx",
			"--test",
			"packages/shared/src/tests/stomxCatalogs.test.ts",
			"packages/shared/src/tests/stomxDefects.test.ts",
			"packages/shared/src/tests/stomxPricelist.test.ts",
			"packages/shared/src/tests/wave118StomxCashFlowCatalogs.test.ts",
			"packages/shared/src/tests/legalConsentsStomx.test.ts",
		],
		maxAllowedMs: 5000,
	},
	{
		name: "Medical Domain Generative Fuzzing",
		domain: "@dental/shared:fuzzing",
		command: "npx",
		args: [
			"tsx",
			"--test",
			"packages/shared/src/tests/medicalDomainGenerativeFuzzing.test.ts",
		],
		maxAllowedMs: 3000,
	},
	{
		name: "Architectural & Smoke Contracts",
		domain: "scripts:smoke",
		command: "node",
		args: ["scripts/smoke-clinical-rule-panel-source.mjs"],
		maxAllowedMs: 2000,
	},
	{
		name: "Documents View & Outpatient Contracts",
		domain: "scripts:smoke-documents",
		command: "node",
		args: ["scripts/smoke-documents-view-source.mjs"],
		maxAllowedMs: 3000,
	},
];

async function runDomainSuite(suite) {
	const start = performance.now();
	console.log(`\n▶ [${suite.domain}] Running: ${suite.name}...`);

	return new Promise((resolve) => {
		const isWin = process.platform === "win32";
		const cmd = isWin && suite.command === "npx" ? "npx.cmd" : suite.command;
		const child = spawn(cmd, suite.args, {
			stdio: ["inherit", "pipe", "pipe"],
			shell: isWin,
			env: {
				...process.env,
				NODE_ENV: "test",
				FORCE_COLOR: "1",
			},
		});

		let stdout = "";
		let stderr = "";

		child.stdout.on("data", (data) => {
			stdout += data.toString();
		});

		child.stderr.on("data", (data) => {
			stderr += data.toString();
		});

		child.on("close", (code) => {
			const durationMs = Math.round(performance.now() - start);
			const passed = code === 0;

			if (passed) {
				console.log(
					`✔ [${suite.domain}] PASS (${durationMs}ms) [target: <${suite.maxAllowedMs}ms]`,
				);
			} else {
				console.error(`✖ [${suite.domain}] FAIL (exit code ${code}, ${durationMs}ms)`);
				if (stderr) console.error(stderr.trim());
				if (stdout) console.log(stdout.trim());
			}

			resolve({
				domain: suite.domain,
				name: suite.name,
				passed,
				exitCode: code,
				durationMs,
				maxAllowedMs: suite.maxAllowedMs,
				latencyStatus:
					durationMs <= suite.maxAllowedMs ? "OPTIMAL" : "WARN_EXCEEDED",
			});
		});

		child.on("error", (err) => {
			const durationMs = Math.round(performance.now() - start);
			console.error(`✖ [${suite.domain}] ERROR:`, err.message);
			resolve({
				domain: suite.domain,
				name: suite.name,
				passed: false,
				exitCode: 1,
				durationMs,
				maxAllowedMs: suite.maxAllowedMs,
				latencyStatus: "ERROR",
				error: err.message,
			});
		});
	});
}

async function main() {
	console.log("================================================================");
	console.log("🚀 DENTE CRM — INTELLIGENT TEST ORCHESTRATOR & BENCHMARK RUNNER");
	console.log("================================================================");
	const overallStart = performance.now();

	const results = [];
	for (const suite of TEST_DOMAINS) {
		const res = await runDomainSuite(suite);
		results.push(res);
	}

	const totalDurationMs = Math.round(performance.now() - overallStart);
	const allPassed = results.every((r) => r.passed);
	const passedCount = results.filter((r) => r.passed).length;

	console.log("\n================================================================");
	console.log("📊 ORCHESTRATION BENCHMARK SUMMARY:");
	console.log("================================================================");
	for (const r of results) {
		const statusIcon = r.passed ? "✔ PASS" : "✖ FAIL";
		console.log(
			`• ${r.domain.padEnd(26)} | ${statusIcon} | ${String(r.durationMs).padStart(5)}ms | Limit: ${String(r.maxAllowedMs).padStart(5)}ms | [${r.latencyStatus}]`,
		);
	}
	console.log("----------------------------------------------------------------");
	console.log(`Total Suites:   ${results.length}`);
	console.log(`Passed Suites:  ${passedCount}/${results.length}`);
	console.log(`Total Walltime: ${totalDurationMs}ms`);
	console.log(`System Status:  ${allPassed ? "GREEN (ALL DOMAINS VERIFIED)" : "RED (FAILURES DETECTED)"}`);
	console.log("================================================================\n");

	if (!allPassed) {
		process.exit(1);
	}
}

main().catch((err) => {
	console.error("Fatal orchestration error:", err);
	process.exit(1);
});
