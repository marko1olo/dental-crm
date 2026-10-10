/**
 * DENTE CRM — WebGL2 Hardware GPU 3D-Texture Engine (FEAT-010 / GPU Overhaul)
 * Shader Compilation & Program Management (Mandate 8b / Layer 1)
 */

import {
	CBCT_MPR_FRAGMENT_SHADER,
	CBCT_MPR_VERTEX_SHADER,
} from "../cbctMprShaders";
import {
	CBCT_CROSS_SECTION_FRAGMENT_SHADER,
	CBCT_CROSS_SECTION_VERTEX_SHADER,
} from "../cbctCrossSectionShaders";
import type { GlUniformLocations } from "./types";

export interface GlCompiledProgram {
	program: WebGLProgram;
	vertexShader: WebGLShader;
	fragmentShader: WebGLShader;
	uniforms: GlUniformLocations;
}

export function compileGlShader(
	gl: WebGL2RenderingContext,
	source: string,
	type: number,
): WebGLShader | null {
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

export function extractUniformLocations(
	gl: WebGL2RenderingContext,
	program: WebGLProgram,
): GlUniformLocations {
	return {
		volume: gl.getUniformLocation(program, "u_volume"),
		volumeDim: gl.getUniformLocation(program, "u_volumeDim"),
		sliceOrigin: gl.getUniformLocation(program, "u_sliceOrigin"),
		axisU: gl.getUniformLocation(program, "u_axisU"),
		axisV: gl.getUniformLocation(program, "u_axisV"),
		axisNorm: gl.getUniformLocation(program, "u_axisNorm"),
		windowWidth: gl.getUniformLocation(program, "u_windowWidth"),
		windowLevel: gl.getUniformLocation(program, "u_windowLevel"),
		invert: gl.getUniformLocation(program, "u_invert"),
		slabMode: gl.getUniformLocation(program, "u_slabMode"),
		slabSteps: gl.getUniformLocation(program, "u_slabSteps"),
		trilinear: gl.getUniformLocation(program, "u_trilinear"),
		interpolationMode: gl.getUniformLocation(program, "u_interpolationMode"),
		colorMap: gl.getUniformLocation(program, "u_colorMap"),
		sharpenAmount: gl.getUniformLocation(program, "u_sharpenAmount"),
		gamma: gl.getUniformLocation(program, "u_gamma"),
		useSoftKnee: gl.getUniformLocation(program, "u_useSoftKnee"),
		softKneeCeiling: gl.getUniformLocation(program, "u_softKneeCeiling"),
		airCutoffHU: gl.getUniformLocation(program, "u_airCutoffHU"),
	};
}

export function createMprShaderProgram(
	gl: WebGL2RenderingContext,
): GlCompiledProgram | null {
	const vertexShader = compileGlShader(gl, CBCT_MPR_VERTEX_SHADER, gl.VERTEX_SHADER);
	const fragmentShader = compileGlShader(gl, CBCT_MPR_FRAGMENT_SHADER, gl.FRAGMENT_SHADER);
	if (!vertexShader || !fragmentShader) {
		if (vertexShader) gl.deleteShader(vertexShader);
		if (fragmentShader) gl.deleteShader(fragmentShader);
		return null;
	}

	const program = gl.createProgram();
	if (!program) {
		gl.deleteShader(vertexShader);
		gl.deleteShader(fragmentShader);
		return null;
	}
	gl.attachShader(program, vertexShader);
	gl.attachShader(program, fragmentShader);
	gl.linkProgram(program);

	if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
		console.error("[CbctVolumeGlContext] Program link failed:", gl.getProgramInfoLog(program));
		gl.deleteShader(vertexShader);
		gl.deleteShader(fragmentShader);
		gl.deleteProgram(program);
		return null;
	}

	const uniforms = extractUniformLocations(gl, program);
	return { program, vertexShader, fragmentShader, uniforms };
}

export function createCrossSectionShaderProgram(
	gl: WebGL2RenderingContext,
): GlCompiledProgram | null {
	const vertexShader = compileGlShader(gl, CBCT_CROSS_SECTION_VERTEX_SHADER, gl.VERTEX_SHADER);
	const fragmentShader = compileGlShader(gl, CBCT_CROSS_SECTION_FRAGMENT_SHADER, gl.FRAGMENT_SHADER);
	if (!vertexShader || !fragmentShader) {
		if (vertexShader) gl.deleteShader(vertexShader);
		if (fragmentShader) gl.deleteShader(fragmentShader);
		return null;
	}

	const program = gl.createProgram();
	if (!program) {
		gl.deleteShader(vertexShader);
		gl.deleteShader(fragmentShader);
		return null;
	}
	gl.attachShader(program, vertexShader);
	gl.attachShader(program, fragmentShader);
	gl.linkProgram(program);

	if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
		console.warn("[CbctVolumeGlContext] Cross-section shader link failed:", gl.getProgramInfoLog(program));
		gl.deleteShader(vertexShader);
		gl.deleteShader(fragmentShader);
		gl.deleteProgram(program);
		return null;
	}

	const uniforms = extractUniformLocations(gl, program);
	return { program, vertexShader, fragmentShader, uniforms };
}

export function disposeGlProgram(
	gl: WebGL2RenderingContext,
	program: WebGLProgram | null,
	vertexShader: WebGLShader | null,
	fragmentShader: WebGLShader | null,
): void {
	if (!program) return;
	if (vertexShader && typeof gl.detachShader === "function") {
		gl.detachShader(program, vertexShader);
	}
	if (vertexShader && typeof gl.deleteShader === "function") {
		gl.deleteShader(vertexShader);
	}
	if (fragmentShader && typeof gl.detachShader === "function") {
		gl.detachShader(program, fragmentShader);
	}
	if (fragmentShader && typeof gl.deleteShader === "function") {
		gl.deleteShader(fragmentShader);
	}
	if (typeof gl.deleteProgram === "function") {
		gl.deleteProgram(program);
	}
}
