import type { CbctVoxelVolume } from "../../cbctMprMath";
import type { Implant3DWorldProjection } from "../../implantSafetyEngine";
import type { Volume3DImplantParam } from "./types";

export function convertImplantWorldToVolume3DParam(
	implant: Implant3DWorldProjection,
	volume: CbctVoxelVolume,
	colorRgb: [number, number, number] = [0.0, 1.0, 0.45],
): Volume3DImplantParam {
	const origin = volume.originMm ?? { x: 0, y: 0, z: 0 };
	const sp = volume.spacingMm;
	const spX = sp?.x && sp.x > 0 ? sp.x : 0.25;
	const spY = sp?.y && sp.y > 0 ? sp.y : 0.25;
	const spZ = sp?.z && sp.z > 0 ? sp.z : 0.25;

	const entryVx = (implant.entry3D.x - origin.x) / spX;
	const entryVy = (implant.entry3D.y - origin.y) / spY;
	const entryVz = (implant.entry3D.z - origin.z) / spZ;
	const apexVx = (implant.apex3D.x - origin.x) / spX;
	const apexVy = (implant.apex3D.y - origin.y) / spY;
	const apexVz = (implant.apex3D.z - origin.z) / spZ;

	const rPlatVx = Math.max(1.5, (implant.platformDiameterMm / 2.0) / spX);
	const rApexVx = Math.max(1.0, (implant.apexDiameterMm / 2.0) / spX);

	return {
		entryVoxel: [entryVx, entryVy, entryVz],
		apexVoxel: [apexVx, apexVy, apexVz],
		platformRadiusVoxel: rPlatVx,
		apexRadiusVoxel: rApexVx,
		colorRgb,
	};
}

export function generate4JawImplants(
	volume: CbctVoxelVolume,
	primaryImplant?: Implant3DWorldProjection | null,
): Implant3DWorldProjection[] {
	const hasValidMandiblePose =
		primaryImplant?.entry3D &&
		primaryImplant.targetToothFdi === 46 &&
		primaryImplant.entry3D.x >= 16.0 &&
		primaryImplant.entry3D.x <= 25.0 &&
		primaryImplant.entry3D.y <= -22.0 &&
		primaryImplant.entry3D.y >= -32.0 &&
		primaryImplant.entry3D.z <= 0.0 &&
		primaryImplant.entry3D.z >= -6.0;

	const baseEntry = hasValidMandiblePose ? primaryImplant.entry3D : { x: 20.6, y: -27.1, z: -2.0 };
	const baseApex = hasValidMandiblePose ? primaryImplant.apex3D : { x: 20.6, y: -27.1, z: -12.0 };
	const platDiam = hasValidMandiblePose ? (primaryImplant?.platformDiameterMm ?? 4.0) : 4.0;
	const apexDiam = hasValidMandiblePose ? (primaryImplant?.apexDiameterMm ?? 2.8) : 2.8;
	const len = hasValidMandiblePose ? (primaryImplant?.lengthMm ?? 10.0) : 10.0;

	const imp1: Implant3DWorldProjection = {
		entry3D: baseEntry, apex3D: baseApex, axisUnit3D: { x: 0, y: 0, z: -1 },
		lengthMm: len, diameterMm: platDiam, platformDiameterMm: platDiam,
		apexDiameterMm: apexDiam, angulationDeg: 0, targetToothFdi: 46, normal2D: { x: 0, y: 1 },
	};

	const imp2: Implant3DWorldProjection = {
		entry3D: { x: 24.0, y: -20.0, z: -1.5 }, apex3D: { x: 24.0, y: -20.0, z: -11.5 },
		axisUnit3D: imp1.axisUnit3D, lengthMm: 10.0, diameterMm: 4.5, platformDiameterMm: 4.5,
		apexDiameterMm: 3.0, angulationDeg: 0, targetToothFdi: 47, normal2D: imp1.normal2D,
	};

	const imp3: Implant3DWorldProjection = {
		entry3D: { x: -20.8, y: -21.8, z: -2.0 }, apex3D: { x: -20.8, y: -21.8, z: -12.0 },
		axisUnit3D: imp1.axisUnit3D, lengthMm: len, diameterMm: platDiam, platformDiameterMm: platDiam,
		apexDiameterMm: apexDiam, angulationDeg: 0, targetToothFdi: 36, normal2D: { x: 0, y: 1 },
	};

	const imp4: Implant3DWorldProjection = {
		entry3D: { x: -24.5, y: -15.5, z: -1.5 }, apex3D: { x: -24.5, y: -15.5, z: -11.5 },
		axisUnit3D: imp1.axisUnit3D, lengthMm: 10.0, diameterMm: 4.5, platformDiameterMm: 4.5,
		apexDiameterMm: 3.0, angulationDeg: 0, targetToothFdi: 37, normal2D: { x: 0, y: 1 },
	};

	return [imp1, imp2, imp3, imp4];
}
