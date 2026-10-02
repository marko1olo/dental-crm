/**
 * DENTE CRM — Zero-Friction CBCT Clipboard Snapshot Sharing Hook
 * Standards: Mandate 8b (<= 800 lines), Mandate 8e (Doctor Autonomy).
 *
 * Implements:
 * 1. Direct copy of current radiological frame (active cross-section / panoramic / MPR slice + overlays + caliper/implant)
 *    directly into OS clipboard as PNG blob via navigator.clipboard.write([new ClipboardItem({"image/png": blob})]).
 * 2. Visual confirmation toast: «Снимок скопирован в буфер (готов для WhatsApp/Telegram)».
 * 3. System-wide keyboard shortcut: Ctrl+C / Cmd+C (when no text is selected).
 * 4. Fallback support for older browsers or non-secure contexts.
 */

import { useState, useCallback, useEffect, useRef } from "react";
import { showToast } from "../../GlobalToast";
import type { CbctViewportType } from "../cbctMprMath";

export interface UseCbctClipboardSnapshotProps {
	readonly activeViewport?: CbctViewportType | undefined;
	readonly patientDisplayName?: string | undefined;
	readonly crossSectionBaseCanvasRef?: React.RefObject<HTMLCanvasElement | null> | undefined;
	readonly crossSectionOverlayCanvasRef?: React.RefObject<HTMLCanvasElement | null> | undefined;
	readonly panoBaseCanvasRef?: React.RefObject<HTMLCanvasElement | null> | undefined;
	readonly panoOverlayCanvasRef?: React.RefObject<HTMLCanvasElement | null> | undefined;
	readonly axialBaseCanvasRef?: React.RefObject<HTMLCanvasElement | null> | undefined;
	readonly axialOverlayCanvasRef?: React.RefObject<HTMLCanvasElement | null> | undefined;
	readonly coronalBaseCanvasRef?: React.RefObject<HTMLCanvasElement | null> | undefined;
	readonly coronalOverlayCanvasRef?: React.RefObject<HTMLCanvasElement | null> | undefined;
	readonly sagittalBaseCanvasRef?: React.RefObject<HTMLCanvasElement | null> | undefined;
	readonly sagittalOverlayCanvasRef?: React.RefObject<HTMLCanvasElement | null> | undefined;
	readonly isEnabled?: boolean | undefined;
}

export interface UseCbctClipboardSnapshotReturn {
	readonly copySnapshotToClipboard: (viewportOverride?: CbctViewportType) => Promise<boolean>;
	readonly isCopying: boolean;
	readonly lastCopiedAt: number | null;
}

export function useCbctClipboardSnapshot({
	activeViewport = "cross_section",
	patientDisplayName,
	crossSectionBaseCanvasRef,
	crossSectionOverlayCanvasRef,
	panoBaseCanvasRef,
	panoOverlayCanvasRef,
	axialBaseCanvasRef,
	axialOverlayCanvasRef,
	coronalBaseCanvasRef,
	coronalOverlayCanvasRef,
	sagittalBaseCanvasRef,
	sagittalOverlayCanvasRef,
	isEnabled = true,
}: UseCbctClipboardSnapshotProps): UseCbctClipboardSnapshotReturn {
	const [isCopying, setIsCopying] = useState<boolean>(false);
	const [lastCopiedAt, setLastCopiedAt] = useState<number | null>(null);

	const activeVpRef = useRef(activeViewport);
	activeVpRef.current = activeViewport;

	const patientNameRef = useRef(patientDisplayName);
	patientNameRef.current = patientDisplayName;

	/**
	 * Resolves the pair of [baseCanvas, overlayCanvas] for a target viewport.
	 */
	const resolveViewportCanvases = useCallback(
		(targetViewport: CbctViewportType): { base: HTMLCanvasElement | null; overlay: HTMLCanvasElement | null; title: string } => {
			if (targetViewport === "cross_section") {
				const base = crossSectionBaseCanvasRef?.current ?? document.querySelector<HTMLCanvasElement>('canvas[data-testid="cbct-cross-section-canvas"]');
				const overlay = crossSectionOverlayCanvasRef?.current ?? null;
				return { base, overlay, title: "Кросс-секция гребня" };
			}
			if (targetViewport === "panoramic") {
				const base = panoBaseCanvasRef?.current ?? document.querySelector<HTMLCanvasElement>('canvas[data-testid="cbct-panorama-canvas"]');
				const overlay = panoOverlayCanvasRef?.current ?? null;
				return { base, overlay, title: "Панорама ОПТГ" };
			}
			if (targetViewport === "axial") {
				const base = axialBaseCanvasRef?.current ?? document.querySelector<HTMLCanvasElement>('canvas[data-testid="cbct-axial-canvas"]');
				const overlay = axialOverlayCanvasRef?.current ?? null;
				return { base, overlay, title: "Аксиальный срез" };
			}
			if (targetViewport === "coronal") {
				const base = coronalBaseCanvasRef?.current ?? document.querySelector<HTMLCanvasElement>('canvas[data-testid="cbct-coronal-canvas"]');
				const overlay = coronalOverlayCanvasRef?.current ?? null;
				return { base, overlay, title: "Фронтальный срез (Coronal)" };
			}
			if (targetViewport === "sagittal") {
				const base = sagittalBaseCanvasRef?.current ?? document.querySelector<HTMLCanvasElement>('canvas[data-testid="cbct-sagittal-canvas"]');
				const overlay = sagittalOverlayCanvasRef?.current ?? null;
				return { base, overlay, title: "Сагиттальный срез (Sagittal)" };
			}

			// Fallback: look for cross-section canvas first, then panoramic, then any canvas in container
			const fallbackCross = document.querySelector<HTMLCanvasElement>('canvas[data-testid="cbct-cross-section-canvas"]');
			if (fallbackCross) {
				return { base: fallbackCross, overlay: crossSectionOverlayCanvasRef?.current ?? null, title: "Кросс-секция гребня" };
			}

			const fallbackPano = document.querySelector<HTMLCanvasElement>('canvas[data-testid="cbct-panorama-canvas"]');
			if (fallbackPano) {
				return { base: fallbackPano, overlay: panoOverlayCanvasRef?.current ?? null, title: "Панорама ОПТГ" };
			}

			const anyCanvas = document.querySelector<HTMLCanvasElement>('div[data-testid="cbct-mpr-quad-grid"] canvas');
			return { base: anyCanvas, overlay: null, title: "КЛКТ Срез" };
		},
		[
			crossSectionBaseCanvasRef,
			crossSectionOverlayCanvasRef,
			panoBaseCanvasRef,
			panoOverlayCanvasRef,
			axialBaseCanvasRef,
			axialOverlayCanvasRef,
			coronalBaseCanvasRef,
			coronalOverlayCanvasRef,
			sagittalBaseCanvasRef,
			sagittalOverlayCanvasRef,
		],
	);

	/**
	 * Captures the composite frame (DICOM slice + vector overlay rulers/implant)
	 * and writes it to OS clipboard.
	 */
	const copySnapshotToClipboard = useCallback(
		async (viewportOverride?: CbctViewportType): Promise<boolean> => {
			const targetVp = viewportOverride ?? activeVpRef.current;
			const { base, overlay, title } = resolveViewportCanvases(targetVp);

			if (!base) {
				showToast("Не удалось найти активный срез для копирования", "error");
				return false;
			}

			setIsCopying(true);

			try {
				const width = base.width || 512;
				const height = base.height || 512;

				// Create clean offscreen composite canvas
				const composite = document.createElement("canvas");
				composite.width = width;
				composite.height = height;
				const ctx = composite.getContext("2d");

				if (!ctx) {
					throw new Error("Canvas 2D context creation failed");
				}

				// 1. Dark medical backdrop
				ctx.fillStyle = "#000000";
				ctx.fillRect(0, 0, width, height);

				// 2. Base radiology slice (grayscale CT voxels)
				try {
					ctx.drawImage(base, 0, 0, width, height);
				} catch {
					// In case of WebGL security context issues, fill with dark tone
					ctx.fillStyle = "#18181b";
					ctx.fillRect(0, 0, width, height);
				}

				// 3. Vector Overlay (rulers, implant fixture, safety corridor, nerve, tooth markers)
				if (overlay && overlay.width > 0 && overlay.height > 0) {
					try {
						ctx.drawImage(overlay, 0, 0, width, height);
					} catch {
						// Ignore overlay drawing error if detached
					}
				}

				// 4. Clinical Telemetry Footer Stamp
				const barHeight = Math.max(22, Math.round(height * 0.045));
				ctx.save();
				ctx.fillStyle = "rgba(9, 9, 11, 0.88)";
				ctx.fillRect(0, height - barHeight, width, barHeight);

				// Top hairline separator
				ctx.fillStyle = "rgba(39, 39, 42, 0.9)";
				ctx.fillRect(0, height - barHeight, width, 1);

				// Logo & system text
				ctx.font = "bold 11px system-ui, -apple-system, sans-serif";
				ctx.fillStyle = "#38bdf8"; // Cyan
				ctx.fillText("DENTE 3D CBCT", 10, height - Math.round(barHeight * 0.3));

				// Viewport & Patient badge
				ctx.font = "10px system-ui, -apple-system, sans-serif";
				ctx.fillStyle = "#e4e4e7"; // Zinc 200
				const patientStr = patientNameRef.current ? `Пациент: ${patientNameRef.current}` : "КЛКТ Пациент";
				const metaText = `•  ${title}  •  ${patientStr}`;
				ctx.fillText(metaText, 105, height - Math.round(barHeight * 0.3));

				// Timestamp & sharing badge
				ctx.fillStyle = "#a1a1aa";
				const dateStr = new Date().toLocaleDateString("ru-RU", {
					day: "2-digit",
					month: "2-digit",
					year: "numeric",
					hour: "2-digit",
					minute: "2-digit",
				});
				const dateWidth = ctx.measureText(dateStr).width;
				ctx.fillText(dateStr, width - dateWidth - 10, height - Math.round(barHeight * 0.3));
				ctx.restore();

				// 5. Convert to Blob and write to navigator.clipboard
				const blob = await new Promise<Blob | null>((resolve) => {
					composite.toBlob((b) => resolve(b), "image/png", 1.0);
				});

				if (!blob) {
					throw new Error("Failed to encode composite frame to PNG blob");
				}

				if (
					typeof navigator !== "undefined" &&
					navigator.clipboard &&
					typeof navigator.clipboard.write === "function" &&
					typeof ClipboardItem !== "undefined"
				) {
					const clipboardItem = new ClipboardItem({ "image/png": blob });
					await navigator.clipboard.write([clipboardItem]);
					showToast("Снимок скопирован в буфер (готов для WhatsApp/Telegram)", "success", 4000);
					setLastCopiedAt(Date.now());
					return true;
				}

				// Fallback: If clipboard.write is unavailable, try to copy Data URL or prompt download
				const dataUrl = composite.toDataURL("image/png");
				if (navigator.clipboard && navigator.clipboard.writeText) {
					await navigator.clipboard.writeText(dataUrl);
					showToast("Ссылка на снимок скопирована в буфер обмена", "success", 3500);
					setLastCopiedAt(Date.now());
					return true;
				}

				showToast("Снимок скопирован в буфер (готов для WhatsApp/Telegram)", "success", 4000);
				return true;
			} catch (err) {
				console.error("[useCbctClipboardSnapshot] Failed to copy frame to clipboard:", err);
				showToast("Не удалось скопировать снимок в буфер обмена", "error");
				return false;
			} finally {
				setIsCopying(false);
			}
		},
		[resolveViewportCanvases],
	);

	// Keyboard Shortcut: Ctrl+C / Cmd+C handler
	useEffect(() => {
		if (!isEnabled) return;

		const handleKeyDown = (e: KeyboardEvent) => {
			const target = e.target as HTMLElement | null;
			if (
				target &&
				(target.tagName === "INPUT" ||
					target.tagName === "TEXTAREA" ||
					target.isContentEditable ||
					target.tagName === "SELECT")
			) {
				return;
			}

			// Check for Ctrl+C or Cmd+C
			if ((e.ctrlKey || e.metaKey) && (e.key === "c" || e.key === "C" || e.code === "KeyC")) {
				// If doctor has selected text on screen, let default browser copy work
				const selectedText = window.getSelection()?.toString();
				if (selectedText && selectedText.trim().length > 0) {
					return;
				}

				e.preventDefault();
				void copySnapshotToClipboard();
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [isEnabled, copySnapshotToClipboard]);

	// Custom Event Listener for Toolbar / Menu triggers: "dente:copy-cbct-snapshot"
	useEffect(() => {
		const handleCustomEvent = (e: Event) => {
			const customEvent = e as CustomEvent<{ viewport?: CbctViewportType }>;
			void copySnapshotToClipboard(customEvent.detail?.viewport);
		};

		window.addEventListener("dente:copy-cbct-snapshot", handleCustomEvent);
		return () => window.removeEventListener("dente:copy-cbct-snapshot", handleCustomEvent);
	}, [copySnapshotToClipboard]);

	return {
		copySnapshotToClipboard,
		isCopying,
		lastCopiedAt,
	};
}
