import {
	disposeGlBuffersAndArrays,
	disposeVolumeTextures,
} from "./glTextureManager";
import { disposeGlProgram } from "./glShaderPrograms";

export class GlResourceTracker {
	public readonly trackedBuffers = new Set<WebGLBuffer>();
	public readonly trackedFramebuffers = new Set<WebGLFramebuffer>();
	public readonly trackedRenderbuffers = new Set<WebGLRenderbuffer>();
	public readonly trackedTextures = new Set<WebGLTexture>();

	public trackBuffer(buffer: WebGLBuffer): WebGLBuffer {
		this.trackedBuffers.add(buffer);
		return buffer;
	}

	public trackFramebuffer(framebuffer: WebGLFramebuffer): WebGLFramebuffer {
		this.trackedFramebuffers.add(framebuffer);
		return framebuffer;
	}

	public trackRenderbuffer(renderbuffer: WebGLRenderbuffer): WebGLRenderbuffer {
		this.trackedRenderbuffers.add(renderbuffer);
		return renderbuffer;
	}

	public trackTexture(texture: WebGLTexture): WebGLTexture {
		this.trackedTextures.add(texture);
		return texture;
	}

	public disposeAll(
		gl: WebGL2RenderingContext | null,
		vao: WebGLVertexArrayObject | null,
		volumeTexture: WebGLTexture | null,
		program: WebGLProgram | null,
		vs: WebGLShader | null,
		fs: WebGLShader | null,
		csProgram: WebGLProgram | null,
		csVs: WebGLShader | null,
		csFs: WebGLShader | null,
		options?: { texturesOnly?: boolean },
	): void {
		if (!gl) return;
		disposeVolumeTextures(gl, this.trackedTextures, volumeTexture);
		if (options?.texturesOnly) return;

		disposeGlBuffersAndArrays(gl, this.trackedBuffers, this.trackedFramebuffers, this.trackedRenderbuffers, vao);
		if (program) disposeGlProgram(gl, program, vs, fs);
		if (csProgram) disposeGlProgram(gl, csProgram, csVs, csFs);
	}
}
