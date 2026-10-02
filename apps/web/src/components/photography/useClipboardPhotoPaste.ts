/**
 * DENTE Dental CRM — 1-Click Clipboard Photo Paste Hook (Ctrl+V)
 *
 * Allows clinicians to paste intraoral camera captures, phone screenshots,
 * and scanner exports directly into Form 043/u clinical diary with 0 extra clicks.
 *
 * Invariant: Does NOT intercept text paste in input / textarea fields when no image is present.
 */

import { useEffect, useState, useCallback, useRef } from "react";
import { compressChairsidePhoto } from "./chairsidePhotoCompressor";
import { showToast } from "../GlobalToast";
import { logger } from "../../utils/logger";

export interface UseClipboardPhotoPasteOptions {
	enabled?: boolean;
	onPhotoReceived: (compressedBlob: Blob, fileName: string) => Promise<void> | void;
}

export function useClipboardPhotoPaste({
	enabled = true,
	onPhotoReceived,
}: UseClipboardPhotoPasteOptions) {
	const [isPasting, setIsPasting] = useState(false);
	const onPhotoReceivedRef = useRef(onPhotoReceived);
	onPhotoReceivedRef.current = onPhotoReceived;

	const handlePaste = useCallback(
		async (e: ClipboardEvent) => {
			if (!enabled) return;

			const clipboardData = e.clipboardData;
			if (!clipboardData || !clipboardData.items) return;

			let imageFile: File | null = null;
			for (let i = 0; i < clipboardData.items.length; i++) {
				const item = clipboardData.items[i];
				if (item && item.type && item.type.startsWith("image/")) {
					imageFile = item.getAsFile();
					if (imageFile) break;
				}
			}

			if (!imageFile) {
				// No image in clipboard — allow default browser text paste
				return;
			}

			// Prevent default clipboard handling since an image was captured
			e.preventDefault();

			setIsPasting(true);
			showToast("Вставка снимка из буфера обмена (Ctrl+V)...", "info", 3000);

			try {
				const compressed = await compressChairsidePhoto(imageFile, {
					maxDimension: 1920,
					quality: 0.85,
					targetMime: "image/webp",
				});

				const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
				const fileName = `clipboard_photo_${timestamp}.webp`;

				await onPhotoReceivedRef.current(compressed, fileName);
			} catch (err) {
				logger.error("[useClipboardPhotoPaste] Failed to process clipboard photo", err);
				showToast(
					"Не удалось обработать изображение из буфера обмена. Проверьте формат снимка.",
					"error",
					8000,
				);
			} finally {
				setIsPasting(false);
			}
		},
		[enabled],
	);

	useEffect(() => {
		if (!enabled) return;

		window.addEventListener("paste", handlePaste);
		return () => {
			window.removeEventListener("paste", handlePaste);
		};
	}, [enabled, handlePaste]);

	return { isPasting };
}
