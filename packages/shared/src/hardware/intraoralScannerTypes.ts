/**
 * @dental/shared/hardware - Universal Intraoral Scanner Types & Contracts.
 *
 * Clinical & Mathematical SSOT for all intraoral dental scanners (3Shape TRIOS, Medit,
 * iTero, Sirona, Shining 3D, Panda, Runyes, Carestream, Eighteeth, Generic).
 *
 * Invariants: Zero Any, Strict Zod Schemas, 100% Immutable Typed Data.
 */

import { z } from "zod";

// ============================================================================
// 1. HARDWARE VENDORS & FILE ROLES
// ============================================================================

export const INTRAORAL_SCANNER_VENDORS = [
	"3shape",
	"medit",
	"itero",
	"sirona",
	"shining3d",
	"panda",
	"runyes",
	"carestream",
	"eighteeth",
	"generic",
] as const;

export const intraoralScannerVendorSchema = z.enum(INTRAORAL_SCANNER_VENDORS);
export type IntraoralScannerVendor = z.infer<typeof intraoralScannerVendorSchema>;

export const INTRAORAL_SCAN_FILE_ROLES = [
	"upper_jaw",
	"lower_jaw",
	"buccal_bite_1",
	"buccal_bite_2",
	"preparation_die",
	"pre_op_jaw",
	"scanbody",
	"face_scan",
	"order_metadata",
	"screenshot_preview",
] as const;

export const intraoralScanFileRoleSchema = z.enum(INTRAORAL_SCAN_FILE_ROLES);
export type IntraoralScanFileRole = z.infer<typeof intraoralScanFileRoleSchema>;

// ============================================================================
// 2. 3D GEOMETRY PRIMITIVES (VECTORS & 4x4 AFFINE MATRICES)
// ============================================================================

export const vector3Schema = z.tuple([z.number(), z.number(), z.number()]).readonly();
export type Vector3 = z.infer<typeof vector3Schema>;

export const matrix4x4Schema = z.tuple([
	z.number(), z.number(), z.number(), z.number(),
	z.number(), z.number(), z.number(), z.number(),
	z.number(), z.number(), z.number(), z.number(),
	z.number(), z.number(), z.number(), z.number(),
]).readonly();
export type Matrix4x4 = z.infer<typeof matrix4x4Schema>;

// ============================================================================
// 3. MESH LEVEL OF DETAIL (LOD) & FILE DESCRIPTORS
// ============================================================================

export const jawMeshLodsSchema = z.object({
	lod0MasterUrl: z.string().optional(),
	lod1PreviewUrl: z.string().optional(),
	lod2ThumbnailUrl: z.string().optional(),
});
export type JawMeshLods = z.infer<typeof jawMeshLodsSchema>;

export const preparationMeshLodSchema = jawMeshLodsSchema.extend({
	toothFdi: z.number().int().min(11).max(85),
});
export type PreparationMeshLod = z.infer<typeof preparationMeshLodSchema>;

export const scanbodyMeshLodSchema = jawMeshLodsSchema.extend({
	toothFdi: z.number().int().min(11).max(85),
});
export type ScanbodyMeshLod = z.infer<typeof scanbodyMeshLodSchema>;

export const scannedFileInfoSchema = z.object({
	fileName: z.string().min(1),
	role: intraoralScanFileRoleSchema,
	fileExtension: z.string().min(1),
	fileSizeBytes: z.number().nonnegative().optional(),
	mimeType: z.string().optional(),
	url: z.string().optional(),
	confidence: z.number().min(0).max(1).default(1),
	vendorHint: intraoralScannerVendorSchema.optional(),
	toothFdi: z.number().int().min(11).max(85).optional(),
	jaw: z.enum(["upper", "lower", "both"]).optional(),
});
export type ScannedFileInfo = z.infer<typeof scannedFileInfoSchema>;

// ============================================================================
// 4. OCCLUSAL CLEARANCE MAP CONTRACTS (MICRON-LEVEL CONTACTS)
// ============================================================================

/**
 * Clinical Occlusal Contact Thresholds (in Microns):
 * - hard_contact: < 50 um (Heavy premature contact or collision)
 * - physiological_contact: 50 - 150 um (Ideal physiological contact stop)
 * - clearance_gap: 150 - 350 um (Target gap for crown / inlay restoration)
 * - disocclusion: > 350 um (Free open space, no contact)
 */
export const OCCLUSION_THRESHOLDS_MICRONS = {
	HARD_CONTACT_MAX: 50,
	PHYSIOLOGICAL_MAX: 150,
	CLEARANCE_GAP_MAX: 350,
} as const;

export const occlusionContactCategorySchema = z.enum([
	"hard_contact",
	"physiological_contact",
	"clearance_gap",
	"disocclusion",
]);
export type OcclusionContactCategory = z.infer<typeof occlusionContactCategorySchema>;

export const occlusionContactPointSchema = z.object({
	point: vector3Schema,
	distanceMicrons: z.number().nonnegative(),
	category: occlusionContactCategorySchema,
	opposingPoint: vector3Schema.optional(),
	normal: vector3Schema.optional(),
});
export type OcclusionContactPoint = z.infer<typeof occlusionContactPointSchema>;

export const occlusionClearanceMapSchema = z.object({
	minDistanceMicrons: z.number().nonnegative(),
	maxDistanceMicrons: z.number().nonnegative(),
	meanDistanceMicrons: z.number().nonnegative(),
	medianDistanceMicrons: z.number().nonnegative(),
	contactPointCount: z.number().int().nonnegative(),
	hardContactCount: z.number().int().nonnegative(),
	physiologicalContactCount: z.number().int().nonnegative(),
	clearanceGapCount: z.number().int().nonnegative(),
	disocclusionCount: z.number().int().nonnegative(),
	points: z.array(occlusionContactPointSchema),
});
export type OcclusionClearanceMap = z.infer<typeof occlusionClearanceMapSchema>;

// ============================================================================
// 5. UNDERCUT ANALYSIS CONTRACTS (PATH OF INSERTION & REVERSE TAPER)
// ============================================================================

export const undercutZoneSchema = z.object({
	center: vector3Schema,
	depthMm: z.number().nonnegative(),
	areaMm2: z.number().nonnegative(),
	angleDegrees: z.number().nonnegative(),
	vertexIndices: z.array(z.number().int().nonnegative()),
});
export type UndercutZone = z.infer<typeof undercutZoneSchema>;

export const undercutAnalysisResultSchema = z.object({
	insertionPathVector: vector3Schema,
	hasUndercut: z.boolean(),
	maxUndercutDepthMm: z.number().nonnegative(),
	totalUndercutAreaMm2: z.number().nonnegative(),
	undercutZones: z.array(undercutZoneSchema),
});
export type UndercutAnalysisResult = z.infer<typeof undercutAnalysisResultSchema>;

// ============================================================================
// 6. MASTER INTRAORAL SCAN SESSION CONTRACT
// ============================================================================

export const intraoralScanSessionSchema = z.object({
	id: z.string().min(1),
	patientId: z.string().min(1),
	visitId: z.string().optional(),
	vendor: intraoralScannerVendorSchema,
	scannerModel: z.string().optional(),
	sessionDate: z.string(),
	occlusionMatrix: matrix4x4Schema,
	isOcclusionPreAligned: z.boolean(),
	preparationTeethFdi: z.array(z.number().int().min(11).max(85)).default([]),
	implantTeethFdi: z.array(z.number().int().min(11).max(85)).default([]),
	materialsPlanned: z.record(z.coerce.number(), z.string()).default({}),
	vitaShade: z.string().optional(),
	upperJawLods: jawMeshLodsSchema.optional(),
	lowerJawLods: jawMeshLodsSchema.optional(),
	buccalBiteLods: z.array(jawMeshLodsSchema).optional(),
	preparationLods: z.array(preparationMeshLodSchema).optional(),
	scanbodyLods: z.array(scanbodyMeshLodSchema).optional(),
	preOpJawLods: jawMeshLodsSchema.optional(),
	files: z.array(scannedFileInfoSchema),
	metadata: z.record(z.string(), z.unknown()).optional(),
});
export type IntraoralScanSession = z.infer<typeof intraoralScanSessionSchema>;
