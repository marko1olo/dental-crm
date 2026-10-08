import type { DicomServerConfigPreset } from "./types";

/**
 * Стандартные сетевые порты протоколов DICOM и PACS серверов.
 */
export const DEFAULT_DICOM_PORTS = {
	STANDARD_DICOM: 104,
	SECURE_DICOM_TLS: 2762,
	DCM4CHEE_DEFAULT: 11112,
	ORTHANC_DICOM: 4242,
	ORTHANC_HTTP: 8042,
	WADO_RS_DEFAULT_HTTP: 8080,
	WADO_RS_DEFAULT_HTTPS: 8443,
} as const;

/**
 * Пресеты ведущих производителей стоматологических томографов (КЛКТ) и визиографов.
 */
export const DICOM_DEVICE_PRESETS: DicomServerConfigPreset[] = [
	{
		id: "sirona-galileos",
		vendor: "Dentsply Sirona",
		model: "Orthophos SL / Galileos / Axeos",
		defaultPort: 104,
		defaultAeTitle: "SIDEXIS",
		wadoSupported: true,
		recommendedTransferSyntax: "Explicit VR Little Endian (1.2.840.10008.1.2.1)",
	},
	{
		id: "kavo-op3d",
		vendor: "KaVo / DEXIS",
		model: "OP 3D Pro / OP 3D LX",
		defaultPort: 104,
		defaultAeTitle: "CLINIIVIEW",
		wadoSupported: true,
		recommendedTransferSyntax: "Explicit VR Little Endian (1.2.840.10008.1.2.1)",
	},
	{
		id: "planmeca-promax",
		vendor: "Planmeca",
		model: "ProMax 3D / Viso G7",
		defaultPort: 104,
		defaultAeTitle: "ROMEXIS",
		wadoSupported: true,
		recommendedTransferSyntax: "Explicit VR Little Endian (1.2.840.10008.1.2.1)",
	},
	{
		id: "vatech-pax-i3d",
		vendor: "Vatech",
		model: "PaX-i3D Smart / Green X",
		defaultPort: 104,
		defaultAeTitle: "EZEP",
		wadoSupported: true,
		recommendedTransferSyntax: "Explicit VR Little Endian (1.2.840.10008.1.2.1)",
	},
	{
		id: "morita-veraview",
		vendor: "J. Morita",
		model: "Veraview X800 / Veraviewepocs 3D",
		defaultPort: 104,
		defaultAeTitle: "IDATA",
		wadoSupported: false,
		recommendedTransferSyntax: "Implicit VR Little Endian (1.2.840.10008.1.2)",
	},
	{
		id: "carestream-cs",
		vendor: "Carestream Dental",
		model: "CS 8100 3D / CS 9600",
		defaultPort: 104,
		defaultAeTitle: "CS_PACS",
		wadoSupported: true,
		recommendedTransferSyntax: "Explicit VR Little Endian (1.2.840.10008.1.2.1)",
	},
];

/**
 * Конфигурация Hot Folder по умолчанию для фонового сканирования снимков.
 */
export const DEFAULT_HOT_FOLDER_CONFIG = {
	enabled: true,
	folderPath: "C:\\DentalImages\\Incoming",
	scanIntervalSec: 15,
	autoGroupSeries: true,
	quarantineOnError: true,
} as const;
