/**
 * photoProtocolGridExport.ts — High-resolution 1-click PNG collage export engine.
 * Unified Canvas rendering engine for clinical photo grids and documentation.
 */

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

export function drawGridHeader(
	ctx: CanvasRenderingContext2D,
	payload: ProtocolGridExportPayload,
	width: number,
	headerHeight: number,
	padding: number,
) {
	ctx.fillStyle = '#1e293b';
	ctx.fillRect(0, 0, width, headerHeight);

	ctx.fillStyle = '#ffffff';
	ctx.font = 'bold 24px sans-serif';
	ctx.fillText(payload.clinicName, padding, 44);

	ctx.fillStyle = '#38bdf8';
	ctx.font = '14px sans-serif';
	ctx.fillText(`Клинический фотопротокол • ${payload.presetTitle}`, padding, 74);

	ctx.fillStyle = '#e2e8f0';
	ctx.font = 'bold 16px sans-serif';
	ctx.textAlign = 'right';
	ctx.fillText(`Пациент: ${payload.patientName}`, width - padding, 40);

	ctx.fillStyle = '#94a3b8';
	ctx.font = '13px sans-serif';
	ctx.fillText(`Карта: ${payload.patientCardNumber} • Врач: ${payload.doctorName}`, width - padding, 66);
	ctx.fillText(`Дата: ${new Date().toLocaleDateString('ru-RU')}`, width - padding, 90);
	ctx.textAlign = 'left';
}

export function drawGridSlots(
	ctx: CanvasRenderingContext2D,
	payload: ProtocolGridExportPayload,
	loadedImages: (HTMLImageElement | null)[],
	cols: number,
	slotWidth: number,
	slotHeight: number,
	gap: number,
	padding: number,
	headerHeight: number,
) {
	for (let i = 0; i < payload.slots.length; i++) {
		const slot = payload.slots[i]!;
		const col = i % cols;
		const row = Math.floor(i / cols);
		const x = padding + col * (slotWidth + gap);
		const y = headerHeight + padding + row * (slotHeight + gap);

		ctx.fillStyle = '#1e293b';
		ctx.strokeStyle = '#334155';
		ctx.lineWidth = 1;
		ctx.fillRect(x, y, slotWidth, slotHeight);
		ctx.strokeRect(x, y, slotWidth, slotHeight);

		const img = loadedImages[i];
		const imgHeight = slotHeight - 36;
		if (img) {
			ctx.drawImage(img, x, y, slotWidth, imgHeight);
		} else {
			ctx.fillStyle = '#334155';
			ctx.fillRect(x, y, slotWidth, imgHeight);
			ctx.fillStyle = '#94a3b8';
			ctx.font = '13px sans-serif';
			ctx.textAlign = 'center';
			ctx.fillText('Кадр отсутствует', x + slotWidth / 2, y + imgHeight / 2);
			ctx.textAlign = 'left';
		}

		ctx.fillStyle = '#0f172a';
		ctx.fillRect(x, y + imgHeight, slotWidth, 36);
		ctx.fillStyle = '#f8fafc';
		ctx.font = 'bold 13px sans-serif';
		ctx.fillText(slot.label, x + 10, y + imgHeight + 23);
	}
}

export function drawGridWatermark(
	ctx: CanvasRenderingContext2D,
	payload: ProtocolGridExportPayload,
	width: number,
	height: number,
	footerHeight: number,
	padding: number,
) {
	ctx.fillStyle = '#090d16';
	ctx.fillRect(0, height - footerHeight, width, footerHeight);
	ctx.fillStyle = '#64748b';
	ctx.font = '12px sans-serif';
	ctx.fillText(
		`Медицинская тайна • ${payload.clinicName} • Пациент: ${payload.patientName} (${payload.patientCardNumber}) • Врач: ${payload.doctorName} • ${new Date().toLocaleDateString('ru-RU')}`,
		padding,
		height - 16,
	);
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
