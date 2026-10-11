import { describe, it } from "vitest";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
import {
	defaultFormatDateTime,
	hasCommunicationSummaryNumbers,
	resolveEffectiveCommunicationEvents,
	resolveEffectiveCommunicationTasks,
} from "../components/communications/communicationsViewModules";
import { CommunicationsView } from "../CommunicationsView";

describe("CommunicationsView safe monolith decomposition", () => {
	it("1. экспортирует канонический компонент CommunicationsView", () => {
		assert.equal(typeof CommunicationsView, "function");
	});

	it("2. чистая утилита defaultFormatDateTime корректно форматирует дату и время", () => {
		const formatted = defaultFormatDateTime("2026-05-15T10:30:00.000Z");
		assert.ok(typeof formatted === "string");
		assert.ok(formatted.length > 0);
	});

	it("3. чистая утилита hasCommunicationSummaryNumbers реагирует на наличие счетчиков", () => {
		assert.equal(hasCommunicationSummaryNumbers(undefined), false);
		assert.equal(
			hasCommunicationSummaryNumbers({
				communicationSummary: {
					openTasks: 0,
					dueToday: 0,
					overdue: 0,
					urgentTasks: 0,
					appointmentConfirmations: 0,
					postVisitInstructions: 0,
				},
			} as any),
			false,
		);
		assert.equal(
			hasCommunicationSummaryNumbers({
				communicationSummary: {
					openTasks: 3,
					dueToday: 0,
					overdue: 0,
					urgentTasks: 0,
					appointmentConfirmations: 0,
					postVisitInstructions: 0,
				},
			} as any),
			true,
		);
	});

	it("4. чистая утилита resolveEffectiveCommunicationTasks подставляет демо-задачи при пустом списке", () => {
		const demoTasks = resolveEffectiveCommunicationTasks(undefined, undefined, true);
		assert.ok(demoTasks.length > 0);
		assert.equal(demoTasks[0]?.id, "demo-comm-task-1");

		const emptyLiveTasks = resolveEffectiveCommunicationTasks([], undefined, false);
		assert.equal(emptyLiveTasks.length, 0);
	});

	it("5. бюджет строк соблюдён: фасад <= 120 строк, каждый файл модуля <= 800 строк", () => {
		const facadePath = path.resolve(__dirname, "../CommunicationsView.tsx");
		const facadeLines = fs.readFileSync(facadePath, "utf8").split("\n").length;
		assert.ok(
			facadeLines <= 120,
			`Фасад CommunicationsView.tsx должен быть <= 120 строк, получено: ${facadeLines}`,
		);

		const modulesDir = path.resolve(
			__dirname,
			"../components/communications/communicationsViewModules",
		);
		const entries = fs.readdirSync(modulesDir);
		for (const entry of entries) {
			const full = path.join(modulesDir, entry);
			if (fs.statSync(full).isFile() && /\.(ts|tsx)$/.test(entry)) {
				const lines = fs.readFileSync(full, "utf8").split("\n").length;
				assert.ok(
					lines <= 800,
					`Файл ${entry} превышает 800 строк (${lines} строк)`,
				);
			}
		}
	});

	it("6. все ключевые тест-якоря (data-testid, aria-label, id) сохранены", () => {
		const facadeContent = fs.readFileSync(
			path.resolve(__dirname, "../CommunicationsView.tsx"),
			"utf8",
		);
		assert.ok(facadeContent.includes('data-testid="communications-view"'));
		assert.ok(facadeContent.includes('id="communications"'));

		const modulesDir = path.resolve(
			__dirname,
			"../components/communications/communicationsViewModules",
		);
		const allContent = fs
			.readdirSync(modulesDir)
			.filter((f) => /\.(ts|tsx)$/.test(f))
			.map((f) => fs.readFileSync(path.join(modulesDir, f), "utf8"))
			.join("\n");

		const requiredAnchors = [
			'data-testid="communications-tab-bot-inbox"',
			'data-testid="communications-tab-staff-chat"',
			'data-testid="communications-omnichannel-hub-btn"',
			'data-testid="communications-more-menu-btn"',
			'aria-label="Дополнительные действия связи"',
			'data-testid="communications-recalls-hub-btn"',
			'aria-label="Сводка связи"',
			'communication-closing-note',
			'communication-closing-note-guidance',
			'aria-label="Очередь связи"',
			'data-testid="btn-communications-tasks-show-more"',
			'aria-label="Журнал связи"',
			'data-testid="btn-communications-journal-show-more"',
		];

		for (const anchor of requiredAnchors) {
			assert.ok(
				allContent.includes(anchor),
				`Пропущен тест-якорь: ${anchor} в decomposed модулях`,
			);
		}
	});
});
