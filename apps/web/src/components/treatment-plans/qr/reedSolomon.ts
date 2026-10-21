/**
 * apps/web/src/components/treatment-plans/qr/reedSolomon.ts
 *
 * Математика полей Галуа GF(256) и кодирование коррекции ошибок Рида-Соломона.
 */

const EXP_TABLE = new Uint8Array(512);
const LOG_TABLE = new Uint8Array(256);

(function initGaloisField() {
	let x = 1;
	for (let i = 0; i < 255; i++) {
		EXP_TABLE[i] = x;
		EXP_TABLE[i + 255] = x;
		LOG_TABLE[x] = i;
		x = (x << 1) ^ (x >= 128 ? 0x11d : 0);
	}
	LOG_TABLE[0] = 0;
})();

export function gMul(a: number, b: number): number {
	if (a === 0 || b === 0) return 0;
	const logA = LOG_TABLE[a] ?? 0;
	const logB = LOG_TABLE[b] ?? 0;
	return EXP_TABLE[(logA + logB) % 255] ?? 0;
}

export function createGeneratorPolynomial(degree: number): Uint8Array {
	let poly = new Uint8Array([1]);
	for (let i = 0; i < degree; i++) {
		const next = new Uint8Array(poly.length + 1);
		const factor = EXP_TABLE[i] ?? 0;
		for (let j = 0; j < poly.length; j++) {
			const current = poly[j] ?? 0;
			next[j] = (next[j] ?? 0) ^ gMul(current, factor);
			next[j + 1] = (next[j + 1] ?? 0) ^ current;
		}
		poly = next;
	}
	return poly;
}

export function calculateReedSolomonErrorCorrection(
	data: Uint8Array,
	ecLength: number,
): Uint8Array {
	const generator = createGeneratorPolynomial(ecLength);
	const message = new Uint8Array(data.length + ecLength);
	message.set(data);

	for (let i = 0; i < data.length; i++) {
		const coef = message[i] ?? 0;
		if (coef !== 0) {
			for (let j = 0; j < generator.length; j++) {
				const genVal = generator[j] ?? 0;
				message[i + j] = (message[i + j] ?? 0) ^ gMul(genVal, coef);
			}
		}
	}
	return message.slice(data.length);
}
