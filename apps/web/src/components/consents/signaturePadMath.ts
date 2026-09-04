/**
 * ============================================================================
 * HIGH-PRECISION DIGITAL TOUCH-SIGNATURE ENGINE
 * Математический движок сглаживания кривых Безье, интерполяции толщины пера,
 * криптографического хеширования SHA-256 и векторного экспорта SVG/PNG
 * ============================================================================
 */

export interface SignaturePoint {
	x: number;
	y: number;
	time: number;
	pressure?: number | undefined;
	width?: number | undefined;
}

export interface SignatureStroke {
	points: SignaturePoint[];
	color?: string | undefined;
	width?: number | undefined;
	isDot?: boolean | undefined;
}

export interface SignatureBoundingBox {
	minX: number;
	minY: number;
	maxX: number;
	maxY: number;
	width: number;
	height: number;
}

export interface SignatureVectorData {
	strokes: SignatureStroke[];
	bounds: SignatureBoundingBox;
	timestamp: number;
	pointCount: number;
	integrityHash?: string | undefined;
}

export interface BezierCurveSegment {
	startPoint: SignaturePoint;
	control1: SignaturePoint;
	control2: SignaturePoint;
	endPoint: SignaturePoint;
	startWidth: number;
	endWidth: number;
}

export interface StrokeWidthOptions {
	minWidth?: number | undefined;
	maxWidth?: number | undefined;
	velocityFilterWeight?: number | undefined;
	pressureWeight?: number | undefined;
}

const DEFAULT_MIN_WIDTH = 1.2;
const DEFAULT_MAX_WIDTH = 3.5;
const DEFAULT_VELOCITY_WEIGHT = 0.7;

/**
 * Вычисление евклидова расстояния между двумя точками
 */
export function calculatePointDistance(p1: SignaturePoint, p2: SignaturePoint): number {
	const dx = p2.x - p1.x;
	const dy = p2.y - p1.y;
	return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Вычисление скорости движения пера (px/ms)
 */
export function calculatePointVelocity(p1: SignaturePoint, p2: SignaturePoint): number {
	const timeDelta = Math.max(p2.time - p1.time, 1);
	const distance = calculatePointDistance(p1, p2);
	return distance / timeDelta;
}

/**
 * Интерполяция толщины штриха на основе скорости и силы нажатия (стилуса)
 * При быстром росчерке линия утончается, при медленном — утолщается
 */
export function calculateStrokeWidth(
	velocity: number,
	pressure: number | undefined,
	options: StrokeWidthOptions = {},
): number {
	const minWidth = options.minWidth ?? DEFAULT_MIN_WIDTH;
	const maxWidth = options.maxWidth ?? DEFAULT_MAX_WIDTH;

	// Если есть аппаратная чувствительность к нажатию стилуса (Apple Pencil / Wacom / S-Pen)
	if (pressure !== undefined && pressure > 0 && pressure <= 1) {
		const pressureContribution = minWidth + (maxWidth - minWidth) * pressure;
		// Небольшая поправка на скорость
		const velocityFactor = Math.max(0.6, 1 - Math.min(velocity / 4, 0.4));
		return Math.min(maxWidth, Math.max(minWidth, pressureContribution * velocityFactor));
	}

	// Эмуляция перьевой ручки по скорости движения
	// v = 0 -> maxWidth, v >= 3.0 -> minWidth
	const normalizedVelocity = Math.min(Math.max(velocity, 0), 3.0) / 3.0;
	const width = maxWidth - (maxWidth - minWidth) * Math.pow(normalizedVelocity, 0.6);
	return Math.min(maxWidth, Math.max(minWidth, width));
}

/**
 * Вычисление средней точки между двумя координатами
 */
export function computeMidpoint(p1: SignaturePoint, p2: SignaturePoint): SignaturePoint {
	return {
		x: (p1.x + p2.x) / 2,
		y: (p1.y + p2.y) / 2,
		time: (p1.time + p2.time) / 2,
		pressure: p1.pressure !== undefined && p2.pressure !== undefined ? (p1.pressure + p2.pressure) / 2 : undefined,
		width: p1.width !== undefined && p2.width !== undefined ? (p1.width + p2.width) / 2 : undefined,
	};
}

/**
 * Сглаживание массива точек в сегменты кубических/квадратичных кривых Безье
 */
export function smoothStrokeToBezierCurves(
	points: SignaturePoint[],
	options: StrokeWidthOptions = {},
): BezierCurveSegment[] {
	if (points.length < 2) return [];

	const minWidth = options.minWidth ?? DEFAULT_MIN_WIDTH;
	const maxWidth = options.maxWidth ?? DEFAULT_MAX_WIDTH;
	const curves: BezierCurveSegment[] = [];

	const first = points[0];
	const second = points[1];
	if (!first || !second) return [];

	if (points.length === 2) {
		const v = calculatePointVelocity(first, second);
		const w = calculateStrokeWidth(v, second.pressure, options);
		curves.push({
			startPoint: first,
			control1: first,
			control2: second,
			endPoint: second,
			startWidth: first.width ?? (minWidth + maxWidth) / 2,
			endWidth: w,
		});
		return curves;
	}

	// Алгоритм сглаживания через промежуточные средние точки (Catmull-Rom к Bezier)
	let currentWidth = first.width ?? (minWidth + maxWidth) / 2;

	for (let i = 1; i < points.length - 1; i++) {
		const p0 = points[i - 1];
		const p1 = points[i];
		const p2 = points[i + 1];
		if (!p0 || !p1 || !p2) continue;

		const mid1 = computeMidpoint(p0, p1);
		const mid2 = computeMidpoint(p1, p2);

		const v = calculatePointVelocity(p0, p1);
		const targetWidth = calculateStrokeWidth(v, p1.pressure, options);
		// Фильтр сглаживания толщины с инерцией
		const weight = options.velocityFilterWeight ?? DEFAULT_VELOCITY_WEIGHT;
		const nextWidth = currentWidth * (1 - weight) + targetWidth * weight;

		curves.push({
			startPoint: mid1,
			control1: p1,
			control2: p1,
			endPoint: mid2,
			startWidth: currentWidth,
			endWidth: nextWidth,
		});

		currentWidth = nextWidth;
	}

	return curves;
}

/**
 * Упрощение точек штриха методом Рамера — Дугласа — Пекера
 * Устраняет избыточные микроколебания сенсора при сохранении формы подписи
 */
export function simplifyStrokePoints(points: SignaturePoint[], tolerance = 1.0): SignaturePoint[] {
	if (points.length <= 2) return points;

	const pStart = points[0];
	const pEnd = points[points.length - 1];
	if (!pStart || !pEnd) return points;

	let maxDistance = 0;
	let maxIndex = 0;

	const lineLength = calculatePointDistance(pStart, pEnd);

	for (let i = 1; i < points.length - 1; i++) {
		const p = points[i];
		if (!p) continue;
		let distance = 0;

		if (lineLength === 0) {
			distance = calculatePointDistance(p, pStart);
		} else {
			// Расстояние от точки до отрезка pStart-pEnd
			const numerator = Math.abs(
				(pEnd.y - pStart.y) * p.x - (pEnd.x - pStart.x) * p.y + pEnd.x * pStart.y - pEnd.y * pStart.x,
			);
			distance = numerator / lineLength;
		}

		if (distance > maxDistance) {
			maxDistance = distance;
			maxIndex = i;
		}
	}

	if (maxDistance > tolerance) {
		const left = simplifyStrokePoints(points.slice(0, maxIndex + 1), tolerance);
		const right = simplifyStrokePoints(points.slice(maxIndex), tolerance);
		return [...left.slice(0, -1), ...right];
	}

	return [pStart, pEnd];
}

/**
 * Вычисление ограничивающего прямоугольника (Bounding Box) подписи
 */
export function calculateBoundingBox(strokes: SignatureStroke[]): SignatureBoundingBox {
	if (!strokes || strokes.length === 0) {
		return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 };
	}

	let minX = Number.POSITIVE_INFINITY;
	let minY = Number.POSITIVE_INFINITY;
	let maxX = Number.NEGATIVE_INFINITY;
	let maxY = Number.NEGATIVE_INFINITY;
	let hasPoints = false;

	for (const stroke of strokes) {
		for (const point of stroke.points) {
			hasPoints = true;
			if (point.x < minX) minX = point.x;
			if (point.y < minY) minY = point.y;
			if (point.x > maxX) maxX = point.x;
			if (point.y > maxY) maxY = point.y;
		}
	}

	if (!hasPoints) {
		return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 };
	}

	return {
		minX: Math.floor(minX),
		minY: Math.floor(minY),
		maxX: Math.ceil(maxX),
		maxY: Math.ceil(maxY),
		width: Math.max(0, Math.ceil(maxX) - Math.floor(minX)),
		height: Math.max(0, Math.ceil(maxY) - Math.floor(minY)),
	};
}

/**
 * Проверка, является ли подпись пустой или недостаточной
 */
export function isSignatureEmpty(strokes: SignatureStroke[], minPointsThreshold = 5): boolean {
	if (!strokes || strokes.length === 0) return true;
	let totalPoints = 0;
	for (const stroke of strokes) {
		totalPoints += stroke.points.length;
	}
	return totalPoints < minPointsThreshold;
}

/**
 * Отрисовка сглаженного штриха на CanvasRenderingContext2D
 */
export function drawSmoothStrokeOnContext(
	ctx: CanvasRenderingContext2D,
	stroke: SignatureStroke,
	options: StrokeWidthOptions & { defaultColor?: string | undefined } = {},
): void {
	const points = stroke.points;
	if (!points || points.length === 0) return;

	const first = points[0];
	if (!first) return;

	ctx.strokeStyle = stroke.color || options.defaultColor || "#0f172a";
	ctx.fillStyle = stroke.color || options.defaultColor || "#0f172a";
	ctx.lineCap = "round";
	ctx.lineJoin = "round";

	// Одиночная точка (клик)
	if (points.length === 1 || stroke.isDot) {
		const radius = (options.maxWidth ?? DEFAULT_MAX_WIDTH) / 2;
		ctx.beginPath();
		ctx.arc(first.x, first.y, radius, 0, Math.PI * 2, true);
		ctx.fill();
		return;
	}

	// 2 точки — прямая линия
	if (points.length === 2) {
		const second = points[1];
		if (!second) return;
		ctx.lineWidth = stroke.width || (options.minWidth ?? DEFAULT_MIN_WIDTH);
		ctx.beginPath();
		ctx.moveTo(first.x, first.y);
		ctx.lineTo(second.x, second.y);
		ctx.stroke();
		return;
	}

	// Множество точек — плавные кривые Безье с интерполяцией толщины
	const curves = smoothStrokeToBezierCurves(points, options);
	for (const curve of curves) {
		ctx.lineWidth = (curve.startWidth + curve.endWidth) / 2;
		ctx.beginPath();
		ctx.moveTo(curve.startPoint.x, curve.startPoint.y);
		ctx.quadraticCurveTo(
			curve.control1.x,
			curve.control1.y,
			curve.endPoint.x,
			curve.endPoint.y,
		);
		ctx.stroke();
	}
}

/**
 * Полная отрисовка всех штрихов на холсте с гарантированным непрозрачным фоном
 */
export function drawAllStrokesOnCanvas(
	canvas: HTMLCanvasElement,
	strokes: SignatureStroke[],
	options: { backgroundColor?: string | undefined; defaultColor?: string | undefined } = {},
): void {
	const ctx = canvas.getContext("2d");
	if (!ctx) return;

	const bgColor = options.backgroundColor ?? "#ffffff";
	ctx.fillStyle = bgColor;
	ctx.fillRect(0, 0, canvas.width, canvas.height);

	for (const stroke of strokes) {
		drawSmoothStrokeOnContext(ctx, stroke, options);
	}
}

/**
 * Экспорт подписи в векторный формат SVG с кривыми Безье
 */
export function exportSignatureToSvg(
	strokes: SignatureStroke[],
	width: number,
	height: number,
	options: {
		strokeColor?: string | undefined;
		strokeWidth?: number | undefined;
		backgroundColor?: string | undefined;
		viewBox?: string | undefined;
	} = {},
): string {
	const strokeColor = options.strokeColor || "#0f172a";
	const bg = options.backgroundColor ? `<rect width="100%" height="100%" fill="${options.backgroundColor}"/>` : "";
	const pathStrings: string[] = [];

	for (const stroke of strokes) {
		const points = stroke.points;
		if (!points || points.length === 0) continue;

		const first = points[0];
		if (!first) continue;

		if (points.length === 1 || stroke.isDot) {
			const r = (options.strokeWidth ?? DEFAULT_MAX_WIDTH) / 2;
			pathStrings.push(`<circle cx="${first.x.toFixed(2)}" cy="${first.y.toFixed(2)}" r="${r.toFixed(2)}" fill="${strokeColor}"/>`);
			continue;
		}

		if (points.length === 2) {
			const second = points[1];
			if (!second) continue;
			pathStrings.push(
				`<path d="M ${first.x.toFixed(2)} ${first.y.toFixed(2)} L ${second.x.toFixed(2)} ${second.y.toFixed(2)}" stroke="${strokeColor}" stroke-width="${(options.strokeWidth ?? DEFAULT_MIN_WIDTH).toFixed(2)}" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`,
			);
			continue;
		}

		let pathData = `M ${first.x.toFixed(2)} ${first.y.toFixed(2)}`;
		for (let i = 1; i < points.length - 1; i++) {
			const current = points[i];
			const next = points[i + 1];
			if (!current || !next) continue;
			const mid = computeMidpoint(current, next);
			pathData += ` Q ${current.x.toFixed(2)} ${current.y.toFixed(2)}, ${mid.x.toFixed(2)} ${mid.y.toFixed(2)}`;
		}
		const last = points[points.length - 1];
		if (last) {
			pathData += ` L ${last.x.toFixed(2)} ${last.y.toFixed(2)}`;
		}

		const sw = stroke.width || options.strokeWidth || 2.2;
		pathStrings.push(
			`<path d="${pathData}" stroke="${strokeColor}" stroke-width="${sw.toFixed(2)}" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`,
		);
	}

	const vb = options.viewBox || `0 0 ${width} ${height}`;

	return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" width="${width}" height="${height}">\n  ${bg}\n  ${pathStrings.join("\n  ")}\n</svg>`;
}

/**
 * ============================================================================
 * ЧИСТАЯ РЕАЛИЗАЦИЯ КРИПТОГРАФИЧЕСКОГО ХЕШИРОВАНИЯ SHA-256 (FIPS 180-4)
 * Полная независимость от платформы (работает синхронно в браузере и Node.js)
 * ============================================================================
 */

function rightRotate(value: number, amount: number): number {
	return (value >>> amount) | (value << (32 - amount));
}

export function generateSha256(asciiString: string): string {
	const maxWord = Math.pow(2, 32);

	// Начальные значения хеша и константы K (FIPS 180-4)
	const hash = new Uint32Array([
		0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
		0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
	]);

	const k = new Uint32Array([
		0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
		0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
		0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
		0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
		0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
		0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
		0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
		0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
	]);

	// UTF-8 кодирование строки
	const utf8Bytes: number[] = [];
	for (let c = 0; c < asciiString.length; c++) {
		let code = asciiString.charCodeAt(c);
		if (code < 0x80) {
			utf8Bytes.push(code);
		} else if (code < 0x800) {
			utf8Bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
		} else if (code < 0xd800 || code >= 0xe000) {
			utf8Bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
		} else {
			// Суррогатная пара UTF-16
			c++;
			code = 0x10000 + (((code & 0x3ff) << 10) | (asciiString.charCodeAt(c) & 0x3ff));
			utf8Bytes.push(
				0xf0 | (code >> 18),
				0x80 | ((code >> 12) & 0x3f),
				0x80 | ((code >> 6) & 0x3f),
				0x80 | (code & 0x3f),
			);
		}
	}

	const utf8BitLength = utf8Bytes.length * 8;

	// Заполнение
	utf8Bytes.push(0x80);
	while ((utf8Bytes.length % 64) !== 56) {
		utf8Bytes.push(0);
	}

	// Добавление 64-битной длины
	const highBits = Math.floor(utf8BitLength / maxWord);
	const lowBits = utf8BitLength >>> 0;

	for (let b = 3; b >= 0; b--) {
		utf8Bytes.push((highBits >>> (b * 8)) & 0xff);
	}
	for (let b = 3; b >= 0; b--) {
		utf8Bytes.push((lowBits >>> (b * 8)) & 0xff);
	}

	// Преобразование в 32-битные слова
	const wordsCount = utf8Bytes.length / 4;
	const words = new Uint32Array(wordsCount);
	for (let b = 0; b < wordsCount; b++) {
		const offset = b * 4;
		const b0 = utf8Bytes[offset] ?? 0;
		const b1 = utf8Bytes[offset + 1] ?? 0;
		const b2 = utf8Bytes[offset + 2] ?? 0;
		const b3 = utf8Bytes[offset + 3] ?? 0;
		words[b] = (b0 << 24) | (b1 << 16) | (b2 << 8) | b3;
	}

	const w = new Uint32Array(64);

	// Обработка блоков по 512 бит (16 слов)
	for (let j = 0; j < wordsCount; j += 16) {
		for (let i = 0; i < 16; i++) {
			w[i] = words[j + i] ?? 0;
		}
		for (let i = 16; i < 64; i++) {
			const w15 = w[i - 15] ?? 0;
			const w2 = w[i - 2] ?? 0;
			const s0 = rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3);
			const s1 = rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10);
			w[i] = ((w[i - 16] ?? 0) + s0 + (w[i - 7] ?? 0) + s1) | 0;
		}

		let a = hash[0] ?? 0;
		let b = hash[1] ?? 0;
		let c = hash[2] ?? 0;
		let d = hash[3] ?? 0;
		let e = hash[4] ?? 0;
		let f = hash[5] ?? 0;
		let g = hash[6] ?? 0;
		let h = hash[7] ?? 0;

		for (let i = 0; i < 64; i++) {
			const S1 = rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25);
			const ch = (e & f) ^ (~e & g);
			const temp1 = (h + S1 + ch + (k[i] ?? 0) + (w[i] ?? 0)) | 0;
			const S0 = rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22);
			const maj = (a & b) ^ (a & c) ^ (b & c);
			const temp2 = (S0 + maj) | 0;

			h = g;
			g = f;
			f = e;
			e = (d + temp1) | 0;
			d = c;
			c = b;
			b = a;
			a = (temp1 + temp2) | 0;
		}

		hash[0] = ((hash[0] ?? 0) + a) | 0;
		hash[1] = ((hash[1] ?? 0) + b) | 0;
		hash[2] = ((hash[2] ?? 0) + c) | 0;
		hash[3] = ((hash[3] ?? 0) + d) | 0;
		hash[4] = ((hash[4] ?? 0) + e) | 0;
		hash[5] = ((hash[5] ?? 0) + f) | 0;
		hash[6] = ((hash[6] ?? 0) + g) | 0;
		hash[7] = ((hash[7] ?? 0) + h) | 0;
	}

	let hexString = "";
	for (let i = 0; i < 8; i++) {
		const hex = ((hash[i] ?? 0) >>> 0).toString(16).padStart(8, "0");
		hexString += hex;
	}

	return hexString;
}

export interface ConsentIntegrityPayload {
	documentText: string;
	patientInfo: {
		name?: string | null | undefined;
		passportOrBirth?: string | null | undefined;
		phone?: string | null | undefined;
	} | string;
	timestamp: string | number;
	strokes?: SignatureStroke[] | undefined;
	verificationMethod?: "tablet_stylus" | "sms_otp" | "printed_scan" | "paper_physical" | undefined;
	smsOtpCode?: string | null | undefined;
}

/**
 * Канонический векторный SVG-штамп для подтверждения подписания на бумажном носителе.
 * Фиксирует статус хранения оригинала в медицинской карте формы № 043/у (323-ФЗ, Приказ № 1051н).
 */
export function generatePaperSignatureSvg(options: {
	date?: string | undefined;
	clinicName?: string | undefined;
	width?: number | undefined;
	height?: number | undefined;
} = {}): string {
	const w = options.width || 400;
	const h = options.height || 120;
	const dateStr = options.date || new Date().toLocaleDateString("ru-RU");
	const clinic = options.clinicName ? ` • ${options.clinicName}` : "";
	return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">
  <rect width="100%" height="100%" fill="#f8fafc" stroke="#0d9488" stroke-width="2" rx="8"/>
  <text x="20" y="36" font-family="sans-serif" font-size="13" font-weight="bold" fill="#0f172a">ПОДПИСАНО НА БУМАЖНОМ НОСИТЕЛЕ</text>
  <text x="20" y="58" font-family="sans-serif" font-size="11" fill="#334155">Бумажный оригинал подписан пациентом</text>
  <text x="20" y="76" font-family="sans-serif" font-size="11" fill="#64748b">(хранится в архиве карты 043/у)</text>
  <text x="20" y="98" font-family="sans-serif" font-size="10" fill="#0d9488">323-ФЗ ст. 20 • Приказ Минздрава № 1051н • ${dateStr}${clinic}</text>
</svg>`;
}

/**
 * Минимальный непрозрачный PNG (1x1 пиксель) для совместимости с API при бумажном подписании
 */
export const PAPER_SIGNATURE_FALLBACK_PNG =
	"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

/**
 * Генерация криптографического цифрового отпечатка (SHA-256) юридического документа
 * Связывает воедино неизменяемый текст согласия, данные пациента, временную метку
 * и векторный росчерк (или метод подтверждения), делая любую модификацию заметной.
 */
export function generateConsentIntegrityHash(payload: ConsentIntegrityPayload): {
	hash: string;
	canonicalPayload: string;
	timestampIso: string;
} {
	const timestampIso =
		typeof payload.timestamp === "number"
			? new Date(payload.timestamp).toISOString()
			: new Date(payload.timestamp).toISOString();

	// Каноническое представление векторных точек подписи (для бумаги или SMS росчерк пустой)
	const serializedStrokes = (payload.strokes || [])
		.map((s, sIdx) => {
			const pts = (s.points || [])
				.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)},${p.time}`)
				.join(";");
			return `S${sIdx}:[${pts}]`;
		})
		.join("|");

	const ptName =
		typeof payload.patientInfo === "string"
			? payload.patientInfo.trim().toUpperCase()
			: (payload.patientInfo?.name || "").trim().toUpperCase();
	const ptId =
		typeof payload.patientInfo === "object" && payload.patientInfo !== null
			? (payload.patientInfo.passportOrBirth || "").trim()
			: "";
	const ptPhone =
		typeof payload.patientInfo === "object" && payload.patientInfo !== null
			? (payload.patientInfo.phone || "").trim()
			: "";

	const canonicalLines = [
		"--- CANONICAL DENTAL INFORMED CONSENT INTEGRITY RECORD ---",
		`DOC_TEXT_HASH: ${generateSha256(payload.documentText)}`,
		`PATIENT_NAME: ${ptName}`,
		`PATIENT_ID: ${ptId}`,
		`PATIENT_PHONE: ${ptPhone}`,
		`TIMESTAMP: ${timestampIso}`,
		`VERIFICATION_METHOD: ${payload.verificationMethod || "tablet_stylus"}`,
		payload.smsOtpCode ? `OTP_DIGEST: ${generateSha256(payload.smsOtpCode)}` : null,
		`STROKES_VECTOR: ${serializedStrokes}`,
		"----------------------------------------------------------",
	].filter(Boolean);

	const canonicalPayload = canonicalLines.join("\n");
	const hash = generateSha256(canonicalPayload);

	return {
		hash,
		canonicalPayload,
		timestampIso,
	};
}
