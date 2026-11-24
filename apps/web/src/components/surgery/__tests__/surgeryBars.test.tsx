/**
 * surgeryBars.test.tsx — Тесты панелей экстракции, синус-лифтинга и имплантации (Мандаты 8e, 8x, 8z).
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import { CANONICAL_SURGICAL_OPERATION_NORMS } from "@dental/shared";
import { VisitSurgeryExtractionBar } from "../../visit/surgery/VisitSurgeryExtractionBar";
import { VisitSurgerySinusGbrBar } from "../../visit/surgery/VisitSurgerySinusGbrBar";
import { VisitSurgeryImplantBar } from "../../visit/surgery/VisitSurgeryImplantBar";
import { VisitSurgeryPerioBar } from "../../visit/surgery/VisitSurgeryPerioBar";
import { VisitSurgeryCategoryCockpit } from "../../visit/surgery/modules/VisitSurgeryCategoryCockpit";
import { getSinusGbrSurgicalServices } from "../surgeryCatalogData";

describe("Surgery Clinical Bars (Extraction, Sinus/GBR, Implants, Perio/Emergency)", () => {
	it("1. renders VisitSurgeryExtractionBar with 1-click uncomplicated norm and chips", { timeout: 20000 }, () => {
		const html = renderToString(
			<VisitSurgeryExtractionBar
				effectiveTooth={38}
				patientName="Иванов Петр"
				doctorName="Др. Соколов"
				onApplyProtocolText={() => {}}
			/>,
		);

		assert.ok(html.includes("visit-surgery-extraction-bar"));
		assert.ok(html.includes("btn-uncomplicated-extraction-norm"));
		assert.ok(html.includes("btn-copy-post-op-memo"));
		assert.ok(html.includes("btn-extraction-complexity-simple"));
		assert.ok(html.includes("btn-extraction-complexity-complex"));
		assert.ok(html.includes("btn-extraction-complexity-impacted_dystopic"));
		assert.ok(html.includes("btn-hemostasis-alvogyl"));
		assert.ok(html.includes("btn-hemostasis-hemostatic_sponge"));
		assert.ok(html.includes("btn-hemostasis-vicryl_suture"));
		assert.ok(html.includes("btn-hemostasis-tampon"));
	});

	it("2. renders VisitSurgerySinusGbrBar with graft selection and membrane options", { timeout: 20000 }, () => {
		const html = renderToString(
			<VisitSurgerySinusGbrBar
				effectiveTooth={16}
				isClosedSinus={false}
				onApplyProtocolText={() => {}}
			/>,
		);

		assert.ok(html.includes("visit-surgery-sinus-gbr-bar"));
		assert.ok(html.includes("btn-uncomplicated-gbr-norm"));
		assert.ok(html.includes("Ксеногранулят 0.5 см³"));
		assert.ok(html.includes("Алломатрикс"));
		assert.ok(html.includes("Аутостружка"));
		assert.ok(html.includes("Бета-ТКФ"));
		assert.ok(html.includes("Коллагеновая 25×25"));
		assert.ok(html.includes("Перикардиальная"));
		assert.ok(html.includes("d-PTFE мембрана"));
		assert.ok(html.includes("btn-toggle-titanium-pins"));
	});

	it("3. renders VisitSurgeryImplantBar with extended brands", { timeout: 20000 }, () => {
		const html = renderToString(
			<VisitSurgeryImplantBar
				implantBrand="Корейская конусная система 11° SLA"
				setImplantBrand={() => {}}
				implantDiameter={4.0}
				setImplantDiameter={() => {}}
				implantLength={10.0}
				setImplantLength={() => {}}
				implantTorque={35}
				setImplantTorque={() => {}}
				implantIsq={72}
				setImplantIsq={() => {}}
				implantCap="fdm"
				setImplantCap={() => {}}
				implantSuture="Полипропилен 4-0 (монофиламент)"
				setImplantSuture={() => {}}
				onApplyPreset={() => {}}
			/>,
		);

		assert.ok(html.includes("btn-preset-standard-implant-tab"));
		assert.ok(html.includes("btn-implant-system-korean_conical_sla"));
		assert.ok(html.includes("btn-implant-system-premium_active_cone"));
		assert.ok(html.includes("btn-implant-system-cortical_microthread"));
		assert.ok(html.includes("input-implant-isq"));
		assert.ok(html.includes("btn-suture-polypropylene_4-0"));
	});

	it("4. renders VisitSurgeryPerioBar for mucogingival surgery (FGG/CTG) without implant toolbar leak (SEV-1)", { timeout: 20000 }, () => {
		const ctgNorm = CANONICAL_SURGICAL_OPERATION_NORMS.find((n) => n.id === "surgery_mucogingival_ctg");
		assert.ok(ctgNorm, "surgery_mucogingival_ctg norm must exist in canonical registry");

		const html = renderToString(
			<VisitSurgeryPerioBar
				effectiveTooth={13}
				norm={ctgNorm}
				onApplyProtocolText={() => {}}
			/>,
		);

		assert.ok(html.includes("visit-surgery-perio-bar"));
		assert.ok(html.includes("btn-uncomplicated-perio-norm"));
		assert.ok(html.includes("btn-technique-ctg"));
		assert.ok(html.includes("btn-technique-fgg"));
		assert.ok(html.includes("btn-technique-caf"));
		assert.ok(html.includes("btn-suture-Prolene_6-0"));
		assert.ok(html.includes("btn-copy-perio-post-op-memo"));
		assert.ok(html.includes("btn-perio-bar-add-to-invoice"));

		// Must NOT contain implant controls
		assert.equal(html.includes("btn-preset-standard-implant-tab"), false);
		assert.equal(html.includes("input-implant-isq"), false);
		assert.equal(html.includes("btn-implant-system-Dentium"), false);
	});

	it("5. renders VisitSurgeryCategoryCockpit correctly for perio_surgery and emergency categories (SEV-1)", { timeout: 20000 }, () => {
		const apicoNorm = CANONICAL_SURGICAL_OPERATION_NORMS.find((n) => n.id === "surgery_apicoectomy")!;
		assert.ok(apicoNorm);

		const fakeStatePerio = {
			effectiveTooth: 21,
			selectedNormId: apicoNorm.id,
			currentNorm: apicoNorm,
			setProtocolText: () => {},
			implantBrand: "Dentium",
			setImplantBrand: () => {},
			implantDiameter: 4.0,
			setImplantDiameter: () => {},
			implantLength: 10.0,
			setImplantLength: () => {},
			implantTorque: 35,
			setImplantTorque: () => {},
			implantIsq: 72,
			setImplantIsq: () => {},
			implantCap: "fdm" as const,
			setImplantCap: () => {},
			implantSuture: "Prolene 4-0",
			setImplantSuture: () => {},
			handleApplyStandardImplantationPreset: () => {},
		};

		// @ts-expect-error test subset
		const htmlPerio = renderToString(
			<VisitSurgeryCategoryCockpit
				s={fakeStatePerio}
				patientName="Петров В.В."
				doctorName="Хирург И.И."
			/>,
		);

		assert.ok(htmlPerio.includes("visit-surgery-perio-bar"), "Cockpit must render perio bar for perio_surgery");
		assert.equal(htmlPerio.includes("btn-preset-standard-implant-tab"), false, "Cockpit must NOT fall back to implant bar");

		// Emergency test
		const periostotomyNorm = CANONICAL_SURGICAL_OPERATION_NORMS.find((n) => n.id === "surgery_periostotomy")!;
		assert.ok(periostotomyNorm);

		const fakeStateEmergency = {
			...fakeStatePerio,
			effectiveTooth: 36,
			selectedNormId: periostotomyNorm.id,
			currentNorm: periostotomyNorm,
		};

		// @ts-expect-error test subset
		const htmlEmergency = renderToString(
			<VisitSurgeryCategoryCockpit
				s={fakeStateEmergency}
				patientName="Сидоров А.А."
				doctorName="Хирург И.И."
			/>,
		);

		assert.ok(htmlEmergency.includes("visit-surgery-perio-bar"), "Cockpit must render perio/emergency bar for emergency");
		assert.ok(htmlEmergency.includes("btn-toggle-rubber-drain"), "Emergency bar must contain drainage toggle");
		assert.equal(htmlEmergency.includes("btn-preset-standard-implant-tab"), false, "Emergency must NOT fall back to implant bar");
	});

	it("6. getSinusGbrSurgicalServices returns integer priceKopecks (SEV-3, Mandate 8bm)", () => {
		const closedServices = getSinusGbrSurgicalServices({
			isClosedSinus: true,
			toothFdi: 16,
		});

		const sinusClosed = closedServices.find((s) => s.code.includes("SINUS_LIFT") || s.nameRu.includes("закрытый"));
		assert.ok(sinusClosed);
		assert.equal(sinusClosed?.priceRub, 18000);
		assert.equal(sinusClosed?.priceKopecks, 1800000n, "Closed sinus lift priceKopecks must be 1800000n");

		const suture = closedServices.find((s) => s.nameRu.includes("Шов"));
		assert.ok(suture);
		assert.equal(suture?.priceKopecks, 150000n);

		const anesth = closedServices.find((s) => s.nameRu.includes("анестезия"));
		assert.ok(anesth);
		assert.equal(anesth?.priceKopecks, 90000n);

		const openWithMembrane = getSinusGbrSurgicalServices({
			isClosedSinus: false,
			toothFdi: 16,
			membrane: "Bio-Gide 25x25 мм",
		});

		const boneGraft = openWithMembrane.find((s) => s.nameRu.includes("Костная пластика"));
		assert.ok(boneGraft);
		assert.equal(boneGraft?.priceRub, 35000);
		assert.equal(boneGraft?.priceKopecks, 3500000n, "Open sinus / GBR priceKopecks must be 3500000n");

		const membraneService = openWithMembrane.find((s) => s.nameRu.includes("Фиксация барьерной мембраны"));
		assert.ok(membraneService);
		assert.equal(membraneService?.priceRub, 25000);
		assert.equal(membraneService?.priceKopecks, 2500000n, "Barrier membrane fixation priceKopecks must be 2500000n");
	});
});

