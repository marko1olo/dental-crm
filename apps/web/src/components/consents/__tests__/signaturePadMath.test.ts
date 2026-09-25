/**
 * signaturePadMath.test.ts
 *
 * Comprehensive Red Team Unit Tests for Digital Signature Pad Math & Canvas/Vector Engine:
 * - Canvas pointer event handling & relative coordinate extraction
 * - Retina high-DPI scaling (devicePixelRatio handling)
 * - Smooth stroke tracking & zero memory leaks (createStrokeTracker)
 * - Quadratic Bezier curve spline & SVG path rendering
 * - Geometric velocity, dynamic width, and Ramer-Douglas-Peucker simplification
 * - Bounding box calculations and empty signature checks
 * - Canvas rendering (drawSmoothStrokeOnContext & drawAllStrokesOnCanvas)
 * - FIPS 180-4 SHA-256 cryptographic hashing & ISO 19005-1 PDF/A-1b generation
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	calculateBoundingBox,
	calculatePointDistance,
	calculatePointVelocity,
	calculateStrokeWidth,
	computeMidpoint,
	createStrokeTracker,
	drawAllStrokesOnCanvas,
	drawSmoothStrokeOnContext,
	exportSignatureToPng,
	exportSignatureToSvg,
	generateConsentIntegrityHash,
	generatePdfA1bDocument,
	generateSha256,
	getPointerCoordinates,
	isSignatureEmpty,
	renderStrokeToSvgPath,
	setupCanvasHighDpi,
	simplifyStrokePoints,
	smoothStrokeToBezierCurves,
	type SignaturePoint,
	type SignatureStroke,
} from "../signaturePadMath.js";

describe("Digital Signature Pad Math & High-DPI Engine (Inquisition Suite)", () => {
	describe("1. Pointer Event Handling & Normalized Coordinates", () => {
		it("accurately extracts relative coordinates within target bounds", () => {
			const mockTarget = {
				getBoundingClientRect: () => ({
					left: 100,
					top: 50,
					width: 400,
					height: 200,
					right: 500,
					bottom: 250,
				}),
			};

			const event = {
				clientX: 250,
				clientY: 150,
				timeStamp: 1727250000000,
				pressure: 0.75,
			};

			const point = getPointerCoordinates(event, mockTarget);
			assert.equal(point.x, 150, "X must be clientX - left (250 - 100 = 150)");
			assert.equal(point.y, 100, "Y must be clientY - top (150 - 50 = 100)");
			assert.equal(point.time, 1727250000000);
			assert.equal(point.pressure, 0.75);
		});

		it("clamps coordinates within element boundaries when pointer drags outside", () => {
			const mockTarget = {
				getBoundingClientRect: () => ({
					left: 100,
					top: 50,
					width: 300,
					height: 150,
				}),
			};

			// Dragged to top-left beyond canvas
			const negEvent = { clientX: 50, clientY: 20 };
			const pMin = getPointerCoordinates(negEvent, mockTarget);
			assert.equal(pMin.x, 0, "X should clamp to 0");
			assert.equal(pMin.y, 0, "Y should clamp to 0");

			// Dragged beyond bottom-right
			const overEvent = { clientX: 500, clientY: 300 };
			const pMax = getPointerCoordinates(overEvent, mockTarget);
			assert.equal(pMax.x, 300, "X should clamp to rect width (300)");
			assert.equal(pMax.y, 150, "Y should clamp to rect height (150)");
		});

		it("falls back gracefully when target element rect has zero dimensions", () => {
			const event = { clientX: 80, clientY: 60 };
			const point = getPointerCoordinates(event, undefined);
			assert.equal(point.x, 80);
			assert.equal(point.y, 60);
			assert.ok(point.time > 0);
		});
	});

	describe("2. Retina High-DPI Canvas Scaling", () => {
		it("scales internal canvas buffer dimensions by devicePixelRatio without blurring", () => {
			const calls: Array<{ method: string; args: any[] }> = [];
			const mockContext = {
				scale: (sx: number, sy: number) => {
					calls.push({ method: "scale", args: [sx, sy] });
				},
				imageSmoothingEnabled: false,
			};

			const mockCanvas = {
				width: 0,
				height: 0,
				style: { width: "", height: "" },
				getContext: (type: string) => (type === "2d" ? (mockContext as any) : null),
			} as unknown as HTMLCanvasElement;

			const ctx = setupCanvasHighDpi(mockCanvas, 400, 140, 2);
			assert.ok(ctx, "Must return valid 2D context");
			assert.equal(mockCanvas.width, 800, "Buffer width must be 400 * 2 = 800");
			assert.equal(mockCanvas.height, 280, "Buffer height must be 140 * 2 = 280");
			assert.equal(mockCanvas.style.width, "400px", "CSS style width must remain 400px");
			assert.equal(mockCanvas.style.height, "140px", "CSS style height must remain 140px");
			assert.deepEqual(calls, [{ method: "scale", args: [2, 2] }]);
			assert.equal(mockContext.imageSmoothingEnabled, true);
		});

		it("handles 3x Retina DPR (iPhone Pro Max / iPad Pro display scale)", () => {
			const mockContext = {
				scale: () => {},
				imageSmoothingEnabled: false,
			};
			const mockCanvas = {
				width: 0,
				height: 0,
				style: { width: "", height: "" },
				getContext: () => mockContext,
			} as unknown as HTMLCanvasElement;

			setupCanvasHighDpi(mockCanvas, 320, 100, 3);
			assert.equal(mockCanvas.width, 960);
			assert.equal(mockCanvas.height, 300);
			assert.equal(mockCanvas.style.width, "320px");
			assert.equal(mockCanvas.style.height, "100px");
		});

		it("returns null safely when canvas is null or undefined", () => {
			const ctx = setupCanvasHighDpi(null as unknown as HTMLCanvasElement, 400, 140);
			assert.equal(ctx, null);
		});
	});

	describe("3. Smooth Stroke Tracker & Zero Memory Leaks", () => {
		it("accumulates points and creates complete strokes without leaking references", () => {
			const tracker = createStrokeTracker({ maxPointsPerStroke: 50 });
			assert.equal(tracker.getStrokes().length, 0);
			assert.equal(tracker.getCurrentPoints().length, 0);

			// Start stroke
			tracker.startStroke({ x: 10, y: 10, time: 1000 });
			assert.equal(tracker.getCurrentPoints().length, 1);

			// Add continuous points
			tracker.addPoint({ x: 20, y: 25, time: 1020 });
			tracker.addPoint({ x: 35, y: 40, time: 1040 });
			tracker.addPoint({ x: 50, y: 60, time: 1060 });
			assert.equal(tracker.getCurrentPoints().length, 4);

			// End stroke
			const stroke = tracker.endStroke();
			assert.ok(stroke);
			assert.equal(stroke.points.length, 4);
			assert.equal(stroke.isDot, false);
			assert.equal(tracker.getCurrentPoints().length, 0, "Current points buffer must be cleared");
			assert.equal(tracker.getStrokes().length, 1);

			// Add a single-dot stroke
			tracker.startStroke({ x: 100, y: 100, time: 1100 });
			const dotStroke = tracker.endStroke();
			assert.ok(dotStroke);
			assert.equal(dotStroke.isDot, true);
			assert.equal(tracker.getStrokes().length, 2);

			// Clear
			tracker.clear();
			assert.equal(tracker.getStrokes().length, 0);

			// Disposal
			tracker.dispose();
			assert.equal(tracker.getStrokes().length, 0);
		});

		it("enforces maxPointsPerStroke ceiling to protect against unconstrained RAM bloat", () => {
			const tracker = createStrokeTracker({ maxPointsPerStroke: 5 });
			tracker.startStroke({ x: 0, y: 0, time: 1 });
			for (let i = 1; i <= 20; i++) {
				tracker.addPoint({ x: i, y: i, time: i + 1 });
			}
			assert.equal(tracker.getCurrentPoints().length, 5, "Must not exceed maxPointsPerStroke ceiling");
			tracker.dispose();
		});
	});

	describe("4. Smooth Bezier Curve Spline & SVG Path Rendering", () => {
		it("renderStrokeToSvgPath handles empty, single point, 2 points and multiple points", () => {
			assert.equal(renderStrokeToSvgPath([]), "");

			// 1 point
			assert.equal(renderStrokeToSvgPath([{ x: 15, y: 25, time: 1 }]), "M 15.00 25.00");

			// 2 points
			const twoPts = [
				{ x: 10, y: 20, time: 1 },
				{ x: 50, y: 60, time: 2 },
			];
			assert.equal(renderStrokeToSvgPath(twoPts), "M 10.00 20.00 L 50.00 60.00");

			// 3+ points
			const multiPts = [
				{ x: 0, y: 0, time: 1 },
				{ x: 10, y: 20, time: 2 },
				{ x: 30, y: 40, time: 3 },
				{ x: 60, y: 50, time: 4 },
			];
			const path = renderStrokeToSvgPath(multiPts);
			assert.ok(path.startsWith("M 0.00 0.00"));
			assert.ok(path.includes("Q"));
			assert.ok(path.endsWith("L 60.00 50.00"));
		});

		it("smoothStrokeToBezierCurves returns empty array for <2 points", () => {
			assert.deepEqual(smoothStrokeToBezierCurves([]), []);
			assert.deepEqual(smoothStrokeToBezierCurves([{ x: 1, y: 1, time: 1 }]), []);
		});

		it("smoothStrokeToBezierCurves computes midpoint Bezier segments for >= 3 points", () => {
			const pts: SignaturePoint[] = [
				{ x: 0, y: 0, time: 100 },
				{ x: 20, y: 40, time: 120 },
				{ x: 50, y: 60, time: 140 },
				{ x: 90, y: 70, time: 160 },
			];
			const curves = smoothStrokeToBezierCurves(pts);
			assert.equal(curves.length, 2, "4 points generate 2 interior curve segments");
			assert.ok(curves[0]!.startPoint);
			assert.ok(curves[0]!.control1);
			assert.ok(curves[0]!.endPoint);
		});
	});

	describe("5. Geometric Math & Stroke Width Dynamics", () => {
		it("calculates exact Euclidean point distance", () => {
			const p1 = { x: 0, y: 0, time: 0 };
			const p2 = { x: 3, y: 4, time: 10 };
			assert.equal(calculatePointDistance(p1, p2), 5);
		});

		it("calculates velocity and adjusts stroke width based on speed", () => {
			const p1 = { x: 0, y: 0, time: 0 };
			const pFast = { x: 100, y: 0, time: 10 }; // 10 px/ms
			const pSlow = { x: 2, y: 0, time: 20 }; // 0.1 px/ms

			const vFast = calculatePointVelocity(p1, pFast);
			const vSlow = calculatePointVelocity(p1, pSlow);
			assert.ok(vFast > vSlow);

			const wFast = calculateStrokeWidth(vFast);
			const wSlow = calculateStrokeWidth(vSlow);
			assert.ok(wSlow > wFast, "Slower drawing speed must produce wider stroke");
			assert.ok(wFast >= 1.2, "Must not be below minWidth");
			assert.ok(wSlow <= 3.5, "Must not exceed maxWidth");
		});

		it("simplifies points via Ramer-Douglas-Peucker without destroying salient geometry", () => {
			const collinearPoints: SignaturePoint[] = [
				{ x: 0, y: 0, time: 1 },
				{ x: 10, y: 10, time: 2 },
				{ x: 20, y: 20, time: 3 },
				{ x: 30, y: 30, time: 4 },
				{ x: 40, y: 40, time: 5 },
			];
			const simplified = simplifyStrokePoints(collinearPoints, 1.0);
			assert.equal(simplified.length, 2, "Straight line must reduce to start and end point");
			assert.deepEqual(simplified[0], collinearPoints[0]);
			assert.deepEqual(simplified[1], collinearPoints[4]);
		});
	});

	describe("6. Bounding Box & Empty Signature Verification", () => {
		it("computes accurate bounding box for single and multiple strokes", () => {
			const strokes: SignatureStroke[] = [
				{
					points: [
						{ x: 50, y: 40, time: 1 },
						{ x: 120, y: 85, time: 2 },
					],
				},
				{
					points: [
						{ x: 30, y: 90, time: 3 },
						{ x: 200, y: 160, time: 4 },
					],
				},
			];

			const bounds = calculateBoundingBox(strokes);
			assert.equal(bounds.minX, 30);
			assert.equal(bounds.minY, 40);
			assert.equal(bounds.maxX, 200);
			assert.equal(bounds.maxY, 160);
			assert.equal(bounds.width, 170);
			assert.equal(bounds.height, 120);
		});

		it("returns 0x0 bounding box for empty strokes", () => {
			const bounds = calculateBoundingBox([]);
			assert.equal(bounds.width, 0);
			assert.equal(bounds.height, 0);
		});

		it("isSignatureEmpty detects threshold requirements", () => {
			assert.equal(isSignatureEmpty([]), true);
			const tinyStroke: SignatureStroke[] = [
				{ points: [{ x: 1, y: 1, time: 1 }, { x: 2, y: 2, time: 2 }] },
			];
			assert.equal(isSignatureEmpty(tinyStroke, 5), true);

			const validStroke: SignatureStroke[] = [
				{
					points: [
						{ x: 1, y: 1, time: 1 },
						{ x: 2, y: 2, time: 2 },
						{ x: 3, y: 3, time: 3 },
						{ x: 4, y: 4, time: 4 },
						{ x: 5, y: 5, time: 5 },
						{ x: 6, y: 6, time: 6 },
					],
				},
			];
			assert.equal(isSignatureEmpty(validStroke, 5), false);
		});
	});

	describe("7. Canvas Rendering Functions (drawSmoothStrokeOnContext & drawAllStrokesOnCanvas)", () => {
		it("drawSmoothStrokeOnContext renders dots with arc() and multi-point curves with quadraticCurveTo()", () => {
			const operations: string[] = [];
			const mockCtx = {
				beginPath: () => operations.push("beginPath"),
				arc: () => operations.push("arc"),
				fill: () => operations.push("fill"),
				moveTo: () => operations.push("moveTo"),
				lineTo: () => operations.push("lineTo"),
				quadraticCurveTo: () => operations.push("quadraticCurveTo"),
				stroke: () => operations.push("stroke"),
				strokeStyle: "",
				fillStyle: "",
				lineCap: "",
				lineJoin: "",
				lineWidth: 0,
			} as unknown as CanvasRenderingContext2D;

			// Dot
			drawSmoothStrokeOnContext(mockCtx, {
				points: [{ x: 10, y: 10, time: 1 }],
				isDot: true,
			});
			assert.ok(operations.includes("arc"));
			assert.ok(operations.includes("fill"));

			operations.length = 0;
			// 3+ points
			drawSmoothStrokeOnContext(mockCtx, {
				points: [
					{ x: 10, y: 10, time: 1 },
					{ x: 30, y: 30, time: 2 },
					{ x: 60, y: 40, time: 3 },
				],
			});
			assert.ok(operations.includes("moveTo"));
			assert.ok(operations.includes("quadraticCurveTo"));
			assert.ok(operations.includes("stroke"));
		});

		it("drawAllStrokesOnCanvas renders background fillRect and iterates all strokes", () => {
			let filledBg = "";
			const mockCtx = {
				scale: () => {},
				fillRect: (_x: number, _y: number, _w: number, _h: number) => {
					filledBg = "filled";
				},
				beginPath: () => {},
				moveTo: () => {},
				lineTo: () => {},
				quadraticCurveTo: () => {},
				stroke: () => {},
				arc: () => {},
				fill: () => {},
				strokeStyle: "",
				fillStyle: "",
				lineCap: "",
				lineJoin: "",
				lineWidth: 0,
			};

			const mockCanvas = {
				width: 400,
				height: 140,
				style: { width: "400px", height: "140px" },
				getContext: () => mockCtx,
			} as unknown as HTMLCanvasElement;

			drawAllStrokesOnCanvas(
				mockCanvas,
				[
					{ points: [{ x: 5, y: 5, time: 1 }, { x: 15, y: 15, time: 2 }] },
				],
				{ backgroundColor: "#f8fafc" },
			);
			assert.equal(filledBg, "filled");
		});
	});

	describe("8. Cryptographic FIPS 180-4 SHA-256 & ISO 19005-1 PDF/A-1b Engine", () => {
		it("produces NIST-compliant SHA-256 digests for standard test vectors", () => {
			// Empty string
			assert.equal(
				generateSha256(""),
				"e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
			);
			// "abc"
			assert.equal(
				generateSha256("abc"),
				"ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
			);
			// Cyrillic string
			const cyrillicHash = generateSha256("Информированное добровольное согласие 1051н");
			assert.equal(cyrillicHash.length, 64);
			assert.match(cyrillicHash, /^[0-9a-f]{64}$/);
		});

		it("generateConsentIntegrityHash links patient, text, timestamp and strokes into tamper-evident hash", () => {
			const payload = {
				documentText: "Согласие на проведение анестезии Артикаин 4%",
				patientInfo: {
					name: "Иванов Иван Иванович",
					passportOrBirth: "4510 № 123456",
					phone: "+7 (999) 111-22-33",
				},
				timestamp: 1727250000000,
				strokes: [
					{
						points: [
							{ x: 10, y: 10, time: 100 },
							{ x: 50, y: 50, time: 200 },
						],
					},
				],
				verificationMethod: "tablet_stylus" as const,
			};

			const record1 = generateConsentIntegrityHash(payload);
			assert.equal(record1.hash.length, 64);

			// Deterministic
			const record2 = generateConsentIntegrityHash(payload);
			assert.equal(record1.hash, record2.hash);

			// Tampering detection (changed one character)
			const tampered = generateConsentIntegrityHash({
				...payload,
				documentText: "Согласие на проведение анестезии Артикаин 4%! (изменено)",
			});
			assert.notEqual(record1.hash, tampered.hash, "Tampered text must yield a distinct integrity hash");
		});

		it("generatePdfA1bDocument creates archival binary with valid structure and PDF/A markers", () => {
			const pdfBytes = generatePdfA1bDocument({
				clinicName: "ООО «Стоматология ДЕНТЕ»",
				clinicAddress: "г. Москва, ул. Арбат, 1",
				clinicPhone: "+7 (495) 123-45-67",
				patientName: "Смирнова Ольга Павловна",
				patientBirthDate: "15.04.1988",
				medicalCardNumber: "043-4455",
				doctorName: "Д-р Петров В. И.",
				documentTitle: "Информированное согласие на дентальную имплантацию",
				documentCode: "ИДС-02-ХИР-ИМПЛ",
				documentText: "Я, Смирнова О. П., даю согласие на установку имплантата в области 4.6.",
				signedAtIso: new Date().toISOString(),
				integrityHash: "fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210",
				verificationMethod: "paper_physical",
			});

			assert.ok(pdfBytes instanceof Uint8Array);
			const pdfStr = new TextDecoder().decode(pdfBytes);
			assert.ok(pdfStr.startsWith("%PDF-1.4"));
			assert.ok(pdfStr.includes("PDF/A-1b"));
			assert.ok(pdfStr.includes("/OutputIntent"));
			assert.ok(pdfStr.includes("sRGB IEC61966-2.1"));
			assert.ok(pdfStr.includes("IntegrityHash"));
			assert.ok(pdfStr.includes("SIGNED ON PAPER (FORM 043/u ARCHIVE)"));
			assert.ok(pdfStr.includes("%%EOF"));
		});
	});
});
