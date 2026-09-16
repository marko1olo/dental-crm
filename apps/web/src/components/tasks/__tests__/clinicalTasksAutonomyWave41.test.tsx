/**
 * clinicalTasksAutonomyWave41.test.tsx
 *
 * Wave 41 Targeted Unit Tests:
 * 1. ClinicalTasksPanel:
 *    - Eliminates note textarea lock: routine typing is not blocked during phase submission/sync.
 *    - Eliminates global phase button lock: buttons are not globally disabled by submittingPhase !== null.
 *    - Provides 4 1-click clinical task presets for solo-doctor & chairside workflows:
 *      * «Контрольный осмотр через 6 месяцев (Профгигиена)»
 *      * «Снятие швов через 7-10 дней»
 *      * «Припасовка каркаса / коронки ЗТЛ»
 *      * «Контрольная рентгенография RVG»
 *    - 1-click execution computes dueAt and description without manual typing of 5 fields (Mandates 8e, 8k, 8n).
 *
 * 2. WorkspaceContinuityStrip:
 *    - Verifies removal of disabled={!effectiveOnline || isSyncingMutations}.
 *    - Allows 1-click forced sync and queue flushing even when effectiveOnline is false.
 *    - Supports onClearMutations 1-click action.
 *
 * 3. PatientAnamnesisModal:
 *    - Guarantees 1-click somatic healthy norm button («Соматически здоров / норма») without 50 manual checkboxes.
 *
 * Mandates: 8d (Burden of Proof), 8e (Doctor Autonomy), 8k (CRM != Reality Simulator), 8n (Solo Doctor Sovereignty).
 */

import React from "react";
import { renderToString } from "react-dom/server";
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
	ClinicalTasksPanel,
	CLINICAL_TASK_PRESETS,
	executeClinicalPresetTaskAutonomy,
	type ClinicalTask,
} from "../../../ClinicalTasksPanel";
import { WorkspaceContinuityStrip } from "../../../workspaceContinuityStrip";
import { PatientAnamnesisModal } from "../../patients/PatientAnamnesisModal";
import { AppLogicProvider, type AppLogicContextType } from "../../../contexts/AppLogicContext";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const mockAppContext = {
	dashboard: {
		appointments: [],
		patients: [{ id: "pat-wave41", fullName: "Семенов С.С." }],
		staff: [],
	},
	auth: {
		currentUser: { name: "Врач-стоматолог", id: "doc-wave41" },
		organizationId: "org-wave41",
		user: { id: "doc-wave41" },
		denteClinicalReadHeaders: (extra: Record<string, string> = {}) => ({
			"x-test-auth": "true",
			...extra,
		}),
		denteClinicalMutationHeaders: (extra: Record<string, string> = {}) => ({
			"x-test-auth": "true",
			...extra,
		}),
	},
} as unknown as AppLogicContextType;

describe("Wave 41 — Clinical Tasks Presets, Non-Blocking Sync & Somatic Norm Autonomy", () => {
	const clinicalTasksPanelPath = path.resolve(__dirname, "../../../ClinicalTasksPanel.tsx");
	const clinicalTasksPanelSource = fs.readFileSync(clinicalTasksPanelPath, "utf8");

	const workspaceContinuityStripPath = path.resolve(
		__dirname,
		"../../../workspaceContinuityStrip.tsx",
	);
	const workspaceContinuityStripSource = fs.readFileSync(
		workspaceContinuityStripPath,
		"utf8",
	);

	describe("1. ClinicalTasksPanel Autonomy & Chairside Presets (Mandates 8e, 8k, 8n)", () => {
		it("eliminates disabled={submittingPhase !== null} locks on textarea and phase buttons in source", () => {
			assert.ok(
				!clinicalTasksPanelSource.includes(
					'id="clinical-tasks-notes"\n\t\t\t\t\tclassName="ops-textarea"\n\t\t\t\t\trows={2}\n\t\t\t\t\tvalue={notes}\n\t\t\t\t\tonChange={(event) => setNotes(event.target.value)}\n\t\t\t\t\tplaceholder="Например: зубы 16 и 17 готовы к препарированию под коронки"\n\t\t\t\t\tdisabled={submittingPhase !== null}',
				),
				"Textarea must not be blocked by submittingPhase !== null",
			);
			assert.ok(
				!clinicalTasksPanelSource.includes(
					"disabled={submittingPhase !== null}\n\t\t\t\t\t\t\tonClick={() => void completePhase(option.code)}",
				),
				"Phase buttons must not be globally blocked by submittingPhase !== null",
			);
		});

		it("contains all required 1-click clinical task presets with correct metadata and due date calculators", () => {
			assert.ok(
				CLINICAL_TASK_PRESETS.length >= 5,
				"Must define at least 5 chairside task presets",
			);

			const recall = CLINICAL_TASK_PRESETS.find(
				(p) => p.id === "preset-recall-6m",
			);
			const suture = CLINICAL_TASK_PRESETS.find(
				(p) => p.id === "preset-suture-removal",
			);
			const ztl = CLINICAL_TASK_PRESETS.find(
				(p) => p.id === "preset-prosthetics-ztl",
			);
			const rvg = CLINICAL_TASK_PRESETS.find(
				(p) => p.id === "preset-rvg-control",
			);
			const ortho = CLINICAL_TASK_PRESETS.find(
				(p) => p.id === "preset-ortho-call",
			);
			const implant = CLINICAL_TASK_PRESETS.find(
				(p) => p.id === "preset-implant-check",
			);
			const ct = CLINICAL_TASK_PRESETS.find(
				(p) => p.id === "preset-ct-planning",
			);

			if (
				!recall ||
				!suture ||
				!ztl ||
				!rvg ||
				!ortho ||
				!implant ||
				!ct
			) {
				throw new Error("All presets must be defined");
			}

			// Preset 1: Напоминание о профгигиене через 6 месяцев
			assert.ok(
				recall.title.includes("Профгигиена") ||
					recall.title.includes("профгигиене"),
			);
			assert.strictEqual(recall.taskType, "recall_hygiene");
			const recallDue = new Date(recall.computeDueAt());
			const now = new Date();
			assert.ok(
				recallDue.getTime() > now.getTime() + 150 * 86400000,
				"Recall due date must be ~6 months ahead",
			);

			// Preset 2: Снятие швов через 7-10 дней
			assert.strictEqual(suture.title, "Снятие швов через 7-10 дней");
			assert.strictEqual(suture.taskType, "suture_removal");
			const sutureDue = new Date(suture.computeDueAt());
			assert.ok(
				sutureDue.getTime() > now.getTime() + 5 * 86400000 &&
					sutureDue.getTime() < now.getTime() + 15 * 86400000,
				"Suture removal due date must be ~7-10 days ahead",
			);

			// Preset 3: Готовность работы ЗТЛ / припасовка
			assert.ok(ztl.title.includes("ЗТЛ"));
			assert.strictEqual(ztl.taskType, "prosthetics_fitting");
			const ztlDue = new Date(ztl.computeDueAt());
			assert.ok(
				ztlDue.getTime() > now.getTime() + 5 * 86400000,
				"ZTL fitting due date must be ahead",
			);

			// Preset 4: Контрольная рентгенография RVG
			assert.strictEqual(rvg.title, "Контрольная рентгенография RVG");
			assert.strictEqual(rvg.taskType, "rvg_control");
			const rvgDue = new Date(rvg.computeDueAt());
			assert.ok(
				rvgDue.getTime() > now.getTime() + 7 * 86400000,
				"RVG control due date must be ahead",
			);

			// Preset 5: Звонок ортодонта / контроль брекетов
			assert.strictEqual(ortho.title, "Звонок ортодонта / контроль брекетов");
			assert.strictEqual(ortho.taskType, "orthodontics_recall");

			// Preset 6: Контрольный осмотр после имплантации
			assert.strictEqual(
				implant.title,
				"Контрольный осмотр после имплантации",
			);
			assert.strictEqual(implant.taskType, "implant_check");

			// Preset 7: Снимок КТ / планирование
			assert.strictEqual(ct.title, "Снимок КТ / планирование");
			assert.strictEqual(ct.taskType, "ct_planning");
		});

		it("creates clinical task in 1 click without manual typing of 5 fields via executeClinicalPresetTaskAutonomy", async () => {
			let capturedTasks: ClinicalTask[] = [];
			let capturedToast = "";

			const preset = CLINICAL_TASK_PRESETS.find(
				(p) => p.id === "preset-suture-removal",
			); // suture removal

			if (!preset) {
				throw new Error("Preset 1 must be defined");
			}
			const result = await executeClinicalPresetTaskAutonomy({
				preset,
				patientId: "pat-wave41",
				notes: "Швы шелк 4-0 в области 36 зуба",
				organizationId: "org-wave41",
				assignedDoctorId: "doc-wave41",
				saveLocally: false,
				setTasks: (updater) => {
					capturedTasks = updater([]);
				},
				showToastFn: (msg) => {
					capturedToast = msg;
				},
			});

			assert.ok(result.task.id, "Task must receive unique ID");
			assert.strictEqual(result.task.title, "Снятие швов через 7-10 дней");
			assert.strictEqual(result.task.taskType, "suture_removal");
			assert.strictEqual(result.task.status, "pending");
			assert.ok(
				result.task.description?.includes("Швы шелк 4-0 в области 36 зуба"),
				"Doctor notes must be appended to preset description",
			);
			assert.ok(
				result.task.description?.includes("Осмотр зоны хирургического вмешательства"),
				"Preset default clinical description must be present",
			);
			assert.ok(result.task.dueAt, "dueAt must be automatically populated");
			assert.strictEqual(capturedTasks.length, 1);
			assert.ok(
				capturedToast.includes("Снятие швов"),
				"Must display confirmation toast to doctor",
			);
		});

		it("renders all 4 presets with test ids and handles table due date rendering", () => {
			const html = renderToString(
				<AppLogicProvider value={mockAppContext}>
					<ClinicalTasksPanel patientId="pat-wave41" />
				</AppLogicProvider>,
			);

			assert.ok(
				html.includes('data-testid="preset-task-recall-6m"'),
				"Must render recall hygiene preset button",
			);
			assert.ok(
				html.includes('data-testid="preset-task-suture-removal"'),
				"Must render suture removal preset button",
			);
			assert.ok(
				html.includes('data-testid="preset-task-prosthetics-ztl"'),
				"Must render ZTL prosthetics fitting preset button",
			);
			assert.ok(
				html.includes('data-testid="preset-task-rvg-control"'),
				"Must render RVG control preset button",
			);
			assert.ok(
				html.includes("Быстрые клинические пресеты (1 клик):"),
				"Must display presets section header",
			);
		});
	});

	describe("2. WorkspaceContinuityStrip Non-Blocking Sync (Mandate 8e)", () => {
		it("eliminates disabled={!effectiveOnline} locks on sync and visit flush buttons", () => {
			assert.ok(
				!workspaceContinuityStripSource.includes(
					"disabled={!effectiveOnline || isSyncingMutations}",
				),
				"Sync mutations button must not be disabled by !effectiveOnline",
			);
			assert.ok(
				!workspaceContinuityStripSource.includes(
					"disabled={!effectiveOnline || isPendingVisitSyncing}",
				),
				"Flush visits button must not be disabled by !effectiveOnline",
			);
		});

		it("allows 1-click forced sync and clear mutations even when offline / unstable network", () => {
			const htmlOffline = renderToString(
				<WorkspaceContinuityStrip
					browserContinuityCritical={false}
					browserWarnings={[]}
					isOnline={false}
					isPendingVisitSyncing={false}
					onCheckDevice={() => {}}
					onFlushSpeech={() => {}}
					onFlushVisit={() => {}}
					pendingSpeechChunkCount={0}
					pendingVisitSaveCount={1}
					pendingMutationCount={3}
					onSyncMutations={() => {}}
					onClearMutations={() => {}}
					isSyncingMutations={false}
				/>,
			);

			// In offline mode with pending mutations:
			// The button must NOT be disabled (no disabled attribute on sync button)
			assert.ok(
				htmlOffline.includes('data-testid="btn-sync-mutations"'),
				"Must render sync button",
			);
			assert.ok(
				htmlOffline.includes("Синхронизировать принудительно"),
				"Offline mode must offer forced synchronization in 1 click",
			);
			assert.ok(
				htmlOffline.includes('data-testid="btn-clear-mutations"'),
				"Must render clear mutations button",
			);
			assert.ok(
				htmlOffline.includes('data-testid="btn-flush-visits"'),
				"Must render flush visits button",
			);

			// Verify that sync button does NOT have disabled attribute when not syncing
			const syncBtnPart = htmlOffline.slice(
				htmlOffline.indexOf('data-testid="btn-sync-mutations"'),
			);
			const syncBtnTag = syncBtnPart.slice(0, syncBtnPart.indexOf(">"));
			assert.ok(
				!syncBtnTag.includes("disabled"),
				"Sync button must NOT be disabled when offline",
			);
		});
	});

	describe("3. PatientAnamnesisModal Somatic Healthy Norm (Mandates 8e, 8k, 8n)", () => {
		it("renders PatientAnamnesisModal with 1-click 'Соматически здоров / норма' button", () => {
			const html = renderToString(
				<PatientAnamnesisModal
					isOpen={true}
					onClose={() => {}}
					patientId="pat-wave41"
					patientName="Семенов С.С."
				/>,
			);

			assert.ok(
				html.includes('data-testid="btn-somatic-healthy-norm"'),
				"Must render 1-click somatic healthy norm button",
			);
			assert.ok(
				html.includes("Соматически здоров / норма"),
				"Button must display 'Соматически здоров / норма' text",
			);
			assert.ok(
				html.includes("Анкета здоровья и клинические стоп-факторы"),
				"Must render somatic safety and risk header",
			);
		});
	});

	describe("4. Zero Cartoon Emojis Compliance (Mandate 8d item 7)", () => {
		it("ensures 0 cartoon emojis in clinical tasks and continuity components", () => {
			const tasksHtml = renderToString(
				<AppLogicProvider value={mockAppContext}>
					<ClinicalTasksPanel patientId="pat-wave41" />
				</AppLogicProvider>,
			);

			const continuityHtml = renderToString(
				<WorkspaceContinuityStrip
					browserContinuityCritical={false}
					browserWarnings={[]}
					isOnline={true}
					isPendingVisitSyncing={false}
					onCheckDevice={() => {}}
					onFlushSpeech={() => {}}
					onFlushVisit={() => {}}
					pendingSpeechChunkCount={0}
					pendingVisitSaveCount={1}
					pendingMutationCount={2}
					onSyncMutations={() => {}}
					isSyncingMutations={false}
				/>,
			);

			const forbiddenEmojis = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
			assert.ok(
				!forbiddenEmojis.test(tasksHtml),
				"ClinicalTasksPanel must contain 0 cartoon emojis",
			);
			assert.ok(
				!forbiddenEmojis.test(continuityHtml),
				"WorkspaceContinuityStrip must contain 0 cartoon emojis",
			);
		});
	});
});
