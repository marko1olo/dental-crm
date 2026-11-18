/**
 * apps/web/src/components/imaging/dental3d/dental3dCaliperController.ts
 *
 * 3D Micrometer Caliper Controller: Raycasting, point picking,
 * and 0.01 mm distance measurement across dental meshes.
 */

import * as THREE from "three";
import type { CaliperMeasurement } from "./dental3dTypes.js";
import { disposeThreeMesh } from "./dental3dDisposal.js";

export class Dental3dCaliperController {
	private caliperGroup: THREE.Group;
	private caliperA: THREE.Vector3 | null = null;
	private caliperB: THREE.Vector3 | null = null;
	private isCaliperActive = false;
	private onCaliperMeasured?: ((measurement: CaliperMeasurement | null) => void) | undefined;
	private raycaster = new THREE.Raycaster();
	private pointer = new THREE.Vector2();

	constructor(
		caliperGroup: THREE.Group,
		onCaliperMeasured?: (m: CaliperMeasurement | null) => void,
	) {
		this.caliperGroup = caliperGroup;
		this.onCaliperMeasured = onCaliperMeasured;
	}

	public toggle(active?: boolean): boolean {
		this.isCaliperActive = active !== undefined ? active : !this.isCaliperActive;
		if (!this.isCaliperActive) {
			this.clear();
		}
		return this.isCaliperActive;
	}

	public isActive(): boolean {
		return this.isCaliperActive;
	}

	public clear(): void {
		this.caliperA = null;
		this.caliperB = null;
		while (this.caliperGroup.children.length > 0) {
			const child = this.caliperGroup.children[0]!;
			this.caliperGroup.remove(child);
			disposeThreeMesh(child);
		}
		if (this.onCaliperMeasured) {
			this.onCaliperMeasured(null);
		}
	}

	public handlePointerDown(
		e: PointerEvent,
		dom: HTMLElement,
		camera: THREE.Camera,
		targetGroup: THREE.Group,
	): void {
		if (!this.isCaliperActive || e.button !== 0) return;

		const rect = dom.getBoundingClientRect();
		this.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
		this.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

		this.raycaster.setFromCamera(this.pointer, camera);
		const intersects = this.raycaster.intersectObjects(targetGroup.children, true);

		if (intersects.length > 0) {
			const hit = intersects[0]!;
			const hitPoint = hit.point.clone();

			if (!this.caliperA) {
				this.caliperA = hitPoint;
				this.renderPoint(hitPoint, 0x0d9488);
			} else if (!this.caliperB) {
				this.caliperB = hitPoint;
				this.renderPoint(hitPoint, 0xef4444);
				this.renderLine(this.caliperA, this.caliperB);

				const distMm = this.caliperA.distanceTo(this.caliperB);
				if (this.onCaliperMeasured) {
					this.onCaliperMeasured({
						pointA: { x: this.caliperA.x, y: this.caliperA.y, z: this.caliperA.z },
						pointB: { x: this.caliperB.x, y: this.caliperB.y, z: this.caliperB.z },
						distanceMm: Math.round(distMm * 100) / 100, // 0.01 mm precision
					});
				}
			} else {
				this.clear();
				this.caliperA = hitPoint;
				this.renderPoint(hitPoint, 0x0d9488);
			}
		}
	}

	private renderPoint(p: THREE.Vector3, color: number): void {
		const sphere = new THREE.Mesh(
			new THREE.SphereGeometry(0.75, 16, 16),
			new THREE.MeshBasicMaterial({ color, depthTest: false }),
		);
		sphere.position.copy(p);
		sphere.renderOrder = 999;
		this.caliperGroup.add(sphere);
	}

	private renderLine(a: THREE.Vector3, b: THREE.Vector3): void {
		const geom = new THREE.BufferGeometry().setFromPoints([a, b]);
		const line = new THREE.Line(
			geom,
			new THREE.LineBasicMaterial({ color: 0xfacc15, linewidth: 3, depthTest: false }),
		);
		line.renderOrder = 998;
		this.caliperGroup.add(line);
	}
}
