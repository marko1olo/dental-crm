/**
 * DENTE CRM — WebGL2 Hardware GPU 3D-Texture Engine (FEAT-010 / GPU Overhaul)
 * Shader Compilation & Program Management (Mandate 8b / Layer 1 <= 120 lines)
 */

import { CBCT_MPR_FRAGMENT_SHADER, CBCT_MPR_VERTEX_SHADER } from "../cbctMprShaders";
import { CBCT_CROSS_SECTION_FRAGMENT_SHADER, CBCT_CROSS_SECTION_VERTEX_SHADER } from "../cbctCrossSectionShaders";
import type { GlUniformLocations } from "./types";

export interface GlCompiledProgram {
	program: WebGLProgram; vertexShader: WebGLShader; fragmentShader: WebGLShader; uniforms: GlUniformLocations;
}

export function compileGlShader(gl: WebGL2RenderingContext, source: string, type: number): WebGLShader | null {
	const shader = gl.createShader(type);
	if (!shader) return null;
	gl.shaderSource(shader, source);
	gl.compileShader(shader);
	if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
		console.error("[CbctVolumeGlContext] Shader compile failed:", gl.getShaderInfoLog(shader));
		gl.deleteShader(shader);
		return null;
	}
	return shader;
}

export function extractUniformLocations(gl: WebGL2RenderingContext, program: WebGLProgram): GlUniformLocations {
	return {
		volume: gl.getUniformLocation(program, "u_volume"), volumeDim: gl.getUniformLocation(program, "u_volumeDim"),
		sliceOrigin: gl.getUniformLocation(program, "u_sliceOrigin"), axisU: gl.getUniformLocation(program, "u_axisU"),
		axisV: gl.getUniformLocation(program, "u_axisV"), axisNorm: gl.getUniformLocation(program, "u_axisNorm"),
		windowWidth: gl.getUniformLocation(program, "u_windowWidth"), windowLevel: gl.getUniformLocation(program, "u_windowLevel"),
		invert: gl.getUniformLocation(program, "u_invert"), slabMode: gl.getUniformLocation(program, "u_slabMode"),
		slabSteps: gl.getUniformLocation(program, "u_slabSteps"), trilinear: gl.getUniformLocation(program, "u_trilinear"),
		interpolationMode: gl.getUniformLocation(program, "u_interpolationMode"), colorMap: gl.getUniformLocation(program, "u_colorMap"),
		sharpenAmount: gl.getUniformLocation(program, "u_sharpenAmount"), gamma: gl.getUniformLocation(program, "u_gamma"),
		useSoftKnee: gl.getUniformLocation(program, "u_useSoftKnee"), softKneeCeiling: gl.getUniformLocation(program, "u_softKneeCeiling"),
		airCutoffHU: gl.getUniformLocation(program, "u_airCutoffHU"),
	};
}

function buildGlProgram(gl: WebGL2RenderingContext, vsSource: string, fsSource: string, isCrossSection = false): GlCompiledProgram | null {
	const vertexShader = compileGlShader(gl, vsSource, gl.VERTEX_SHADER);
	const fragmentShader = compileGlShader(gl, fsSource, gl.FRAGMENT_SHADER);
	if (!vertexShader || !fragmentShader) {
		if (vertexShader) gl.deleteShader(vertexShader);
		if (fragmentShader) gl.deleteShader(fragmentShader);
		return null;
	}
	const program = gl.createProgram();
	if (!program) {
		gl.deleteShader(vertexShader); gl.deleteShader(fragmentShader); return null;
	}
	gl.attachShader(program, vertexShader); gl.attachShader(program, fragmentShader); gl.linkProgram(program);
	if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
		const log = gl.getProgramInfoLog(program);
		if (isCrossSection) console.warn("[CbctVolumeGlContext] Cross-section link failed:", log);
		else console.error("[CbctVolumeGlContext] Program link failed:", log);
		gl.deleteShader(vertexShader); gl.deleteShader(fragmentShader); gl.deleteProgram(program); return null;
	}
	return { program, vertexShader, fragmentShader, uniforms: extractUniformLocations(gl, program) };
}

export function createMprShaderProgram(gl: WebGL2RenderingContext): GlCompiledProgram | null {
	return buildGlProgram(gl, CBCT_MPR_VERTEX_SHADER, CBCT_MPR_FRAGMENT_SHADER, false);
}

export function createCrossSectionShaderProgram(gl: WebGL2RenderingContext): GlCompiledProgram | null {
	return buildGlProgram(gl, CBCT_CROSS_SECTION_VERTEX_SHADER, CBCT_CROSS_SECTION_FRAGMENT_SHADER, true);
}

export function disposeGlProgram(gl: WebGL2RenderingContext, program: WebGLProgram | null, vs: WebGLShader | null, fs: WebGLShader | null): void {
	if (!program) return;
	if (vs && typeof gl.detachShader === "function") gl.detachShader(program, vs);
	if (vs && typeof gl.deleteShader === "function") gl.deleteShader(vs);
	if (fs && typeof gl.detachShader === "function") gl.detachShader(program, fs);
	if (fs && typeof gl.deleteShader === "function") gl.deleteShader(fs);
	if (typeof gl.deleteProgram === "function") gl.deleteProgram(program);
}
