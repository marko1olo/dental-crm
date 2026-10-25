import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CephStandaloneStudioView } from "../CephStandaloneStudioView";
import {
	publishCephSyncEvent,
	subscribeCephSyncChannel,
	cacheActiveCephStudy,
	getCachedActiveCephStudy,
	type CephStudioSyncMessage,
} from "../cephStudioSyncChannel";

describe("Cephalometric Studio Views & Dual Monitor Broadcast Sync", () => {
	it("renders CephStandaloneStudioView in Doctor Diagnostic Mode by default", () => {
		const html = renderToStaticMarkup(
			createElement(CephStandaloneStudioView, {
				patientId: "pat-ortho-doc",
				patientName: "Кузнецова Анна Павловна",
				initialStudioMode: "doctor",
				autoLoadDemo: true,
			}),
		);

		assert.ok(html.includes('data-testid="ceph-standalone-studio"'));
		assert.ok(html.includes('data-testid="ceph-studio-header"'));
		assert.ok(html.includes('data-testid="toggle-patient-demo-mode"'));
		assert.ok(html.includes("Показ пациенту"));
		assert.ok(html.includes('data-testid="btn-ceph-insert-protocol"'));
		assert.ok(html.includes('data-testid="btn-ceph-close-window"'));
		assert.ok(html.includes('data-testid="ceph-studio-sidebar"'));
		assert.ok(html.includes("Ориентиры"));
		assert.ok(html.includes("Расчет углов"));
	});

	it("renders CephStandaloneStudioView in Patient Demonstration Mode with Ricketts E-line and plain bite explanation", () => {
		const html = renderToStaticMarkup(
			createElement(CephStandaloneStudioView, {
				patientId: "pat-ortho-patient",
				patientName: "Кузнецова Анна Павловна",
				initialStudioMode: "patient",
				autoLoadDemo: true,
			}),
		);

		assert.ok(html.includes("Эстетический анализ профиля"));
		assert.ok(html.includes("Эстетическая линия Риккетса (E-Line)"));
		assert.ok(html.includes("Соотношение челюстей"));
		assert.ok(html.includes("Наклон передних зубов и улыбка"));
		assert.ok(html.includes("Режим пациента"));
	});

	it("cacheActiveCephStudy and getCachedActiveCephStudy support zero-storage-quota in-memory transfers", () => {
		cacheActiveCephStudy({
			patientId: "pat-transfer-test",
			patientName: "Тестовый Пациент",
			scaleMmPerPixel: 0.125,
		});

		const retrieved = getCachedActiveCephStudy();
		assert.ok(retrieved !== null);
		assert.equal(retrieved.patientId, "pat-transfer-test");
		assert.equal(retrieved.scaleMmPerPixel, 0.125);

		cacheActiveCephStudy(null);
		assert.equal(getCachedActiveCephStudy(), null);
	});

	it("publishCephSyncEvent and subscribeCephSyncChannel deliver messages through event dispatcher", () => {
		const received: CephStudioSyncMessage[] = [];
		const unsub = subscribeCephSyncChannel((msg) => {
			received.push(msg);
		});

		publishCephSyncEvent("CEPH_DEMO_MODE_TOGGLED", { isPatientDemoMode: true }, { patientId: "pat-sync-test" });
		assert.ok(received.length > 0);
		assert.equal(received[0]?.type, "CEPH_DEMO_MODE_TOGGLED");
		unsub();
	});
});
