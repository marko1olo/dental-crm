/**
 * @dental/shared/hardware - Layer 0: Domain Types & Interfaces for Universal Dental Hardware Bridge.
 *
 * Compliance: THE HAMMER, Mandates 2 (Zero Mocks), 8e (Doctor Autonomy), 8s (Anti-bloat), 8n (Solo Doctor Sovereignty).
 */

export type DentalHardwareFamily =
	| "rvg"
	| "cbct_opg"
	| "scanner_3d"
	| "document_scanner"
	| "photo_protocol";

export type DentalHardwareVendor =
	// Family A: RVG
	| "vatech"
	| "sirona"
	| "planmeca"
	| "carestream"
	| "kavo"
	| "woodpecker"
	| "eighteeth"
	| "owandy"
	| "xpect_vision"
	| "handy"
	| "trident"
	// Family B: CBCT 3D / OPG
	| "newtom"
	| "morita"
	| "pointnix"
	| "genoray"
	// Family C: 3D Intraoral Scanners
	| "medit"
	| "threeshape"
	| "shining3d"
	| "panda"
	| "alliedstar"
	| "runyes"
	// Family D: MFPs & Document Scanners
	| "kyocera"
	| "hp"
	| "canon_scanner"
	| "xerox"
	| "brother"
	| "pantum"
	| "fujitsu_avision"
	// Family E: Photo Protocol
	| "canon_photo"
	| "nikon_photo"
	| "sony_photo"
	| "generic";

export interface DentalHardwarePreset {
	readonly id: string;
	readonly vendor: DentalHardwareVendor;
	readonly family: DentalHardwareFamily;
	readonly name: string;
	readonly description: string;
	readonly defaultPaths: readonly string[];
	readonly protocol: "watch_folder" | "slida" | "vdds" | "cli_bridge" | "twain";
	readonly filePatterns: readonly string[];
	readonly exchangeFileName?: string | undefined;
	readonly defaultModality: "IO" | "DX" | "PX" | "CT" | "CR" | "3D_SCAN" | "DOC" | "PHOTO";
	readonly cliTemplate?: string | undefined;
}

export type PhotoProtocolSlotId =
	| "extraoral_portrait_rest"
	| "extraoral_portrait_smile"
	| "extraoral_profile_right"
	| "extraoral_profile_45"
	| "intraoral_anterior_occlusion"
	| "intraoral_anterior_open"
	| "intraoral_buccal_right"
	| "intraoral_buccal_left"
	| "intraoral_occlusal_maxillary"
	| "intraoral_occlusal_mandibular"
	| "intraoral_anterior_overjet"
	| "intraoral_smile_aesthetic";

export interface PhotoProtocolSlot {
	readonly index: number; // 1..12
	readonly id: PhotoProtocolSlotId;
	readonly titleRu: string;
	readonly descriptionRu: string;
	readonly category: "extraoral" | "intraoral";
	readonly matchPatterns: readonly string[];
}

export interface SlidaPatientDescriptor {
	readonly patientId: string;
	readonly lastName: string;
	readonly firstName: string;
	readonly middleName?: string | undefined;
	readonly birthDate?: string | undefined; // YYYYMMDD or YYYY-MM-DD
	readonly gender?: "M" | "F" | "U" | undefined;
	readonly toothCode?: string | undefined; // FDI notation (11..48, 51..85)
	readonly command?: "OpenPatient" | "NewImage" | "ShowImages" | "AcquireImage" | undefined;
	readonly modality?: "IO" | "DX" | "PX" | "CT" | "CR" | "3D_SCAN" | "DOC" | "PHOTO" | undefined;
}

export interface SlidaResponse {
	readonly success: boolean;
	readonly status: string;
	readonly patientId?: string | undefined;
	readonly toothCode?: string | undefined;
	readonly modality?: "IO" | "DX" | "PX" | "CT" | "CR" | "3D_SCAN" | "DOC" | "PHOTO" | undefined;
	readonly imagePaths: readonly string[];
	readonly error?: string | undefined;
}

export interface VddsMediaDescriptor extends SlidaPatientDescriptor {
	readonly version?: "5.0" | "6.0" | undefined;
	readonly returnFilePath?: string | undefined;
	readonly action?: "ACQUIRE" | "SHOW" | "OPEN" | undefined;
}

export interface VddsMediaResponse {
	readonly success: boolean;
	readonly status: string;
	readonly patientId?: string | undefined;
	readonly toothCode?: string | undefined;
	readonly modality?: string | undefined;
	readonly imagePaths: readonly string[];
	readonly error?: string | undefined;
}

export interface CommandLineBridgeOptions {
	readonly exePath?: string | undefined;
	readonly outputDir?: string | undefined;
	readonly extraArgs?: readonly string[] | undefined;
}

export interface HotFolderFileMetadata {
	readonly fileName: string;
	readonly fullPath?: string | undefined;
	readonly toothCode?: string | undefined;
	readonly patientId?: string | undefined;
	readonly vendor: DentalHardwareVendor;
	readonly modality: "IO" | "DX" | "PX" | "CT" | "CR" | "3D_SCAN" | "DOC" | "PHOTO";
	readonly fileCategory: "dicom" | "mesh" | "document" | "photo" | "standard_image";
	readonly photoProtocolSlot?: PhotoProtocolSlot | undefined;
}

export interface TwainDeviceCatalogEntry {
	readonly id: string;
	readonly name: string;
	readonly vendor: DentalHardwareVendor;
	readonly family: DentalHardwareFamily;
	readonly type: "sensor" | "scanner" | "camera" | "document_scanner";
	readonly connected: boolean;
	readonly supportedModalities: readonly string[];
}
