/**
 * Windows workstation signal discovery (registry, profiles, running services).
 */
import path from "node:path";
import os from "node:os";
import { statSync } from "node:fs";
import type { MigrationLocalSourceDiscoveryCandidate, MigrationLocalSourceDiscoveryRequest } from "@dental/shared";
import { uniqueStrings, legacySourceTitles } from "./smartImportsUtils.js";
import { execFileAsync, migrationWorkstationProfiles } from "./smartImportsConstants.js";
import {
  migrationRootExists,
  migrationAvailableWindowsDriveRoots,
  migrationDriveDataRoots,
  migrationDirectoryPriority,
  migrationFingerprint,
  migrationProfileSafeAlias,
  registerMigrationSourceRoute,
  migrationWorkstationProfileMatches
} from "./smartImportsRoots.js";

export type MigrationWorkstationSignalCandidate = {
	channel: "configured" | "process" | "service" | "installed_app" | "shortcut";
	value: string;
	profiles: (typeof migrationWorkstationProfiles)[number][];
};

export function migrationWorkstationSignalChannelTitle(
	channel: MigrationWorkstationSignalCandidate["channel"],
) {
	if (channel === "shortcut") return "ярлык ОС";
	if (channel === "installed_app") return "установленная программа";
	if (channel === "process") return "процесс ОС";
	if (channel === "service") return "служба ОС";
	return "настроенный сигнал";
}

export function normalizeMigrationSignalValues(value: string | undefined) {
	return (value ?? "")
		.split(/\r?\n|[;|]/)
		.map((item) => item.trim())
		.filter((item) => item.length >= 3)
		.slice(0, 120);
}

export async function readWindowsMigrationWorkstationSignalValues(
	warnings: Set<string>,
) {
	if (os.platform() !== "win32")
		return [] as Array<{
			channel: "process" | "service" | "installed_app" | "shortcut";
			value: string;
		}>;
	const rxPattern =
		"sidexis|sirona|romexis|planmeca|vatech|ezdent|carestream|kodak|morita|idixel|i-dixel|veraview|newtom|new tom|nnt|myray|cefla|owandy|quickvision|quick vision|dexis|kavo|ka vo|gendex|acteon|sopro|sopix|pspix|x-mind|x mind|ondemand|invivo|cliniview|dbswin|vistasoft|digora|soredex|trophy|visiodent|mediadent|vixwin|sopro|schick|dtx|3shape|medit|exocad|firebird|interbase|sqlite|mssql|sql|dbf|dbase|foxpro|clipper|paradox|1cv8|1c|cliniccards|dental|stomatology|opendental|open dental|dentrix|eaglesoft|patterson|infoclinica|infodent|dentasoft|clinic365|sycret|secret dent|adenta|dentcrm24|clientix|klientix|medods|dentaltap|istom|qstoma|macdent|stombox|medangel|medialog|arnica|ident|stomx|dicom|pacs|rvg|xray|cbct|opg";
	if (!/^[a-zA-Z0-9_| -]+$/.test(rxPattern)) {
		throw new Error("Недопустимые символы в шаблоне поиска миграции");
	}
	const script = [
		"$ErrorActionPreference='SilentlyContinue'",
		"$rx = $env:MIGRATION_RX",
		"$rows = @()",
		"$processes = Get-Process | Select-Object -First 500 -Property ProcessName,Path | ForEach-Object { ([string]$_.ProcessName + ' || ' + [string]$_.Path) } | Where-Object { $_ -match $rx }",
		"$services = Get-CimInstance Win32_Service | Select-Object -First 1000 -Property Name,DisplayName,PathName | ForEach-Object { ([string]$_.Name + ' || ' + [string]$_.DisplayName + ' || ' + [string]$_.PathName) } | Where-Object { $_ -match $rx }",
		"$uninstallPaths = @('HKLM:\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*','HKLM:\\Software\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*','HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*')",
		"$apps = foreach ($p in $uninstallPaths) { Get-ItemProperty -Path $p | Select-Object -First 800 -Property DisplayName,InstallLocation,InstallSource,DisplayIcon | ForEach-Object { ([string]$_.DisplayName + ' || ' + [string]$_.InstallLocation + ' || ' + [string]$_.InstallSource + ' || ' + [string]$_.DisplayIcon) } }",
		"$apps = $apps | Where-Object { $_ -and $_ -match $rx } | Select-Object -First 160",
		"$shortcutRoots = @([Environment]::GetFolderPath('Desktop'),[Environment]::GetFolderPath('CommonDesktopDirectory'),[Environment]::GetFolderPath('StartMenu'),[Environment]::GetFolderPath('CommonStartMenu'))",
		"$shell = New-Object -ComObject WScript.Shell",
		"$shortcuts = foreach ($root in $shortcutRoots) { if ($root -and (Test-Path $root)) { Get-ChildItem -Path $root -Filter *.lnk -Recurse -ErrorAction SilentlyContinue | Select-Object -First 400 | ForEach-Object { $lnk = $shell.CreateShortcut($_.FullName); ([string]$_.Name + ' || ' + [string]$lnk.TargetPath + ' || ' + [string]$lnk.Arguments + ' || ' + [string]$lnk.WorkingDirectory) } } }",
		"$shortcuts = $shortcuts | Where-Object { $_ -and $_ -match $rx } | Select-Object -First 160",
		"foreach ($p in $processes) { if ($p) { $rows += [pscustomobject]@{ channel='process'; value=[string]$p } } }",
		"foreach ($s in $services) { if ($s) { $rows += [pscustomobject]@{ channel='service'; value=[string]$s } } }",
		"foreach ($a in $apps) { if ($a) { $rows += [pscustomobject]@{ channel='installed_app'; value=[string]$a } } }",
		"foreach ($l in $shortcuts) { if ($l) { $rows += [pscustomobject]@{ channel='shortcut'; value=[string]$l } } }",
		"$rows | ConvertTo-Json -Compress",
	].join("; ");
	const encodedScript = Buffer.from(script, "utf16le").toString("base64");
	try {
		const psPath = path.join(
			process.env.WINDIR || "C:\\Windows",
			"System32",
			"WindowsPowerShell",
			"v1.0",
			"powershell.exe",
		);
		const { stdout } = await execFileAsync(
			psPath,
			[
				"-NoProfile",
				"-NonInteractive",
				"-ExecutionPolicy",
				"Bypass",
				"-EncodedCommand",
				encodedScript,
			],
			{
				timeout: 2500,
				maxBuffer: 160 * 1024,
				windowsHide: true,
				env: { ...process.env, MIGRATION_RX: rxPattern },
			},
		);
		if (!stdout.trim()) return [];
		const parsed = JSON.parse(stdout);
		const rows = Array.isArray(parsed) ? parsed : [parsed];
		return rows
			.map((row) => {
				const channelRaw = String(row?.channel ?? "").trim();
				const value = String(row?.value ?? "").trim();
				return {
					channel:
						channelRaw === "service"
							? ("service" as const)
							: channelRaw === "installed_app"
								? ("installed_app" as const)
								: channelRaw === "shortcut"
									? ("shortcut" as const)
									: ("process" as const),
					value,
				};
			})
			.filter((row) => row.value.length >= 3);
	} catch (err) {
		console.error("[Dente] context:", err);
		warnings.add(
			"Системные сигналы рабочей станции не прочитаны: поиск продолжился по доступным папкам и ярлыкам без списка процессов, служб и установленных программ.",
		);
		return [];
	}
}

export async function collectMigrationWorkstationSignals(
	input: MigrationLocalSourceDiscoveryRequest,
	warnings: Set<string>,
) {
	if (!input.includeWorkstationSignals || input.maxWorkstationSignals <= 0)
		return [];
	const configuredSignals = normalizeMigrationSignalValues(
		process.env.DENTAL_MIGRATION_WORKSTATION_SIGNALS,
	).map((value) => ({
		channel: "configured" as const,
		value,
	}));
	const configuredInstalledApps = normalizeMigrationSignalValues(
		process.env.DENTAL_MIGRATION_WORKSTATION_APPS,
	).map((value) => ({
		channel: "installed_app" as const,
		value,
	}));
	const configuredShortcuts = normalizeMigrationSignalValues(
		process.env.DENTAL_MIGRATION_WORKSTATION_SHORTCUTS,
	).map((value) => ({
		channel: "shortcut" as const,
		value,
	}));
	const systemSignals =
		await readWindowsMigrationWorkstationSignalValues(warnings);
	const signals = [
		...configuredSignals,
		...configuredInstalledApps,
		...configuredShortcuts,
		...systemSignals,
	];
	const unique = new Map<string, MigrationWorkstationSignalCandidate>();
	for (const signal of signals) {
		const profiles = migrationWorkstationProfileMatches(signal.value);
		if (!profiles.length) continue;
		const primary = profiles[0];
		if (!primary) continue;
		const key = `${signal.channel}:${primary.label}:${migrationFingerprint(signal.value)}`;
		if (!unique.has(key)) {
			unique.set(key, { ...signal, profiles });
		}
		if (unique.size >= input.maxWorkstationSignals) break;
	}
	return Array.from(unique.values());
}

export function migrationIsTooBroadDerivedRoot(root: string) {
	const normalized = path.resolve(root).toLowerCase();
	const parsed = path.parse(normalized);
	if (normalized === parsed.root.toLowerCase()) return true;
	const broadNames = new Set([
		"program files",
		"program files (x86)",
		"windows",
		"users",
		"documents and settings",
		"appdata",
	]);
	return broadNames.has(path.basename(normalized));
}

export function migrationExistingDirectory(value: string) {
	try {
		const resolved = path.resolve(value);
		const stat = statSync(resolved);
		if (stat.isDirectory()) return resolved;
		if (stat.isFile()) return path.dirname(resolved);
		return null;
	} catch (err) {
		console.error("[Dente] context:", err);
		return null;
	}
}

export function migrationSignalPathFragments(value: string) {
	const fragments = new Set<string>();
	const parts = value
		.split(/\s+\|\|\s+/)
		.map((part) => part.trim().replace(/^["']|["']$/g, ""))
		.filter(Boolean);
	for (const part of parts) {
		const executable = part.match(
			/([A-Za-zА-Яа-яЁё]:[\\/][^|"\r\n]+?\.(?:exe|bat|cmd|lnk|appref-ms|msc|dll|db|sqlite|fdb|gdb|fbk|ib|ibk|gbk|mdb|accdb|dbf|dbt|fpt|cdx|idx|ntx|ndx|mdx|1cd|dt|bak|dcm|dicom|ima))/i,
		)?.[1];
		if (executable) fragments.add(executable.trim());
		const absolute = part.match(
			/^([A-Za-zА-Яа-яЁё]:[\\/][^|"\r\n]+|\\\\[^|"\r\n]+)/i,
		)?.[1];
		if (absolute) fragments.add(absolute.trim());
	}
	if (!fragments.size) {
		const executable = value.match(
			/([A-Za-zА-Яа-яЁё]:[\\/][^|"\r\n]+?\.(?:exe|bat|cmd|lnk|appref-ms|msc|dll|db|sqlite|fdb|gdb|fbk|ib|ibk|gbk|mdb|accdb|dbf|dbt|fpt|cdx|idx|ntx|ndx|mdx|1cd|dt|bak|dcm|dicom|ima))/i,
		)?.[1];
		if (executable) fragments.add(executable.trim());
	}
	return Array.from(fragments);
}

export function migrationNearbyDataRoots(baseDirectory: string) {
	const nearbyNames = [
		"Data",
		"DB",
		"Database",
		"Bases",
		"Base",
		"Backup",
		"Backups",
		"Export",
		"Exports",
		"Archive",
		"Storage",
		"Old",
		"Legacy",
		"Migration",
		"Stomatology",
		"Stomatologia",
		"Patients",
		"PatientDB",
		"ClinicDB",
		"Images",
		"DICOM",
		"PACS",
		"XRay",
		"X-Ray",
		"CBCT",
		"RVG",
		"OPG",
		"Pano",
		"Panoramic",
		"Radiology",
		"Orthanc",
		"dcm4chee",
		"КЛКТ",
		"ОПТГ",
		"Снимки",
		"Рентген",
		"Пациенты",
		"Картотека",
		"База",
		"База пациентов",
		"Старая база",
		"Старая МИС",
		"Архив",
		"Архив клиники",
		"Выгрузка",
	];
	const parent = path.dirname(baseDirectory);
	return [
		baseDirectory,
		...nearbyNames.map((name) => path.join(baseDirectory, name)),
		...(parent && parent !== baseDirectory
			? [parent, ...nearbyNames.map((name) => path.join(parent, name))]
			: []),
	];
}

export function migrationProfileRelativeDataRoots(
	profile: (typeof migrationWorkstationProfiles)[number],
) {
	if (/romexis|planmeca/i.test(profile.label)) {
		return [
			"Planmeca",
			"Romexis",
			path.join("Planmeca", "Romexis"),
			path.join("Planmeca", "RomexisData"),
			"RomexisData",
		];
	}
	if (/sidexis|sirona/i.test(profile.label)) {
		return [
			"Sirona",
			"Sidexis",
			path.join("Sirona", "Sidexis"),
			path.join("Sirona", "SIDEXIS"),
			"SIDEXIS",
		];
	}
	if (/vatech|ezdent/i.test(profile.label)) {
		return [
			"Vatech",
			"EzDent",
			"EzDent-i",
			"Ez3D",
			path.join("Vatech", "EzDent-i"),
			path.join("Vatech", "Ez3D"),
		];
	}
	if (/carestream|kodak/i.test(profile.label)) {
		return [
			"Carestream",
			"Kodak",
			"CS Imaging",
			path.join("Carestream", "CS Imaging"),
		];
	}
	if (/morita|i-dixel/i.test(profile.label)) {
		return [
			"Morita",
			"J Morita",
			"i-Dixel",
			"iDixel",
			"Veraview",
			path.join("J Morita", "i-Dixel"),
			path.join("Morita", "i-Dixel"),
		];
	}
	if (/newtom|nnt|myray/i.test(profile.label)) {
		return [
			"NewTom",
			"NNT",
			"MyRay",
			"Cefla",
			path.join("Cefla", "NewTom"),
			path.join("Cefla", "NNT"),
			path.join("MyRay", "Data"),
		];
	}
	if (/owandy|quickvision/i.test(profile.label)) {
		return ["Owandy", "QuickVision", path.join("Owandy", "QuickVision")];
	}
	if (/dexis|kavo|gendex/i.test(profile.label)) {
		return [
			"DEXIS",
			"KaVo",
			"Gendex",
			path.join("DEXIS", "Data"),
			path.join("KaVo", "Data"),
			path.join("Gendex", "Images"),
		];
	}
	if (/acteon|sopro|sopix|pspix|x-mind/i.test(profile.label)) {
		return [
			"Acteon",
			"SOPRO",
			"SOPIX",
			"PSPIX",
			"X-Mind",
			path.join("Acteon", "Imaging"),
			path.join("SOPRO", "Images"),
			path.join("PSPIX", "Data"),
		];
	}
	if (/cliniccards/i.test(profile.label)) return ["Cliniccards", "ClinicCards"];
	if (/dental4windows/i.test(profile.label)) return ["Dental4Windows", "D4W"];
	if (/sycret|secret/i.test(profile.label))
		return [
			"Sycret Dent",
			"Secret Dent",
			"SycretDent",
			path.join("Sycret Dent", "Data"),
		];
	if (/адента|adenta/i.test(profile.label))
		return [
			"Адента",
			"Adenta",
			"Adenta Professional",
			path.join("Adenta", "Data"),
		];
	if (/dent\.?crm24|dentcrm24/i.test(profile.label))
		return ["DentCRM24", "Dent.CRM24", path.join("DentCRM24", "Data")];
	if (/клиентикс|clientix|klientix/i.test(profile.label))
		return [
			"Клиентикс",
			"Clientix",
			"Клиентикс Улыбка",
			path.join("Clientix", "Data"),
		];
	if (/2v/i.test(profile.label))
		return ["2V", "2V Stomatology", "2V-Стоматология", path.join("2V", "Data")];
	if (/future\s*it/i.test(profile.label))
		return [
			"Future IT Dent",
			"FutureITDent",
			path.join("Future IT Dent", "Data"),
		];
	if (/32top/i.test(profile.label))
		return ["32top", "32 top", path.join("32top", "Data")];
	if (/medods/i.test(profile.label))
		return ["MEDODS", "Medods", path.join("MEDODS", "Data")];
	if (/dentaltap/i.test(profile.label))
		return ["DentalTap", "Dental Tap", path.join("DentalTap", "Data")];
	if (
		/open dental|opendentimages|dentrix|eaglesoft|patterson|softdent|practiceworks|curve dental|denticon|tab32|dolphin/i.test(
			profile.label,
		)
	) {
		return [
			"OpenDental",
			"Open Dental",
			"OpenDentImages",
			"OpenDentImages AtoZ",
			"AtoZ",
			"Dentrix",
			"Dentrix Common",
			"Eaglesoft",
			"Patterson",
			"SoftDent",
			"PracticeWorks",
			"Curve Dental",
			"Denticon",
			"tab32",
			"Dolphin Management",
			"Dolphin Imaging",
		];
	}
	if (/infodent|инфодент|denta office/i.test(profile.label))
		return ["Infodent", "ИНФОДЕНТ", "Denta Office", "DentaOffice"];
	if (/infoclinica|инфоклиника/i.test(profile.label))
		return ["Infoclinica", "InfoClinic", "Инфоклиника"];
	if (/istom|iStom|ай\s*стом/i.test(profile.label))
		return ["iStom", "IStom", "АйСтом", path.join("iStom", "Data")];
	if (/qstoma|кью\s*стома/i.test(profile.label))
		return ["QStoma", "Q Stoma", "КьюСтома", path.join("QStoma", "Data")];
	if (/бит\.?\s*стоматолог|bit\.?\s*stomatolog/i.test(profile.label)) {
		return [
			"БИТ.Стоматология",
			"BIT.Stomatology",
			"1C-Бит.Стоматология",
			path.join("1C", "БИТ.Стоматология"),
		];
	}
	if (/macdent|mac\s*dent/i.test(profile.label))
		return ["MacDent", path.join("MacDent", "Data")];
	if (/stombox|stom\s*box/i.test(profile.label))
		return ["Stombox", "StomBox", path.join("Stombox", "Data")];
	if (/1c|1cv8/i.test(profile.label)) return ["1C", "1Cv8", "1cv8"];
	if (/ident|stomx/i.test(profile.label)) return ["IDENT", "StomX", "Ident"];
	if (/firebird|interbase/i.test(profile.label))
		return ["Firebird", "InterBase"];
	if (/3shape|medit|exocad/i.test(profile.label))
		return ["3Shape", "Medit", "Exocad"];
	return profile.label
		.split(/[/|]/)
		.map((part) => part.trim())
		.filter((part) => part.length >= 3 && part.length <= 40);
}

export function migrationProfileDataRootBases() {
	const home = os.homedir();
	const programData = process.env.ProgramData || "C:\\ProgramData";
	const localAppData =
		process.env.LOCALAPPDATA || path.join(home, "AppData", "Local");
	const roamingAppData =
		process.env.APPDATA || path.join(home, "AppData", "Roaming");
	const publicRoot =
		process.env.PUBLIC ||
		path.join(path.parse(home).root || "C:\\", "Users", "Public");
	return [
		programData,
		localAppData,
		roamingAppData,
		path.join(home, "Documents"),
		path.join(home, "Desktop"),
		path.join(home, "Downloads"),
		path.join(home, "Pictures"),
		path.join(publicRoot, "Documents"),
		path.join(publicRoot, "Desktop"),
	];
}

export function migrationRootsFromWorkstationProfiles(
	profiles: (typeof migrationWorkstationProfiles)[number][],
) {
	const roots: string[] = [];
	for (const profile of profiles) {
		for (const relativeRoot of migrationProfileRelativeDataRoots(profile)) {
			for (const baseRoot of migrationProfileDataRootBases()) {
				const root = path.join(baseRoot, relativeRoot);
				if (!migrationIsTooBroadDerivedRoot(root) && migrationRootExists(root))
					roots.push(root);
			}
		}
	}
	return uniqueStrings(roots).slice(0, 80);
}

export function migrationRootsFromWorkstationSignals(
	signals: MigrationWorkstationSignalCandidate[],
) {
	const roots: string[] = [];
	for (const signal of signals) {
		roots.push(...migrationRootsFromWorkstationProfiles(signal.profiles));
		for (const fragment of migrationSignalPathFragments(signal.value)) {
			const directory = migrationExistingDirectory(fragment);
			if (!directory || migrationIsTooBroadDerivedRoot(directory)) continue;
			for (const root of migrationNearbyDataRoots(directory)) {
				if (!migrationIsTooBroadDerivedRoot(root) && migrationRootExists(root))
					roots.push(root);
			}
		}
	}
	return uniqueStrings(roots).slice(0, 80);
}

export async function readWindowsMigrationMappedRoots(warnings: Set<string>) {
	if (os.platform() !== "win32") return [] as string[];
	const script = [
		"$ErrorActionPreference='SilentlyContinue'",
		"$roots = @()",
		"Get-PSDrive -PSProvider FileSystem | Select-Object -First 80 | ForEach-Object { $roots += [pscustomobject]@{ root=[string]$_.Root; displayRoot=[string]$_.DisplayRoot } }",
		"$roots | ConvertTo-Json -Compress",
	].join("; ");
	const encodedScript = Buffer.from(script, "utf16le").toString("base64");
	try {
		const psPath = path.join(
			process.env.WINDIR || "C:\\Windows",
			"System32",
			"WindowsPowerShell",
			"v1.0",
			"powershell.exe",
		);
		const { stdout } = await execFileAsync(
			psPath,
			[
				"-NoProfile",
				"-NonInteractive",
				"-ExecutionPolicy",
				"Bypass",
				"-EncodedCommand",
				encodedScript,
			],
			{
				timeout: 1600,
				maxBuffer: 80 * 1024,
				windowsHide: true,
			},
		);
		if (!stdout.trim()) return [];
		const parsed = JSON.parse(stdout);
		const rows = Array.isArray(parsed) ? parsed : [parsed];
		const roots: string[] = [];
		for (const row of rows) {
			const root = String(row?.root ?? "").trim();
			const displayRoot = String(row?.displayRoot ?? "").trim();
			if (/^[D-Z]:\\$/i.test(root)) roots.push(root);
			if (displayRoot.startsWith("\\\\")) roots.push(displayRoot);
		}
		return uniqueStrings(roots)
			.filter((root) => migrationRootExists(root))
			.slice(0, 32);
	} catch (err) {
		console.error("[Dente] context:", err);
		warnings.add(
			"Сетевые и внешние диски не удалось прочитать автоматически: поиск продолжился по доступным папкам и вручную указанным корням.",
		);
		return [];
	}
}

export function migrationCandidateFromWorkstationSignal(
	signal: MigrationWorkstationSignalCandidate,
): MigrationLocalSourceDiscoveryCandidate | null {
	const primaryProfile = signal.profiles[0];
	if (!primaryProfile) return null;
	const sourceRef = `workstation-signal:${migrationFingerprint(`${signal.channel}:${signal.value}`)}`;
	const reasons = [
		`${primaryProfile.label}: ${primaryProfile.reason}`,
		`${migrationWorkstationSignalChannelTitle(signal.channel)} похож на установленную старую CRM, снимки или базу`,
	];
	signal.profiles.slice(1, 3).forEach((profile) => {
		reasons.push(`${profile.label}: ${profile.reason}`);
	});
	return {
		sourceRef,
		safeDisplayName: migrationProfileSafeAlias(
			primaryProfile.label,
			primaryProfile.kind,
			sourceRef,
		),
		sourceKind: primaryProfile.kind,
		sourceLabel: "Системный след рабочей станции",
		sourceFingerprint: migrationFingerprint(sourceRef),
		depth: 0,
		confidence: 0.62,
		matchedFiles: 0,
		databaseFiles: 0,
		dumpFiles: 0,
		tableFiles: 0,
		archiveFiles: 0,
		dicomLikeFiles: 0,
		imageFiles: 0,
		hasDicomDir: false,
		latestModifiedAt: null,
		reasons,
		warnings: [
			"Найден системный след старой программы без файлов данных: нужна штатная выгрузка, резервная копия, папка данных или локальный модуль только для чтения.",
			"Автопоиск не раскрывает имя процесса, службы, установленной программы, ярлыка, командную строку, локальные пути, пациентов или снимки.",
		],
		smartImportLine: `${legacySourceTitles[primaryProfile.kind]} ${sourceRef}`,
	};
}

export interface MigrationDiscoveryQueueItem {
	root: string;
	folderPath: string;
	depth: number;
}
