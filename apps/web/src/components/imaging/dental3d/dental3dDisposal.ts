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

export function disposeThreeMesh(obj: THREE.Object3D): void {
	obj.traverse((child) => {
		if ((child as THREE.Mesh).isMesh) {
			const m = child as THREE.Mesh;
			if (m.geometry && typeof m.geometry.dispose === "function") {
				m.geometry.dispose();
			}
			if (m.material) {
				if (Array.isArray(m.material)) {
					for (const mat of m.material) {
						if (mat && typeof (mat as DisposableResource).dispose === "function") {
							(mat as DisposableResource).dispose?.();
						}
					}
				} else {
					const singleMat = m.material as DisposableResource;
					if (typeof singleMat.dispose === "function") {
						singleMat.dispose();
					}
				}
			}
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
		const r = renderer as unknown as WebGlRendererWithContextLoss;
		if (typeof r.dispose === "function") {
			r.dispose();
		}
		if (typeof r.forceContextLoss === "function") {
			try {
				r.forceContextLoss();
			} catch {
				// Non-fatal
			}
		}
		if (renderer.domElement && renderer.domElement.parentNode) {
			renderer.domElement.parentNode.removeChild(renderer.domElement);
		}
	}
}
