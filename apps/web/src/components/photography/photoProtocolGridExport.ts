/**
 * photoProtocolGridExport.ts — High-resolution 1-click PNG collage export engine.
 * Renders clinical photo grids to offscreen canvas with legal watermarks, clinic branding,
 * and patient metadata for instant chairside export (Mandates 8e, 8k).
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
	if (typeof document === 'undefined') {
		return '';
	}

	const canvas = document.createElement('canvas');
	const cols = payload.slots.length > 8 ? 4 : payload.slots.length > 4 ? 3 : 2;
	const rows = Math.ceil(payload.slots.length / cols);

	const slotWidth = 400;
	const slotHeight = 280;
	const gap = 16;
	const padding = 32;
	const headerHeight = 120;
	const footerHeight = 44;

	canvas.width = padding * 2 + cols * slotWidth + (cols - 1) * gap;
	canvas.height = headerHeight + padding + rows * slotHeight + (rows - 1) * gap + footerHeight;

	const ctx = canvas.getContext('2d');
	if (!ctx) return '';

	// Dark sleek clinical aesthetic background
	ctx.fillStyle = '#0f172a';
	ctx.fillRect(0, 0, canvas.width, canvas.height);

	// Header background
	ctx.fillStyle = '#1e293b';
	ctx.fillRect(0, 0, canvas.width, headerHeight);

	// Clinic Brand Title
	ctx.fillStyle = '#ffffff';
	ctx.font = 'bold 24px sans-serif';
	ctx.fillText(payload.clinicName, padding, 44);

	ctx.fillStyle = '#38bdf8';
	ctx.font = '14px sans-serif';
	ctx.fillText(`Клинический фотопротокол • ${payload.presetTitle}`, padding, 74);

	// Patient & Doctor Metadata (Right Aligned)
	ctx.fillStyle = '#e2e8f0';
	ctx.font = 'bold 16px sans-serif';
	ctx.textAlign = 'right';
	ctx.fillText(`Пациент: ${payload.patientName}`, canvas.width - padding, 40);

	ctx.fillStyle = '#94a3b8';
	ctx.font = '13px sans-serif';
	ctx.fillText(`Карта: ${payload.patientCardNumber} • Врач: ${payload.doctorName}`, canvas.width - padding, 66);
	ctx.fillText(`Дата: ${new Date().toLocaleDateString('ru-RU')}`, canvas.width - padding, 90);
	ctx.textAlign = 'left';

	// Load images safely in parallel
	const loadedImages = await Promise.all(payload.slots.map((s) => loadImageSafe(s.imageUrl)));

	// Draw each slot
	for (let i = 0; i < payload.slots.length; i++) {
		const slot = payload.slots[i]!;
		const col = i % cols;
		const row = Math.floor(i / cols);

		const x = padding + col * (slotWidth + gap);
		const y = headerHeight + padding + row * (slotHeight + gap);

		// Slot border box
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

		// Slot label footer
		ctx.fillStyle = '#0f172a';
		ctx.fillRect(x, y + imgHeight, slotWidth, 36);
		ctx.fillStyle = '#f8fafc';
		ctx.font = 'bold 13px sans-serif';
		ctx.fillText(slot.label, x + 10, y + imgHeight + 23);
	}

	// Watermark
	ctx.fillStyle = '#090d16';
	ctx.fillRect(0, canvas.height - footerHeight, canvas.width, footerHeight);
	ctx.fillStyle = '#64748b';
	ctx.font = '12px sans-serif';
	ctx.fillText(
		`Медицинская тайна • ${payload.clinicName} • Пациент: ${payload.patientName} (${payload.patientCardNumber}) • Врач: ${payload.doctorName} • ${new Date().toLocaleDateString('ru-RU')}`,
		padding,
		canvas.height - 16,
	);

	const dataUrl = canvas.toDataURL('image/png');
	const filename = `PhotoCollage_${payload.patientName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.png`;

	const downloadLink = document.createElement('a');
	downloadLink.download = filename;
	downloadLink.href = dataUrl;
	downloadLink.click();

	return dataUrl;
}
