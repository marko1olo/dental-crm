import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
	parseTopLevelSurface,
	resolveClinicRoute,
	primaryViewToAppView,
	appViewToPrimaryView,
	buildClinicHashUrl,
} from "../routeResolver";

describe("routeResolver SSOT", () => {
	it("parses public portals into public_portal contour", () => {
		const booking = parseTopLevelSurface({ pathname: "/booking/smile-clinic", search: "", hash: "" });
		assert.equal(booking.surface, "public_portal");
		if (booking.surface === "public_portal") {
			assert.equal(booking.kind, "booking");
			assert.equal(booking.slug, "smile-clinic");
		}

		const sign = parseTopLevelSurface({ pathname: "/consent-sign/abc-token-123", search: "", hash: "" });
		assert.equal(sign.surface, "public_portal");
		if (sign.surface === "public_portal") {
			assert.equal(sign.kind, "consent_sign");
			assert.equal(sign.token, "abc-token-123");
		}
	});

	it("parses aux displays separately from clinic workspace", () => {
		const cbct = parseTopLevelSurface({ pathname: "/", search: "?cbct=1", hash: "" });
		assert.equal(cbct.surface, "aux_display");
		if (cbct.surface === "aux_display") assert.equal(cbct.kind, "cbct_direct");

		const kiosk = parseTopLevelSurface({ pathname: "/kiosk", search: "", hash: "" });
		assert.equal(kiosk.surface, "aux_display");
		if (kiosk.surface === "aux_display") assert.equal(kiosk.kind, "kiosk");
	});

	it("keeps primary workspace views inside persistent clinic_workspace without standalone hijacking", () => {
		const settingsAccess = resolveClinicRoute("", "#settings/access");
		assert.equal(settingsAccess.view, "settings");
		assert.equal(settingsAccess.subTab, "access");
		assert.equal(settingsAccess.studio, null);

		const docs = resolveClinicRoute("", "#documents");
		assert.equal(docs.view, "documents");
		assert.equal(docs.studio, null);

		const warehouse = resolveClinicRoute("", "#warehouse");
		assert.equal(warehouse.view, "warehouse");
		assert.equal(warehouse.studio, null);

		const lab = resolveClinicRoute("", "#lab");
		assert.equal(lab.view, "lab");
		assert.equal(lab.studio, null);

		const plans = resolveClinicRoute("", "#treatment-plans");
		assert.equal(plans.view, "treatment_plans");
		assert.equal(plans.studio, null);

		const analyticsCohorts = resolveClinicRoute("", "#marketing-cohorts");
		assert.equal(analyticsCohorts.view, "analytics");
		assert.equal(analyticsCohorts.subTab, "cohorts");
		assert.equal(analyticsCohorts.studio, null);
	});

	it("prevents query filter false-positives (Wave8 parity)", () => {
		const patientsWithPhotoFilter = resolveClinicRoute("?patientId=pat-lab-123&filter=photo", "#patients");
		assert.equal(patientsWithPhotoFilter.view, "patients");
		assert.equal(patientsWithPhotoFilter.entityId, "pat-lab-123");
		assert.equal(patientsWithPhotoFilter.studio, null);

		const visitWithSettingsTab = resolveClinicRoute("?tab=settings&patient=1", "#visit");
		assert.equal(visitWithSettingsTab.view, "visit");
		assert.equal(visitWithSettingsTab.studio, null);
	});

	it("maps deep-linked studios at depth = 1 with explicit underlying view and params", () => {
		const cashbox = resolveClinicRoute("?stand=cashbox&amountRub=4500&patientId=pat-99", "");
		assert.equal(cashbox.view, "finance");
		assert.equal(cashbox.studio?.kind, "cashbox");
		if (cashbox.studio?.kind === "cashbox") {
			assert.equal(cashbox.studio.patientId, "pat-99");
			assert.equal(cashbox.studio.amountKopecks, 450000);
		}

		const odontogram = resolveClinicRoute("", "#odontogram?patientId=123");
		assert.equal(odontogram.view, "visit");
		assert.equal(odontogram.studio?.kind, "odontogram_fullscreen");
		if (odontogram.studio?.kind === "odontogram_fullscreen") {
			assert.equal(odontogram.studio.patientId, "123");
		}

		const endo = resolveClinicRoute("?tooth=36", "#endo?patientId=pat-7");
		assert.equal(endo.view, "visit");
		assert.equal(endo.studio?.kind, "endo");
		if (endo.studio?.kind === "endo") {
			assert.equal(endo.studio.patientId, "pat-7");
			assert.equal(endo.studio.toothFdi, 36);
		}
	});

	it("maps bidirectionally between PrimaryWorkspaceView and AppView", () => {
		assert.equal(primaryViewToAppView("treatment_plans"), "pipeline");
		assert.equal(primaryViewToAppView("warehouse"), "inventory");
		assert.equal(primaryViewToAppView("pricelist"), "settings");
		assert.equal(appViewToPrimaryView("pipeline"), "treatment_plans");
		assert.equal(appViewToPrimaryView("inventory"), "warehouse");

		const url = buildClinicHashUrl({ view: "visit", studio: "perio", entityId: "p-1" });
		assert.equal(url, "#perio?view=visit&patientId=p-1");
	});
});
