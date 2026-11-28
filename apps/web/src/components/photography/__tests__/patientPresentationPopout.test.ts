import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { BeforeAfterBlendView } from "../BeforeAfterBlendView";
import { BeforeAfterComparisonView } from "../BeforeAfterComparisonView";
import { ClinicalPhotoProtocolHeader } from "../ClinicalPhotoProtocolHeader";
import { ClinicalPhotoProtocolModal } from "../ClinicalPhotoProtocolModal";
import { PatientPresentationStandaloneView } from "../PatientPresentationStandaloneView";
import { compressChairsidePhotoToBlobUrl } from "../chairsidePhotoCompressor";
import { STANDARD_12_SLOT_PROTOCOL } from "../photoGridPresets";
import {
	DENTE_PRESENTATION_SYNC_CHANNEL,
	DENTE_PRESENTATION_STORAGE_KEY,
	isPatientPresentationRoute,
} from "../presentationSyncProtocol";

const CARTOON_EMOJI_RE =
	/[\u{1F300}-\u{1F5FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1FA70}-\u{1FAFF}]/u;

describe("Patient Presentation Pop-out & Memory Overflow Protection Suite (Live 6G SUT)", () => {
	const defaultPreset = STANDARD_12_SLOT_PROTOCOL;
	const beforeSlot = { slotId: defaultPreset.slots[0]?.id ?? "slot_1", imageUrl: "data:image/png;base64,iVBOR", detectedVitaShade: "A3" };
	const afterSlot = { slotId: defaultPreset.slots[1]?.id ?? "slot_2", imageUrl: "data:image/png;base64,iVBOR", detectedVitaShade: "A1" };

	it("1. Doctor Autonomy (Mandate 8e): renders 0 disabled buttons across presentation and protocol views", () => {
		const prevDoc = (globalThis as { document?: unknown }).document;
		(globalThis as { document?: unknown }).document = undefined;
		try {
			const htmlList = [
				renderToStaticMarkup(
					React.createElement(PatientPresentationStandaloneView, {
						initialBeforeImageUrl: beforeSlot.imageUrl,
						initialAfterImageUrl: afterSlot.imageUrl,
						initialClinicName: "Клиника ДЕНТЕ",
						initialPatientName: "Иванов А. П.",
					}),
				),
				renderToStaticMarkup(
					React.createElement(BeforeAfterBlendView, {
						beforeSlotRecord: beforeSlot,
						afterSlotRecord: afterSlot,
						blendOpacity: 0.5,
						onBlendOpacityChange: () => {},
					}),
				),
				renderToStaticMarkup(
					React.createElement(BeforeAfterComparisonView, {
						preset: defaultPreset,
						slotsData: { [beforeSlot.slotId]: beforeSlot, [afterSlot.slotId]: afterSlot },
						beforeSlotId: beforeSlot.slotId,
						afterSlotId: afterSlot.slotId,
					}),
				),
				renderToStaticMarkup(
					React.createElement(ClinicalPhotoProtocolModal, {
						isOpen: true,
						onClose: () => {},
						patientId: "pat-photo-1",
						patientName: "Иванов А. П.",
					}),
				),
			];

			for (const html of htmlList) {
				assert.ok(html.length > 0);
				assert.equal(/<button[^>]*\bdisabled\b/i.test(html), false, "Presentation components must render 0 disabled buttons");
				assert.equal(CARTOON_EMOJI_RE.test(html), false, "Presentation components must render 0 cartoon emojis");
			}
		} finally {
			(globalThis as { document?: unknown }).document = prevDoc;
		}
	});

	it("2. Strict Clinical Isolation: PatientPresentationStandaloneView omits prices, financial terms, and CRM notes", () => {
		const populatedHtml = renderToStaticMarkup(
			React.createElement(PatientPresentationStandaloneView, {
				initialBeforeImageUrl: beforeSlot.imageUrl,
				initialAfterImageUrl: afterSlot.imageUrl,
				initialBeforeLabel: "До лечения",
				initialAfterLabel: "После лечения",
				initialClinicName: "Клиника ДЕНТЕ",
				initialPatientName: "Соколова М. И.",
			}),
		);

		assert.ok(populatedHtml.includes('data-testid="patient-presentation-view"'));
		assert.equal(populatedHtml.includes("₽"), false);
		assert.equal(populatedHtml.includes("€"), false);
		assert.equal(/\$\s*\d+/.test(populatedHtml), false);
		assert.equal(/прейскурант/i.test(populatedHtml), false);
		assert.equal(/задолженность/i.test(populatedHtml), false);
		assert.equal(/себестоимость/i.test(populatedHtml), false);
		assert.equal(/касса/i.test(populatedHtml), false);
		assert.equal(/оплата/i.test(populatedHtml), false);
		assert.equal(/анамнез/i.test(populatedHtml), false);
		assert.equal(/диагноз/i.test(populatedHtml), false);

		const emptyHtml = renderToStaticMarkup(React.createElement(PatientPresentationStandaloneView, {}));
		assert.ok(emptyHtml.includes('data-testid="presentation-empty-state"'));
	});

	it("3. Popout Launcher Buttons: header, blend, and comparison views render btn-patient-presentation-popout", () => {
		const headerHtml = renderToStaticMarkup(
			React.createElement(ClinicalPhotoProtocolHeader, {
				patientName: "Иванов А. П.",
				patientCardNumber: "К-100",
				doctorName: "Соколов А. В.",
				clinicName: "Клиника ДЕНТЕ",
				activeViewMode: "comparison",
				setActiveViewMode: () => {},
				slotsData: {},
				activePresetId: defaultPreset.id,
				onSaveProtocol: () => {},
				onClose: () => {},
			}),
		);
		const blendHtml = renderToStaticMarkup(
			React.createElement(BeforeAfterBlendView, {
				beforeSlotRecord: beforeSlot,
				afterSlotRecord: afterSlot,
				blendOpacity: 0.5,
				onBlendOpacityChange: () => {},
			}),
		);
		const comparisonHtml = renderToStaticMarkup(
			React.createElement(BeforeAfterComparisonView, {
				preset: defaultPreset,
				slotsData: {},
				beforeSlotId: beforeSlot.slotId,
				afterSlotId: afterSlot.slotId,
			}),
		);

		for (const html of [headerHtml, blendHtml, comparisonHtml]) {
			assert.ok(html.includes('data-testid="btn-patient-presentation-popout"'));
		}
	});

	it("4. BroadcastChannel Sync Protocol Constants & Route Detection", () => {
		assert.equal(DENTE_PRESENTATION_SYNC_CHANNEL, "dente_presentation_sync");
		assert.equal(DENTE_PRESENTATION_STORAGE_KEY, "dente_presentation_cached_state");

		const prevWindow = (globalThis as { window?: unknown }).window;
		try {
			(globalThis as { window: unknown }).window = {
				location: { pathname: "/chairside/patient-presentation", search: "", hash: "" },
			};
			assert.equal(isPatientPresentationRoute(), true);

			(globalThis as { window: unknown }).window = {
				location: { pathname: "/", search: "?view=patient-presentation", hash: "" },
			};
			assert.equal(isPatientPresentationRoute(), true);

			(globalThis as { window: unknown }).window = {
				location: { pathname: "/schedule", search: "", hash: "#schedule" },
			};
			assert.equal(isPatientPresentationRoute(), false);
		} finally {
			(globalThis as { window?: unknown }).window = prevWindow;
		}
	});

	it("5. compressChairsidePhotoToBlobUrl allocates and revokes object URL cleanly", async () => {
		const prevGlobals = {
			Image: (globalThis as { Image?: unknown }).Image,
			document: (globalThis as { document?: unknown }).document,
			createObjectURL: URL.createObjectURL,
			revokeObjectURL: URL.revokeObjectURL,
		};
		const createdUrls: string[] = [];
		const revokedUrls: string[] = [];
		let imgClearedSrc: string | null = null;
		let canvasResetWidth: number | null = null;

		URL.createObjectURL = () => {
			const u = `blob:dente-test-${createdUrls.length + 1}`;
			createdUrls.push(u);
			return u;
		};
		URL.revokeObjectURL = (u: string) => {
			revokedUrls.push(u);
		};
		(globalThis as { Image: unknown }).Image = class FakeImage {
			width = 800;
			height = 600;
			onload: (() => void) | null = null;
			onerror: (() => void) | null = null;
			#src = "";
			get src() {
				return this.#src;
			}
			set src(v: string) {
				this.#src = v;
				if (v === "") {
					imgClearedSrc = "";
				} else if (this.onload) {
					queueMicrotask(() => this.onload?.());
				}
			}
		};
		const fakeCanvas = {
			_width: 0,
			height: 0,
			get width() {
				return this._width;
			},
			set width(v: number) {
				this._width = v;
				if (v === 0) canvasResetWidth = 0;
			},
			getContext() {
				return {
					save: () => {},
					restore: () => {},
					drawImage: () => {},
				};
			},
			toBlob(cb: (blob: Blob | null) => void) {
				cb(new Blob(["compressed-webp"], { type: "image/webp" }));
			},
		};
		(globalThis as { document: unknown }).document = {
			createElement: (tag: string) => (tag === "canvas" ? fakeCanvas : {}),
		};

		try {
			const inputBlob = new Blob([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], { type: "image/png" });
			const res = await compressChairsidePhotoToBlobUrl(inputBlob, { maxDimension: 1024 });
			assert.equal(res.blobUrl.startsWith("blob:dente-test-"), true);
			assert.ok(res.sizeBytes > 0);
			assert.equal(imgClearedSrc, "");
			assert.equal(canvasResetWidth, 0);

			res.revoke();
			assert.ok(revokedUrls.includes(res.blobUrl), "revoke() must call URL.revokeObjectURL on the compressed blob URL");
		} finally {
			(globalThis as { Image?: unknown }).Image = prevGlobals.Image;
			(globalThis as { document?: unknown }).document = prevGlobals.document;
			URL.createObjectURL = prevGlobals.createObjectURL;
			URL.revokeObjectURL = prevGlobals.revokeObjectURL;
		}
	});
});
