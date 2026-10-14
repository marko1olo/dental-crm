import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CephalometricAnalysisModal } from "../../radiology/CephalometricAnalysisModal";
import { CephStandaloneStudioView } from "../CephStandaloneStudioView";
import {
	parseCephStudioRoute,
	buildCephStudioPopoutUrl,
} from "../../../utils/runtimeRouter";
import {
	publishCephSyncEvent,
	subscribeCephSyncChannel,
	cacheActiveCephStudy,
	getCachedActiveCephStudy,
	type CephStudioSyncMessage,
} from "../cephStudioSyncChannel";

describe("Cephalometric Popout Studio & Dual Monitor Autonomy", () => {
	it("1. renders button [ ↗ 2-й монитор / Студия ] with data-testid='btn-ceph-popout-window' in CephalometricAnalysisModal", () => {
		const html = renderToStaticMarkup(
			createElement(CephalometricAnalysisModal, {
				isOpen: true,
				onClose: () => {},
				patientId: "pat-123",
				patientName: "Кузнецова Анна Павловна",
			}),
		);

		assert.ok(
			html.includes('data-testid="btn-ceph-popout-window"'),
			"Contains popout studio button data-testid='btn-ceph-popout-window'",
		);
		assert.ok(
			html.includes("2-й монитор / Студия"),
			"Displays text '2-й монитор / Студия' on popout button",
		);
		assert.ok(
			html.includes("Открыть полноэкранную студию цефалометрии на втором мониторе"),
			"Has accessible title explaining dual monitor purpose",
		);
	});

	it("2. parseCephStudioRoute authoritatively identifies /radiology/ceph-studio, /ceph-studio, and ?view=ceph-studio", () => {
		const route1 = parseCephStudioRoute("/radiology/ceph-studio?patientId=pat-777&patientName=Иванов");
		assert.equal(route1.isCephStudio, true);
		assert.equal(route1.patientId, "pat-777");
		assert.equal(route1.patientName, "Иванов");

		const route2 = parseCephStudioRoute("/ceph-studio");
		assert.equal(route2.isCephStudio, true);

		const route3 = parseCephStudioRoute("http://localhost:5173/?view=ceph-studio&patientDemo=true");
		assert.equal(route3.isCephStudio, true);
		assert.equal(route3.demoMode, true);

		const routeNegative = parseCephStudioRoute("/patients/list");
		assert.equal(routeNegative.isCephStudio, false);
	});

	it("3. buildCephStudioPopoutUrl creates canonical URL with patient parameters", () => {
		const url = buildCephStudioPopoutUrl({
			patientId: "pat-999",
			patientName: "Смирнов Алексей",
			demo: true,
			patientDemo: true,
		});

		assert.ok(url.startsWith("/radiology/ceph-studio?"));
		assert.ok(url.includes("view=ceph-studio"));
		assert.ok(url.includes("patientId=pat-999"));
		assert.ok(url.includes("demo=true"));
		assert.ok(url.includes("patientDemo=true"));
	});

	it("4. renders CephStandaloneStudioView in Doctor Diagnostic Mode by default", () => {
		const html = renderToStaticMarkup(
			createElement(CephStandaloneStudioView, {
				patientId: "pat-ortho-doc",
				patientName: "Кузнецова Анна Павловна",
				initialStudioMode: "doctor",
				autoLoadDemo: true,
			}),
		);

		assert.ok(
			html.includes('data-testid="ceph-standalone-studio"'),
			"Renders standalone studio root",
		);
		assert.ok(
			html.includes('data-testid="ceph-studio-header"'),
			"Renders studio cockpit header",
		);
		assert.ok(
			html.includes('data-testid="toggle-patient-demo-mode"'),
			"Renders toggle for patient demo mode",
		);
		assert.ok(
			html.includes("Показ пациенту"),
			"Shows button to switch into patient demo mode",
		);
		assert.ok(
			html.includes('data-testid="btn-ceph-insert-protocol"'),
			"Renders button to insert analysis into patient EMR protocol",
		);
		assert.ok(
			html.includes('data-testid="btn-ceph-close-window"'),
			"Renders close studio button",
		);
		assert.ok(
			html.includes('data-testid="ceph-studio-sidebar"'),
			"Renders sidebar for analysis",
		);
		assert.ok(
			html.includes("Ориентиры"),
			"Displays doctor landmarks tab",
		);
		assert.ok(
			html.includes("Расчет углов"),
			"Displays doctor angle calculation tab",
		);
	});

	it("5. renders CephStandaloneStudioView in Patient Demonstration Mode with Ricketts E-line and plain bite explanation", () => {
		const html = renderToStaticMarkup(
			createElement(CephStandaloneStudioView, {
				patientId: "pat-ortho-patient",
				patientName: "Кузнецова Анна Павловна",
				initialStudioMode: "patient",
				autoLoadDemo: true,
			}),
		);

		assert.ok(
			html.includes("Эстетический анализ профиля"),
			"Renders aesthetic profile header in patient mode",
		);
		assert.ok(
			html.includes("Эстетическая линия Риккетса (E-Line)"),
			"Renders Ricketts E-line card for patient understanding",
		);
		assert.ok(
			html.includes("Соотношение челюстей"),
			"Renders plain-language bite explanation card",
		);
		assert.ok(
			html.includes("Наклон передних зубов и улыбка"),
			"Renders incisor smile aesthetics card",
		);
		assert.ok(
			html.includes("Режим пациента"),
			"Toggle active label indicates patient demo mode is active",
		);
	});

	it("6. cacheActiveCephStudy and getCachedActiveCephStudy support zero-storage-quota in-memory transfers", () => {
		cacheActiveCephStudy({
			patientId: "pat-transfer-test",
			patientName: "Тестовый Пациент",
			scaleMmPerPixel: 0.125,
		});

		const retrieved = getCachedActiveCephStudy();
		assert.ok(retrieved !== null);
		assert.equal(retrieved.patientId, "pat-transfer-test");
		assert.equal(retrieved.scaleMmPerPixel, 0.125);

		// Clean up
		cacheActiveCephStudy(null);
		assert.equal(getCachedActiveCephStudy(), null);
	});

	it("7. publishCephSyncEvent and subscribeCephSyncChannel deliver messages through event dispatcher", () => {
		const received: CephStudioSyncMessage[] = [];
		const unsub = subscribeCephSyncChannel((msg) => {
			received.push(msg);
		});

		publishCephSyncEvent("CEPH_DEMO_MODE_TOGGLED", { isPatientDemoMode: true }, { patientId: "pat-123" });

		assert.ok(received.length > 0, "Subscriber received sync message");
		assert.equal(received[0]?.type, "CEPH_DEMO_MODE_TOGGLED");
		assert.equal((received[0]?.payload as { isPatientDemoMode: boolean }).isPatientDemoMode, true);

		unsub();
	});
});
