/**
 * DENTE DENTAL CRM — 2D Radiology Filter Convolution & WebGL Shaders
 * EzDent-i spatial filters (Laplacian 5x5, Sobel 45°, Unsharp Masking, High-Boost, Emboss),
 * CPU convolution fallbacks, sensor chamfer clipping, and WebGL2 GLSL shaders.
 */

import type { VatechImageProcessingPreset } from "./types.js";

/**
 * Vatech EzDent-i image processing modes (Reverse-engineered from EzSensor.ini [IP1]..[IP8]).
 * Multi-scale unsharp masking and adaptive contrast thresholds.
 */
export const VATECH_EZDENT_IP_MODES: readonly VatechImageProcessingPreset[] = [
	{
		id: "ip1_molar_rc",
		captionRu: "Режим 1: Моляры (Эндодонтия / Корневые каналы)",
		usmSteps: 8,
		usmAmount: 150,
		usmRadius: 2.0,
		histEquThreshold: 80,
		invert: false,
		segmentCoeff: 2.5,
	},
	{
		id: "ip2_molar_mc",
		captionRu: "Режим 2: Моляры (Средний контраст)",
		usmSteps: 8,
		usmAmount: 120,
		usmRadius: 2.0,
		histEquThreshold: 80,
		invert: false,
		segmentCoeff: 3.5,
	},
	{
		id: "ip3_molar_hc",
		captionRu: "Режим 3: Моляры (Высокий контраст кости)",
		usmSteps: 8,
		usmAmount: 180,
		usmRadius: 2.0,
		histEquThreshold: 80,
		invert: false,
		segmentCoeff: 4.5,
	},
	{
		id: "ip4_front_lower",
		captionRu: "Режим 4: Фронтальные нижние зубы (Резцы / Клыки)",
		usmSteps: 6,
		usmAmount: 150,
		usmRadius: 1.5,
		histEquThreshold: 80,
		invert: false,
		segmentCoeff: 4.5,
	},
	{
		id: "ip6_front_mc",
		captionRu: "Режим 6: Фронтальные зубы (Оптимальный баланс)",
		usmSteps: 6,
		usmAmount: 100,
		usmRadius: 1.5,
		histEquThreshold: 80,
		invert: false,
		segmentCoeff: 4.5,
	},
	{
		id: "ip7_front_lc",
		captionRu: "Режим 7: Фронтальные зубы (Мягкие ткани / Десна)",
		usmSteps: 6,
		usmAmount: 80,
		usmRadius: 1.0,
		histEquThreshold: 80,
		invert: false,
		segmentCoeff: 3.5,
	},
	{
		id: "ip8_caries_hc",
		captionRu: "Режим 8: Апроксимальный кариес (Максимальный микроконтраст)",
		usmSteps: 8,
		usmAmount: 200,
		usmRadius: 1.2,
		histEquThreshold: 80,
		invert: false,
		segmentCoeff: 4.8,
	},
];

/**
 * Calculates normalized unsharp mask weights and kernel scale for real-time WebGL shader convolution.
 */
export function calculateUnsharpMaskWeights(modeId: string): {
	amount: number;
	radius: number;
	threshold: number;
	laplacianWeight: number;
} {
	const preset = VATECH_EZDENT_IP_MODES.find((p) => p.id === modeId) || VATECH_EZDENT_IP_MODES[0]!;
	const normalizedAmount = Math.max(0, Math.min(300, preset.usmAmount)) / 100.0;
	return {
		amount: preset.usmAmount,
		radius: preset.usmRadius,
		threshold: preset.histEquThreshold,
		laplacianWeight: Number((normalizedAmount * 0.8).toFixed(3)),
	};
}

/** Standard 3x3 Unsharp Mask convolution kernel for edge enhancement */
export const UNSHARP_MASK_KERNEL_3X3: readonly number[] = [-1, -1, -1, -1, 9, -1, -1, -1, -1];

/**
 * EzDent-i High-Boost convolution kernel for maximum root apex & bone trabecular contrast.
 * High-boost amplification factor 13 in center with 8-neighbor gradient subtraction.
 */
export const HIGH_BOOST_KERNEL_3X3: readonly number[] = [-1, -2, -1, -2, 13, -2, -1, -2, -1];

/**
 * EzDent-i 45° Emboss pseudo-relief kernel for detecting subtle enamel microcracks,
 * hairline root fractures, and cementoenamel boundary transitions.
 */
export const EMBOSS_45_KERNEL_3X3: readonly number[] = [-2, -1, 0, -1, 1, 1, 0, 1, 2];

/**
 * 5x5 Extended Laplacian kernel for multi-scale unsharp masking (EzSensor.ini USM_NumSteps pyramid).
 * Broad spatial support captures wider bone trabecular transitions without ringing artifacts.
 */
export const LAPLACIAN_KERNEL_5X5: readonly number[] = [
	0, 0, -1, 0, 0, 0, -1, -2, -1, 0, -1, -2, 16, -2, -1, 0, -1, -2, -1, 0, 0, 0, -1, 0, 0,
];

/**
 * Directional 45° Prewitt/Sobel gradient kernel for acute crack inspection.
 */
export const SOBEL_45_KERNEL_3X3: readonly number[] = [-2, -1, 0, -1, 0, 1, 0, 1, 2];

/**
 * Applies 3x3 2D spatial convolution kernel on image buffer (CPU fallback for non-WebGL/offline).
 */
export function apply2DSpatialConvolution(
	data: Uint8ClampedArray,
	width: number,
	height: number,
	kernel: readonly number[],
	offset = 0,
): Uint8ClampedArray {
	const output = new Uint8ClampedArray(data.length);
	const kernelSum = kernel.reduce((acc, v) => acc + v, 0);
	const divisor = kernelSum === 0 ? 1 : kernelSum;

	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			const idx = (y * width + x) * 4;

			// Handle boundaries with clamp-to-edge
			if (x === 0 || y === 0 || x === width - 1 || y === height - 1) {
				output[idx] = data[idx]!;
				output[idx + 1] = data[idx + 1]!;
				output[idx + 2] = data[idx + 2]!;
				output[idx + 3] = data[idx + 3]!;
				continue;
			}

			let r = 0;
			let g = 0;
			let b = 0;
			let kIdx = 0;

			for (let ky = -1; ky <= 1; ky++) {
				for (let kx = -1; kx <= 1; kx++) {
					const neighborIdx = ((y + ky) * width + (x + kx)) * 4;
					const weight = kernel[kIdx++]!;
					r += data[neighborIdx]! * weight;
					g += data[neighborIdx + 1]! * weight;
					b += data[neighborIdx + 2]! * weight;
				}
			}

			output[idx] = Math.min(255, Math.max(0, Math.round(r / divisor + offset)));
			output[idx + 1] = Math.min(255, Math.max(0, Math.round(g / divisor + offset)));
			output[idx + 2] = Math.min(255, Math.max(0, Math.round(b / divisor + offset)));
			output[idx + 3] = data[idx + 3]!;
		}
	}

	return output;
}

/**
 * Applies 5x5 2D spatial convolution kernel for multi-scale USM filtering on CPU fallback.
 */
export function apply5x5SpatialConvolution(
	data: Uint8ClampedArray,
	width: number,
	height: number,
	kernel: readonly number[],
	offset = 0,
): Uint8ClampedArray {
	const output = new Uint8ClampedArray(data.length);
	const kernelSum = kernel.reduce((acc, v) => acc + v, 0);
	const divisor = kernelSum === 0 ? 1 : kernelSum;

	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			const idx = (y * width + x) * 4;

			// Handle boundaries
			if (x < 2 || y < 2 || x >= width - 2 || y >= height - 2) {
				output[idx] = data[idx]!;
				output[idx + 1] = data[idx + 1]!;
				output[idx + 2] = data[idx + 2]!;
				output[idx + 3] = data[idx + 3]!;
				continue;
			}

			let r = 0;
			let g = 0;
			let b = 0;
			let kIdx = 0;

			for (let ky = -2; ky <= 2; ky++) {
				for (let kx = -2; kx <= 2; kx++) {
					const neighborIdx = ((y + ky) * width + (x + kx)) * 4;
					const weight = kernel[kIdx++]!;
					r += data[neighborIdx]! * weight;
					g += data[neighborIdx + 1]! * weight;
					b += data[neighborIdx + 2]! * weight;
				}
			}

			output[idx] = Math.min(255, Math.max(0, Math.round(r / divisor + offset)));
			output[idx + 1] = Math.min(255, Math.max(0, Math.round(g / divisor + offset)));
			output[idx + 2] = Math.min(255, Math.max(0, Math.round(b / divisor + offset)));
			output[idx + 3] = data[idx + 3]!;
		}
	}

	return output;
}

/**
 * Clips the ergonomic chamfered corner of intraoral EzSensor images (matches VACAL.dll VCA_CutImage).
 * EzSensor hardware has a cut bottom-left or top-left corner where the sensor cable attaches.
 */
export function clipChamferedSensorCorner(
	data: Uint8ClampedArray,
	width: number,
	height: number,
	chamferPx = 65,
	corner: "bottom_left" | "bottom_right" | "top_left" | "top_right" = "bottom_left",
): Uint8ClampedArray {
	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			let isCut = false;
			if (corner === "bottom_left") {
				if (x + (height - 1 - y) < chamferPx) isCut = true;
			} else if (corner === "bottom_right") {
				if ((width - 1 - x) + (height - 1 - y) < chamferPx) isCut = true;
			} else if (corner === "top_left") {
				if (x + y < chamferPx) isCut = true;
			} else if (corner === "top_right") {
				if ((width - 1 - x) + y < chamferPx) isCut = true;
			}

			if (isCut) {
				const idx = (y * width + x) * 4;
				data[idx] = 0;
				data[idx + 1] = 0;
				data[idx + 2] = 0;
				data[idx + 3] = 255;
			}
		}
	}
	return data;
}

/** Canonical WebGL2 GLSL Vertex Shader for 2D X-Ray quad */
export const GLSL_2D_RADIOLOGY_VERTEX_SHADER = `#version 300 es
in vec2 a_position;
in vec2 a_texCoord;
out vec2 v_texCoord;

void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
    v_texCoord = a_texCoord;
}
`;

/** Canonical WebGL2 GLSL Fragment Shader implementing EzDent-i filter suite */
export const GLSL_2D_RADIOLOGY_FRAGMENT_SHADER = `#version 300 es
precision highp float;

in vec2 v_texCoord;
out vec4 fragColor;

uniform sampler2D u_image;
uniform vec2 u_textureSize;

uniform float u_brightness;
uniform float u_contrast;

uniform int u_invert;
uniform int u_sharpen;
uniform int u_maxSharpen;
uniform int u_pseudoRelief;
uniform int u_cutChamfer;

void main() {
    vec2 step = 1.0 / max(vec2(1.0), u_textureSize);

    if (u_cutChamfer == 1) {
        vec2 pixelCoord = v_texCoord * u_textureSize;
        if (pixelCoord.x + (u_textureSize.y - pixelCoord.y) < 65.0) {
            fragColor = vec4(0.0, 0.0, 0.0, 1.0);
            return;
        }
    }

    vec4 center = texture(u_image, v_texCoord);
    vec3 c = center.rgb;

    vec3 tl = texture(u_image, v_texCoord + vec2(-step.x, -step.y)).rgb;
    vec3 tc = texture(u_image, v_texCoord + vec2( 0.0,    -step.y)).rgb;
    vec3 tr = texture(u_image, v_texCoord + vec2( step.x, -step.y)).rgb;
    vec3 ml = texture(u_image, v_texCoord + vec2(-step.x,  0.0   )).rgb;
    vec3 mr = texture(u_image, v_texCoord + vec2( step.x,  0.0   )).rgb;
    vec3 bl = texture(u_image, v_texCoord + vec2(-step.x,  step.y)).rgb;
    vec3 bc = texture(u_image, v_texCoord + vec2( 0.0,     step.y)).rgb;
    vec3 br = texture(u_image, v_texCoord + vec2( step.x,  step.y)).rgb;

    if (u_pseudoRelief == 1) {
        vec3 gradient = -2.0*tl - 1.0*tc - 1.0*ml + 1.0*mr + 1.0*bc + 2.0*br;
        c = clamp(0.5 + gradient * 0.4, 0.0, 1.0);
    }
    else if (u_maxSharpen == 1) {
        vec3 highBoost = 13.0*c - 2.0*(tc + ml + mr + bc) - 1.0*(tl + tr + bl + br);
        c = clamp(highBoost, 0.0, 1.0);
    }
    else if (u_sharpen == 1) {
        vec3 neighbors = (tl + tc + tr + ml + mr + bl + bc + br) * 0.125;
        vec3 detail = c - neighbors;
        float noiseThreshold = 0.02;
        vec3 coredDetail = sign(detail) * max(vec3(0.0), abs(detail) - noiseThreshold);
        c = clamp(c + 1.6 * coredDetail, 0.0, 1.0);
    }

    float contrastVal = u_contrast;
    if (contrastVal >= 50.0 && contrastVal <= 300.0) {
        contrastVal = contrastVal - 100.0;
    }
    float rad = (clamp(contrastVal, -95.0, 200.0) + 100.0) * 0.00785398;
    float contrastFactor = tan(rad);

    float brightVal = u_brightness;
    if (brightVal >= 0.0 && brightVal <= 200.0) {
        brightVal = brightVal - 100.0;
    }
    float brightOffset = brightVal * 0.01;

    c = clamp((c - 0.5) * contrastFactor + 0.5 + brightOffset, 0.0, 1.0);

    if (u_invert == 1) {
        c = vec3(1.0) - c;
    }

    fragColor = vec4(c, center.a);
}
`;
