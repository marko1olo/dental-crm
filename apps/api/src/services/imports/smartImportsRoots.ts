/**
 * Discovery root candidate identification and path ranking.
 */
import { createHash } from "node:crypto";
import { existsSync, statSync } from "node:fs";
import { open } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { MigrationLocalSourceDiscoveryCandidate, SmartImportLegacySource } from "@dental/shared";
import { uniqueStrings, legacySourceTitles } from "./smartImportsUtils.js";
import {
  migrationWorkstationProfiles,
  migrationVendorGuidanceCatalog,
  migrationDiscoverySkipDirectoryNames,
  migrationClinicDataContainerPattern,
  migrationClinicDataContainerHint,
  legacyMisTextPattern,
  imagingVendorPattern,
  imagingVendorSupplementalPattern,
  legacySourceSupplementalKeywordPattern,
  migrationDatabaseExtensions,
  migrationDumpExtensions,
  migrationDicomExtensions,
  migrationTableExtensions,
  migrationArchiveExtensions,
  migrationImageExtensions
} from "./smartImportsConstants.js";

export function migrationConfiguredRootsEnv(name: string) {
	return (
		process.env[name]
			?.split(/[;|]/)
			.map((root) => root.trim())
			.filter(Boolean) ?? []
	);
}

export function migrationRootExists(root: string) {
	try {
		return existsSync(root);
	} catch (err) {
		console.error("[Dente] context:", err);
		return false;
	}
}

export function migrationAvailableWindowsDriveRoots() {
	if (os.platform() !== "win32") return [] as string[];
	const roots: string[] = [];
	for (let code = "D".charCodeAt(0); code <= "Z".charCodeAt(0); code += 1) {
		const root = `${String.fromCharCode(code)}:\\`;
		if (migrationRootExists(root)) roots.push(root);
	}
	return roots;
}

export function migrationDriveDataRoots(driveRoots: string[]) {
	const folderHints = [
		"Dental",
		"Denta",
		"Stomatology",
		"Stomatologia",
		"Стоматология",
		"Клиника",
		"Пациенты",
		"База пациентов",
		"Старая база",
		"Старая МИС",
		"Архив клиники",
		"Выгрузка",
		"Выгрузки",
		"DICOM",
		"PACS",
		"Images",
		"XRay",
		"X-Ray",
		"CBCT",
		"КЛКТ",
		"ОПТГ",
		"Pano",
		"Panoramic",
		"Radiology",
		"Orthanc",
		"dcm4chee",
		"КТ",
		"Снимки",
		"Рентген",
		"Backup",
		"Export",
		"1C",
		"1Cv8",
		"Sidexis",
		"Romexis",
		"Planmeca",
		"Vatech",
		"Carestream",
		"Morita",
		"i-Dixel",
		"NewTom",
		"NNT",
		"MyRay",
		"Owandy",
		"QuickVision",
		"DEXIS",
		"KaVo",
		"Gendex",
		"Acteon",
		"SOPRO",
		"SOPIX",
		"PSPIX",
		"X-Mind",
		"Infoclinica",
		"Infodent",
		"ИНФОДЕНТ",
		"Denta Office",
		"ClinicCards",
		"DentalSoft",
		"Sycret Dent",
		"Secret Dent",
		"Адента",
		"Adenta",
		"DentCRM24",
		"Dent.CRM24",
		"Клиентикс",
		"Clientix",
		"Клиентикс Улыбка",
		"2V",
		"2V Stomatology",
		"Future IT Dent",
		"FutureITDent",
		"32top",
		"MEDODS",
		"DentalTap",
		"iStom",
		"IStom",
		"АйСтом",
		"QStoma",
		"Q Stoma",
		"БИТ.Стоматология",
		"BIT.Stomatology",
		"MacDent",
		"Stombox",
		"OpenDental",
		"Open Dental",
		"OpenDentImages",
		"OpenDentImages AtoZ",
		"AtoZ",
		"Dentrix",
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
	return driveRoots.flatMap((root) => [
		root,
		...folderHints.map((folder) => path.join(root, folder)),
	]);
}

export function migrationDiscoveryDefaultRoots() {
	const configured = [
		...migrationConfiguredRootsEnv("DENTAL_MIGRATION_DISCOVERY_ROOTS"),
		...migrationConfiguredRootsEnv("DENTAL_MIGRATION_NETWORK_ROOTS"),
	];
	const home = os.homedir();
	const programData = process.env.ProgramData || "C:\\ProgramData";
	const programFiles = process.env.ProgramFiles || "C:\\Program Files";
	const programFilesX86 =
		process.env["ProgramFiles(x86)"] || "C:\\Program Files (x86)";
	const localAppData =
		process.env.LOCALAPPDATA || path.join(home, "AppData", "Local");
	const roamingAppData =
		process.env.APPDATA || path.join(home, "AppData", "Roaming");
	const publicRoot = process.env.PUBLIC || "C:\\Users\\Public";
	const publicDocuments = path.join(publicRoot, "Documents");
	const publicDesktop = path.join(publicRoot, "Desktop");
	const userStartMenu = path.join(
		roamingAppData,
		"Microsoft",
		"Windows",
		"Start Menu",
		"Programs",
	);
	const commonStartMenu = path.join(
		programData,
		"Microsoft",
		"Windows",
		"Start Menu",
		"Programs",
	);
	const knownMigrationAppFolders = [
		"Sidexis",
		"Sirona",
		"Romexis",
		"Planmeca",
		"Vatech",
		"EzDent-i",
		"EzDent",
		"Ez3D",
		"Carestream",
		"Kodak",
		"CS Imaging",
		"OnDemand3D",
		"Invivo",
		"Cliniview",
		"DBSWIN",
		"VistaSoft",
		"Digora",
		"Soredex",
		"Trophy",
		"Visiodent",
		"DTX Studio Clinic",
		"Mediadent",
		"VixWin",
		"Sopro",
		"Schick",
		"Morita",
		"J Morita",
		"i-Dixel",
		"iDixel",
		"Veraview",
		"NewTom",
		"NNT",
		"MyRay",
		"Cefla",
		"Owandy",
		"QuickVision",
		"DEXIS",
		"KaVo",
		"Gendex",
		"Acteon",
		"SOPRO",
		"SOPIX",
		"PSPIX",
		"X-Mind",
		"Dental",
		"Stomatology",
		"Stomatologia",
		"Стоматология",
		"Клиника",
		"Пациенты",
		"База пациентов",
		"Старая база",
		"Старая МИС",
		"Архив клиники",
		"Выгрузка",
		"Снимки",
		"Рентген",
		"КЛКТ",
		"ОПТГ",
		"DentalSoft",
		"Denta",
		"Clinic365",
		"DentalCloud",
		"Sycret Dent",
		"Secret Dent",
		"Адента",
		"Adenta",
		"DentCRM24",
		"Dent.CRM24",
		"Клиентикс",
		"Clientix",
		"Клиентикс Улыбка",
		"2V",
		"2V Stomatology",
		"Future IT Dent",
		"FutureITDent",
		"32top",
		"MEDODS",
		"DentalTap",
		"IDENT",
		"StomX",
		"iStom",
		"IStom",
		"АйСтом",
		"QStoma",
		"Q Stoma",
		"БИТ.Стоматология",
		"BIT.Stomatology",
		"1C-Бит.Стоматология",
		"MacDent",
		"Stombox",
		"Infoclinica",
		"Infodent",
		"Denta Office",
		"ClinicCards",
		"Dental4Windows",
		"OpenDental",
		"Open Dental",
		"OpenDentImages",
		"OpenDentImages AtoZ",
		"AtoZ",
		"Dentrix",
		"Eaglesoft",
		"Patterson",
		"SoftDent",
		"PracticeWorks",
		"Curve Dental",
		"Denticon",
		"tab32",
		"Dolphin Management",
		"Dolphin Imaging",
		"MedAngel",
		"Medialog",
		"Arnica",
		"3Shape",
		"Medit",
		"Exocad",
	];
	const knownMigrationAppRoots = knownMigrationAppFolders.flatMap((folder) => [
		path.join("C:\\", folder),
		path.join(programData, folder),
		path.join(localAppData, folder),
		path.join(roamingAppData, folder),
		path.join(programFiles, folder),
		path.join(programFilesX86, folder),
	]);
	const driveRoots = migrationAvailableWindowsDriveRoots();
	const roots = [
		...configured,
		path.join(home, "Downloads"),
		path.join(home, "Desktop"),
		path.join(home, "Documents"),
		path.join(home, "Pictures"),
		path.join(home, "OneDrive", "Documents"),
		path.join(home, "OneDrive", "Pictures"),
		publicDesktop,
		publicDocuments,
		userStartMenu,
		commonStartMenu,
		"C:\\Dental",
		"C:\\Denta",
		"C:\\Stomatology",
		"C:\\Стоматология",
		"C:\\Клиника",
		"C:\\Пациенты",
		"C:\\База пациентов",
		"C:\\Старая база",
		"C:\\Старая МИС",
		"C:\\Архив клиники",
		"C:\\Выгрузка",
		"C:\\Снимки",
		"C:\\Рентген",
		"C:\\КЛКТ",
		"C:\\ОПТГ",
		"C:\\Images",
		"C:\\XRay",
		"C:\\Sidexis",
		"C:\\Romexis",
		"C:\\Morita",
		"C:\\i-Dixel",
		"C:\\NewTom",
		"C:\\NNT",
		"C:\\MyRay",
		"C:\\Owandy",
		"C:\\QuickVision",
		"C:\\DEXIS",
		"C:\\KaVo",
		"C:\\Gendex",
		"C:\\Acteon",
		"C:\\SOPRO",
		"C:\\SOPIX",
		"C:\\PSPIX",
		"C:\\X-Mind",
		"C:\\1C",
		"C:\\1Cv8",
		"C:\\Stom",
		"C:\\Stomatology",
		"C:\\Infoclinica",
		"C:\\Infodent",
		"C:\\DentaOffice",
		"C:\\ClinicCards",
		"C:\\Dental4Windows",
		"C:\\Sycret Dent",
		"C:\\Adenta",
		"C:\\DentCRM24",
		"C:\\Clientix",
		"C:\\2V",
		"C:\\Future IT Dent",
		"C:\\32top",
		"C:\\MEDODS",
		"C:\\DentalTap",
		"C:\\iStom",
		"C:\\QStoma",
		"C:\\BIT.Stomatology",
		"C:\\MacDent",
		"C:\\Stombox",
		"C:\\OpenDental",
		"C:\\Open Dental",
		"C:\\OpenDentImages",
		"C:\\OpenDentImages AtoZ",
		"C:\\AtoZ",
		"C:\\Dentrix",
		"C:\\Eaglesoft",
		"C:\\Patterson",
		"C:\\SoftDent",
		"C:\\PracticeWorks",
		"C:\\Curve Dental",
		"C:\\Denticon",
		"C:\\tab32",
		"C:\\Dolphin Management",
		"C:\\Dolphin Imaging",
		"C:\\DICOM",
		"C:\\PACS",
		programData,
		path.join(programData, "1C"),
		path.join(programData, "1Cv8"),
		path.join(programData, "Sidexis"),
		path.join(programData, "Romexis"),
		path.join(programData, "Vatech"),
		path.join(programData, "Carestream"),
		path.join(programData, "Planmeca"),
		path.join(programData, "DEXIS"),
		path.join(programData, "KaVo"),
		path.join(programData, "Gendex"),
		path.join(programData, "Acteon"),
		path.join(programData, "SOPRO"),
		path.join(programData, "SOPIX"),
		path.join(programData, "PSPIX"),
		path.join(programData, "X-Mind"),
		path.join(programData, "Dental"),
		path.join(programData, "Microsoft", "SQL Server"),
		path.join(programData, "Firebird"),
		path.join(localAppData, "Dental"),
		path.join(localAppData, "1C"),
		path.join(localAppData, "1Cv8"),
		path.join(localAppData, "Sidexis"),
		path.join(localAppData, "Romexis"),
		path.join(localAppData, "Vatech"),
		path.join(localAppData, "Carestream"),
		path.join(localAppData, "Planmeca"),
		path.join(localAppData, "DEXIS"),
		path.join(localAppData, "KaVo"),
		path.join(localAppData, "Gendex"),
		path.join(localAppData, "Acteon"),
		path.join(localAppData, "SOPRO"),
		path.join(localAppData, "SOPIX"),
		path.join(localAppData, "PSPIX"),
		path.join(localAppData, "X-Mind"),
		path.join(roamingAppData, "Dental"),
		path.join(roamingAppData, "1C"),
		path.join(roamingAppData, "1Cv8"),
		path.join(roamingAppData, "Sidexis"),
		path.join(roamingAppData, "Romexis"),
		path.join(roamingAppData, "Vatech"),
		path.join(roamingAppData, "Carestream"),
		path.join(roamingAppData, "Planmeca"),
		path.join(roamingAppData, "DEXIS"),
		path.join(roamingAppData, "KaVo"),
		path.join(roamingAppData, "Gendex"),
		path.join(roamingAppData, "Acteon"),
		path.join(roamingAppData, "SOPRO"),
		path.join(roamingAppData, "SOPIX"),
		path.join(roamingAppData, "PSPIX"),
		path.join(roamingAppData, "X-Mind"),
		path.join(programFiles, "Sidexis"),
		path.join(programFiles, "Romexis"),
		path.join(programFiles, "Vatech"),
		path.join(programFiles, "Carestream"),
		path.join(programFiles, "Planmeca"),
		path.join(programFiles, "DEXIS"),
		path.join(programFiles, "KaVo"),
		path.join(programFiles, "Gendex"),
		path.join(programFiles, "Acteon"),
		path.join(programFiles, "SOPRO"),
		path.join(programFiles, "SOPIX"),
		path.join(programFiles, "PSPIX"),
		path.join(programFiles, "X-Mind"),
		path.join(programFiles, "Dental"),
		path.join(programFilesX86, "Sidexis"),
		path.join(programFilesX86, "Romexis"),
		path.join(programFilesX86, "Vatech"),
		path.join(programFilesX86, "Carestream"),
		path.join(programFilesX86, "Planmeca"),
		path.join(programFilesX86, "DEXIS"),
		path.join(programFilesX86, "KaVo"),
		path.join(programFilesX86, "Gendex"),
		path.join(programFilesX86, "Acteon"),
		path.join(programFilesX86, "SOPRO"),
		path.join(programFilesX86, "SOPIX"),
		path.join(programFilesX86, "PSPIX"),
		path.join(programFilesX86, "X-Mind"),
		path.join(programFilesX86, "Dental"),
		...knownMigrationAppRoots,
		...migrationDriveDataRoots(driveRoots),
		"D:\\",
	];
	return Array.from(
		new Set(
			roots
				.map((root) => path.resolve(root))
				.filter((root) => migrationRootExists(root)),
		),
	);
}

export function migrationFingerprint(value: string) {
	const stableValue =
		/^https?:\/\//i.test(value) ||
		value.startsWith("\\\\") ||
		/^browser-local:/i.test(value) ||
		/^smart-preview:/i.test(value) ||
		/^workstation-profile:/i.test(value) ||
		/^workstation-signal:/i.test(value)
			? value
			: path.resolve(value);
	return createHash("sha1").update(stableValue).digest("hex").slice(0, 10);
}

export function safeMigrationDiscoveryRoot(root: string) {
	const trimmed = root.trim();
	if (
		/^(?:browser-local|smart-preview|workstation-profile|workstation-signal|migration-source|local-root|network-root|remote-root|source-root):[a-f0-9]{8,12}$/i.test(
			trimmed,
		)
	) {
		return trimmed;
	}
	const fingerprint = migrationFingerprint(trimmed).toUpperCase();
	if (trimmed.startsWith("\\\\")) return `network-root:${fingerprint}`;
	if (/^https?:\/\//i.test(trimmed)) return `remote-root:${fingerprint}`;
	if (path.isAbsolute(trimmed) || /^[A-Za-z]:[\\/]/.test(trimmed))
		return `local-root:${fingerprint}`;
	return `source-root:${fingerprint}`;
}

export function safeMigrationDiscoveryRoots(roots: string[]) {
	return uniqueStrings(roots.map((root) => safeMigrationDiscoveryRoot(root)));
}

export type MigrationSourceRoute = {
	sourceRef: string;
	sourceKind: SmartImportLegacySource["kind"];
	safeDisplayName: string;
	sourceFingerprint: string;
	createdAtMs: number;
};

export const migrationSourceRouteStore = new Map<string, MigrationSourceRoute>();

export function isMigrationPublicSourceToken(sourceRef: string) {
	return /^(?:browser-local|smart-preview|workstation-profile|workstation-signal):[a-f0-9]{8,12}$/i.test(
		sourceRef,
	);
}

export function isMigrationSourceRouteToken(sourceRef: string) {
	return /^migration-source:[a-f0-9]{8,12}$/i.test(sourceRef);
}

export function registerMigrationSourceRoute(
	sourceRef: string,
	sourceKind: SmartImportLegacySource["kind"],
	safeDisplayName: string,
) {
	if (isMigrationPublicSourceToken(sourceRef)) return sourceRef;
	const sourceFingerprint = migrationFingerprint(sourceRef);
	const token = `migration-source:${sourceFingerprint.toUpperCase()}`;
	migrationSourceRouteStore.set(token.toLowerCase(), {
		sourceRef,
		sourceKind,
		safeDisplayName,
		sourceFingerprint,
		createdAtMs: Date.now(),
	});
	return token;
}

export function resolveMigrationSourceRoute(sourceRef: string) {
	const trimmed = sourceRef.trim();
	if (!isMigrationSourceRouteToken(trimmed)) {
		return {
			requestedSourceRef: trimmed,
			sourceRef: trimmed,
			routeToken: null as string | null,
			routeExpired: false,
			route: null as MigrationSourceRoute | null,
		};
	}
	const route = migrationSourceRouteStore.get(trimmed.toLowerCase()) ?? null;
	return {
		requestedSourceRef: trimmed,
		sourceRef: route?.sourceRef ?? trimmed,
		routeToken: trimmed,
		routeExpired: !route,
		route,
	};
}

export function migrationDiscoveryDepth(root: string, folderPath: string) {
	const relative = path.relative(root, folderPath);
	if (!relative || relative === ".") return 0;
	return relative.split(path.sep).filter(Boolean).length;
}

export function migrationFolderHintScore(folderPath: string) {
	const normalized = folderPath.toLowerCase();
	let score = 0;
	if (
		/стомат|стоматология|dental|denta|clinic|клиник|mis|crm|legacy|migration|миграц|перенос|backup|dump|export|выгруз|стар(?:ая|ой)?|база\s*пациент|пациенты|картотек|архив\s*клиник/.test(
			normalized,
		)
	)
		score += 0.14;
	if (migrationClinicDataContainerHint(folderPath)) score += 0.16;
	if (
		legacyMisTextPattern.test(normalized) ||
		/sql\s*server|firebird|interbase|access/.test(normalized)
	)
		score += 0.2;
	if (imagingVendorPattern.test(normalized)) score += 0.18;
	if (
		/dicom|dicomdir|cbct|кт|ккт|rvg|opg|оптг|xray|x-ray|рентген|снимк|pacs|orthanc|dcm4chee|radiology|pano|panoramic/.test(
			normalized,
		)
	)
		score += 0.18;
	const profileMatches = migrationWorkstationProfileMatches(folderPath);
	if (profileMatches.length)
		score += Math.min(0.34, profileMatches.length * 0.16);
	return score;
}

export function migrationWorkstationProfileMatches(value: string) {
	return migrationWorkstationProfiles.filter((profile) =>
		profile.pattern.test(value),
	);
}

export function migrationVendorGuidanceMatches(value: string) {
	return migrationVendorGuidanceCatalog.filter((guidance) =>
		guidance.pattern.test(value),
	);
}

export function migrationDirectoryPriority(folderPath: string) {
	const profileMatches = migrationWorkstationProfileMatches(folderPath);
	const hintScore = migrationFolderHintScore(folderPath);
	if (profileMatches.length >= 2 || hintScore >= 0.34) return 2;
	if (profileMatches.length || hintScore >= 0.14) return 1;
	return 0;
}

export function migrationDiscoveryEntryPriority(
	entry: { name: string | Buffer; isDirectory(): boolean; isFile(): boolean },
	folderPath: string,
) {
	const entryName = entry.name.toString();
	const fullPath = path.join(folderPath, entryName);
	if (entry.isDirectory()) {
		const directoryPriority = migrationDirectoryPriority(fullPath);
		return (
			20 +
			directoryPriority * 35 +
			Math.round(migrationFolderHintScore(fullPath) * 20)
		);
	}
	if (!entry.isFile()) return 0;
	const extension = path.extname(entryName).toLowerCase();
	let priority = 0;
	if (/^DICOMDIR$/i.test(entryName)) priority += 100;
	if (migrationDatabaseExtensions.has(extension)) priority += 92;
	if (migrationDumpExtensions.has(extension)) priority += 84;
	if (migrationDicomExtensions.has(extension)) priority += 78;
	if (migrationTableExtensions.has(extension)) priority += 58;
	if (migrationArchiveExtensions.has(extension)) priority += 44;
	if (migrationImageExtensions.has(extension)) priority += 24;
	if (migrationWorkstationProfileMatches(fullPath).length) priority += 20;
	return priority;
}

export function migrationSourceKindFromCounts(input: {
	folderPath: string;
	firstMatchPath: string;
	databaseFiles: number;
	dumpFiles: number;
	tableFiles: number;
	archiveFiles: number;
	dicomLikeFiles: number;
	imageFiles: number;
	hasDicomDir: boolean;
}): SmartImportLegacySource["kind"] {
	const text = `${input.folderPath} ${input.firstMatchPath}`.toLowerCase();
	const profileKind = migrationWorkstationProfileMatches(text)[0]?.kind;
	if (profileKind === "vendor_imaging_system") return "vendor_imaging_system";
	if (
		imagingVendorPattern.test(text) ||
		imagingVendorSupplementalPattern.test(text)
	)
		return "vendor_imaging_system";
	if (
		input.hasDicomDir ||
		input.dicomLikeFiles > 0 ||
		/dicom|cbct|кт|ккт/.test(text)
	)
		return "dicom_folder";
	if (
		input.imageFiles > 8 ||
		/rvg|opg|оптг|xray|x-ray|рентген|снимк|фото/.test(text)
	)
		return "xray_image_archive";
	if (
		/\.fdb\b|\.gdb\b|\.fbk\b|\.ib\b|\.ibk\b|\.gbk\b|firebird|interbase/.test(
			text,
		)
	)
		return "firebird_database";
	if (/\.mdb\b|\.accdb\b|access\b/.test(text)) return "access_database";
	if (
		/\.dbf\b|\.dbt\b|\.fpt\b|\.cdx\b|\.idx\b|\.ntx\b|\.ndx\b|\.mdx\b|dbase|foxpro|visual\s*foxpro|clipper|paradox/.test(
			text,
		)
	)
		return "mis_database";
	if (/\.sqlite\b|\.sqlite3\b|sqlite|\.db\b/.test(text))
		return "sqlite_database";
	if (
		/mysql|mariadb|postgres|postgresql|pgsql|psql|\.myd\b|\.myi\b|\.frm\b|\.ibd\b/.test(
			text,
		)
	)
		return "mis_database";
	if (
		input.dumpFiles > 0 ||
		/\.sql\b|\.dump\b|\.bak\b|\.dt\b|\.mdf\b|\.ldf\b|\.sdf\b|postgres|mysql|mssql|sql\s*server/.test(
			text,
		)
	)
		return "sql_dump";
	if (input.tableFiles > 0)
		return input.firstMatchPath.toLowerCase().endsWith(".csv") ||
			input.firstMatchPath.toLowerCase().endsWith(".tsv")
			? "csv_export"
			: "spreadsheet_export";
	if (input.archiveFiles > 0) return "archive_export";
	if (profileKind) return profileKind;
	if (
		legacySourceSupplementalKeywordPattern.test(text) ||
		legacyMisTextPattern.test(text)
	)
		return "mis_database";
	return "unknown_legacy_source";
}

export function migrationDbfFolderSourceRequired(
	folderPath: string,
	firstMatchPath: string,
) {
	const text = `${folderPath} ${firstMatchPath}`.toLowerCase();
	return /\.dbf\b|\.dbt\b|\.fpt\b|\.cdx\b|\.idx\b|\.ntx\b|\.ndx\b|\.mdx\b|dbase|foxpro|visual\s*foxpro|clipper|paradox/.test(
		text,
	);
}

export function migrationSafeAlias(
	kind: SmartImportLegacySource["kind"],
	sourceRef: string,
) {
	return `${legacySourceTitles[kind]} #${migrationFingerprint(sourceRef).toUpperCase()}`;
}

export function migrationProfileSafeAlias(
	profileLabel: string,
	kind: SmartImportLegacySource["kind"],
	sourceRef: string,
) {
	return `${profileLabel || legacySourceTitles[kind]} #${migrationFingerprint(sourceRef).toUpperCase()}`;
}

export function shouldSkipMigrationDiscoveryDirectory(directoryName: string) {
	return migrationDiscoverySkipDirectoryNames.has(directoryName.toLowerCase());
}

export type MigrationWorkstationSignalCandidate = {
	channel: "configured" | "process" | "service" | "installed_app" | "shortcut";
	value: string;
	profiles: (typeof migrationWorkstationProfiles)[number][];
};

