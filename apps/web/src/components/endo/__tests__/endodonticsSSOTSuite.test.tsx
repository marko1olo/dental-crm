/**
 * DENTE Dental CRM — Endodontics Canonical SSOT & Root Canal Protocols Suite
 * apps/web/src/components/endo/__tests__/endodonticsSSOTSuite.test.tsx
 *
 * Чистый тестовый сьют на node:test и node:assert/strict (Мандаты 8e, 8n, 8am, 8wy, 8aq, 8b).
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import {
	EndodonticStudioModal,
} from "../EndodonticStudioModal";
import {
	CANONICAL_ENDO_PROTOCOLS,
	CANONICAL_IRRIGATION_SOLUTIONS,
	CANONICAL_MAF_SIZES,
	CANONICAL_WL_CHIPS,
	calculateEndoTreatmentCostKopecks,
	getChairsideDefaultCanals,
	getDefaultCanalsForTooth,
	getToothCanalAnatomySpec,
	formatWorkingLengthDisplay,
	formatEndoPatientMemo,
	sanitizeCanalsForSubmission,
	getAnatomicalWorkingLength,
} from "../endodonticsCatalogData";
import { DirectEndodonticsLauncher } from "../DirectEndodonticsLauncher";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const endoDir = path.resolve(__dirname, "..");
const webSrc = path.resolve(endoDir, "../..");

describe("🏛️ DENTE Endodontics Canonical SSOT & Root Canal Protocols Suite", () => {
	describe("1. FDI Tooth Anatomy & Defaults (11..48)", () => {
		it("Upper molars (16, 26) have 4 anatomical canals: MB1, MB2, DB, P", () => {
			const canals16 = getDefaultCanalsForTooth(16);
			assert.ok(canals16.length >= 3, "Upper molar must have at least 3-4 canals");
			const names = canals16.map((c) => c.canalName);
			assert.ok(names.includes("MB1") || names.includes("MB"), "Has Mesiobuccal");
			assert.ok(names.includes("DB"), "Has Distobuccal");
			assert.ok(names.includes("P"), "Has Palatal");
		});

		it("Lower molars (36, 46) have anatomical canals: MB, ML, D", () => {
			const canals46 = getDefaultCanalsForTooth(46);
			assert.ok(canals46.length >= 3, "Lower molar 46 has at least 3 canals");
			const names = canals46.map((c) => c.canalName);
			assert.ok(names.includes("MB") && names.includes("ML") && names.includes("D"));
		});

		it("Upper premolars (14, 24) have 2 canals (B, P) and incisors have 1 canal", () => {
			const canals14 = getDefaultCanalsForTooth(14);
			assert.equal(canals14.length, 2, "Upper first premolar has 2 canals");
			const canals21 = getDefaultCanalsForTooth(21);
			assert.equal(canals21.length, 1, "Central incisor has 1 canal");
		});

		it("Working Length limits match human anatomy via getToothCanalAnatomySpec", () => {
			const specCanine = getToothCanalAnatomySpec(13);
			assert.ok(specCanine.avgWlMm >= 25.0, "Canine is the longest tooth");
			assert.equal(specCanine.typicalCanalsCount, 1);

			const specMolar = getToothCanalAnatomySpec(16);
			assert.equal(specMolar.typicalCanalsCount, 4);
		});
	});

	describe("2. Three Canonical Endodontic Protocols", () => {
		it("Protocol 1: Pulpitis 1-visit (vital extirpation, NiTi, NaOCl+EDTA, gutta-percha + AH Plus)", () => {
			const proto = CANONICAL_ENDO_PROTOCOLS.pulpitis_1visit;
			assert.equal(proto.id, "pulpitis_1visit");
			assert.equal(proto.stageStamp, "COMPLETED");
			assert.ok(proto.obturationTechnique.includes("AH Plus"));
			assert.ok(proto.irrigation.includes("NaOCl 3% + EDTA 17%"));

			const note = proto.generateSoapNote({
				activeTooth: 16,
				toothAnatomicalName: "Первый моляр верхней челюсти",
				canals: getChairsideDefaultCanals(16),
			});
			assert.ok(note.includes("ПУЛЬПИТ В 1 ВИЗИТ"));
			assert.ok(note.includes("AH Plus"));
			assert.ok(note.includes("Apex 0.0"));
		});

		it("Protocol 2: Periodontitis (disinfection, temporary Ca(OH)2 Calcept for 10-14 days)", () => {
			const proto = CANONICAL_ENDO_PROTOCOLS.periodontitis_temp;
			assert.equal(proto.id, "periodontitis_temp");
			assert.equal(proto.stageStamp, "TEMP_CAOH2");
			assert.ok(proto.defaultSealer.includes("Каласепт"));

			const note = proto.generateSoapNote({
				activeTooth: 36,
				toothAnatomicalName: "Первый моляр нижней челюсти",
				canals: getChairsideDefaultCanals(36),
			});
			assert.ok(note.includes("ПЕРИОДОНТИТ 1-Й ВИЗИТ"));
			assert.ok(note.includes("Ca(OH)2"));
			assert.ok(note.includes("10–14 дней"));
		});

		it("Protocol 3: Retreatment / Canal Unsealing (removal of gutta-percha/resorcin, revision)", () => {
			const proto = CANONICAL_ENDO_PROTOCOLS.retreatment_unsealing;
			assert.equal(proto.id, "retreatment_unsealing");
			assert.ok(proto.rotarySystem.includes("Retreatment") || proto.rotarySystem.includes("D-RaCe"));
			assert.ok(proto.irrigation.includes("Хлоргексидин"));

			const note = proto.generateSoapNote({
				activeTooth: 46,
				toothAnatomicalName: "Первый моляр нижней челюсти",
				canals: getChairsideDefaultCanals(46),
			});
			assert.ok(note.includes("РАСПЛОМБИРОВКА И РЕТРИТМЕНТ"));
			assert.ok(note.includes("распломбирован на всю глубину"));
		});
	});

	describe("3. BigInt Currency Math (Mandate 8wy Zero-Float Precision)", () => {
		it("Calculates endodontic treatment cost strictly in integer kopecks", () => {
			const breakdown1Canal = calculateEndoTreatmentCostKopecks({
				toothNumber: 21,
				canalsCount: 1,
				protocolId: "pulpitis_1visit",
				withRvg: true,
			});

			assert.equal(typeof breakdown1Canal.totalKopecks, "bigint", "Total kopecks must be BigInt");
			assert.ok(breakdown1Canal.totalKopecks > 0n);
			assert.equal(breakdown1Canal.totalRubles, Number(breakdown1Canal.totalKopecks / 100n));

			for (const s of breakdown1Canal.services) {
				assert.equal(typeof s.priceKopecks, "bigint", `Service ${s.code} price must be BigInt`);
			}
		});

		it("Scales correctly with 3-canal molar and retreatment unsealing", () => {
			const retreatBreakdown = calculateEndoTreatmentCostKopecks({
				toothNumber: 46,
				canalsCount: 3,
				protocolId: "retreatment_unsealing",
				withRvg: true,
				withMicroscope: true,
			});

			// 3 канала распломбировки: 3 * 220_000n = 660_000n
			const unsealService = retreatBreakdown.services.find((s) => s.code === "A16.07.082.001");
			assert.ok(unsealService, "Must include unsealing service");
			assert.equal(unsealService?.priceKopecks, 660_000n);

			// Микроскоп
			const microscopeService = retreatBreakdown.services.find((s) => s.code === "A16.07.030.005");
			assert.ok(microscopeService, "Must include dental microscope service");
			assert.equal(microscopeService?.priceKopecks, 300_000n);
		});
	});

	describe("4. Mandate 8e: Doctor Autonomy (Zero Disabled Buttons)", () => {
		it("EndodonticStudioModal contains ZERO disabled buttons", () => {
			const html = renderToString(
				<EndodonticStudioModal
					isOpen={true}
					onClose={() => {}}
					toothNumber={16}
					patientName="Алексеев Д.В."
					doctorName="Д-р Иванов А.С."
				/>,
			);
			assert.ok(html.includes('data-testid="endodontic-studio-modal"'));
			assert.ok(html.includes('data-testid="insert-endo-protocol-btn"'));

			const disabledButtonRegex = /<button[^>]*\bdisabled\b[^>]*>/i;
			assert.equal(disabledButtonRegex.test(html), false, "Mandate 8e: Must have ZERO disabled buttons");
		});

		it("Sanitizes invalid working length without crashing or blocking doctor", () => {
			const dirtyCanals = [
				{ id: "1", canalName: "MB", workingLengthMm: -5, masterApicalFile: "", taper: "", obturationTechnique: "" },
				{ id: "2", canalName: "DB", workingLengthMm: 0, isObliterated: true, masterApicalFile: "", taper: "", obturationTechnique: "" },
			];
			const sanitized = sanitizeCanalsForSubmission(dirtyCanals, 16, "COMPLETED", getAnatomicalWorkingLength);
			assert.ok(Number(sanitized[0].workingLengthMm) > 0, "Fallback to anatomical WL for invalid input");
			assert.equal(sanitized[1].workingLengthMm, 0, "Obliterated canal stays 0 mm");
		});
	});

	describe("5. Mandate 8am & Apple HIG: Mobile Touch Ergonomics", () => {
		it("Renders single Primary CTA button with teal theme (#0d9488)", () => {
			const html = renderToString(
				<EndodonticStudioModal
					isOpen={true}
					onClose={() => {}}
					toothNumber={36}
				/>,
			);
			assert.ok(html.includes("Зафиксировать протокол каналов"), "Clear action CTA title");
			assert.ok(html.includes("bg-[var(--teal,#0d9488)]"), "Uses canonical teal token");
		});

		it("Has mobile bottom sheet drag handle (36x5px) and safe area inset", () => {
			const html = renderToString(
				<EndodonticStudioModal
					isOpen={true}
					onClose={() => {}}
					toothNumber={46}
				/>,
			);
			assert.ok(html.includes("w-9 h-1.5"), "Has iOS drag handle 36x5px");
			assert.ok(html.includes("safe-area-inset-bottom"), "Protects Home Indicator area");
			assert.ok(html.includes("overflow-x-clip"), "0px horizontal drift invariant");
		});

		it("Action touch targets satisfy Apple HIG min-h >= 44px (min-h-[50px])", () => {
			const html = renderToString(
				<EndodonticStudioModal
					isOpen={true}
					onClose={() => {}}
					toothNumber={14}
				/>,
			);
			assert.ok(html.includes("min-h-[50px]"), "Primary CTA has generous touch area");
		});
	});

	describe("6. Clean Clinical Language & Anti-Jargon Mandate (8x & 8ap)", () => {
		it("EndodonticStudioModal contains ZERO '043/у' or '804н' regulatory jargon in UI", () => {
			const html = renderToString(
				<EndodonticStudioModal
					isOpen={true}
					onClose={() => {}}
					toothNumber={16}
				/>,
			);
			assert.ok(!html.includes("043/у"), "No raw Form 043/u in visible UI");
			assert.ok(!html.includes("804н"), "No raw Law 804n in visible UI");
			assert.ok(html.includes("Эндодонтическая студия"), "Professional clinical Russian");
		});

		it("Zero cartoon emojis in modal markup", () => {
			const html = renderToString(
				<EndodonticStudioModal
					isOpen={true}
					onClose={() => {}}
					toothNumber={26}
				/>,
			);
			const emojiRegex = /[\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
			assert.ok(!emojiRegex.test(html), "Zero cartoon emojis allowed");
		});
	});

	describe("7. Live UI Mounting & Deep Links (Mandate 8aq)", () => {
		it("DirectEndodonticsLauncher mounts in AppShell.tsx", () => {
			const appShellPath = path.join(webSrc, "AppShell.tsx");
			const content = fs.readFileSync(appShellPath, "utf-8");
			assert.ok(content.includes("DirectEndodonticsLauncher"), "AppShell must import DirectEndodonticsLauncher");
			assert.ok(content.includes("<DirectEndodonticsLauncher />"), "AppShell must render <DirectEndodonticsLauncher />");
		});

		it("DirectEndodonticsLauncher mounts in StandaloneLaunchers.tsx under deep links", () => {
			const launchersPath = path.join(webSrc, "components/appLayout/modalsContainerModules/StandaloneLaunchers.tsx");
			const content = fs.readFileSync(launchersPath, "utf-8");
			assert.ok(content.includes("DirectEndodonticsLauncher"), "StandaloneLaunchers must import DirectEndodonticsLauncher");
			assert.ok(content.includes("endo=1") || content.includes("#endo"), "Must handle endo deep link");
			assert.ok(content.includes("#root-canals") || content.includes("root_canals=1"), "Must handle root-canals deep link");
		});
	});

	describe("8. Healthy Sweet Spot File Line Count Ceilings (Mandate 8b / 8zi)", () => {
		it("endodonticsCatalogData.ts is in healthy sweet spot (280–350 lines)", () => {
			const catalogPath = path.join(endoDir, "endodonticsCatalogData.ts");
			const lines = fs.readFileSync(catalogPath, "utf-8").split("\n").length;
			assert.ok(lines >= 280 && lines <= 350, `endodonticsCatalogData.ts must be 280–350 lines, was ${lines}`);
		});

		it("EndodonticStudioModal.tsx is in healthy sweet spot (380–480 lines)", () => {
			const studioPath = path.join(endoDir, "EndodonticStudioModal.tsx");
			const lines = fs.readFileSync(studioPath, "utf-8").split("\n").length;
			assert.ok(lines >= 380 && lines <= 480, `EndodonticStudioModal.tsx must be 380–480 lines, was ${lines}`);
		});

		it("DirectEndodonticsLauncher.tsx is in healthy sweet spot (60–100 lines)", () => {
			const launcherPath = path.join(endoDir, "DirectEndodonticsLauncher.tsx");
			const lines = fs.readFileSync(launcherPath, "utf-8").split("\n").length;
			assert.ok(lines >= 60 && lines <= 100, `DirectEndodonticsLauncher.tsx must be 60–100 lines, was ${lines}`);
		});
	});
});
