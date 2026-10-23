/**
 * photoProtocolGridExport.ts — High-resolution 1-click PNG collage export engine.
 */

import { drawGridHeader, drawGridSlots, drawGridWatermark } from './export/canvasGridDraw';

export interface ProtocolGridExportPayload {
	readonly clinicName: string;
	readonly patientName: string;
	readonly patientCardNumber: string;
	readonly doctorName: string;
	readonly presetTitle: string;
	readonly slots: readonly {
		readonly title: string;
		readonly label: string;
		readonly imageUrl?: string | undefined;
	}[];
}

export function loadImageSafe(url?: string): Promise<HTMLImageElement | null> {
	if (!url || typeof Image === 'undefined') return Promise.resolve(null);
	return new Promise((resolve) => {
		const img = new Image();
		img.crossOrigin = 'anonymous';
		img.onload = () => resolve(img);
		img.onerror = () => resolve(null);
		img.src = url;
	});
}

export async function exportProtocolGridAsPng(payload: ProtocolGridExportPayload): Promise<string> {
	if (typeof document === 'undefined') return '';

	const canvas = document.createElement('canvas');
	const cols = payload.slots.length > 8 ? 4 : payload.slots.length > 4 ? 3 : 2;
	const rows = Math.ceil(payload.slots.length / cols);
	const slotWidth = 400, slotHeight = 280, gap = 16, padding = 32, headerHeight = 120, footerHeight = 44;

	canvas.width = padding * 2 + cols * slotWidth + (cols - 1) * gap;
	canvas.height = headerHeight + padding + rows * slotHeight + (rows - 1) * gap + footerHeight;

	const ctx = canvas.getContext('2d');
	if (!ctx) return '';

	ctx.fillStyle = '#0f172a';
	ctx.fillRect(0, 0, canvas.width, canvas.height);

	drawGridHeader(ctx, payload, canvas.width, headerHeight, padding);
	const loadedImages = await Promise.all(payload.slots.map((s) => loadImageSafe(s.imageUrl)));
	drawGridSlots(ctx, payload, loadedImages, cols, slotWidth, slotHeight, gap, padding, headerHeight);
	drawGridWatermark(ctx, payload, canvas.width, canvas.height, footerHeight, padding);

	const dataUrl = canvas.toDataURL('image/png');
	const filename = `PhotoCollage_${payload.patientName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.png`;
	const link = document.createElement('a');
	link.download = filename;
	link.href = dataUrl;
	link.click();

	return dataUrl;
}
