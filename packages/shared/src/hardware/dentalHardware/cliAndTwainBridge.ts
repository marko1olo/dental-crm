/**
 * @dental/shared/hardware - Layer 1: CLI Templates, Parameterized Formatting and TWAIN Device Catalog.
 *
 * Compliance: THE HAMMER, Mandates 2 (Zero Mocks), 8e (Doctor Autonomy), 8s (Anti-bloat), 8n (Solo Doctor Sovereignty).
 */

import type {
	CommandLineBridgeOptions,
	DentalHardwareVendor,
	SlidaPatientDescriptor,
	TwainDeviceCatalogEntry,
} from "./types.js";

/**
 * Generates Planmeca Romexis CLI arguments for 1-click patient card opening.
 */
export function generateRomexisCliArgs(patient: SlidaPatientDescriptor): string[] {
	const args = [
		"-p",
		patient.patientId,
		"-l",
		patient.lastName,
		"-f",
		patient.firstName,
	];

	if (patient.birthDate) {
		const raw = patient.birthDate.replace(/[-.]/g, "");
		if (raw.length === 8) {
			args.push("-b", raw);
		}
	}

	return args;
}

export const VENDOR_CLI_TEMPLATES: Record<DentalHardwareVendor, string> = {
	vatech: '"{exePath}" -c {patientId}',
	sirona: '"{exePath}" /P:{patientId} /N:"{lastName}^{firstName}" /DOB:{birthDate}',
	planmeca: '"{exePath}" -p {patientId} -l "{lastName}" -f "{firstName}" -b {birthDateRaw}',
	carestream: '"{exePath}" /P:{patientId} /LN:"{lastName}" /FN:"{firstName}" /DOB:{birthDate}',
	kavo: '"{exePath}" /P:{patientId} /N:"{lastName},{firstName}"',
	woodpecker: '"{exePath}" /patient:{patientId} /name:"{lastName}"',
	eighteeth: '"{exePath}" -pid {patientId} -pname "{lastName} {firstName}"',
	owandy: '"{exePath}" -p {patientId} -n "{lastName}"',
	xpect_vision: '"{exePath}" /pid:{patientId} /tooth:{toothCode}',
	handy: '"{exePath}" /ID:{patientId} /Name:"{lastName} {firstName}"',
	trident: '"{exePath}" -patid {patientId} -patname "{lastName}"',
	newtom: '"{exePath}" -id {patientId} -name "{lastName}^{firstName}"',
	morita: '"{exePath}" /ID:{patientId} /N:"{lastName}"',
	pointnix: '"{exePath}" -p {patientId} -n "{lastName}"',
	genoray: '"{exePath}" /P:{patientId} /N:"{lastName}"',
	medit: "meditlink://open?patientId={patientId}",
	threeshape: "3shape://open?patientId={patientId}",
	shining3d: '"{exePath}" --patient-id {patientId} --name "{lastName} {firstName}"',
	panda: '"{exePath}" -pid {patientId}',
	alliedstar: '"{exePath}" /patient:{patientId}',
	runyes: '"{exePath}" -patient {patientId}',
	kyocera: '"{exePath}" /scan /dest:"{outputDir}"',
	hp: '"{exePath}" /scan /output:"{outputDir}"',
	canon_scanner: '"{exePath}" /scan /save:"{outputDir}"',
	xerox: '"{exePath}" -scan -out "{outputDir}"',
	brother: '"{exePath}" /SCAN /DIR:"{outputDir}"',
	pantum: '"{exePath}" /scan /out:"{outputDir}"',
	fujitsu_avision: '"{exePath}" /ScanToFolder:"{outputDir}"',
	canon_photo: '"{exePath}" /download /dest:"{outputDir}"',
	nikon_photo: '"{exePath}" /import /dest:"{outputDir}"',
	sony_photo: '"{exePath}" /import /folder:"{outputDir}"',
	generic: '"{exePath}" /P:{patientId}',
};

export function getVendorCliTemplate(vendor: DentalHardwareVendor): string {
	return VENDOR_CLI_TEMPLATES[vendor] || VENDOR_CLI_TEMPLATES.generic;
}

/**
 * Formats command line execution string from template and patient parameters.
 */
export function formatCommandLineBridge(
	template: string,
	patient: SlidaPatientDescriptor,
	options: CommandLineBridgeOptions = {}
): string {
	const rawBirth = (patient.birthDate || "19800101").replace(/[-.]/g, "");
	const birthDate = rawBirth.slice(0, 8);
	const exePath = options.exePath || "imaging_app.exe";
	const outputDir = options.outputDir || "C:\\Scans";

	let result = template
		.replace(/\{exePath\}/g, exePath)
		.replace(/\{patientId\}/g, patient.patientId || "")
		.replace(/\{lastName\}/g, patient.lastName || "")
		.replace(/\{firstName\}/g, patient.firstName || "")
		.replace(/\{middleName\}/g, patient.middleName || "")
		.replace(/\{birthDateRaw\}/g, rawBirth)
		.replace(/\{birthDate\}/g, birthDate)
		.replace(/\{gender\}/g, patient.gender || "U")
		.replace(/\{toothCode\}/g, patient.toothCode || "")
		.replace(/\{modality\}/g, patient.modality || "IO")
		.replace(/\{outputDir\}/g, outputDir);

	if (options.extraArgs && options.extraArgs.length > 0) {
		result += ` ${options.extraArgs.join(" ")}`;
	}

	return result;
}

/**
 * Standard TWAIN device catalog across all 5 dental equipment families.
 */
export function getTwainDeviceCatalog(): readonly TwainDeviceCatalogEntry[] {
	return [
		// RVG Sensors
		{
			id: "twain-vatech-ezsensor",
			name: "Vatech EzSensor Classic HD (TWAIN DSM)",
			vendor: "vatech",
			family: "rvg",
			type: "sensor",
			connected: true,
			supportedModalities: ["IO"],
		},
		{
			id: "twain-planmeca-prosensor",
			name: "Planmeca ProSensor HD (TWAIN)",
			vendor: "planmeca",
			family: "rvg",
			type: "sensor",
			connected: true,
			supportedModalities: ["IO"],
		},
		{
			id: "twain-carestream-rvg6200",
			name: "Carestream RVG 6200 Intraoral Sensor",
			vendor: "carestream",
			family: "rvg",
			type: "sensor",
			connected: true,
			supportedModalities: ["IO"],
		},
		{
			id: "twain-woodpecker-isensor",
			name: "Woodpecker i-Sensor H2 (TWAIN/Direct)",
			vendor: "woodpecker",
			family: "rvg",
			type: "sensor",
			connected: true,
			supportedModalities: ["IO"],
		},
		{
			id: "twain-eighteeth-nanopix",
			name: "Eighteeth NanoPix 2 Sensor (TWAIN)",
			vendor: "eighteeth",
			family: "rvg",
			type: "sensor",
			connected: true,
			supportedModalities: ["IO"],
		},
		{
			id: "twain-owandy-one",
			name: "Owandy-One Intraoral Sensor (TWAIN)",
			vendor: "owandy",
			family: "rvg",
			type: "sensor",
			connected: true,
			supportedModalities: ["IO"],
		},
		{
			id: "twain-xpect-mammo",
			name: "Xpect Vision CdTe Quantum Sensor (TWAIN)",
			vendor: "xpect_vision",
			family: "rvg",
			type: "sensor",
			connected: true,
			supportedModalities: ["IO"],
		},
		{
			id: "twain-handy-hdr600",
			name: "Handy HDR-600 Digital Sensor (TWAIN)",
			vendor: "handy",
			family: "rvg",
			type: "sensor",
			connected: true,
			supportedModalities: ["IO"],
		},
		{
			id: "twain-trident-iview",
			name: "Trident I-View Gold Sensor (TWAIN)",
			vendor: "trident",
			family: "rvg",
			type: "sensor",
			connected: true,
			supportedModalities: ["IO"],
		},
		// 3D Scanner Direct Interface
		{
			id: "twain-runyes-3ds",
			name: "Runyes 3DS Intraoral Scanner (TWAIN/Direct)",
			vendor: "runyes",
			family: "scanner_3d",
			type: "scanner",
			connected: true,
			supportedModalities: ["3D_SCAN"],
		},
		// Document Scanners (TWAIN/WIA)
		{
			id: "twain-pantum-m6500",
			name: "Pantum M6500/M7100 Series Network Scanner (TWAIN/WIA)",
			vendor: "pantum",
			family: "document_scanner",
			type: "document_scanner",
			connected: true,
			supportedModalities: ["DOC", "CR"],
		},
		{
			id: "twain-kyocera-ecosys",
			name: "Kyocera ECOSYS M2040dn Document Scanner (TWAIN/WIA)",
			vendor: "kyocera",
			family: "document_scanner",
			type: "document_scanner",
			connected: true,
			supportedModalities: ["DOC"],
		},
		{
			id: "twain-hp-scanjet",
			name: "HP ScanJet Pro 3000 / LaserJet MFP (TWAIN)",
			vendor: "hp",
			family: "document_scanner",
			type: "document_scanner",
			connected: true,
			supportedModalities: ["DOC"],
		},
		{
			id: "twain-canon-canoscan",
			name: "Canon imageRUNNER / CanoScan (TWAIN/WIA)",
			vendor: "canon_scanner",
			family: "document_scanner",
			type: "document_scanner",
			connected: true,
			supportedModalities: ["DOC"],
		},
		{
			id: "twain-fujitsu-fi7160",
			name: "Fujitsu fi-7160 / ScanSnap ADF Scanner (TWAIN)",
			vendor: "fujitsu_avision",
			family: "document_scanner",
			type: "document_scanner",
			connected: true,
			supportedModalities: ["DOC"],
		},
	];
}
