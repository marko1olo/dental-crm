/**
 * Offscreen Canvas Rendering for Clinical Photo Grid Export
 */

import { ProtocolGridExportPayload } from '../photoProtocolGridExport';

export function drawGridHeader(ctx: CanvasRenderingContext2D, payload: ProtocolGridExportPayload, width: number, headerHeight: number, padding: number) {
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

export function drawGridWatermark(ctx: CanvasRenderingContext2D, payload: ProtocolGridExportPayload, width: number, height: number, footerHeight: number, padding: number) {
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
