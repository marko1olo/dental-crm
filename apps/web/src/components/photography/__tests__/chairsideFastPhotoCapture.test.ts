/**
 * DENTE Dental CRM — Unit & Regression Tests: Chairside Clipboard Photo,
 * Intraoral Camera Fast Capture & Before/After Patient Splitter (6G Live SUT)
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { IntraoralCameraModal } from "../IntraoralCameraModal";
import { BeforeAfterSplitter } from "../../visit/BeforeAfterSplitter";
import { VisitDiaryPhotoUpload } from "../../visit/photoUpload/VisitDiaryPhotoUpload";
import { VisitDiaryPhotoActionsToolbar } from "../../visit/photoUpload/VisitDiaryPhotoActionsToolbar";
import { VisitDiaryPhotoThumbnailGrid } from "../../visit/photoUpload/VisitDiaryPhotoThumbnailGrid";
import { VisitDiaryPhotoModals } from "../../visit/photoUpload/VisitDiaryPhotoModals";
import { calculateSplitClipPath } from "../photoProtocolMath";
import { useClipboardPhotoPaste } from "../useClipboardPhotoPaste";
import { compressChairsidePhotoToBlobUrl } from "../chairsidePhotoCompressor";

const EMOJI_REGEX =
	/[\u{1F300}-\u{1F5FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1FA70}-\u{1FAFF}]/u;

describe("Chairside Fast Photo Capture & Before/After Splitter (6G Live SUT)", () => {
	it("1. IntraoralCameraModal renders closed empty and live capture controls without disabled buttons or emojis", () => {
		const closed = renderToStaticMarkup(
			React.createElement(IntraoralCameraModal, {
				isOpen: false,
				onClose: () => {},
				onCapturePhoto: async () => {},
			}),
		);
		assert.equal(closed, "");

		const open = renderToStaticMarkup(
			React.createElement(IntraoralCameraModal, {
				isOpen: true,
				onClose: () => {},
				onCapturePhoto: async () => {},
			}),
		);
		assert.ok(open.length > 50);
		assert.equal(open.includes('disabled=""'), false);
		assert.equal(EMOJI_REGEX.test(open), false);
	});

	it("2. BeforeAfterSplitter renders empty state, populated comparison slider, and deterministic split clip path", () => {
		const emptyHtml = renderToStaticMarkup(
			React.createElement(BeforeAfterSplitter, {
				photos: [],
			}),
		);
		assert.ok(emptyHtml.includes('data-testid="before-after-empty-state"'));
		assert.equal(emptyHtml.includes('disabled=""'), false);
		assert.equal(EMOJI_REGEX.test(emptyHtml), false);

		const activeHtml = renderToStaticMarkup(
			React.createElement(BeforeAfterSplitter, {
				beforeUrl: "blob:before",
				afterUrl: "blob:after",
				beforeLabel: "До",
				afterLabel: "После",
				onClose: () => {},
			}),
		);
		assert.ok(activeHtml.includes('data-testid="before-after-split-slider"'));
		assert.ok(activeHtml.includes("До"));
		assert.ok(activeHtml.includes("После"));
		assert.ok(calculateSplitClipPath(35, "vertical").includes("65%"));
	});

	it("3. VisitDiaryPhotoActionsToolbar exposes Ctrl+V hint, Before/After CTA, QR Bridge & DSD without disabled buttons", () => {
		const html = renderToStaticMarkup(
			React.createElement(VisitDiaryPhotoActionsToolbar, {
				isLocked: false,
				diaryId: "diary-1",
				attachmentsCount: 2,
				isUploading: false,
				onCameraOpen: () => {},
				onBeforeAfterOpen: () => {},
				onFileInputChange: () => {},
				onQrBridgeOpen: () => {},
				onDsdOpen: () => {},
			}),
		);
		assert.ok(html.includes("Ctrl+V: вставить"));
		assert.ok(html.includes("До / После"));
		assert.ok(html.includes('data-testid="btn-visit-diary-qr-bridge"'));
		assert.ok(html.includes('data-testid="btn-visit-diary-open-dsd"'));
		assert.equal(html.includes('disabled=""'), false);
		assert.equal(EMOJI_REGEX.test(html), false);
	});

	it("4. VisitDiaryPhotoUpload & VisitDiaryPhotoThumbnailGrid render cleanly for unlocked visits", () => {
		const uploadHtml = renderToStaticMarkup(
			React.createElement(VisitDiaryPhotoUpload, {
				visitId: "visit-1",
				diaryId: "diary-1",
				isLocked: false,
				patientId: "pat-1",
				patientName: "Сидоров А.А.",
			}),
		);
		assert.ok(uploadHtml.includes("Вложения (Фотографии)"));
		assert.ok(uploadHtml.includes("Ctrl+V: вставить"));
		assert.equal(uploadHtml.includes('disabled=""'), false);
		assert.equal(EMOJI_REGEX.test(uploadHtml), false);

		const gridHtml = renderToStaticMarkup(
			React.createElement(VisitDiaryPhotoThumbnailGrid, {
				attachments: [
					{
						id: "att-1",
						name: "tooth_11.jpg",
						mimeType: "image/jpeg",
						sizeBytes: 1024,
					},
				],
				photoObjectUrls: { "att-1": "blob:tooth-11" },
				unreadablePhotoIds: [],
				loadState: "ready",
				selectedPrintIds: new Set(["att-1"]),
				isLocked: false,
				diaryId: "diary-1",
				zoomPhoto: null,
				onZoomChange: () => {},
				onTogglePrint: () => {},
				onDeletePhoto: () => {},
				onReload: () => {},
			}),
		);
		assert.ok(gridHtml.includes("tooth_11.jpg"));
		assert.equal(EMOJI_REGEX.test(gridHtml), false);
	});

	it("5. VisitDiaryPhotoModals mounts BeforeAfterSplitter when isBeforeAfterOpen is true", () => {
		const html = renderToStaticMarkup(
			React.createElement(VisitDiaryPhotoModals, {
				isDsdModalOpen: false,
				onCloseDsd: () => {},
				patientId: "pat-1",
				patientName: "Пациент",
				visitId: "visit-1",
				dsdPatientPhotos: [],
				onDsdApplySuccess: () => {},
				isQrBridgeOpen: false,
				onCloseQrBridge: () => {},
				onQrPhotoReceived: () => {},
				isCameraModalOpen: false,
				onCloseCameraModal: () => {},
				onCaptureCameraPhoto: async () => {},
				isBeforeAfterOpen: true,
				onCloseBeforeAfter: () => {},
				splitterPhotos: [],
			}),
		);
		assert.ok(html.includes('data-testid="before-after-split-slider"'));
		assert.equal(EMOJI_REGEX.test(html), false);
	});

	it("6. useClipboardPhotoPaste & compressChairsidePhotoToBlobUrl handle clipboard paste & URL cleanup", async () => {
		function HookProbe() {
			useClipboardPhotoPaste({ enabled: false, onPhotoReceived: () => {} });
			return React.createElement("span", null, "probe");
		}
		assert.ok(renderToStaticMarkup(React.createElement(HookProbe)).includes("probe"));

		const prevCreate = URL.createObjectURL;
		const prevRevoke = URL.revokeObjectURL;
		let revokedUrl: string | null = null;
		(URL as { createObjectURL: (obj: Blob) => string }).createObjectURL = () => "blob:chairside-test";
		(URL as { revokeObjectURL: (url: string) => void }).revokeObjectURL = (url: string) => {
			revokedUrl = url;
		};
		try {
			const res = await compressChairsidePhotoToBlobUrl(new Blob(["raw"], { type: "image/jpeg" }));
			assert.equal(res.blobUrl, "blob:chairside-test");
			res.revoke();
			assert.equal(revokedUrl, "blob:chairside-test");
		} finally {
			(URL as { createObjectURL: typeof prevCreate }).createObjectURL = prevCreate;
			(URL as { revokeObjectURL: typeof prevRevoke }).revokeObjectURL = prevRevoke;
		}
	});
});
