import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { VisitDiaryPhotoUpload, type DiaryPrintPhoto } from "../../../VisitDiaryPhotoUpload";
import { VisitDiaryPhotoActionsToolbar } from "../VisitDiaryPhotoActionsToolbar";
import { VisitDiaryPhotoThumbnailGrid } from "../VisitDiaryPhotoThumbnailGrid";

const CARTOON_EMOJI_REGEX =
	/[\u{1F300}-\u{1F5FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1FA70}-\u{1FAFF}]/u;

describe("Visit Diary Photo Upload Rendered Runtime & P1-5.1/P2-5.4 Invariants (@dental/web)", () => {
	it("1. Root facade VisitDiaryPhotoUpload renders cleanly without disabled buttons or cartoon emojis", () => {
		const sampleTypeCheck: DiaryPrintPhoto = { id: "att-1", url: "blob:test", name: "photo.jpg" };
		assert.equal(sampleTypeCheck.id, "att-1");

		const html = renderToStaticMarkup(
			React.createElement(VisitDiaryPhotoUpload, {
				visitId: "visit-1",
				diaryId: "diary-1",
				isLocked: false,
				patientId: "pat-1",
				patientName: "Тестов И.И.",
			}),
		);

		assert.equal(
			/<button[^>]*\sdisabled(?:=["'][^"']*["'])?(?=[\s>])/i.test(html),
			false,
			"VisitDiaryPhotoUpload must contain 0 disabled buttons",
		);
		assert.equal(CARTOON_EMOJI_REGEX.test(html), false, "Must contain 0 cartoon emojis");
	});

	it("2. Clinician Actions Toolbar enforces 44px touch targets, neutral monochrome icons (P2-5.4), and action labels", () => {
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

		assert.ok(html.includes("Ctrl+V: вставить"), "Toolbar must display Ctrl+V quick hint");
		assert.ok(html.includes("Снимок с камеры"), "Toolbar must contain camera capture button");
		assert.ok(html.includes("Прикрепить фото"), "Toolbar must contain attach photo button");
		assert.ok(html.includes("До / После"), "Toolbar must contain Before/After comparison button");
		assert.ok(html.includes("min-h-[44px]"), "Toolbar buttons must adhere to 44px mobile touch targets");
		assert.equal(html.includes("text-emerald-600"), false, "P2-5.4: rainbow icon classes must be neutralized");
		assert.ok(html.includes("text-[var(--ink-muted)]"), "Icons must use monochrome semantic ink-muted token");
		assert.equal(CARTOON_EMOJI_REGEX.test(html), false, "Toolbar must contain 0 cartoon emojis");
	});

	it("3. Photo Thumbnail Grid renders loading, error, and populated states cleanly without disabled buttons or emojis", () => {
		const loadingHtml = renderToStaticMarkup(
			React.createElement(VisitDiaryPhotoThumbnailGrid, {
				attachments: [],
				photoObjectUrls: {},
				unreadablePhotoIds: [],
				loadState: { phase: "loading" },
				selectedPrintIds: new Set(),
				isLocked: false,
				diaryId: "diary-1",
				zoomPhoto: null,
				onZoomChange: () => {},
				onTogglePrint: () => {},
				onDeletePhoto: () => {},
				onReload: () => {},
			}),
		);
		assert.ok(loadingHtml.includes("Загрузка снимков"), "Grid must render loading state");

		const errorHtml = renderToStaticMarkup(
			React.createElement(VisitDiaryPhotoThumbnailGrid, {
				attachments: [],
				photoObjectUrls: {},
				unreadablePhotoIds: [],
				loadState: { phase: "failed", status: 500 },
				selectedPrintIds: new Set(),
				isLocked: false,
				diaryId: "diary-1",
				zoomPhoto: null,
				onZoomChange: () => {},
				onTogglePrint: () => {},
				onDeletePhoto: () => {},
				onReload: () => {},
			}),
		);
		assert.ok(errorHtml.includes("Список снимков не прочитан"), "Grid must render failure recovery UI");

		const readyHtml = renderToStaticMarkup(
			React.createElement(VisitDiaryPhotoThumbnailGrid, {
				attachments: [
					{
						id: "att-1",
						diaryId: "diary-1",
						name: "tooth-16.jpg",
						url: "blob:http://localhost/photo-1",
						createdAt: "2026-11-28T10:00:00Z",
					},
				],
				photoObjectUrls: { "att-1": "blob:http://localhost/photo-1" },
				unreadablePhotoIds: [],
				loadState: { phase: "loaded" },
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
		assert.ok(readyHtml.includes("В карту приёма"), "Grid must render chart print badge without raw 043/у");
		assert.equal(readyHtml.includes("043/у"), false, "Must not leak bureaucratic 043/у code");
		assert.ok(readyHtml.includes("Увеличить снимок"), "Grid must render full-screen zoom trigger");
		assert.equal(CARTOON_EMOJI_REGEX.test(readyHtml), false, "Grid must contain 0 cartoon emojis");
	});
});
