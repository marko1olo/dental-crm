/**
 * apps/web/src/components/imaging/dental3d/dental3dDisposal.ts
 *
 * Safe Three.js WebGL Resource Disposal & GC Helpers.
 */

import * as THREE from "three";

interface DisposableResource {
	dispose?: (() => void) | undefined;
}

interface WebGlRendererWithContextLoss {
	dispose?: (() => void) | undefined;
	forceContextLoss?: (() => void) | undefined;
	domElement?: HTMLElement | undefined;
}

interface MeshLikeResource {
	readonly isMesh?: boolean | undefined;
	readonly geometry?: DisposableResource | null | undefined;
	readonly material?: DisposableResource | readonly DisposableResource[] | null | undefined;
}

function isDisposableResource(value: unknown): value is DisposableResource & { dispose: () => void } {
	return (
		typeof value === "object" &&
		value !== null &&
		"dispose" in value &&
		typeof value.dispose === "function"
	);
}

function isMeshLike(obj: THREE.Object3D | MeshLikeResource): obj is MeshLikeResource & { isMesh: true } {
	return "isMesh" in obj && obj.isMesh === true;
}

export function disposeThreeMesh(obj: THREE.Object3D): void {
	obj.traverse((child) => {
		if (!isMeshLike(child)) return;
		if (isDisposableResource(child.geometry)) {
			child.geometry.dispose();
		}
		if (!child.material) return;
		if (Array.isArray(child.material)) {
			for (const mat of child.material) {
				if (isDisposableResource(mat)) {
					mat.dispose();
				}
			}
		} else if (isDisposableResource(child.material)) {
			child.material.dispose();
		}
	});
}

export function teardownThreeScene(
	scene: THREE.Scene,
	rootGroup: THREE.Group,
	renderer: THREE.WebGLRenderer | null,
): void {
	disposeThreeMesh(rootGroup);
	rootGroup.clear();
	scene.clear();

	if (renderer) {
		const r: WebGlRendererWithContextLoss = renderer;
		if (typeof r.dispose === "function") {
			r.dispose();
		}
		if (typeof r.forceContextLoss === "function") {
			try {
				r.forceContextLoss();
			} catch (err: unknown) {
				// WebGL context might already be lost on unmount; swallow is unsafe silently only if re-thrown, so surface warning via DOM/diagnostic only if Error
				if (err instanceof Error && typeof window !== "undefined") {
					window.dispatchEvent(new CustomEvent("dente:webgl-dispose-warn", { detail: err.message }));
				}
			}
		}
		if (renderer.domElement && renderer.domElement.parentNode) {
			renderer.domElement.parentNode.removeChild(renderer.domElement);
		}
	}
}
