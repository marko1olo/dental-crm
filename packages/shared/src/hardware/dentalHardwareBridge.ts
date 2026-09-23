/**
 * @dental/shared/hardware — Multi-Vendor Dental Hardware Bridge & PACS Protocols.
 *
 * Implements native integration standards for top dental radiovisiography & tomography vendors:
 * 1. Vatech (EzDent-i / EasyDent / EzSensor) — Top-1 dental sensor in Russia & CIS.
 * 2. Sirona (Sidexis 4 / Sidexis XG / Orthophos / Galileos) — SLIDA protocol standard.
 * 3. Planmeca (Romexis / ProSensor / ProMax) — Romexis Link & command-line bridge.
 * 4. Carestream Dental / Kodak / Trophy (CS Imaging / RVG 5200/6200).
 * 5. KaVo / Gendex / Instrumentarium (VixWin Platinum / GXS-700 / CliniView / OP300).
 * 6. Xpect Vision (XVSensor / Direct photon counting CdTe sensor).
 *
 * Compliance: Mandates 2 (Zero Mocks), 8e (Doctor Autonomy), 8k (Friction-killer), 8n (Solo doctor).
 */

export type DentalHardwareVendor =
	| "vatech"
	| "sirona"
	| "planmeca"
	| "carestream"
	| "kavo"
	| "xpect_vision"
	| "generic";

export interface DentalHardwarePreset {
	readonly id: string;
	readonly vendor: DentalHardwareVendor;
	readonly name: string;
	readonly description: string;
	readonly defaultPaths: readonly string[];
	readonly protocol: "watch_folder" | "slida" | "twain" | "cli_bridge";
	readonly filePatterns: readonly string[];
	readonly exchangeFileName?: string | undefined;
	readonly defaultModality: "IO" | "DX" | "PX" | "CT" | "CR";
}

/**
 * Standard installation directories and watch folders for primary dental radiography systems in RF/CIS.
 */
export const DENTAL_HARDWARE_PRESETS: readonly DentalHardwarePreset[] = [
	{
		id: "preset-vatech-ezdent",
		vendor: "vatech",
		name: "Vatech (EzDent-i / EasyDent / EzSensor)",
		description: "Top-1 интраоральный радиовизиограф и КЛКТ томограф в РФ (EzSensor HD, Green 16, PaX-i3D)",
		defaultPaths: [
			"C:\\EzDent-i\\Capture",
			"C:\\EzDent-i\\Data",
			"C:\\EzDent-i\\Link",
			"C:\\Program Files (x86)\\Vatech\\EasyDent4",
			"C:\\Vatech\\Data",
			"C:\\EasyDent\\Capture",
		],
		protocol: "watch_folder",
		filePatterns: ["vatech", "ezdent", "easydent", "ezsensor", "vth", "ezd"],
		exchangeFileName: "Link.ini",
		defaultModality: "IO",
	},
	{
		id: "preset-sirona-sidexis",
		vendor: "sirona",
		name: "Dentsply Sirona (Sidexis 4 / Sidexis XG)",
		description: "Стандарт SLIDA (Sidexis Link Interface for Dental Applications), Orthophos, Galileos",
		defaultPaths: [
			"C:\\Sidexis",
			"C:\\Program Files\\Sirona\\Sidexis4",
			"C:\\Program Files (x86)\\Sirona Dental Systems\\Sidexis",
			"C:\\PDATA",
			"C:\\Sirona\\Data",
		],
		protocol: "slida",
		filePatterns: ["sidexis", "sirona", "pdata", "slida", "sdx", "si"],
		exchangeFileName: "sidexis.ini",
		defaultModality: "IO",
	},
	{
		id: "preset-planmeca-romexis",
		vendor: "planmeca",
		name: "Planmeca (Romexis / ProSensor / ProMax)",
		description: "Planmeca Romexis 2D/3D Imaging, ProSensor HD и томографы ProMax 3D",
		defaultPaths: [
			"C:\\Planmeca\\Romexis",
			"C:\\Program Files\\Planmeca\\Romexis",
			"C:\\Planmeca\\Data",
			"C:\\Dimaxis",
		],
		protocol: "cli_bridge",
		filePatterns: ["planmeca", "romexis", "prosensor", "promax", "dimaxis"],
		exchangeFileName: "RomexisLink.xml",
		defaultModality: "IO",
	},
	{
		id: "preset-carestream-trophy",
		vendor: "carestream",
		name: "Carestream Dental / Kodak / Trophy (CS Imaging / RVG 5200/6200)",
		description: "Интраоральные датчики RVG 5100/5200/6200, панорамные аппараты CS 8100/9600",
		defaultPaths: [
			"C:\\Trophy\\Data",
			"C:\\Trophy",
			"C:\\Program Files (x86)\\Carestream\\CSImaging\\Data",
			"C:\\Program Files (x86)\\Trophy\\Data",
			"C:\\Carestream\\Data",
			"C:\\Kodak\\Data",
		],
		protocol: "watch_folder",
		filePatterns: ["trophy", "carestream", "csimaging", "kodak", "rvg", "rvg5200", "rvg6200"],
		exchangeFileName: "cslink.ini",
		defaultModality: "IO",
	},
	{
		id: "preset-kavo-gendex",
		vendor: "kavo",
		name: "KaVo / Gendex / Instrumentarium (VixWin Platinum / CliniView / OP300)",
		description: "Визиографы GXS-700, ПО VixWin Platinum, CliniView, томографы KaVo OP300 / Instrumentarium",
		defaultPaths: [
			"C:\\VixWin",
			"C:\\Gendex",
			"C:\\CliniView",
			"C:\\Program Files (x86)\\KaVo\\CliniView",
			"C:\\Digora",
			"C:\\KaVo\\Data",
		],
		protocol: "watch_folder",
		filePatterns: ["kavo", "gendex", "vixwin", "cliniview", "digora", "instrumentarium", "soredex", "op300"],
		exchangeFileName: "vixwin.ini",
		defaultModality: "IO",
	},
	{
		id: "preset-xpect-vision",
		vendor: "xpect_vision",
		name: "Xpect Vision (XVSensor / Mammo CdTe)",
		description: "Квантовый радиовизиограф прямого подсчёта фотонов на теллуриде кадмия (CdTe, 35 мкм питч)",
		defaultPaths: [
			"C:\\Program Files (x86)\\XVSensor\\XVSensor\\Images",
			"C:\\Program Files (x86)\\XVSensor\\Images",
			"C:\\XVSensor\\Images",
			"C:\\XVSensor",
		],
		protocol: "watch_folder",
		filePatterns: ["xvsensor", "xpect", "mammo", "zraw"],
		exchangeFileName: "xvsensor_export.ini",
		defaultModality: "IO",
	},
];

/**
 * Detects dental hardware vendor from full file path, folder path, or file name.
 */
export function detectHardwareVendorFromPath(targetPath: string): DentalHardwareVendor {
	if (!targetPath || typeof targetPath !== "string") {
		return "generic";
	}

	const normalized = targetPath.toLowerCase().replace(/\\/g, "/");

	// 1. Vatech (EzDent-i / EasyDent / EzSensor)
	if (
		normalized.includes("ezdent") ||
		normalized.includes("easydent") ||
		normalized.includes("ezsensor") ||
		normalized.includes("vatech")
	) {
		return "vatech";
	}

	// 2. Sirona (Sidexis / Orthophos / Galileos)
	if (
		normalized.includes("sidexis") ||
		normalized.includes("sirona") ||
		normalized.includes("pdata") ||
		normalized.includes("slida") ||
		normalized.includes("orthophos") ||
		normalized.includes("galileos")
	) {
		return "sirona";
	}

	// 3. Planmeca (Romexis / ProSensor / ProMax / Dimaxis)
	if (
		normalized.includes("romexis") ||
		normalized.includes("planmeca") ||
		normalized.includes("prosensor") ||
		normalized.includes("promax") ||
		normalized.includes("dimaxis")
	) {
		return "planmeca";
	}

	// 4. Carestream / Trophy / Kodak (CS Imaging / RVG)
	if (
		normalized.includes("trophy") ||
		normalized.includes("carestream") ||
		normalized.includes("csimaging") ||
		normalized.includes("kodak") ||
		normalized.includes("rvg")
	) {
		return "carestream";
	}

	// 5. KaVo / Gendex / Instrumentarium / Soredex (VixWin / CliniView / OP300)
	if (
		normalized.includes("vixwin") ||
		normalized.includes("gendex") ||
		normalized.includes("cliniview") ||
		normalized.includes("digora") ||
		normalized.includes("instrumentarium") ||
		normalized.includes("soredex") ||
		normalized.includes("op300") ||
		normalized.includes("kavo")
	) {
		return "kavo";
	}

	// 6. Xpect Vision
	if (
		normalized.includes("xvsensor") ||
		normalized.includes("xpect") ||
		normalized.includes("mammo")
	) {
		return "xpect_vision";
	}

	return "generic";
}

/**
 * Returns preset configuration by vendor code.
 */
export function getHardwarePresetByVendor(vendor: DentalHardwareVendor): DentalHardwarePreset | undefined {
	return DENTAL_HARDWARE_PRESETS.find((p) => p.vendor === vendor);
}

/**
 * Patient descriptor for SLIDA and external imaging software bridges.
 */
export interface SlidaPatientDescriptor {
	readonly patientId: string;
	readonly lastName: string;
	readonly firstName: string;
	readonly middleName?: string | undefined;
	readonly birthDate?: string | undefined; // YYYYMMDD or YYYY-MM-DD
	readonly gender?: "M" | "F" | "U" | undefined;
	readonly toothCode?: string | undefined; // FDI notation (11..48, 51..85)
	readonly command?: "OpenPatient" | "NewImage" | "ShowImages" | undefined;
	readonly modality?: "IO" | "DX" | "PX" | "CT" | "CR" | undefined;
}

/**
 * Generates SLIDA .ini content (Sidexis Link Interface for Dental Applications)
 * Used by Sidexis 4, Sidexis XG, and compatible SLIDA listeners.
 */
export function generateSlidaIniContent(patient: SlidaPatientDescriptor): string {
	const rawBirth = (patient.birthDate || "19800101").replace(/[-.]/g, "");
	const birthDate = rawBirth.slice(0, 8);
	const action = patient.command || "OpenPatient";
	const genderCode = patient.gender === "F" ? "F" : "M";

	const lines = [
		"[Patient]",
		`Id=${patient.patientId}`,
		`LastName=${patient.lastName}`,
		`FirstName=${patient.firstName}`,
		`MiddleName=${patient.middleName || ""}`,
		`BirthDate=${birthDate}`,
		`Sex=${genderCode}`,
		"",
		"[Destination]",
		"Application=Sidexis",
		`Action=${action}`,
	];

	if (patient.toothCode) {
		lines.push("", "[Picture]", `Tooth=${patient.toothCode}`);
		if (patient.modality) {
			lines.push(`Modality=${patient.modality}`);
		}
	}

	return `${lines.join("\r\n")}\r\n`;
}

/**
 * Generates SLIDA XML format descriptor (used by modern Sidexis 4 and Romexis Link bridges).
 */
export function generateSlidaXmlContent(patient: SlidaPatientDescriptor): string {
	const rawBirth = (patient.birthDate || "1980-01-01").replace(/\./g, "-");
	const birthDate = rawBirth.length === 8 ? `${rawBirth.slice(0, 4)}-${rawBirth.slice(4, 6)}-${rawBirth.slice(6, 8)}` : rawBirth;
	const action = patient.command || "OpenPatient";
	const genderCode = patient.gender === "F" ? "F" : "M";
	const toothAttr = patient.toothCode ? ` tooth="${patient.toothCode}"` : "";
	const modalityAttr = patient.modality ? ` modality="${patient.modality}"` : "";

	return `<?xml version="1.0" encoding="UTF-8"?>
<SlidaRequest version="1.0">
  <Patient id="${escapeXml(patient.patientId)}">
    <LastName>${escapeXml(patient.lastName)}</LastName>
    <FirstName>${escapeXml(patient.firstName)}</FirstName>
    <MiddleName>${escapeXml(patient.middleName || "")}</MiddleName>
    <BirthDate>${escapeXml(birthDate)}</BirthDate>
    <Sex>${genderCode}</Sex>
  </Patient>
  <Command action="${action}"${toothAttr}${modalityAttr} />
</SlidaRequest>
`;
}

/**
 * Generates EzDent-i Link.ini content for Vatech bridge.
 */
export function generateEzDentLinkContent(patient: SlidaPatientDescriptor): string {
	const rawBirth = (patient.birthDate || "19800101").replace(/[-.]/g, "");
	const birthDate = rawBirth.slice(0, 8);
	const fullName = [patient.lastName, patient.firstName, patient.middleName].filter(Boolean).join(" ");
	const genderCode = patient.gender === "F" ? "F" : "M";

	const lines = [
		"[Patient]",
		`ChartNo=${patient.patientId}`,
		`Name=${fullName}`,
		`BirthDay=${birthDate}`,
		`Gender=${genderCode}`,
		"",
		"[Command]",
		"Execute=PatientView",
	];

	if (patient.toothCode) {
		lines.push(`ToothNo=${patient.toothCode}`);
	}

	return `${lines.join("\r\n")}\r\n`;
}

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

function escapeXml(str: string): string {
	return str
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&apos;");
}
