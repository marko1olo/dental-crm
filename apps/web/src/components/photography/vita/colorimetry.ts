/**
 * Precise sRGB <-> CIELAB Conversion (D65 Illuminant / 2° Standard Observer)
 */

import { ColorRGB, ColorLab } from './types';

function sRGBToLinear(c: number): number {
	return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function xyzF(t: number): number {
	const delta = 6 / 29;
	return t > delta * delta * delta ? Math.cbrt(t) : t / (3 * delta * delta) + 4 / 29;
}

export function rgbToLab(rgb: ColorRGB): ColorLab {
	const r = sRGBToLinear(rgb.r / 255);
	const g = sRGBToLinear(rgb.g / 255);
	const b = sRGBToLinear(rgb.b / 255);

	let x = r * 0.4124564 + g * 0.3575761 + b * 0.1804375;
	let y = r * 0.2126729 + g * 0.7151522 + b * 0.0721750;
	let z = r * 0.0193339 + g * 0.1191920 + b * 0.9503041;

	x /= 0.95047;
	y /= 1.00000;
	z /= 1.08883;

	const fx = xyzF(x);
	const fy = xyzF(y);
	const fz = xyzF(z);

	const L = Math.max(0, 116 * fy - 16);
	const a = 500 * (fx - fy);
	const labB = 200 * (fy - fz);

	return { L, a, b: labB };
}

function labInvF(t: number): number {
	const delta = 6 / 29;
	return t > delta ? t * t * t : 3 * delta * delta * (t - 4 / 29);
}

function linearToSRGB(c: number): number {
	const val = c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
	return Math.max(0, Math.min(255, Math.round(val * 255)));
}

export function labToRgb(lab: ColorLab): ColorRGB {
	const fy = (lab.L + 16) / 116;
	const fx = lab.a / 500 + fy;
	const fz = fy - lab.b / 200;

	let x = 0.95047 * labInvF(fx);
	let y = 1.00000 * labInvF(fy);
	let z = 1.08883 * labInvF(fz);

	const rLinear = x * 3.2404542 + y * -1.5371385 + z * -0.4985314;
	const gLinear = x * -0.9692660 + y * 1.8760108 + z * 0.0415560;
	const bLinear = x * 0.0556434 + y * -0.2040259 + z * 1.0572252;

	return {
		r: linearToSRGB(rLinear),
		g: linearToSRGB(gLinear),
		b: linearToSRGB(bLinear),
	};
}
