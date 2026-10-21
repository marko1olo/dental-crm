/**
 * Statutory Russian Dental Lab Order Presets & Materials
 * Standards for Dental Prosthetics, VITA Shades, Stump Shades (ND1-ND9), Materials, and Lab Workflows.
 */

export {
	type ProstheticTypeId,
	type ProstheticCategory,
	type ProstheticTypeDefinition,
	PROSTHETIC_TYPES,
} from './prostheticTypesCatalog';

export {
	type DentalLabMaterial,
	LAB_MATERIALS,
} from './labMaterialsCatalog';

export {
	type ColorShadeOption,
	VITA_CLASSICAL_SHADES,
	VITA_BLEACH_SHADES,
	VITA_3D_MASTER_SHADES,
	STUMP_SHADES_ND,
	type SurfaceTextureOption,
	SURFACE_TEXTURES,
	type TranslucencyLevelOption,
	TRANSLUCENCY_LEVELS,
} from './orderShadesAndTextures';

export {
	type ImplantPlatformType,
	type ImplantPlatformOption,
	IMPLANT_PLATFORMS,
	type AbutmentCategoryType,
	type AbutmentTypeOption,
	ABUTMENT_TYPE_OPTIONS,
	type FixationType,
	type FixationTypeOption,
	FIXATION_TYPES,
	type LabImplantComponentsManifest,
	formatImplantComponentsSummary,
} from './implantComponentsPresets';

export * from './labWorkOrderStages';
