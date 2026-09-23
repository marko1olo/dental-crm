/**
 * @dental/shared/hardware — Universal Multi-Vendor Dental Hardware & Imaging Ecosystem Bridge.
 *
 * Implements native integration standards for all 5 equipment families in Russian & CIS dental practices:
 * A. Radiovisiographs (RVG) & software: Vatech, Sirona, Planmeca, Carestream, KaVo, Woodpecker, Eighteeth, Owandy, Xpect Vision, Handy, Trident.
 * B. CBCT 3D & OPG: Vatech PaX/Green, KaVo OP3D/OnDemand3D, Sirona Orthophos/Galileos, Planmeca ProMax, Carestream CS 8100/9600, NewTom/MyRay, Morita, PointNix, Genoray.
 * C. 3D Intraoral Scanners: Medit (Medit Link), 3Shape (TRIOS), Shining 3D (Aoralscan), Panda Scanner, Alliedstar, Runyes (QuickScan), Carestream CS 3600/3700.
 * D. MFPs & Document Scanners: Kyocera, HP, Canon, Xerox, Brother, Pantum, Fujitsu/Avision (SMB/FTP + TWAIN/WIA).
 * E. Clinical Photo Protocol: Canon, Nikon, Sony SD-card & tethering auto-import with standard 12-shot intraoral & portrait layout.
 *
 * 5 Universal Communication Protocols:
 * 1. SLIDA Protocol (Sidexis Link Interface for Dental Applications) INI & XML.
 * 2. VDDS-Media 5/6 Standard (Association of German Dental Software Manufacturers).
 * 3. CLI Command-Line Bridge: Parameterized templates for vendor executable launches.
 * 4. Hot Folder Watcher: Auto-import of DICOM, STL, PLY, OBJ, PDF, TIFF, JPEG with metadata parsing.
 * 5. TWAIN / WIA: Unified 2D frame capture driver catalog.
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

/**
 * Multi-Vendor Hardware Presets covering all 5 families (RVG, CBCT, 3D Scanners, MFPs, Photo Protocol).
 */
export const DENTAL_HARDWARE_PRESETS: readonly DentalHardwarePreset[] = [
	// -------------------------------------------------------------------------
	// Family A: RVG (Радиовизиографы и ПО)
	// -------------------------------------------------------------------------
	{
		id: "preset-vatech-ezdent",
		vendor: "vatech",
		family: "rvg",
		name: "Vatech (EzDent-i / EasyDent / EzSensor)",
		description: "Top-1 интраоральный радиовизиограф в РФ (EzSensor Classic HD, Soft, Wave)",
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
		cliTemplate: '"{exePath}" -c {patientId}',
	},
	{
		id: "preset-sirona-sidexis",
		vendor: "sirona",
		family: "rvg",
		name: "Dentsply Sirona (Sidexis 4 / Sidexis XG / XIOS)",
		description: "Стандарт SLIDA (Sidexis Link Interface for Dental Applications) и датчики XIOS XG",
		defaultPaths: [
			"C:\\Sidexis",
			"C:\\Program Files\\Sirona\\Sidexis4",
			"C:\\Program Files (x86)\\Sirona Dental Systems\\Sidexis",
			"C:\\PDATA",
			"C:\\Sirona\\Data",
		],
		protocol: "slida",
		filePatterns: ["sidexis", "sirona", "pdata", "slida", "sdx", "si", "xios"],
		exchangeFileName: "sidexis.ini",
		defaultModality: "IO",
		cliTemplate: '"{exePath}" /P:{patientId} /N:"{lastName}^{firstName}" /DOB:{birthDate}',
	},
	{
		id: "preset-planmeca-romexis",
		vendor: "planmeca",
		family: "rvg",
		name: "Planmeca (Romexis / ProSensor HD)",
		description: "Planmeca Romexis 2D Imaging и ProSensor HD датчики",
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
		cliTemplate: '"{exePath}" -p {patientId} -l "{lastName}" -f "{firstName}" -b {birthDateRaw}',
	},
	{
		id: "preset-carestream-trophy",
		vendor: "carestream",
		family: "rvg",
		name: "Carestream Dental / Kodak / Trophy (CS Imaging / RVG 5200/6200)",
		description: "Интраоральные визиографы RVG 5100/5200/6200 и ПО CS Imaging v7/v8",
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
		cliTemplate: '"{exePath}" /P:{patientId} /LN:"{lastName}" /FN:"{firstName}" /DOB:{birthDate}',
	},
	{
		id: "preset-kavo-gendex",
		vendor: "kavo",
		family: "rvg",
		name: "KaVo / Gendex / Instrumentarium (VixWin Platinum / GXS-700 / CliniView)",
		description: "Визиографы GXS-700, ПО VixWin Platinum, CliniView, фосфорные пластины Digora",
		defaultPaths: [
			"C:\\VixWin",
			"C:\\Gendex",
			"C:\\CliniView",
			"C:\\Program Files (x86)\\KaVo\\CliniView",
			"C:\\Digora",
			"C:\\KaVo\\Data",
		],
		protocol: "watch_folder",
		filePatterns: ["kavo", "gendex", "vixwin", "cliniview", "digora", "instrumentarium", "soredex"],
		exchangeFileName: "vixwin.ini",
		defaultModality: "IO",
		cliTemplate: '"{exePath}" /P:{patientId} /N:"{lastName},{firstName}"',
	},
	{
		id: "preset-woodpecker-isensor",
		vendor: "woodpecker",
		family: "rvg",
		name: "Woodpecker (i-Sensor H1 / H2)",
		description: "Популярный надежный радиовизиограф Woodpecker i-Sensor H1 и H2 с ультратонким сенсором 4.4 мм",
		defaultPaths: [
			"C:\\Woodpecker\\iSensor",
			"C:\\Program Files\\Woodpecker\\i-Sensor",
			"C:\\i-Sensor\\Data",
			"C:\\Woodpecker\\Images",
		],
		protocol: "watch_folder",
		filePatterns: ["woodpecker", "isensor", "i-sensor"],
		exchangeFileName: "isensor_bridge.ini",
		defaultModality: "IO",
		cliTemplate: '"{exePath}" /patient:{patientId} /name:"{lastName}"',
	},
	{
		id: "preset-eighteeth-nanopix",
		vendor: "eighteeth",
		family: "rvg",
		name: "Eighteeth (NanoPix 1 / NanoPix 2)",
		description: "Интраоральный радиовизиограф Eighteeth NanoPix 1/2 с разрешением 20 пар линий/мм",
		defaultPaths: [
			"C:\\Eighteeth\\NanoPix",
			"C:\\Program Files\\Eighteeth\\NanoPix",
			"C:\\Program Files (x86)\\Eighteeth",
			"C:\\NanoPix\\Images",
		],
		protocol: "watch_folder",
		filePatterns: ["eighteeth", "nanopix"],
		exchangeFileName: "nanopix_link.ini",
		defaultModality: "IO",
		cliTemplate: '"{exePath}" -pid {patientId} -pname "{lastName} {firstName}"',
	},
	{
		id: "preset-owandy-quickvision",
		vendor: "owandy",
		family: "rvg",
		name: "Owandy (QuickVision / Owandy-One)",
		description: "Французские визиографы Owandy-One и ПО QuickVision для 2D визуализации",
		defaultPaths: [
			"C:\\Owandy\\QuickVision",
			"C:\\Program Files\\Owandy\\QuickVision",
			"C:\\Program Files (x86)\\Owandy",
			"C:\\QuickVision\\Images",
		],
		protocol: "cli_bridge",
		filePatterns: ["owandy", "quickvision", "owandy-one"],
		exchangeFileName: "quickvision.ini",
		defaultModality: "IO",
		cliTemplate: '"{exePath}" -p {patientId} -n "{lastName}"',
	},
	{
		id: "preset-xpect-vision",
		vendor: "xpect_vision",
		family: "rvg",
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
		cliTemplate: '"{exePath}" /pid:{patientId} /tooth:{toothCode}',
	},
	{
		id: "preset-handy-dentist",
		vendor: "handy",
		family: "rvg",
		name: "Handy (HDR-500 / HDR-600 / HandyDentist)",
		description: "Доступный цифровой визиограф Handy HDR-500/600 и ПО HandyDentist",
		defaultPaths: [
			"C:\\HandyDentist\\Images",
			"C:\\Program Files\\HandyDentist",
			"C:\\Handy\\Capture",
			"C:\\Program Files (x86)\\HandyDentist",
		],
		protocol: "watch_folder",
		filePatterns: ["handy", "handydentist", "hdr-500", "hdr-600"],
		exchangeFileName: "handy_link.ini",
		defaultModality: "IO",
		cliTemplate: '"{exePath}" /ID:{patientId} /Name:"{lastName} {firstName}"',
	},
	{
		id: "preset-trident-iview",
		vendor: "trident",
		family: "rvg",
		name: "Trident (I-View / I-View Gold / Deep View)",
		description: "Итальянский радиовизиограф Trident I-View Gold и программный пакет Deep View",
		defaultPaths: [
			"C:\\Trident\\I-View",
			"C:\\DeepView\\Data",
			"C:\\Program Files\\Trident\\DeepView",
			"C:\\Trident\\Data",
		],
		protocol: "watch_folder",
		filePatterns: ["trident", "iview", "deepview"],
		exchangeFileName: "trident_link.ini",
		defaultModality: "IO",
		cliTemplate: '"{exePath}" -patid {patientId} -patname "{lastName}"',
	},

	// -------------------------------------------------------------------------
	// Family B: CBCT 3D & OPG (Томографы КЛКТ 3D и ОПТГ)
	// -------------------------------------------------------------------------
	{
		id: "preset-vatech-green-pax",
		vendor: "vatech",
		family: "cbct_opg",
		name: "Vatech (PaX-i3D / Green 16 / Ez3D-i)",
		description: "Конусно-лучевые томографы КЛКТ Vatech Green 16, PaX-i3D Smart Plus и ПО Ez3D-i",
		defaultPaths: [
			"C:\\Ez3D-i\\Data",
			"C:\\Vatech\\PaX-i3D",
			"C:\\Ez3D-i\\Capture",
			"C:\\Vatech\\Green16",
			"C:\\Vatech\\PaX",
		],
		protocol: "watch_folder",
		filePatterns: ["green16", "pax-i", "ez3d", "vatech_3d", "pax-i3d", "pax"],
		exchangeFileName: "Ez3DLink.ini",
		defaultModality: "CT",
		cliTemplate: '"{exePath}" -p {patientId} -3d',
	},
	{
		id: "preset-kavo-op3d",
		vendor: "kavo",
		family: "cbct_opg",
		name: "KaVo OP 3D / OP 3D Pro / OnDemand3D",
		description: "КЛКТ томографы KaVo OP 3D, OP300 и рабочая станция OnDemand3D App",
		defaultPaths: [
			"C:\\KaVo\\OP3D",
			"C:\\OnDemand3DApp",
			"C:\\Program Files\\CyberMed\\OnDemand3D",
			"C:\\KaVo\\OP300",
		],
		protocol: "cli_bridge",
		filePatterns: ["op3d", "ondemand3d", "kavo3d", "op300"],
		exchangeFileName: "kavo_3d_link.ini",
		defaultModality: "CT",
		cliTemplate: '"{exePath}" -patientID {patientId} -patientName "{lastName} {firstName}"',
	},
	{
		id: "preset-sirona-orthophos-galileos",
		vendor: "sirona",
		family: "cbct_opg",
		name: "Dentsply Sirona (Orthophos SL / Galileos 3D)",
		description: "Томографы Orthophos SL 3D, Orthophos XG 3D и Galileos Comfort Plus",
		defaultPaths: [
			"C:\\Sidexis\\Galileos",
			"C:\\Sirona\\Orthophos",
			"C:\\PDATA\\3D",
			"C:\\Program Files\\Sirona\\Galileos",
		],
		protocol: "slida",
		filePatterns: ["orthophos", "galileos", "sirona3d", "galileos3d"],
		exchangeFileName: "sidexis.ini",
		defaultModality: "CT",
		cliTemplate: '"{exePath}" /P:{patientId} /N:"{lastName}^{firstName}" /CT',
	},
	{
		id: "preset-planmeca-promax-3d",
		vendor: "planmeca",
		family: "cbct_opg",
		name: "Planmeca (ProMax 3D / Romexis 3D)",
		description: "Томографы Planmeca ProMax 3D Classic / Mid / Max и Romexis 3D Imaging",
		defaultPaths: [
			"C:\\Planmeca\\Romexis3D",
			"C:\\Planmeca\\ProMax",
			"C:\\Romexis\\3D",
			"C:\\Planmeca\\ProMax3D",
		],
		protocol: "cli_bridge",
		filePatterns: ["promax", "promax3d", "romexis3d"],
		exchangeFileName: "RomexisLink.xml",
		defaultModality: "CT",
		cliTemplate: '"{exePath}" -p {patientId} -l "{lastName}" -f "{firstName}" -3d',
	},
	{
		id: "preset-carestream-cs9600",
		vendor: "carestream",
		family: "cbct_opg",
		name: "Carestream Dental (CS 8100 3D / CS 9600)",
		description: "Томографы Carestream CS 8100 3D, CS 8200 3D, флагман CS 9600 и CS 3D Imaging",
		defaultPaths: [
			"C:\\Carestream\\CS9600",
			"C:\\Carestream\\CS8100_3D",
			"C:\\CSImaging\\3D",
			"C:\\Carestream\\Data\\3D",
		],
		protocol: "watch_folder",
		filePatterns: ["cs9600", "cs8100", "cs3d", "cs8200"],
		exchangeFileName: "cslink3d.ini",
		defaultModality: "CT",
		cliTemplate: '"{exePath}" /P:{patientId} /3D',
	},
	{
		id: "preset-newtom-nnt",
		vendor: "newtom",
		family: "cbct_opg",
		name: "NewTom / MyRay (NNT / iRYS)",
		description: "Итальянские экспертные томографы NewTom VGi evo, GiANO HR, MyRay Hyperion X9 и ПО NNT/iRYS",
		defaultPaths: [
			"C:\\NNT\\Data",
			"C:\\Program Files\\NNT",
			"C:\\iRYS\\Data",
			"C:\\MyRay\\Data",
			"C:\\Program Files\\Cefla\\iRYS",
		],
		protocol: "cli_bridge",
		filePatterns: ["newtom", "nnt", "myray", "irys", "giano"],
		exchangeFileName: "nnt_bridge.ini",
		defaultModality: "CT",
		cliTemplate: '"{exePath}" -id {patientId} -name "{lastName}^{firstName}"',
	},
	{
		id: "preset-morita-idixel",
		vendor: "morita",
		family: "cbct_opg",
		name: "J. Morita (i-Dixel / Veraviewepocs 3D / Veraview X800)",
		description: "Японские премиум томографы Morita Veraview X800, Veraviewepocs 3D R100 и ПО i-Dixel",
		defaultPaths: [
			"C:\\i-Dixel\\Data",
			"C:\\Morita\\iDixel",
			"C:\\Program Files\\Morita\\iDixel",
			"C:\\Morita\\Data",
		],
		protocol: "cli_bridge",
		filePatterns: ["morita", "idixel", "i-dixel", "veraview", "x800"],
		exchangeFileName: "idixel_link.ini",
		defaultModality: "CT",
		cliTemplate: '"{exePath}" /ID:{patientId} /N:"{lastName}"',
	},
	{
		id: "preset-pointnix-realscan",
		vendor: "pointnix",
		family: "cbct_opg",
		name: "PointNix (Point 3D Combi / RealScan)",
		description: "Корейские томографы PointNix Point 3D Combi 500 и диагностический софт RealScan",
		defaultPaths: [
			"C:\\PointNix\\RealScan",
			"C:\\PointNix\\Data",
			"C:\\Point3D",
			"C:\\Program Files\\PointNix",
		],
		protocol: "watch_folder",
		filePatterns: ["pointnix", "point3d", "realscan"],
		exchangeFileName: "pointnix.ini",
		defaultModality: "CT",
		cliTemplate: '"{exePath}" -p {patientId} -n "{lastName}"',
	},
	{
		id: "preset-genoray-papaya",
		vendor: "genoray",
		family: "cbct_opg",
		name: "Genoray (Papaya 3D / Triana / The Smile Designer)",
		description: "Томографы Genoray Papaya 3D Plus, панорамные аппараты и просмотрщик Triana",
		defaultPaths: [
			"C:\\Genoray\\Papaya",
			"C:\\TheSmileDesigner",
			"C:\\Triana\\Data",
			"C:\\Program Files\\Genoray",
		],
		protocol: "cli_bridge",
		filePatterns: ["genoray", "papaya", "triana", "smiledesigner"],
		exchangeFileName: "genoray.ini",
		defaultModality: "CT",
		cliTemplate: '"{exePath}" /P:{patientId} /N:"{lastName}"',
	},

	// -------------------------------------------------------------------------
	// Family C: 3D Intraoral Scanners (3D Интраоральные сканеры)
	// -------------------------------------------------------------------------
	{
		id: "preset-medit-link",
		vendor: "medit",
		family: "scanner_3d",
		name: "Medit (Medit Link / i500 / i700 / i900)",
		description: "Интраоральные 3D-сканеры Medit i500, i700 Wireless, i900 и интеграционный протокол Medit Link",
		defaultPaths: [
			"C:\\Medit\\Medit Link",
			"C:\\Medit Link\\Data",
			"C:\\Program Files\\Medit\\Medit Link",
			"C:\\Medit\\Scans",
		],
		protocol: "cli_bridge",
		filePatterns: ["medit", "meditlink", "i500", "i700", "i900"],
		exchangeFileName: "medit_case.json",
		defaultModality: "3D_SCAN",
		cliTemplate: "meditlink://open?patientId={patientId}",
	},
	{
		id: "preset-3shape-trios",
		vendor: "threeshape",
		family: "scanner_3d",
		name: "3Shape (TRIOS 3 / 4 / 5 / Dental Desktop)",
		description: "Золотой стандарт ортопедического сканирования 3Shape TRIOS и ПО Dental Desktop",
		defaultPaths: [
			"C:\\3Shape\\DentalDesktop",
			"C:\\Program Files\\3Shape\\Dental Desktop\\Data",
			"C:\\TRIOS\\Scans",
			"C:\\3Shape\\Scans",
		],
		protocol: "cli_bridge",
		filePatterns: ["3shape", "threeshape", "trios", "dentaldesktop"],
		exchangeFileName: "3shape_order.xml",
		defaultModality: "3D_SCAN",
		cliTemplate: "3shape://open?patientId={patientId}",
	},
	{
		id: "preset-shining3d-aoralscan",
		vendor: "shining3d",
		family: "scanner_3d",
		name: "Shining 3D (Aoralscan 2 / Aoralscan 3 / 3 Wireless)",
		description: "Высокоскоростной сканер Shining 3D Aoralscan 3 для ортопедии и имплантологии",
		defaultPaths: [
			"C:\\Shining3D\\Aoralscan",
			"C:\\Program Files\\Shining3D\\Dental\\Data",
			"C:\\Aoralscan\\Export",
			"C:\\Shining3D\\Data",
		],
		protocol: "watch_folder",
		filePatterns: ["shining3d", "shining", "aoralscan"],
		exchangeFileName: "shining_order.json",
		defaultModality: "3D_SCAN",
		cliTemplate: '"{exePath}" --patient-id {patientId} --name "{lastName} {firstName}"',
	},
	{
		id: "preset-panda-scanner",
		vendor: "panda",
		family: "scanner_3d",
		name: "Panda Scanner (Panda P2 / Panda P3 / BAMBOO)",
		description: "Компактный легкий сканер Panda Scanner P2/P3 и софт BAMBOO",
		defaultPaths: [
			"C:\\PandaScanner\\Data",
			"C:\\Program Files\\Panda\\BAMBOO",
			"C:\\Panda\\Scans",
			"C:\\BAMBOO\\Export",
		],
		protocol: "watch_folder",
		filePatterns: ["panda", "pandascan", "bamboo"],
		exchangeFileName: "panda_project.json",
		defaultModality: "3D_SCAN",
		cliTemplate: '"{exePath}" -pid {patientId}',
	},
	{
		id: "preset-alliedstar-as",
		vendor: "alliedstar",
		family: "scanner_3d",
		name: "Alliedstar (AS 100 / AS 200 Wireless)",
		description: "Интраоральный 3D-сканер нового поколения Alliedstar AS 100/200",
		defaultPaths: [
			"C:\\Alliedstar\\Scans",
			"C:\\Program Files\\Alliedstar",
			"C:\\AS100\\Export",
			"C:\\Alliedstar\\Data",
		],
		protocol: "watch_folder",
		filePatterns: ["alliedstar", "as100", "as200"],
		exchangeFileName: "alliedstar_order.json",
		defaultModality: "3D_SCAN",
		cliTemplate: '"{exePath}" /patient:{patientId}',
	},
	{
		id: "preset-runyes-3ds",
		vendor: "runyes",
		family: "scanner_3d",
		name: "Runyes (Runyes 3DS / QuickScan)",
		description: "Интраоральный 3D-сканер Runyes 3DS (M3) и экспорт моделей PLY/STL/OBJ",
		defaultPaths: [
			"C:\\Runyes\\3DS",
			"C:\\Runyes\\Scans",
			"C:\\Program Files\\Runyes\\3DS",
			"C:\\Program Files (x86)\\Runyes",
			"C:\\Runyes\\Data",
			"C:\\Runyes",
		],
		protocol: "watch_folder",
		filePatterns: ["runyes", "3ds", "quickscan", "ply", "stl"],
		exchangeFileName: "runyes_project.json",
		defaultModality: "3D_SCAN",
		cliTemplate: '"{exePath}" -patient {patientId}',
	},
	{
		id: "preset-carestream-cs3700",
		vendor: "carestream",
		family: "scanner_3d",
		name: "Carestream Dental (CS 3600 / CS 3700 / CS 3800 Wireless)",
		description: "Интраоральные 3D-сканеры Carestream CS 3600, CS 3700 и беспроводной CS 3800",
		defaultPaths: [
			"C:\\Carestream\\CS3600\\Data",
			"C:\\Carestream\\CS3700\\Data",
			"C:\\CS3800\\Scans",
			"C:\\Carestream\\ScannerData",
		],
		protocol: "watch_folder",
		filePatterns: ["cs3600", "cs3700", "cs3800"],
		exchangeFileName: "cs_scanner_case.xml",
		defaultModality: "3D_SCAN",
		cliTemplate: '"{exePath}" /P:{patientId} /SCAN3D',
	},

	// -------------------------------------------------------------------------
	// Family D: MFPs & Document Scanners (МФУ и документные сканеры)
	// -------------------------------------------------------------------------
	{
		id: "preset-kyocera-taskalfa",
		vendor: "kyocera",
		family: "document_scanner",
		name: "Kyocera (TASKalfa / ECOSYS SMB/FTP)",
		description: "Сетевые МФУ Kyocera ECOSYS M2040dn, TASKalfa со сканированием в сетевую папку SMB/FTP",
		defaultPaths: [
			"C:\\Kyocera\\Scan",
			"C:\\Scans\\Kyocera",
			"C:\\SMB\\KyoceraScan",
			"C:\\Scan\\Kyocera",
		],
		protocol: "watch_folder",
		filePatterns: ["kyocera", "taskalfa", "ecosys"],
		exchangeFileName: "kyocera_config.ini",
		defaultModality: "DOC",
		cliTemplate: '"{exePath}" /scan /dest:"{outputDir}"',
	},
	{
		id: "preset-hp-scanjet",
		vendor: "hp",
		family: "document_scanner",
		name: "HP (LaserJet MFP / ScanJet Pro)",
		description: "МФУ HP LaserJet Enterprise и поточные документ-сканеры ScanJet Pro",
		defaultPaths: [
			"C:\\HP\\Scan",
			"C:\\Scans\\HP",
			"C:\\ScanJet\\Data",
			"C:\\Scan\\HP",
		],
		protocol: "watch_folder",
		filePatterns: ["scanjet", "laserjet", "hp_scan"],
		exchangeFileName: "hp_scan.ini",
		defaultModality: "DOC",
		cliTemplate: '"{exePath}" /scan /output:"{outputDir}"',
	},
	{
		id: "preset-canon-imagerunner",
		vendor: "canon_scanner",
		family: "document_scanner",
		name: "Canon (imageRUNNER / CanoScan / imageFORMULA)",
		description: "Офисные МФУ Canon imageRUNNER ADVANCE и документные сканеры imageFORMULA",
		defaultPaths: [
			"C:\\Canon\\Scan",
			"C:\\Scans\\Canon",
			"C:\\imageRUNNER\\Data",
			"C:\\Scan\\Canon",
		],
		protocol: "watch_folder",
		filePatterns: ["canoscan", "imagerunner", "imageformula"],
		exchangeFileName: "canon_scan.ini",
		defaultModality: "DOC",
		cliTemplate: '"{exePath}" /scan /save:"{outputDir}"',
	},
	{
		id: "preset-xerox-workcentre",
		vendor: "xerox",
		family: "document_scanner",
		name: "Xerox (WorkCentre / VersaLink / AltaLink)",
		description: "Сетевые МФУ Xerox VersaLink B405, WorkCentre с прямой отправкой сканов паспортов и согласий",
		defaultPaths: [
			"C:\\Xerox\\Scan",
			"C:\\Scans\\Xerox",
			"C:\\WorkCentre\\Data",
			"C:\\Scan\\Xerox",
		],
		protocol: "watch_folder",
		filePatterns: ["xerox", "workcentre", "versalink", "altalink"],
		exchangeFileName: "xerox_scan.ini",
		defaultModality: "DOC",
		cliTemplate: '"{exePath}" -scan -out "{outputDir}"',
	},
	{
		id: "preset-brother-dcp",
		vendor: "brother",
		family: "document_scanner",
		name: "Brother (DCP / MFC Series / ADS Scanners)",
		description: "МФУ Brother DCP-L2500, MFC-L2700 и потоковые сканеры Brother ADS-2800",
		defaultPaths: [
			"C:\\Brother\\Scan",
			"C:\\Scans\\Brother",
			"C:\\Brother\\ControlCenter",
			"C:\\Scan\\Brother",
		],
		protocol: "watch_folder",
		filePatterns: ["brother", "dcp-", "mfc-", "ads-"],
		exchangeFileName: "brother_scan.ini",
		defaultModality: "DOC",
		cliTemplate: '"{exePath}" /SCAN /DIR:"{outputDir}"',
	},
	{
		id: "preset-pantum-scanner",
		vendor: "pantum",
		family: "document_scanner",
		name: "Pantum (M6500 / M7100 / BM5100 Series)",
		description: "Сетевые МФУ и документ-сканеры Pantum для оцифровки паспортов, полисов, согласий и анализов",
		defaultPaths: [
			"C:\\Pantum\\Scan",
			"C:\\Pantum",
			"C:\\Program Files\\Pantum",
			"C:\\Program Files (x86)\\Pantum",
			"C:\\Scans\\Pantum",
			"C:\\Scan\\Pantum",
		],
		protocol: "watch_folder",
		filePatterns: ["pantum", "ptm", "scan"],
		exchangeFileName: "scan_config.ini",
		defaultModality: "CR",
		cliTemplate: '"{exePath}" /scan /out:"{outputDir}"',
	},
	{
		id: "preset-fujitsu-scansnap",
		vendor: "fujitsu_avision",
		family: "document_scanner",
		name: "Fujitsu / Avision (ScanSnap / fi-Series / Avision FB)",
		description: "Профессиональные скоростные документ-сканеры Fujitsu fi-7160, ScanSnap iX1600 и Avision",
		defaultPaths: [
			"C:\\ScanSnap\\Data",
			"C:\\Fujitsu\\Scans",
			"C:\\Avision\\Data",
			"C:\\Scans\\Fujitsu",
		],
		protocol: "watch_folder",
		filePatterns: ["fujitsu", "scansnap", "avision", "fi-7160", "fi-"],
		exchangeFileName: "scansnap_job.ini",
		defaultModality: "DOC",
		cliTemplate: '"{exePath}" /ScanToFolder:"{outputDir}"',
	},

	// -------------------------------------------------------------------------
	// Family E: Clinical Photo Protocol (Фотопротокол и камеры)
	// -------------------------------------------------------------------------
	{
		id: "preset-canon-eos-photo",
		vendor: "canon_photo",
		family: "photo_protocol",
		name: "Canon (EOS Utility / DCIM Auto-Import)",
		description: "Зеркальные и беззеркальные камеры Canon (EOS R/RP/90D) для дентального фотопротокола",
		defaultPaths: [
			"C:\\EOS_Utility\\Photos",
			"D:\\DCIM\\100CANON",
			"E:\\DCIM\\100CANON",
			"F:\\DCIM\\100CANON",
			"C:\\Photos\\Canon",
		],
		protocol: "watch_folder",
		filePatterns: ["canon_eos", "eos_utility", "dcim", "100canon"],
		exchangeFileName: "canon_tether.ini",
		defaultModality: "PHOTO",
		cliTemplate: '"{exePath}" /download /dest:"{outputDir}"',
	},
	{
		id: "preset-nikon-photo",
		vendor: "nikon_photo",
		family: "photo_protocol",
		name: "Nikon (Camera Control Pro / DCIM Auto-Import)",
		description: "Камеры Nikon (Z5/Z6/D7500) для портретной и макро внутриротовой съемки с кольцевой вспышкой",
		defaultPaths: [
			"C:\\Nikon\\Photos",
			"D:\\DCIM\\100NIKON",
			"E:\\DCIM\\100NIKON",
			"F:\\DCIM\\100NIKON",
			"C:\\Photos\\Nikon",
		],
		protocol: "watch_folder",
		filePatterns: ["nikon", "100nikon", "camera_control"],
		exchangeFileName: "nikon_tether.ini",
		defaultModality: "PHOTO",
		cliTemplate: '"{exePath}" /import /dest:"{outputDir}"',
	},
	{
		id: "preset-sony-alpha-photo",
		vendor: "sony_photo",
		family: "photo_protocol",
		name: "Sony (Imaging Edge Desktop / DCIM Auto-Import)",
		description: "Камеры Sony Alpha (A7 IV, A6700) для протокольной съемки улыбки и окклюзии",
		defaultPaths: [
			"C:\\Sony\\ImagingEdge",
			"D:\\DCIM\\100MSDCF",
			"E:\\DCIM\\100MSDCF",
			"F:\\DCIM\\100MSDCF",
			"C:\\Photos\\Sony",
		],
		protocol: "watch_folder",
		filePatterns: ["sony", "imaging_edge", "100msdcf"],
		exchangeFileName: "sony_tether.ini",
		defaultModality: "PHOTO",
		cliTemplate: '"{exePath}" /import /folder:"{outputDir}"',
	},
];

/**
 * Standard 12-shot Dental Clinical Photo Protocol (Портретный и внутриротовой фотопротокол).
 */
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

export const DENTAL_PHOTO_PROTOCOL_12: readonly PhotoProtocolSlot[] = [
	{
		index: 1,
		id: "extraoral_portrait_rest",
		titleRu: "Портрет в покое (анфас)",
		descriptionRu: "Лицо пациента в покое, губы сомкнуты, взгляд прямо перед собой",
		category: "extraoral",
		matchPatterns: ["portrait_rest", "face_rest", "анфас_покой", "портрет_покой", "slot1", "slot_1", "01_"],
	},
	{
		index: 2,
		id: "extraoral_portrait_smile",
		titleRu: "Портрет с улыбкой (анфас)",
		descriptionRu: "Естественная широкая улыбка, обнажение резцов и десневого края",
		category: "extraoral",
		matchPatterns: ["portrait_smile", "face_smile", "smile", "анфас_улыбка", "портрет_улыбка", "slot2", "slot_2", "02_"],
	},
	{
		index: 3,
		id: "extraoral_profile_right",
		titleRu: "Профиль справа (90°)",
		descriptionRu: "Боковой профиль под прямым углом, франкфуртская горизонталь",
		category: "extraoral",
		matchPatterns: ["profile_right", "profile_90", "profile", "профиль_справа", "профиль", "slot3", "slot_3", "03_"],
	},
	{
		index: 4,
		id: "extraoral_profile_45",
		titleRu: "Полупрофиль 45°",
		descriptionRu: "Ракурс три четверти с естественной улыбкой",
		category: "extraoral",
		matchPatterns: ["profile_45", "semi_profile", "three_quarter", "полупрофиль", "45deg", "slot4", "slot_4", "04_"],
	},
	{
		index: 5,
		id: "intraoral_anterior_occlusion",
		titleRu: "Фронт в окклюзии",
		descriptionRu: "Внутриротовой снимок передних зубов в привычном прикусе с ретракторами",
		category: "intraoral",
		matchPatterns: ["anterior_occlusion", "front_occlusion", "front_bite", "фронт_окклюзия", "фронт_прикус", "slot5", "slot_5", "05_"],
	},
	{
		index: 6,
		id: "intraoral_anterior_open",
		titleRu: "Фронт с разомкнутыми зубами",
		descriptionRu: "Разомкнутые резцовые края для оценки истираемости и анатомии",
		category: "intraoral",
		matchPatterns: ["anterior_open", "front_open", "open_bite", "фронт_разомкнут", "разомкнутый_фронт", "slot6", "slot_6", "06_"],
	},
	{
		index: 7,
		id: "intraoral_buccal_right",
		titleRu: "Боковой вид справа (окклюзия)",
		descriptionRu: "Смыкание клыков и моляров справа по I/II/III классу Энгля",
		category: "intraoral",
		matchPatterns: ["buccal_right", "lateral_right", "right_bite", "боковой_справа", "бок_справа", "slot7", "slot_7", "07_"],
	},
	{
		index: 8,
		id: "intraoral_buccal_left",
		titleRu: "Боковой вид слева (окклюзия)",
		descriptionRu: "Смыкание клыков и моляров слева по I/II/III классу Энгля",
		category: "intraoral",
		matchPatterns: ["buccal_left", "lateral_left", "left_bite", "боковой_слева", "бок_слева", "slot8", "slot_8", "08_"],
	},
	{
		index: 9,
		id: "intraoral_occlusal_maxillary",
		titleRu: "Окклюзия верхней челюсти",
		descriptionRu: "Зеркальный снимок зубного ряда верхней челюсти от 17 до 27",
		category: "intraoral",
		matchPatterns: ["occlusal_maxillary", "occlusal_upper", "upper_arch", "окклюзия_верх", "вч_зеркало", "slot9", "slot_9", "09_"],
	},
	{
		index: 10,
		id: "intraoral_occlusal_mandibular",
		titleRu: "Окклюзия нижней челюсти",
		descriptionRu: "Зеркальный снимок зубного ряда нижней челюсти от 37 до 47",
		category: "intraoral",
		matchPatterns: ["occlusal_mandibular", "occlusal_lower", "lower_arch", "окклюзия_низ", "нч_зеркало", "slot10", "slot_10", "10_"],
	},
	{
		index: 11,
		id: "intraoral_anterior_overjet",
		titleRu: "Резцовое перекрытие (Overjet / Overbite)",
		descriptionRu: "Крупный план сагиттальной щели и вертикального резцового перекрытия",
		category: "intraoral",
		matchPatterns: ["anterior_overjet", "overbite", "overjet", "сагиттальная_щель", "оверджет", "перекрытие", "slot11", "slot_11", "11_"],
	},
	{
		index: 12,
		id: "intraoral_smile_aesthetic",
		titleRu: "Эстетика улыбки (макро без ретракторов)",
		descriptionRu: "Губной коридор, линия улыбки, резцовый край и десневые зениты",
		category: "intraoral",
		matchPatterns: ["smile_aesthetic", "macro_smile", "aesthetic_smile", "эстетика_улыбки", "макро_улыбка", "slot12", "slot_12", "12_"],
	},
];

/**
 * Matches a photo filename against the 12 standard dental photo protocol slots.
 */
export function matchPhotoProtocolSlot(fileName: string): PhotoProtocolSlot | undefined {
	if (!fileName || typeof fileName !== "string") return undefined;
	const normalized = fileName.toLowerCase().replace(/\\/g, "/");
	const baseName = normalized.split("/").pop() || normalized;

	// 1. Explicit slot index pattern: slot1..slot12, slot_1..slot_12, слот1..слот12
	const slotNumMatch = baseName.match(/(?:^|[_\W])(?:slot|слот)[_-]?(0?[1-9]|1[0-2])(?=[_\W]|$)/i);
	if (slotNumMatch) {
		const idx = parseInt(slotNumMatch[1], 10);
		const found = DENTAL_PHOTO_PROTOCOL_12.find((s) => s.index === idx);
		if (found) return found;
	}

	// 2. Leading or delimited index: 01_..12_ or _01.._12
	const delimitedNumMatch = baseName.match(/(?:^|[_\W])(0[1-9]|1[0-2])[_\W]/);
	if (delimitedNumMatch) {
		const idx = parseInt(delimitedNumMatch[1], 10);
		const found = DENTAL_PHOTO_PROTOCOL_12.find((s) => s.index === idx);
		if (found) return found;
	}

	// 3. Match semantic patterns (skipping slot numeric aliases handled above)
	for (const slot of DENTAL_PHOTO_PROTOCOL_12) {
		for (const pattern of slot.matchPatterns) {
			if (pattern.startsWith("slot") || pattern.startsWith("0") || pattern.startsWith("1")) {
				continue;
			}
			if (baseName.includes(pattern)) {
				return slot;
			}
		}
	}
	return undefined;
}

/**
 * Detects dental hardware vendor from full file path, folder path, or file name.
 */
export function detectHardwareVendorFromPath(targetPath: string): DentalHardwareVendor {
	if (!targetPath || typeof targetPath !== "string") {
		return "generic";
	}

	const normalized = targetPath.toLowerCase().replace(/\\/g, "/");

	// 1. Vatech (EzDent-i / EasyDent / EzSensor / PaX / Green)
	if (
		normalized.includes("ezdent") ||
		normalized.includes("easydent") ||
		normalized.includes("ezsensor") ||
		normalized.includes("vatech") ||
		normalized.includes("ez3d") ||
		normalized.includes("green16") ||
		normalized.includes("pax-i") ||
		normalized.includes(".vth") ||
		normalized.includes(".ezd")
	) {
		return "vatech";
	}

	// 2. Sirona (Sidexis / Orthophos / Galileos / XIOS)
	if (
		normalized.includes("sidexis") ||
		normalized.includes("sirona") ||
		normalized.includes("pdata") ||
		normalized.includes("slida") ||
		normalized.includes("orthophos") ||
		normalized.includes("galileos") ||
		normalized.includes("xios")
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

	// 4. Carestream / Trophy / Kodak (CS Imaging / RVG / CS 8100 / CS 9600 / CS 3600)
	if (
		normalized.includes("trophy") ||
		normalized.includes("carestream") ||
		normalized.includes("csimaging") ||
		normalized.includes("kodak") ||
		normalized.includes("rvg") ||
		normalized.includes("cs8100") ||
		normalized.includes("cs9600") ||
		normalized.includes("cs3600") ||
		normalized.includes("cs3700") ||
		normalized.includes("cs3800")
	) {
		return "carestream";
	}

	// 5. KaVo / Gendex / Instrumentarium / Soredex (VixWin / CliniView / OP300 / OP3D / Digora)
	if (
		normalized.includes("vixwin") ||
		normalized.includes("gendex") ||
		normalized.includes("cliniview") ||
		normalized.includes("digora") ||
		normalized.includes("instrumentarium") ||
		normalized.includes("soredex") ||
		normalized.includes("op300") ||
		normalized.includes("op3d") ||
		normalized.includes("kavo") ||
		normalized.includes("ondemand3d")
	) {
		return "kavo";
	}

	// 6. Woodpecker (i-Sensor H1/H2)
	if (
		normalized.includes("woodpecker") ||
		normalized.includes("isensor") ||
		normalized.includes("i-sensor")
	) {
		return "woodpecker";
	}

	// 7. Eighteeth (NanoPix 1/2)
	if (
		normalized.includes("eighteeth") ||
		normalized.includes("nanopix")
	) {
		return "eighteeth";
	}

	// 8. Owandy (QuickVision / Owandy-One)
	if (
		normalized.includes("owandy") ||
		normalized.includes("quickvision")
	) {
		return "owandy";
	}

	// 9. Xpect Vision (XVSensor CdTe direct photon counting)
	if (
		normalized.includes("xvsensor") ||
		normalized.includes("xpect") ||
		normalized.includes("mammo") ||
		normalized.includes("zraw")
	) {
		return "xpect_vision";
	}

	// 10. Handy (HandyDentist / HDR-500/600)
	if (
		normalized.includes("handydentist") ||
		normalized.includes("hdr-500") ||
		normalized.includes("hdr-600") ||
		normalized.includes("handy")
	) {
		return "handy";
	}

	// 11. Trident (I-View / Deep View)
	if (
		normalized.includes("trident") ||
		normalized.includes("iview") ||
		normalized.includes("i-view") ||
		normalized.includes("deepview")
	) {
		return "trident";
	}

	// 12. NewTom / MyRay (NNT / iRYS)
	if (
		normalized.includes("newtom") ||
		normalized.includes("myray") ||
		normalized.includes("nnt") ||
		normalized.includes("irys") ||
		normalized.includes("giano")
	) {
		return "newtom";
	}

	// 13. Morita (i-Dixel / Veraviewepocs / X800)
	if (
		normalized.includes("morita") ||
		normalized.includes("idixel") ||
		normalized.includes("i-dixel") ||
		normalized.includes("veraview") ||
		normalized.includes("x800")
	) {
		return "morita";
	}

	// 14. PointNix (Point 3D Combi / RealScan)
	if (
		normalized.includes("pointnix") ||
		normalized.includes("point3d") ||
		normalized.includes("realscan")
	) {
		return "pointnix";
	}

	// 15. Genoray (Papaya 3D / Triana)
	if (
		normalized.includes("genoray") ||
		normalized.includes("papaya") ||
		normalized.includes("triana") ||
		normalized.includes("smiledesigner")
	) {
		return "genoray";
	}

	// 16. Medit (Medit Link / i500 / i700 / i900)
	if (
		normalized.includes("meditlink") ||
		normalized.includes("medit")
	) {
		return "medit";
	}

	// 17. 3Shape (TRIOS / Dental Desktop)
	if (
		normalized.includes("3shape") ||
		normalized.includes("threeshape") ||
		normalized.includes("trios") ||
		normalized.includes("dentaldesktop")
	) {
		return "threeshape";
	}

	// 18. Shining 3D (Aoralscan)
	if (
		normalized.includes("shining3d") ||
		normalized.includes("shining") ||
		normalized.includes("aoralscan")
	) {
		return "shining3d";
	}

	// 19. Panda Scanner (BAMBOO)
	if (
		normalized.includes("pandascan") ||
		normalized.includes("panda") ||
		normalized.includes("bamboo")
	) {
		return "panda";
	}

	// 20. Alliedstar (AS 100/200)
	if (
		normalized.includes("alliedstar") ||
		normalized.includes("as100") ||
		normalized.includes("as200")
	) {
		return "alliedstar";
	}

	// 21. Runyes 3D Intraoral Scanner
	if (
		normalized.includes("runyes") ||
		normalized.includes("quickscan")
	) {
		return "runyes";
	}

	// 22. Kyocera Network Scanner
	if (
		normalized.includes("kyocera") ||
		normalized.includes("taskalfa") ||
		normalized.includes("ecosys")
	) {
		return "kyocera";
	}

	// 23. HP LaserJet / ScanJet
	if (
		normalized.includes("scanjet") ||
		normalized.includes("hp_scan") ||
		normalized.includes("laserjet")
	) {
		return "hp";
	}

	// 24. Canon MFP / Document Scanner
	if (
		normalized.includes("canoscan") ||
		normalized.includes("imagerunner") ||
		normalized.includes("imageformula")
	) {
		return "canon_scanner";
	}

	// 25. Xerox MFP
	if (
		normalized.includes("xerox") ||
		normalized.includes("workcentre") ||
		normalized.includes("versalink") ||
		normalized.includes("altalink")
	) {
		return "xerox";
	}

	// 26. Brother Scanner
	if (
		normalized.includes("brother") ||
		normalized.includes("dcp-") ||
		normalized.includes("mfc-")
	) {
		return "brother";
	}

	// 27. Pantum Network Document Scanner
	if (
		normalized.includes("pantum") ||
		normalized.includes("ptm")
	) {
		return "pantum";
	}

	// 28. Fujitsu / Avision Scanner
	if (
		normalized.includes("fujitsu") ||
		normalized.includes("scansnap") ||
		normalized.includes("avision") ||
		normalized.includes("fi-7160") ||
		normalized.includes("fi-")
	) {
		return "fujitsu_avision";
	}

	// 29. Canon Photo DSLR
	if (
		normalized.includes("canon_eos") ||
		normalized.includes("eos_utility") ||
		normalized.includes("100canon")
	) {
		return "canon_photo";
	}

	// 30. Nikon Photo DSLR
	if (
		normalized.includes("nikon") ||
		normalized.includes("100nikon") ||
		normalized.includes("camera_control")
	) {
		return "nikon_photo";
	}

	// 31. Sony Alpha Photo
	if (
		normalized.includes("sony") ||
		normalized.includes("imaging_edge") ||
		normalized.includes("100msdcf")
	) {
		return "sony_photo";
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
 * Returns preset configuration by unique ID.
 */
export function getHardwarePresetById(id: string): DentalHardwarePreset | undefined {
	return DENTAL_HARDWARE_PRESETS.find((p) => p.id === id);
}

/**
 * Filters presets by equipment family.
 */
export function getPresetsByFamily(family: DentalHardwareFamily): readonly DentalHardwarePreset[] {
	return DENTAL_HARDWARE_PRESETS.filter((p) => p.family === family);
}

/**
 * Patient descriptor for SLIDA, VDDS, CLI and external imaging software bridges.
 */
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

/**
 * Generates SLIDA .ini content (Sidexis Link Interface for Dental Applications).
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

export interface SlidaResponse {
	readonly success: boolean;
	readonly status: string;
	readonly patientId?: string | undefined;
	readonly toothCode?: string | undefined;
	readonly modality?: "IO" | "DX" | "PX" | "CT" | "CR" | "3D_SCAN" | "DOC" | "PHOTO" | undefined;
	readonly imagePaths: readonly string[];
	readonly error?: string | undefined;
}

/**
 * Parses SLIDA INI response file returned by imaging software.
 */
export function parseSlidaIniResponse(iniContent: string): SlidaResponse {
	if (!iniContent || typeof iniContent !== "string") {
		return { success: false, status: "ERROR", imagePaths: [], error: "Empty INI content" };
	}
	const lines = iniContent.split(/\r?\n/);
	let patientId: string | undefined;
	let toothCode: string | undefined;
	let modality: string | undefined;
	let status = "OK";
	const imagePaths: string[] = [];

	for (const line of lines) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith(";") || trimmed.startsWith("#") || trimmed.startsWith("[")) continue;
		const eqIndex = trimmed.indexOf("=");
		if (eqIndex === -1) continue;
		const key = trimmed.slice(0, eqIndex).trim().toLowerCase();
		const val = trimmed.slice(eqIndex + 1).trim();

		if (key === "status") {
			status = val.toUpperCase();
		} else if (key === "id" || key === "chartno" || key === "patientid") {
			patientId = val;
		} else if (key === "tooth" || key === "toothno") {
			toothCode = val;
		} else if (key === "modality") {
			modality = val.toUpperCase();
		} else if (key === "file" || key === "image" || key === "path" || key === "filepath") {
			imagePaths.push(val);
		}
	}

	return {
		success: status === "OK" || status === "SUCCESS",
		status,
		patientId,
		toothCode,
		modality: modality as any,
		imagePaths,
	};
}

/**
 * Parses SLIDA XML response descriptor.
 */
export function parseSlidaXmlResponse(xmlContent: string): SlidaResponse {
	if (!xmlContent || typeof xmlContent !== "string") {
		return { success: false, status: "ERROR", imagePaths: [], error: "Empty XML content" };
	}
	const statusMatch = xmlContent.match(/status=["']([^"']+)["']/i);
	const status = statusMatch ? statusMatch[1].toUpperCase() : "OK";

	const patMatch = xmlContent.match(/<Patient[^>]*id=["']([^"']+)["']/i) || xmlContent.match(/<Id>([^<]+)<\/Id>/i);
	const patientId = patMatch ? patMatch[1].trim() : undefined;

	const picToothMatch = xmlContent.match(/tooth=["']([^"']+)["']/i) || xmlContent.match(/<Tooth>([^<]+)<\/Tooth>/i);
	const toothCode = picToothMatch ? picToothMatch[1].trim() : undefined;

	const fileMatches: string[] = [];
	const fileAttrRegex = /(?:file|path|image)=["']([^"']+)["']/gi;
	let match: RegExpExecArray | null;
	while ((match = fileAttrRegex.exec(xmlContent)) !== null) {
		fileMatches.push(match[1]);
	}
	const fileTagRegex = /<(?:File|Path|Image)>([^<]+)<\/(?:File|Path|Image)>/gi;
	while ((match = fileTagRegex.exec(xmlContent)) !== null) {
		fileMatches.push(match[1].trim());
	}

	const modalityMatch = xmlContent.match(/modality=["']([^"']+)["']/i) || xmlContent.match(/<Modality>([^<]+)<\/Modality>/i);
	const modality = modalityMatch ? (modalityMatch[1].trim().toUpperCase() as any) : undefined;

	return {
		success: status === "OK" || status === "SUCCESS",
		status,
		patientId,
		toothCode,
		modality,
		imagePaths: Array.from(new Set(fileMatches)),
	};
}

/**
 * Universal SLIDA response parser (auto-detects XML or INI).
 */
export function parseSlidaResponse(content: string): SlidaResponse {
	if (!content || typeof content !== "string") {
		return { success: false, status: "ERROR", imagePaths: [], error: "Empty content" };
	}
	if (content.trim().startsWith("<")) {
		return parseSlidaXmlResponse(content);
	}
	return parseSlidaIniResponse(content);
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

// -----------------------------------------------------------------------------
// Protocol 2: VDDS-Media 5/6 Standard
// -----------------------------------------------------------------------------

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

/**
 * Generates VDDS-Media 5/6 patient exchange file.
 */
export function generateVddsMediaContent(
	patient: VddsMediaDescriptor,
	options: { returnFilePath?: string } = {}
): string {
	const version = patient.version || "5.0";
	const returnFile = options.returnFilePath || patient.returnFilePath || "C:\\Temp\\dente_vdds_return.ini";
	const action = patient.action || (patient.command === "NewImage" ? "ACQUIRE" : "SHOW");
	const rawBirth = (patient.birthDate || "19800101").replace(/[-.]/g, "");
	let formattedBirth = "01.01.1980";
	if (rawBirth.length === 8) {
		formattedBirth = `${rawBirth.slice(6, 8)}.${rawBirth.slice(4, 6)}.${rawBirth.slice(0, 4)}`;
	}
	const genderCode = patient.gender === "F" ? "2" : patient.gender === "M" ? "1" : "0";
	const modalityCode = patient.modality || "IO";

	const lines = [
		"[VDDS]",
		`Version=${version}`,
		"ProgramName=DENTE Dental CRM",
		"",
		"[Patient]",
		`ID=${patient.patientId}`,
		`NAME=${patient.lastName}`,
		`VORNAME=${patient.firstName}`,
		`GEBDAT=${formattedBirth}`,
		`GESCHL=${genderCode}`,
		"",
		"[XRay]",
		`AUFNAHMEART=${modalityCode}`,
		`AKTION=${action}`,
		`RUECKGABE=${returnFile}`,
	];

	if (patient.toothCode) {
		lines.push(`ZAHN=${patient.toothCode}`);
	}

	return `${lines.join("\r\n")}\r\n`;
}

/**
 * Parses VDDS-Media response file.
 */
export function parseVddsMediaResponse(content: string): VddsMediaResponse {
	if (!content || typeof content !== "string") {
		return { success: false, status: "ERROR", imagePaths: [], error: "Empty VDDS content" };
	}
	const lines = content.split(/\r?\n/);
	let patientId: string | undefined;
	let toothCode: string | undefined;
	let modality: string | undefined;
	let status = "SUCCESS";
	const imagePaths: string[] = [];

	for (const line of lines) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith(";") || trimmed.startsWith("#") || trimmed.startsWith("[")) continue;
		const eqIndex = trimmed.indexOf("=");
		if (eqIndex === -1) continue;
		const key = trimmed.slice(0, eqIndex).trim().toUpperCase();
		const val = trimmed.slice(eqIndex + 1).trim();

		if (key === "STATUS") {
			status = val.toUpperCase();
		} else if (key === "ID" || key === "PATIENTID") {
			patientId = val;
		} else if (key === "ZAHN" || key === "TOOTH") {
			toothCode = val;
		} else if (key === "AUFNAHMEART" || key === "MODALITY") {
			modality = val.toUpperCase();
		} else if (key === "FILE" || key === "DATEI" || key === "BILD" || key === "IMAGE" || key === "PATH") {
			imagePaths.push(val);
		}
	}

	return {
		success: status === "SUCCESS" || status === "OK" || status === "0",
		status,
		patientId,
		toothCode,
		modality,
		imagePaths,
	};
}

// -----------------------------------------------------------------------------
// Protocol 3: CLI Command-Line Bridge
// -----------------------------------------------------------------------------

export interface CommandLineBridgeOptions {
	readonly exePath?: string | undefined;
	readonly outputDir?: string | undefined;
	readonly extraArgs?: readonly string[] | undefined;
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

// -----------------------------------------------------------------------------
// Protocol 4: Hot Folder Watcher Metadata Extraction
// -----------------------------------------------------------------------------

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

/**
 * Parses radiology, mesh, document or photo filename from hot folder.
 */
export function parseHotFolderFilenameMetadata(
	fileName: string,
	targetPath?: string
): HotFolderFileMetadata {
	const safeName = fileName || "";
	const combinedPath = targetPath ? `${targetPath}/${safeName}` : safeName;
	const vendor = detectHardwareVendorFromPath(combinedPath);

	let toothCode: string | undefined;
	let patientId: string | undefined;

	// FDI notation: permanent (11..48) or primary/pediatric (51..85)
	const matchTooth = safeName.match(
		/(?:tooth[_-]?|зуб[_-]?|_|-)([1-4][1-8]|5[1-5]|6[1-5]|7[1-5]|8[1-5])(?:\b|_|-|\.|$)/i
	);
	if (matchTooth) {
		toothCode = matchTooth[1];
	}

	// Patient ID extraction: patient_123, pat-123, pid-123, p-123, id_123, chart_123
	const matchPatient = safeName.match(
		/(?:^|[_\W])(?:patient[_-]?|пациент[_-]?|pat[_-]?|pid[_-]?|p[_-]|id[_-]|chart[_-]?)([A-Za-z0-9]+)(?=[_\W]|$)/i
	);
	if (matchPatient) {
		patientId = matchPatient[1];
	}

	const ext = safeName.includes(".") ? `.${safeName.split(".").pop()!.toLowerCase()}` : "";
	const isDicom = [".dcm", ".dicom", ".ima"].includes(ext);
	const isMesh = [".stl", ".ply", ".obj"].includes(ext);
	const isDoc = [".pdf", ".tif", ".tiff"].includes(ext);
	const isImage = [".jpg", ".jpeg", ".png", ".bmp", ".webp"].includes(ext);

	const photoProtocolSlot = matchPhotoProtocolSlot(safeName);

	let fileCategory: HotFolderFileMetadata["fileCategory"] = "standard_image";
	let modality: HotFolderFileMetadata["modality"] = "IO";

	const lowerName = safeName.toLowerCase();
	const isCbct = lowerName.includes("cbct") || lowerName.includes("ct") || lowerName.includes("3d") || lowerName.includes("tomography");
	const isPan = lowerName.includes("pan") || lowerName.includes("opg") || lowerName.includes("pax") || lowerName.includes("orthophos");

	if (isDicom) {
		fileCategory = "dicom";
		modality = isCbct ? "CT" : isPan ? "PX" : "IO";
	} else if (isMesh) {
		fileCategory = "mesh";
		modality = "3D_SCAN";
	} else if (isDoc) {
		fileCategory = "document";
		modality = "DOC";
	} else if (photoProtocolSlot || lowerName.includes("dcim") || lowerName.includes("photo") || lowerName.includes("портрет") || lowerName.includes("улыбка")) {
		fileCategory = "photo";
		modality = "PHOTO";
	} else if (isImage) {
		fileCategory = "standard_image";
		modality = toothCode ? "IO" : isCbct ? "CT" : isPan ? "PX" : "DX";
	}

	return {
		fileName: safeName,
		fullPath: targetPath ? targetPath : undefined,
		toothCode,
		patientId,
		vendor,
		modality,
		fileCategory,
		photoProtocolSlot,
	};
}

/**
 * Backward-compatible helper for DICOM filename parsing.
 */
export function parseDicomFilenameMetadata(fileName: string): { toothCode?: string; patientId?: string } {
	const res = parseHotFolderFilenameMetadata(fileName);
	return { toothCode: res.toothCode, patientId: res.patientId };
}

// -----------------------------------------------------------------------------
// Protocol 5: TWAIN / WIA Unified 2D Frame Capture Catalog
// -----------------------------------------------------------------------------

export interface TwainDeviceDescriptor {
	readonly id: string;
	readonly name: string;
	readonly vendor: DentalHardwareVendor;
	readonly family: DentalHardwareFamily;
	readonly type: "sensor" | "scanner" | "camera" | "document_scanner";
	readonly connected: boolean;
	readonly supportedModalities: readonly string[];
}

/**
 * Standard TWAIN device catalog across all 5 dental equipment families.
 */
export function getTwainDeviceCatalog(): readonly TwainDeviceDescriptor[] {
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

function escapeXml(str: string): string {
	return str
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&apos;");
}
