/**
 * apps/web/src/components/imaging/dental3d/dental3dKinematics.ts
 *
 * TMJ Biomechanical Hinge Axis & Mandibular Occlusion Kinematics.
 */

import * as THREE from "three";

export class Dental3dKinematics {
	private occlusionMatrixArray: number[] | undefined;
	private isBiteClosed = true;

	public setOcclusionMatrix(matrixArray: number[] | undefined): void {
		this.occlusionMatrixArray = matrixArray;
	}

	public getOcclusionMatrix(): number[] | undefined {
		return this.occlusionMatrixArray;
	}

	public setBiteClosed(closed: boolean): void {
		this.isBiteClosed = closed;
	}

	public isClosed(): boolean {
		return this.isBiteClosed;
	}

	public toggleBite(): boolean {
		this.isBiteClosed = !this.isBiteClosed;
		return this.isBiteClosed;
	}

	/**
	 * Applies TMJ hinge opening rotation and occlusion matrix to the lower jaw mesh.
	 * In closed state: uses registration matrix (or aligned default).
	 * In open state: rotates mandible along condylar hinge axis (TMJ ~ 45mm posterior, 25mm superior)
	 * by ~15 degrees downwards and translates downwards ~15-18mm.
	 */
	public applyKinematics(lowerMesh: THREE.Mesh | null): void {
		if (!lowerMesh) return;

		lowerMesh.position.set(0, 0, 0);
		lowerMesh.rotation.set(0, 0, 0);
		lowerMesh.updateMatrix();

		if (this.isBiteClosed) {
			if (this.occlusionMatrixArray && this.occlusionMatrixArray.length === 16) {
				const mat = new THREE.Matrix4().fromArray(this.occlusionMatrixArray);
				lowerMesh.applyMatrix4(mat);
			}
		} else {
			// TMJ Hinge Arc Rotation:
			// Axis passing through bilateral condyles (~45mm behind origin, 20mm above)
			const hingePoint = new THREE.Vector3(0, 20, -45);
			lowerMesh.position.sub(hingePoint);
			lowerMesh.rotateX(0.22); // ~12.6 degrees opening rotation
			lowerMesh.position.add(hingePoint);
			lowerMesh.position.y -= 12; // Slight translatory condylar protrusion
		}

		lowerMesh.updateMatrixWorld(true);
	}
}
