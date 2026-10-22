import { calculateCollageDimensions, generateCollageWatermarkText } from '../photoProtocolMath';
import { loadImageSafe } from '../photoProtocolGridExport';
import type { BeforeAfterCollagePayload } from './collageTypes';

export async function exportCollageAsPng(payload: BeforeAfterCollagePayload): Promise<string> {
	const format = payload.format || '16_9_hd';
	const dims = calculateCollageDimensions(format);

	const canvas = document.createElement('canvas');
	canvas.width = dims.widthPx;
	canvas.height = dims.heightPx;
	const ctx = canvas.getContext('2d');
	if (!ctx) throw new Error('Canvas 2D context is unavailable');

	ctx.fillStyle = '#0f172a';
	ctx.fillRect(0, 0, canvas.width, canvas.height);

	const headerHeight = Math.round(canvas.height * 0.12);
	ctx.fillStyle = '#1e293b';
	ctx.fillRect(0, 0, canvas.width, headerHeight);

	ctx.fillStyle = '#ffffff';
	ctx.font = 'bold 36px sans-serif';
	ctx.fillText(payload.clinicName, 40, 55);

	ctx.font = '20px sans-serif';
	ctx.fillStyle = '#94a3b8';
	ctx.fillText('Клинический фотопротокол До / После (Стоматологический стандарт СтАР)', 40, 92);

	ctx.textAlign = 'right';
	ctx.fillStyle = '#ffffff';
	ctx.font = 'bold 20px sans-serif';
	ctx.fillText(`Пациент: ${payload.patientName} (${payload.patientCardNumber})`, canvas.width - 40, 50);

	ctx.font = '16px sans-serif';
	ctx.fillStyle = '#94a3b8';
	ctx.fillText(`Врач: ${payload.doctorName} • ${payload.dateStr || new Date().toLocaleDateString('ru-RU')}`, canvas.width - 40, 80);

	if (payload.beforeShade || payload.afterShade) {
		ctx.fillText(`VITA: ДО ${payload.beforeShade || '—'} → ПОСЛЕ ${payload.afterShade || '—'}`, canvas.width - 40, 108);
	}
	ctx.textAlign = 'left';

	const contentY = headerHeight + 24;
	const contentHeight = canvas.height - contentY - 48;
	const colWidth = (canvas.width - 72) / 2;

	const [imgBefore, imgAfter] = await Promise.all([
		loadImageSafe(payload.beforeImageUrl),
		loadImageSafe(payload.afterImageUrl),
	]);

	if (imgBefore) {
		ctx.drawImage(imgBefore, 24, contentY, colWidth, contentHeight);
	} else {
		ctx.fillStyle = '#1e293b';
		ctx.fillRect(24, contentY, colWidth, contentHeight);
		ctx.fillStyle = '#64748b';
		ctx.font = 'bold 20px sans-serif';
		ctx.textAlign = 'center';
		ctx.fillText(`Кадр «До» не загружен (${payload.beforeTitle})`, 24 + colWidth / 2, contentY + contentHeight / 2);
		ctx.textAlign = 'left';
	}
	ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
	ctx.fillRect(36, contentY + 16, 260, 42);
	ctx.fillStyle = '#38bdf8';
	ctx.font = 'bold 20px sans-serif';
	ctx.fillText(`ДО: ${payload.beforeTitle}`, 48, contentY + 44);

	const afterColX = 24 + colWidth + 24;
	if (imgAfter) {
		ctx.drawImage(imgAfter, afterColX, contentY, colWidth, contentHeight);
	} else {
		ctx.fillStyle = '#1e293b';
		ctx.fillRect(afterColX, contentY, colWidth, contentHeight);
		ctx.fillStyle = '#64748b';
		ctx.font = 'bold 20px sans-serif';
		ctx.textAlign = 'center';
		ctx.fillText(`Кадр «После» не загружен (${payload.afterTitle})`, afterColX + colWidth / 2, contentY + contentHeight / 2);
		ctx.textAlign = 'left';
	}
	ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
	ctx.fillRect(afterColX + 12, contentY + 16, 260, 42);
	ctx.fillStyle = '#4ade80';
	ctx.font = 'bold 20px sans-serif';
	ctx.fillText(`ПОСЛЕ: ${payload.afterTitle}`, afterColX + 24, contentY + 44);

	const watermarkText = generateCollageWatermarkText(
		payload.clinicName,
		payload.patientName,
		payload.patientCardNumber,
		payload.doctorName,
		payload.dateStr
	);
	ctx.fillStyle = '#090d16';
	ctx.fillRect(0, canvas.height - 36, canvas.width, 36);
	ctx.fillStyle = '#64748b';
	ctx.font = '14px sans-serif';
	ctx.fillText(watermarkText, 24, canvas.height - 13);

	const dataUrl = canvas.toDataURL('image/png');
	const filename = `PhotoProtocol_${payload.patientName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.png`;

	const downloadLink = document.createElement('a');
	downloadLink.download = filename;
	downloadLink.href = dataUrl;
	downloadLink.click();

	return dataUrl;
}
