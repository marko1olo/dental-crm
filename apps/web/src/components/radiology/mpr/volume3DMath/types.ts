export interface Volume3DClippingBox {
	clipMin: [number, number, number];
	clipMax: [number, number, number];
}

export const DEFAULT_VOLUME_3D_CLIPPING_BOX: Volume3DClippingBox = {
	clipMin: [0.0, 0.0, 0.0],
	clipMax: [1.0, 1.0, 1.0],
};

export type Volume3DPresetId =
	| "skull"
	| "dense_bone"
	| "hard_bone"
	| "soft_tissue"
	| "mip"
	| "transparent_skull"
	| "vessels"
	| "airway"
	| "cortical_bone"
	| "cancellous_bone"
	| "enamel_metal"
	| "ez3d_bone"
	| "ez3d_soft_tissue";

export interface Volume3DPresetSpec {
	id: Volume3DPresetId;
	label: string;
	shortLabel: string;
	description: string;
	huMin: number;
	huMax: number;
	colorRgb: [number, number, number];
}

export interface Volume3DImplantParam {
	readonly entryVoxel: [number, number, number];
	readonly apexVoxel: [number, number, number];
	readonly platformRadiusVoxel: number;
	readonly apexRadiusVoxel: number;
	readonly colorRgb: [number, number, number];
}
