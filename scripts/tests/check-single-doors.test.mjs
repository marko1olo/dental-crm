#!/usr/bin/env node

/**
 * check-single-doors.test.mjs — Набор тестов для линтера единых точек входа и защиты SSOT (Single-Door Guardian).
 *
 * Запуск:
 *   node --test scripts/tests/check-single-doors.test.mjs
 */

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
	SACRED_STUDIOS,
	checkApiMutationDoors,
	checkUiClones,
	checkUiOrphans,
	loadAllowlist,
	runSingleDoorChecks,
} from "../check-single-doors.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../..");
const guardScriptPath = path.join(repoRoot, "scripts/check-single-doors.mjs");
const cacheDir = path.join(repoRoot, "node_modules/.cache");

test("SACRED_STUDIOS contains all 10 canonical clinical domains", () => {
	assert.equal(SACRED_STUDIOS.length, 10);
	const domains = SACRED_STUDIOS.map((s) => s.domain);
	assert.ok(domains.includes("cashbox"));
	assert.ok(domains.includes("emr"));
	assert.ok(domains.includes("treatment_plans"));
	assert.ok(domains.includes("schedule"));
	assert.ok(domains.includes("patient_card"));
	assert.ok(domains.includes("dental_lab"));
	assert.ok(domains.includes("doctor_payroll"));
	assert.ok(domains.includes("documents"));
	assert.ok(domains.includes("pricelist"));
	assert.ok(domains.includes("telephony"));
});

test("Rule 1 (UI Anti-Clones): detects clone suffixes (*V2, *New, *Copy, *2)", () => {
	const mockFiles = [
		path.join(repoRoot, "apps/web/src/components/billing/CashRegisterStudioModal.tsx"),
		path.join(repoRoot, "apps/web/src/components/billing/CashRegisterStudioModalV2.tsx"),
		path.join(repoRoot, "apps/web/src/components/emr/VisitModalNew.tsx"),
		path.join(repoRoot, "apps/web/src/components/schedule/AppointmentModalCopy.tsx"),
		path.join(repoRoot, "apps/web/src/components/finance/PayrollModal2.tsx"),
	];

	const violations = checkUiClones(mockFiles, { ui_sacred_clones_allowlist: [] });
	assert.ok(violations.length >= 4);
	const rules = violations.map((v) => v.rule);
	assert.ok(rules.includes("UI_CLONE_SUFFIX"));
});

test("Rule 1 (UI Anti-Clones): detects sacred studio parallel clones", () => {
	const mockFiles = [
		// Canonical file
		path.join(repoRoot, "apps/web/src/components/billing/CashRegisterStudioModal.tsx"),
		// Clones
		path.join(repoRoot, "apps/web/src/components/billing/CashboxModal.tsx"),
		path.join(repoRoot, "apps/web/src/components/billing/CashRegisterDrawer.tsx"),
		path.join(repoRoot, "apps/web/src/components/emr/MedicalRecordModal.tsx"),
		path.join(repoRoot, "apps/web/src/components/telephony/CallsModal.tsx"),
	];

	const violations = checkUiClones(mockFiles, { ui_sacred_clones_allowlist: [] });
	assert.equal(violations.length, 4);
	assert.ok(violations.every((v) => v.rule === "UI_SACRED_CLONE"));
});

test("Rule 1 (UI Anti-Clones): ignores subpart helper files and respects allowlist", () => {
	const mockFiles = [
		path.join(repoRoot, "apps/web/src/components/billing/CashRegisterModalHeader.tsx"),
		path.join(repoRoot, "apps/web/src/components/billing/CashRegisterModalProps.ts"),
		path.join(repoRoot, "apps/web/src/components/schedule/ScheduleModalsLayer.tsx"),
		path.join(repoRoot, "apps/web/src/components/billing/studioModules/CashRegisterSubpart.tsx"),
		path.join(repoRoot, "apps/web/src/components/legacy/AllowedCloneV2.tsx"),
	];

	const allowlist = {
		ui_sacred_clones_allowlist: [
			{
				file: "apps/web/src/components/legacy/AllowedCloneV2.tsx",
				reason: "Legitimate legacy facade",
			},
		],
	};

	const violations = checkUiClones(mockFiles, allowlist);
	assert.equal(violations.length, 0);
});

test("Rule 2 (UI Anti-Orphans): detects orphaned modal without incoming imports", () => {
	fs.mkdirSync(cacheDir, { recursive: true });
	const tempDir = fs.mkdtempSync(path.join(cacheDir, "dente-door-test-"));

	try {
		const modalFile = path.join(tempDir, "OrphanTestModal.tsx");
		fs.writeFileSync(
			modalFile,
			`export function OrphanTestModal() { return <div>Orphan</div>; }`,
			"utf8",
		);

		const violations = checkUiOrphans([modalFile], { ui_orphan_modals_legacy_backlog: [] });
		assert.equal(violations.length, 1);
		assert.equal(violations[0].rule, "UI_ORPHAN_MODAL");
	} finally {
		fs.rmSync(tempDir, { recursive: true, force: true });
	}
});

test("Rule 2 (UI Anti-Orphans): passes modal when imported via static or dynamic import", () => {
	fs.mkdirSync(cacheDir, { recursive: true });
	const tempDir = fs.mkdtempSync(path.join(cacheDir, "dente-door-test-"));

	try {
		const modalFile = path.join(tempDir, "ImportedTestModal.tsx");
		const callerFile = path.join(tempDir, "AppCaller.tsx");

		fs.writeFileSync(
			modalFile,
			`export function ImportedTestModal() { return <div>Imported</div>; }`,
			"utf8",
		);
		fs.writeFileSync(
			callerFile,
			`import { ImportedTestModal } from "./ImportedTestModal";\nexport const App = () => <ImportedTestModal />;`,
			"utf8",
		);

		const violations = checkUiOrphans([modalFile, callerFile], { ui_orphan_modals_legacy_backlog: [] });
		assert.equal(violations.length, 0);
	} finally {
		fs.rmSync(tempDir, { recursive: true, force: true });
	}
});

test("Rule 3 (API Mutation Doors): detects unvalidated Fastify mutation", () => {
	fs.mkdirSync(cacheDir, { recursive: true });
	const tempDir = fs.mkdtempSync(path.join(cacheDir, "dente-door-test-"));

	try {
		const routeFile = path.join(tempDir, "unvalidatedRoute.ts");
		fs.writeFileSync(
			routeFile,
			`
			import { FastifyInstance } from "fastify";
			export async function testRoutes(fastify: FastifyInstance) {
				fastify.post("/api/unvalidated-test", async (req, reply) => {
					return { ok: true };
				});
			}
			`,
			"utf8",
		);

		const violations = checkApiMutationDoors([routeFile], { api_mutation_doors_legacy_backlog: [] });
		assert.equal(violations.length, 1);
		assert.equal(violations[0].rule, "API_MUTATION_UNVALIDATED");
		assert.equal(violations[0].path, "/api/unvalidated-test");
		assert.equal(violations[0].method, "POST");
	} finally {
		fs.rmSync(tempDir, { recursive: true, force: true });
	}
});

test("Rule 3 (API Mutation Doors): passes validated mutations (schema.body, safeParse, comment override, allowlist)", () => {
	fs.mkdirSync(cacheDir, { recursive: true });
	const tempDir = fs.mkdtempSync(path.join(cacheDir, "dente-door-test-"));

	try {
		const routeFile = path.join(tempDir, "validatedRoutes.ts");
		fs.writeFileSync(
			routeFile,
			`
			import { FastifyInstance } from "fastify";
			export async function testRoutes(fastify: FastifyInstance) {
				// 1. schema.body
				fastify.post("/api/schema-body", { schema: { body: { type: "object" } } }, async (req) => {
					return { ok: true };
				});

				// 2. inline safeParse
				fastify.put("/api/inline-parse", async (req) => {
					const parsed = mySchema.safeParse(req.body);
					return { ok: parsed.success };
				});

				// 3. door-validation comment override
				// door-validation: none — Multipart binary stream validated in parser
				fastify.post("/api/comment-override", async (req) => {
					return { ok: true };
				});

				// 4. allowlist match
				fastify.patch("/api/allowlisted-door", async (req) => {
					return { ok: true };
				});
			}
			`,
			"utf8",
		);

		const allowlist = {
			api_mutation_doors_legacy_backlog: [
				{
					pattern: "PATCH /api/allowlisted-door",
					reason: "Covered by legacy allowlist",
				},
			],
		};

		const violations = checkApiMutationDoors([routeFile], allowlist);
		assert.equal(violations.length, 0);
	} finally {
		fs.rmSync(tempDir, { recursive: true, force: true });
	}
});

test("E2E Integration: check-single-doors passes on real monorepo with Exit Code 0", () => {
	const result = spawnSync(process.execPath, [guardScriptPath, "--json"], {
		cwd: repoRoot,
		encoding: "utf8",
		env: { ...process.env, NODE_ENV: "test" },
	});

	assert.equal(
		result.status,
		0,
		`Expected exit 0, got ${result.status}. Stdout: ${result.stdout}. Stderr: ${result.stderr}`,
	);

	const parsed = JSON.parse(result.stdout);
	assert.equal(parsed.passed, true);
	assert.equal(parsed.allViolations.length, 0);
	assert.ok(parsed.stats.webFilesCount > 0);
	assert.ok(parsed.stats.apiFilesCount > 0);
});
