import type { Point2D } from './vectorGeometry';

export type CollageFormatType = 'A4_portrait' | 'A4_landscape' | '16_9_hd' | '16_9_4k';

export interface CollageDimensionConfig {
	widthPx: number;
	heightPx: number;
	aspectRatio: number;
	labelRu: string;
	dpi: number;
}

export function calculateCollageDimensions(format: CollageFormatType): CollageDimensionConfig {
	switch (format) {
		case 'A4_portrait':
			return { widthPx: 2480, heightPx: 3508, aspectRatio: 2480 / 3508, labelRu: 'A4 Портрет (210 x 297 мм, 300 DPI)', dpi: 300 };
		case 'A4_landscape':
			return { widthPx: 3508, heightPx: 2480, aspectRatio: 3508 / 2480, labelRu: 'A4 Альбомный (297 x 210 мм, 300 DPI)', dpi: 300 };
		case '16_9_4k':
			return { widthPx: 3840, heightPx: 2160, aspectRatio: 16 / 9, labelRu: 'Презентация 4K UHD (3840 x 2160, 16:9)', dpi: 150 };
		case '16_9_hd':
		default:
			return { widthPx: 1920, heightPx: 1080, aspectRatio: 16 / 9, labelRu: 'Презентация Full HD (1920 x 1080, 16:9)', dpi: 96 };
	}
}

export function generateCollageWatermarkText(
	clinicName: string,
	patientName: string,
	patientCardNumber: string,
	doctorName: string,
	dateStr?: string
): string {
	const date = dateStr || new Date().toLocaleDateString('ru-RU');
	return `${clinicName.toUpperCase()} • Пациент: ${patientName} (${patientCardNumber}) • Врач: ${doctorName} • ${date}`;
}

export interface BoundingBox {
	x: number;
	y: number;
	width: number;
	height: number;
}

export function calculateCropBoundingBox(
	imageWidth: number,
	imageHeight: number,
	targetAspectRatio: number
): BoundingBox {
	if (imageWidth <= 0 || imageHeight <= 0 || targetAspectRatio <= 0) {
		return { x: 0, y: 0, width: 0, height: 0 };
	}
	const currentRatio = imageWidth / imageHeight;
	let cropW = imageWidth;
	let cropH = imageHeight;
	if (currentRatio > targetAspectRatio) cropW = imageHeight * targetAspectRatio;
	else cropH = imageWidth / targetAspectRatio;
	return { x: (imageWidth - cropW) / 2, y: (imageHeight - cropH) / 2, width: cropW, height: cropH };
}

export function fitImageIntoContainer(
	imageWidth: number,
	imageHeight: number,
	containerWidth: number,
	containerHeight: number,
	fit: 'contain' | 'cover' = 'contain'
): { width: number; height: number; scale: number; offsetX: number; offsetY: number } {
	if (imageWidth <= 0 || imageHeight <= 0 || containerWidth <= 0 || containerHeight <= 0) {
		return { width: 0, height: 0, scale: 1, offsetX: 0, offsetY: 0 };
	}
	const scaleX = containerWidth / imageWidth;
	const scaleY = containerHeight / imageHeight;
	const scale = fit === 'contain' ? Math.min(scaleX, scaleY) : Math.max(scaleX, scaleY);
	const width = imageWidth * scale;
	const height = imageHeight * scale;
	const offsetX = (containerWidth - width) / 2;
	const offsetY = (containerHeight - height) / 2;
	return { width, height, scale, offsetX, offsetY };
}

export function mirrorCoordinates(
	point: Point2D,
	axis: 'horizontal' | 'vertical',
	containerSize: { width: number; height: number }
): Point2D {
	if (axis === 'horizontal') return { x: containerSize.width - point.x, y: point.y };
	return { x: point.x, y: containerSize.height - point.y };
}
