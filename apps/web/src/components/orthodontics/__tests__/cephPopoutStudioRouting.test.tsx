import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CephalometricAnalysisModal } from "../../radiology/CephalometricAnalysisModal";
import { parseCephStudioRoute, buildCephStudioPopoutUrl } from "../../../utils/runtimeRouter";

describe("Cephalometric Popout Studio Routing & Triggers", () => {
	it("renders button [ ↗ 2-й монитор / Студия ] with data-testid='btn-ceph-popout-window' in CephalometricAnalysisModal", () => {
		const html = renderToStaticMarkup(
			createElement(CephalometricAnalysisModal, {
				isOpen: true,
				onClose: () => {},
				patientId: "pat-123",
				patientName: "Кузнецова Анна Павловна",
			}),
		);

		assert.ok(html.includes('data-testid="btn-ceph-popout-window"'), "Contains popout studio button");
		assert.ok(html.includes("2-й монитор / Студия"), "Displays text on popout button");
		assert.ok(html.includes("Открыть полноэкранную студию цефалометрии на втором мониторе"), "Has accessible title");
	});

	it("parseCephStudioRoute authoritatively identifies /radiology/ceph-studio, /ceph-studio, and ?view=ceph-studio", () => {
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

	it("buildCephStudioPopoutUrl creates canonical URL with patient parameters", () => {
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
});
