import path from "node:path";
import type { SmartImportLegacySource } from "@dental/shared";
/**
 * Constants, catalogs, extensions, and patterns for smart imports and migrations.
 */
import { execFile } from "node:child_process";
import { promisify } from "node:util";

export const execFileAsync = promisify(execFile);
export const emptyPatientText = "ФИО;Телефон;Дата рождения;Комментарий";

export const imagePathPattern =
	/(?:[A-Za-zА-Яа-яЁё]:[\\/][^\s;|,]+|\\\\[^\s;|,]+|\/[^\s;|,]+|\b[^\s;|,]+\.(?:dcm|dicom|ima|dc3|acr|jpg|jpeg|png|tif|tiff|bmp|webp|stl|obj|ply|glb|gltf|3mf)\b)/i;
export const imagingKeywordPattern =
	/rvg|rv[sx]|прицел|прицельн|opg|оптг|ортопан|панорам|trg|трг|ceph|цеф|телерентг|cbct|кт|ккт|dicom|dicomweb|pacs|orthanc|dcm4chee|twain|wia|sensor|ezsensor|carestream|vatech|sidexis|romexis|ondemand|invivo|digora|soredex|trophy|visiodent|durr|dürr|orangedental|myray|newtom|dexis|kavo|gendex|acteon|sopro|sopix|pspix|x[-\s]?mind|3shape|medit|exocad|blue\s*sky|снимок|рентген|томограф/i;
export const patientKeywordPattern =
	/фио|пациент|клиент|телефон|номер|дата рождения|д\.р\.|др|birth|patient|phone|mobile/i;
export const clinicKeywordPattern =
	/клиник|стоматолог|dental|dent|clinic|инн|inn|кпп|kpp|огрн|ogrn|лиценз|license|адрес|address|сайт|website|www\.|https?:\/\/|email|e-mail|почта|банк|бик|р\/с|расчетн|корр/i;
export const legacySourceKeywordPattern =
	/стар(?:ая|ой)?\s+(?:баз|мис|crm)|legacy|migration|миграц|перенос|выгруз|экспорт|backup|dump|restore|sql|sqlite|firebird|interbase|access|mdb|accdb|dbf|dbase|foxpro|clipper|paradox|1c|1с|\.1cd|\.dt|mdf|sdf|fbk|ibk|gbk|мис|инфоклиника|infodent|инфодент|дента\s*офис|denta\s*office|cliniccards|dental4windows|dental\s*pro|dental\s*soft|dentasoft|dental\s*cloud|clinic\s*365|clinic365|ident|stomx|i[-\s]?stom|ай\s*стом|q[-\s]?stoma|кью\s*стома|бит\.?\s*стоматолог|bit\.?\s*stomatolog|mac\s*dent|stom\s*box|medangel|медангел|medialog|медиалог|arnica|арника|пакс|pacs|orthanc|dcm4chee|dicomweb|qido|wado|ae\s*title|сетев(?:ая|ой)\s+папк|network\s+share|smb|\\\\/i;
export const legacySourceSupplementalKeywordPattern =
	/open\s*dent(?:al)?|opendental|opendent|open\s*dent\s*images|atoz|dentrix|eaglesoft|patterson|softdent|practice\s*works|curve\s*dental|denticon|tab32|dolphin\s*(?:imaging|management)|morita|i[-\s]?dixel|idixel|veraview|new\s*tom|newtom|\bnnt\b|myray|cefla|owandy|quick\s*vision|quickvision/i;
export const legacyMisTextPattern =
	/1c|1с|\.1cd\b|мис|инфоклиника|infoclinica|infodent|инфодент|дента\s*офис|denta\s*office|clinic\s*cards|cliniccards|dental\s*4\s*windows|d4w|dental4windows|dental\s*pro|dentpro|dental\s*soft|dentasoft|dental\s*cloud|clinic\s*365|clinic365|medangel|медангел|medialog|медиалог|arnica|арника|sycret\s*dent|secret\s*dent|адента|adenta|dent\s*crm\s*24|dentcrm24|dent\.crm24|клиентикс|clientix|klientix|2v.*(?:стоматолог|dental)|future\s*it\s*dent|futureitdent|32\s*top|32top|medods|медодс|dental\s*tap|dentaltap|(?:^|[\\/])ident(?:[\\/]|$)|\bident\b|stomx|stom\s*x|стомx|стомикс|i[-\s]?stom|ай\s*стом|q[-\s]?stoma|кью\s*стома|бит\.?\s*стоматолог|bit\.?\s*stomatolog|1c.*стоматолог|1с.*стоматолог|mac\s*dent|macdent|stom\s*box|stombox|open\s*dent(?:al)?|opendental|opendent|open\s*dent\s*images|atoz|dentrix|eaglesoft|patterson|softdent|practice\s*works|curve\s*dental|denticon|tab32|dolphin\s*(?:imaging|management)|legacy|старая\s+баз/i;
export const legacyDatabasePathPattern =
	/(?:[A-Za-zА-Яа-яЁё]:[\\/][^;|\n]+?|\\\\[^;|\n]+?|\/[^;|\n]+?)\.(?:fdb|gdb|fbk|ib|ibk|gbk|mdb|accdb|db|sqlite|sqlite3|dbf|dbt|fpt|cdx|idx|ntx|ndx|mdx|1cd|dt|mdf|ldf|sdf|bak|sql|dump|backup|csv|tsv|xls|xlsx|xlsm|xlsb|ods|xml|json|zip|7z|rar|tar|gz)\b|\b[^\s;|,]+\.(?:fdb|gdb|fbk|ib|ibk|gbk|mdb|accdb|db|sqlite|sqlite3|dbf|dbt|fpt|cdx|idx|ntx|ndx|mdx|1cd|dt|mdf|ldf|sdf|bak|sql|dump|backup|csv|tsv|xls|xlsx|xlsm|xlsb|ods|xml|json|zip|7z|rar|tar|gz)\b/i;
export const imagingSourceFolderPattern =
	/\bDICOMDIR\b|(?:sidexis|romexis|dtx|ondemand|invivo|ezdent|cliniview|clini\s*view|dbswin|vistasoft|carestream|vatech|planmeca|morita|galileos|kavo|dexis|gendex|orthophos|digora|soredex|trophy|visiodent|durr|dürr|orangedental|myray|newtom|quickvision|acteon|sopro|sopix|pspix|x[-\s]?mind|weasis|ohif|radiant|dicom|cbct|кт|ккт|rvg|opg|оптг|рентген|снимк|томограф)\b.*(?:folder|папк|каталог|archive|архив|export|выгруз|root|share|шара|источник|source|backup|old|стар)|(?:folder|папк|каталог|archive|архив|export|выгруз|root|share|шара|источник|source|backup|old|стар)\b.*(?:sidexis|romexis|dtx|ondemand|invivo|ezdent|cliniview|clini\s*view|dbswin|vistasoft|carestream|vatech|planmeca|morita|galileos|kavo|dexis|gendex|orthophos|digora|soredex|trophy|visiodent|durr|dürr|orangedental|myray|newtom|quickvision|acteon|sopro|sopix|pspix|x[-\s]?mind|dicom|cbct|кт|ккт|rvg|opg|оптг|рентген|снимк|томограф)|\\\\[^;|\n]*(?:dicom|cbct|rvg|opg|xray|x-ray|кт|ккт|рентген|снимк)[^;|\n]*/i;
export const imagingVendorPattern =
	/sidexis|romexis|dtx|ondemand|invivo|ezdent|cliniview|clini\s*view|dbswin|vistasoft|carestream|vatech|planmeca|morita|galileos|kavo|dexis|gendex|orthophos|digora|soredex|trophy|visiodent|durr|dürr|orangedental|myray|newtom|quickvision|acteon|sopro|sopix|pspix|x[-\s]?mind|suni|schick|apixia|medit|3shape|exocad|blue\s*sky/i;
export const headerOnlyPattern =
	/^(?:фио|пациент|patient|phone|телефон|тип|файл|путь|source|источник|дата|зуб|модальность|modality|studyinstanceuid|seriesinstanceuid|sopinstanceuid|instance|series|study|birth|dob|комментарий|notes)(?:[;,\t| ]+(?:фио|пациент|patient|phone|телефон|тип|файл|путь|source|источник|дата|зуб|модальность|modality|studyinstanceuid|seriesinstanceuid|sopinstanceuid|instance|series|study|birth|dob|комментарий|notes))*$/i;
export const imagingVendorSupplementalPattern =
	/i[-\s]?dixel|idixel|veraview|new\s*tom|\bnnt\b|cefla|owandy|quick\s*vision/i;
export const migrationClinicDataContainerPattern =
	/(?:стомат|клиник|dental|denta|dent|stom|clinic|mis|crm|пациент|patient|1c|1с|миграц|migration|стар|old|legacy).*(?:backup|backups|export|exports|archive|архив|arhiv|выгруз|vygruz|data|db|database|base|баз|baza|dump)|(?:backup|backups|export|exports|archive|архив|arhiv|выгруз|vygruz|data|db|database|base|баз|baza|dump).*(?:стомат|клиник|dental|denta|dent|stom|clinic|mis|crm|пациент|patient|1c|1с|миграц|migration|стар|old|legacy)|(?:база\s*пациент|пациенты|картотек|стоматолог(?:ия|ическая)?|архив\s*клиник|старая\s*(?:база|мис|crm)|выгрузк[аи]?|снимки|рентген|оптг|ккт|(?:^|[\\/\s_-])кт(?:$|[\\/\s_-])|xray|x-ray|cbct|opg|patient\s*db|patients|clinic\s*(?:db|backup|archive)|old\s*(?:db|database|crm))/i;

export function migrationClinicDataContainerHint(folderPath: string) {
	const folderName = path.basename(folderPath);
	const parentName = path.basename(path.dirname(folderPath));
	const localName =
		parentName && parentName !== folderName
			? `${parentName}/${folderName}`
			: folderName;
	return migrationClinicDataContainerPattern.test(localName);
}

export const migrationDiscoverySkipDirectoryNames = new Set([
	".git",
	".hg",
	".svn",
	"node_modules",
	"dist",
	"build",
	"cache",
	"tmp",
	"temp",
	"windows",
	"program files",
	"program files (x86)",
	"$recycle.bin",
	"system volume information",
	"appdata",
	"application data",
]);
export const migrationDatabaseExtensions = new Set([
	".fdb",
	".gdb",
	".fbk",
	".ib",
	".mdb",
	".accdb",
	".sqlite",
	".sqlite3",
	".db",
	".dbf",
	".dbt",
	".fpt",
	".cdx",
	".idx",
	".ntx",
	".ndx",
	".mdx",
	".1cd",
	".mdf",
	".ldf",
	".sdf",
	".myd",
	".myi",
	".frm",
	".ibd",
	".px",
]);
export const migrationDumpExtensions = new Set([
	".bak",
	".backup",
	".dump",
	".sql",
	".psql",
	".pgsql",
	".dt",
	".ibk",
	".gbk",
]);
export const migrationTableExtensions = new Set([
	".csv",
	".tsv",
	".xls",
	".xlsx",
	".xlsm",
	".xlsb",
	".ods",
	".xml",
	".json",
]);
export const migrationArchiveExtensions = new Set([
	".zip",
	".7z",
	".rar",
	".tar",
	".gz",
]);
export const migrationImageExtensions = new Set([
	".jpg",
	".jpeg",
	".png",
	".tif",
	".tiff",
	".bmp",
	".webp",
	".stl",
	".obj",
	".ply",
	".glb",
	".gltf",
	".3mf",
]);
export const migrationDicomExtensions = new Set([
	".dcm",
	".dicom",
	".ima",
	".dc3",
	".acr",
]);

export const migrationWorkstationProfiles: Array<{
	label: string;
	kind: SmartImportLegacySource["kind"];
	pattern: RegExp;
	reason: string;
}> = [
	{
		label: "1C/1Cv8",
		kind: "mis_database",
		pattern: /(?:^|[\\/])(?:1c|1cv8|1с)(?:[\\/]|$)|\.1cd\b|\.dt\b/i,
		reason: "папка или файл 1C/1Cv8",
	},
	{
		label: "Инфоклиника",
		kind: "mis_database",
		pattern: /инфоклиника|infoclinica|info\s*clinic/i,
		reason: "похоже на Инфоклинику",
	},
	{
		label: "ИНФОДЕНТ/Denta Office",
		kind: "mis_database",
		pattern: /infodent|инфодент|дента\s*офис|denta\s*office/i,
		reason: "похоже на ИНФОДЕНТ/Denta Office",
	},
	{
		label: "Cliniccards",
		kind: "mis_database",
		pattern: /clinic\s*cards|cliniccards/i,
		reason: "похоже на Cliniccards",
	},
	{
		label: "Dental4Windows",
		kind: "mis_database",
		pattern: /dental\s*4\s*windows|d4w/i,
		reason: "похоже на Dental4Windows",
	},
	{
		label: "Dental Pro",
		kind: "mis_database",
		pattern: /dental\s*pro|dentpro/i,
		reason: "похоже на Dental Pro",
	},
	{
		label: "Sycret Dent",
		kind: "mis_database",
		pattern: /sycret\s*dent|secret\s*dent|сикрет\s*дент/i,
		reason: "похоже на Sycret Dent",
	},
	{
		label: "Адента Профессионал",
		kind: "mis_database",
		pattern: /адента|adenta/i,
		reason: "похоже на Адента",
	},
	{
		label: "DentCRM24/Dent.CRM24",
		kind: "mis_database",
		pattern: /dent\s*crm\s*24|dentcrm24|dent\.crm24/i,
		reason: "похоже на DentCRM24/Dent.CRM24",
	},
	{
		label: "Клиентикс Улыбка",
		kind: "mis_database",
		pattern: /клиентикс|clientix|klientix|ulybka|улыбка/i,
		reason: "похоже на Клиентикс Улыбка",
	},
	{
		label: "2V: Стоматология",
		kind: "mis_database",
		pattern: /(?:^|[\\/])2v(?:[\\/]|$)|2v.*стоматолог|2v.*dental/i,
		reason: "похоже на 2V: Стоматология",
	},
	{
		label: "Future IT Dent",
		kind: "mis_database",
		pattern: /future\s*it\s*dent|futureitdent|фьючер\s*ит\s*дент/i,
		reason: "похоже на Future IT Dent",
	},
	{
		label: "32top",
		kind: "mis_database",
		pattern: /32\s*top|32top/i,
		reason: "похоже на 32top",
	},
	{
		label: "MEDODS",
		kind: "mis_database",
		pattern: /medods|медодс/i,
		reason: "похоже на MEDODS",
	},
	{
		label: "DentalTap",
		kind: "mis_database",
		pattern: /dental\s*tap|dentaltap/i,
		reason: "похоже на DentalTap",
	},
	{
		label: "DentalSoft/Denta",
		kind: "mis_database",
		pattern: /dental\s*soft|dentasoft|(?:^|[\\/])denta(?:[\\/]|$)|дента\b/i,
		reason: "похоже на DentalSoft/Denta",
	},
	{
		label: "Clinic365/Dental Cloud",
		kind: "mis_database",
		pattern: /clinic\s*365|clinic365|dental\s*cloud/i,
		reason: "похоже на Clinic365/Dental Cloud",
	},
	{
		label: "MedAngel/Medialog/Arnica",
		kind: "mis_database",
		pattern: /medangel|медангел|medialog|медиалог|arnica|арника/i,
		reason: "похоже на медицинскую МИС с dental-картами",
	},
	{
		label: "IDENT/StomX",
		kind: "mis_database",
		pattern: /(?:^|[\\/])ident(?:[\\/]|$)|stomx|stom\s*x|стомx|стомикс/i,
		reason: "похоже на IDENT/StomX",
	},
	{
		label: "iStom",
		kind: "mis_database",
		pattern: /(?:^|[\\/])i[-\s]?stom(?:[\\/]|$)|i[-\s]?stom|ай\s*стом/i,
		reason: "похоже на iStom",
	},
	{
		label: "QStoma",
		kind: "mis_database",
		pattern: /q[-\s]?stoma|кью\s*стома/i,
		reason: "похоже на QStoma",
	},
	{
		label: "БИТ.Стоматология",
		kind: "mis_database",
		pattern:
			/бит\.?\s*стоматолог|bit\.?\s*stomatolog|1c.*стоматолог|1с.*стоматолог/i,
		reason: "похоже на БИТ.Стоматология",
	},
	{
		label: "MacDent",
		kind: "mis_database",
		pattern: /mac\s*dent|macdent/i,
		reason: "похоже на MacDent",
	},
	{
		label: "Stombox",
		kind: "mis_database",
		pattern: /stom\s*box|stombox/i,
		reason: "похоже на Stombox",
	},
	{
		label: "Firebird/InterBase",
		kind: "firebird_database",
		pattern:
			/firebird|interbase|\.fdb\b|\.gdb\b|\.fbk\b|\.ib\b|\.ibk\b|\.gbk\b/i,
		reason: "похоже на серверную базу старой программы или резервную копию",
	},
	{
		label: "Microsoft Access",
		kind: "access_database",
		pattern: /(?:^|[\\/])access(?:[\\/]|$)|\.mdb\b|\.accdb\b/i,
		reason: "Access MDB/ACCDB",
	},
	{
		label: "Open Dental/OpenDentImages",
		kind: "mis_database",
		pattern:
			/open\s*dent(?:al)?|opendental|opendent|open\s*dent\s*images|atoz/i,
		reason: "похоже на Open Dental/OpenDentImages",
	},
	{
		label: "Dentrix/Eaglesoft/Patterson",
		kind: "mis_database",
		pattern: /dentrix|eaglesoft|patterson/i,
		reason: "похоже на Dentrix/Eaglesoft/Patterson",
	},
	{
		label: "SoftDent/PracticeWorks",
		kind: "mis_database",
		pattern: /softdent|practice\s*works/i,
		reason: "похоже на SoftDent/PracticeWorks",
	},
	{
		label: "Curve Dental/Denticon/tab32",
		kind: "mis_database",
		pattern: /curve\s*dental|denticon|tab32/i,
		reason: "похоже на Curve Dental/Denticon/tab32",
	},
	{
		label: "Dolphin Management",
		kind: "mis_database",
		pattern: /dolphin\s*management/i,
		reason: "похоже на Dolphin Management",
	},
	{
		label: "DBF/FoxPro/Clipper",
		kind: "mis_database",
		pattern:
			/dbf|dbase|foxpro|visual\s*foxpro|clipper|paradox|\.dbf\b|\.dbt\b|\.fpt\b|\.cdx\b|\.idx\b|\.ntx\b|\.ndx\b|\.mdx\b/i,
		reason: "похоже на файловую базу DBF/FoxPro/Clipper",
	},
	{
		label: "Morita/i-Dixel",
		kind: "vendor_imaging_system",
		pattern: /morita|i[-\s]?dixel|idixel|veraview/i,
		reason: "похоже на программу снимков Morita/i-Dixel",
	},
	{
		label: "NewTom/NNT/MyRay",
		kind: "vendor_imaging_system",
		pattern: /new\s*tom|newtom|\bnnt\b|myray|cefla/i,
		reason: "похоже на программу КЛКТ NewTom/NNT/MyRay",
	},
	{
		label: "Owandy/QuickVision",
		kind: "vendor_imaging_system",
		pattern: /owandy|quick\s*vision|quickvision/i,
		reason: "похоже на программу снимков Owandy/QuickVision",
	},
	{
		label: "DEXIS/KaVo/Gendex",
		kind: "vendor_imaging_system",
		pattern: /\bdexis\b|kavo|ka\s*vo|gendex/i,
		reason: "похоже на программу снимков DEXIS/KaVo/Gendex",
	},
	{
		label: "Acteon/SOPRO/SOPIX/PSPIX/X-Mind",
		kind: "vendor_imaging_system",
		pattern: /acteon|sopro|sopix|pspix|x[-\s]?mind/i,
		reason: "похоже на программу снимков Acteon/SOPRO/SOPIX/PSPIX/X-Mind",
	},
	{
		label: "SQL Server",
		kind: "sql_dump",
		pattern: /sql\s*server|mssql|\.mdf\b|\.ldf\b|\.bak\b/i,
		reason: "SQL Server файл данных или резервная копия",
	},
	{
		label: "SQLite",
		kind: "sqlite_database",
		pattern: /sqlite|\.sqlite3?\b|\.db\b/i,
		reason: "SQLite/DB файл",
	},
	{
		label: "Sidexis/Sirona",
		kind: "vendor_imaging_system",
		pattern: /sidexis|sirona|orthophos|galileos/i,
		reason: "похоже на программу снимков Sidexis/Sirona",
	},
	{
		label: "Romexis/Planmeca",
		kind: "vendor_imaging_system",
		pattern: /romexis|planmeca/i,
		reason: "похоже на программу снимков Romexis/Planmeca",
	},
	{
		label: "Vatech/EzDent",
		kind: "vendor_imaging_system",
		pattern: /vatech|ezdent|ez\s*dent|ez3d/i,
		reason: "похоже на программу снимков Vatech/EzDent",
	},
	{
		label: "Carestream/Kodak",
		kind: "vendor_imaging_system",
		pattern: /carestream|kodak/i,
		reason: "похоже на программу снимков Carestream/Kodak",
	},
	{
		label: "OnDemand3D",
		kind: "vendor_imaging_system",
		pattern: /ondemand|on\s*demand\s*3d/i,
		reason: "похоже на программу снимков OnDemand3D",
	},
	{
		label: "Invivo",
		kind: "vendor_imaging_system",
		pattern: /invivo/i,
		reason: "похоже на программу снимков Invivo",
	},
	{
		label: "Cliniview",
		kind: "vendor_imaging_system",
		pattern: /cliniview|clini\s*view/i,
		reason: "похоже на программу снимков Cliniview",
	},
	{
		label: "DBSWIN/VistaSoft",
		kind: "vendor_imaging_system",
		pattern: /dbswin|vistasoft|durr|dürr/i,
		reason: "похоже на программу снимков DBSWIN/VistaSoft",
	},
	{
		label: "Digora/Soredex",
		kind: "vendor_imaging_system",
		pattern: /digora|soredex/i,
		reason: "похоже на программу снимков Digora/Soredex",
	},
	{
		label: "Trophy/Visiodent",
		kind: "vendor_imaging_system",
		pattern: /trophy|visiodent/i,
		reason: "похоже на программу снимков Trophy/Visiodent",
	},
	{
		label: "Mediadent/VixWin/Sopro/Schick",
		kind: "vendor_imaging_system",
		pattern: /mediadent|vixwin|sopro|schick/i,
		reason: "похоже на программу RVG-снимков Mediadent/VixWin/Sopro/Schick",
	},
	{
		label: "DTX Studio",
		kind: "vendor_imaging_system",
		pattern: /dtx\s*studio|nobel\s*biocare/i,
		reason: "похоже на программу снимков DTX Studio",
	},
	{
		label: "3Shape/Medit/exocad",
		kind: "vendor_imaging_system",
		pattern: /3shape|medit|exocad/i,
		reason: "похоже на CAD/CAM/сканер",
	},
	{
		label: "КТ/архив снимков",
		kind: "dicom_folder",
		pattern: /dicom|dicomdir|pacs|orthanc|dcm4chee|qido|wado|cbct|кт|ккт/i,
		reason: "признаки КТ/архива снимков",
	},
	{
		label: "RVG/OPG/XRay",
		kind: "xray_image_archive",
		pattern: /rvg|opg|оптг|xray|x-ray|рентген|снимк|радиовизиограф/i,
		reason: "похоже на архив RVG/ОПТГ/рентгена",
	},
];

export const migrationVendorGuidanceCatalog: Array<{
	label: string;
	pattern: RegExp;
	requiredArtifacts: string[];
	recommendedRoute: string;
	nextAction: string;
}> = [
	{
		label: "Romexis/Planmeca",
		pattern: /romexis|planmeca/i,
		requiredArtifacts: [
			"Romexis/Planmeca: открыть штатную выгрузку КТ/ОПТГ и табличный список исследований, если доступен",
			"Romexis/Planmeca: найти папку хранения через настройки программы или администратора, не по пациентским именам",
		],
		recommendedRoute:
			"Для Romexis/Planmeca сначала просить штатную выгрузку снимков, затем строить предпросмотр метаданных; внутреннюю базу трогать только через локальный модуль только для чтения.",
		nextAction:
			"Открыть Romexis/Planmeca, сделать выгрузку снимков контрольного пациента и проверить список в CRM.",
	},
	{
		label: "Sidexis/Sirona",
		pattern: /sidexis|sirona|orthophos|galileos/i,
		requiredArtifacts: [
			"Sidexis/Sirona: штатная выгрузка снимков или папка исследования, плюс список пациентов/исследований из программы",
			"Sidexis/Sirona: путь к хранилищу искать через настройки/служебную учетку, не переносить файлы вслепую",
		],
		recommendedRoute:
			"Для Sidexis/Sirona предпочтительна штатная выгрузка снимков; прямой разбор хранилища только для чтения и только до предпросмотра.",
		nextAction:
			"Сделать Sidexis/Sirona выгрузку снимков, затем прогнать проверку снимков и сверку 10 карт.",
	},
	{
		label: "Vatech/EzDent",
		pattern: /vatech|ezdent|ez\s*dent|ez3d/i,
		requiredArtifacts: [
			"Vatech/EzDent: выгрузка снимков из EzDent/Ez3D или папка хранения снимков со списком",
			"Vatech/EzDent: отдельно выгрузить patient/study list, если программа умеет экспорт таблицы",
		],
		recommendedRoute:
			"Для Vatech/EzDent строить список снимков из штатной выгрузки, сопоставление пациента только через предпросмотр.",
		nextAction:
			"В EzDent/Ez3D экспортировать папку исследования и проверить, что исследование/серии читаются без загрузки тяжелых данных.",
	},
	{
		label: "Carestream/Kodak",
		pattern: /carestream|kodak/i,
		requiredArtifacts: [
			"Carestream/Kodak: выгрузка снимков или архивная выгрузка программы, плюс список исследований",
			"Carestream/Kodak: если штатная выгрузка закрыта, нужен локальный модуль только для чтения к хранилищу, без записи в старую систему",
		],
		recommendedRoute:
			"Для Carestream/Kodak сначала штатная выгрузка программы, затем предпросмотр списка снимков.",
		nextAction:
			"Снять одну контрольную Carestream/Kodak выгрузку и открыть план проверки снимков.",
	},
	{
		label: "Morita/i-Dixel",
		pattern: /morita|i[-\s]?dixel|idixel|veraview/i,
		requiredArtifacts: [
			"Morita/i-Dixel: штатная выгрузка для КТ/ОПТГ/RVG или копия папки хранения только для чтения",
			"Morita/i-Dixel: список исследований экспортировать отдельно, если программа умеет табличную выгрузку; пути и снимки не отправлять в публичный поиск",
		],
		recommendedRoute:
			"Для Morita/i-Dixel сначала использовать штатную выгрузку снимков, затем предпросмотр метаданных и ручную сверку пациента; прямой разбор хранилища только для чтения.",
		nextAction:
			"Открыть i-Dixel/Morita, снять выгрузку контрольного исследования и прогнать проверку снимков.",
	},
	{
		label: "NewTom/NNT/MyRay",
		pattern: /new\s*tom|newtom|\bnnt\b|myray|cefla/i,
		requiredArtifacts: [
			"NewTom/NNT/MyRay: выгрузка КЛКТ или архивная выгрузка программы со списком",
			"NewTom/NNT/MyRay: если найден только установленный клиент, нужна выгрузка или папка данных, а не импорт ярлыка",
		],
		recommendedRoute:
			"Для NewTom/NNT/MyRay вести миграцию через штатную выгрузку снимков; локальные пути хранения использовать только как подсказку для администратора.",
		nextAction:
			"Сделать выгрузку снимков из NNT/NewTom/MyRay и проверить метаданные исследования/серии в CRM.",
	},
	{
		label: "Owandy/QuickVision",
		pattern: /owandy|quick\s*vision|quickvision/i,
		requiredArtifacts: [
			"Owandy/QuickVision: выгрузка снимков или папка снимков с локальным списком",
			"Owandy/QuickVision: RVG/OPG файлы сверять через предпросмотр до привязки к карте",
		],
		recommendedRoute:
			"Для Owandy/QuickVision сначала искать штатную выгрузку и только потом локальную проверку папки только для чтения.",
		nextAction:
			"Открыть QuickVision/Owandy, выгрузить пакет снимков/RVG и запустить проверку источника снимков.",
	},
	{
		label: "DEXIS/KaVo/Gendex",
		pattern: /\bdexis\b|kavo|ka\s*vo|gendex/i,
		requiredArtifacts: [
			"DEXIS/KaVo/Gendex: штатная выгрузка снимков или папка хранения снимков только для чтения",
			"DEXIS/KaVo/Gendex: список исследований/пациентов экспортировать отдельно, если программа дает табличную выгрузку",
		],
		recommendedRoute:
			"Для DEXIS/KaVo/Gendex сначала искать официальную выгрузку снимков; прямое чтение хранения использовать только для чтения и только для предпросмотра метаданных.",
		nextAction:
			"Открыть DEXIS/KaVo/Gendex, снять выгрузку контрольного исследования и проверить снимки.",
	},
	{
		label: "Acteon/SOPRO/SOPIX/PSPIX/X-Mind",
		pattern: /acteon|sopro|sopix|pspix|x[-\s]?mind/i,
		requiredArtifacts: [
			"Acteon/SOPRO/SOPIX/PSPIX/X-Mind: выгрузка снимков или папка снимков программы со списком",
			"Acteon/SOPRO/SOPIX/PSPIX/X-Mind: RVG/OPG привязки проверять через предпросмотр снимков, не автоматической записью",
		],
		recommendedRoute:
			"Для Acteon/SOPRO/SOPIX/PSPIX/X-Mind строить список снимков, затем ручную сверку спорных совпадений пациента.",
		nextAction:
			"Снять выгрузку снимков из Acteon/SOPRO/SOPIX/PSPIX и открыть предпросмотр проверки снимков.",
	},
	{
		label: "Open Dental/Dentrix/Eaglesoft",
		pattern: /open\s*dental|opendental|dentrix|eaglesoft|patterson/i,
		requiredArtifacts: [
			"Open Dental/Dentrix/Eaglesoft: штатная выгрузка пациентов, визитов, услуг, оплат и расписания",
			"Open Dental/Dentrix/Eaglesoft: если доступна только база, нужна отдельная копия или резервная копия и локальный разбор с контрольными итогами до предпросмотра",
		],
		recommendedRoute:
			"Для Open Dental/Dentrix/Eaglesoft сначала использовать штатную выгрузку, затем локальный разбор копии базы; прямая запись из старой базы запрещена.",
		nextAction:
			"Найти выгрузку или резервную копию Open Dental/Dentrix/Eaglesoft и прогнать черновой предпросмотр с контрольными итогами.",
	},
	{
		label: "1C/1Cv8",
		pattern: /(?:^|[\\/])(?:1c|1cv8|1с)(?:[\\/]|$)|\.1cd\b|\.dt\b/i,
		requiredArtifacts: [
			"1C/1Cv8: штатная выгрузка `.dt` или копия `.1cd`, снятая при закрытой базе или через администратора",
			"1C/1Cv8: желательно получить табличные выгрузки пациентов, услуг, оплат и визитов из интерфейса",
		],
		recommendedRoute:
			"Для 1C сначала штатная выгрузка или резервная копия, затем локальный модуль формирует табличный список; прямая запись из `.1cd` запрещена.",
		nextAction:
			"Попросить администратора 1C снять `.dt` или табличные выгрузки и прогнать черновой предпросмотр.",
	},
	{
		label: "Firebird/InterBase",
		pattern:
			/firebird|interbase|\.fdb\b|\.gdb\b|\.fbk\b|\.ib\b|\.ibk\b|\.gbk\b/i,
		requiredArtifacts: [
			"Firebird/InterBase: `.fbk/.ibk/.gbk` резервная копия предпочтительнее рабочей `.fdb/.gdb/.ib`",
			"Firebird/InterBase: нужны доступ только для чтения или отдельная копия, чтобы разбор не трогал рабочую МИС",
		],
		recommendedRoute:
			"Для Firebird/InterBase использовать отдельную резервную копию или копию базы, затем локальный модуль собирает табличный список с контрольными итогами.",
		nextAction:
			"Снять `.fbk/.ibk/.gbk` или копию базы, затем открыть локальный разбор базы и предпросмотр.",
	},
	{
		label: "DBF/FoxPro/Clipper",
		pattern:
			/dbf|dbase|foxpro|visual\s*foxpro|clipper|paradox|\.dbf\b|\.dbt\b|\.fpt\b|\.cdx\b|\.idx\b|\.ntx\b|\.ndx\b|\.mdx\b/i,
		requiredArtifacts: [
			"DBF/FoxPro/Clipper: копировать всю папку данных, не один `.dbf`; соседние memo/index файлы `.dbt/.fpt/.cdx/.idx/.ntx/.ndx/.mdx` должны идти вместе с таблицами",
			"DBF/FoxPro/Clipper: зафиксировать OEM/Windows-кодировку и выгрузить пациентов, визиты, услуги, оплаты и ссылки на снимки через локальный модуль только для чтения",
		],
		recommendedRoute:
			"Для DBF/FoxPro/Clipper использовать отдельную копию всей папки, затем локальный разбор в табличный черновик с контрольными итогами; не писать обратно в старые таблицы.",
		nextAction:
			"Выбрать всю папку данных DBF/FoxPro, запустить проверку источника и построить предпросмотр импорта из чернового списка.",
	},
	{
		label:
			"Инфоклиника/ИНФОДЕНТ/Denta Office/Cliniccards/Dental4Windows/Dental Pro/DentalSoft/Clinic365/Dental Cloud/MedAngel/Medialog/Arnica/Sycret Dent/Адента/DentCRM24/Клиентикс/2V/Future IT Dent/32top/MEDODS/DentalTap/IDENT/iStom/QStoma/БИТ.Стоматология/MacDent/Stombox",
		pattern:
			/инфоклиника|infoclinica|infodent|инфодент|дента\s*офис|denta\s*office|clinic\s*cards|cliniccards|dental\s*4\s*windows|d4w|dental\s*pro|dentpro|dental\s*soft|dentasoft|dental\s*cloud|clinic\s*365|clinic365|medangel|медангел|medialog|медиалог|arnica|арника|sycret\s*dent|secret\s*dent|адента|adenta|dent\s*crm\s*24|dentcrm24|dent\.crm24|клиентикс|clientix|klientix|2v.*(?:стоматолог|dental)|future\s*it\s*dent|futureitdent|32\s*top|32top|medods|медодс|dental\s*tap|dentaltap|(?:^|[\\/])ident(?:[\\/]|$)|stomx|stom\s*x|стомx|стомикс|i[-\s]?stom|ай\s*стом|q[-\s]?stoma|кью\s*стома|бит\.?\s*стоматолог|bit\.?\s*stomatolog|1c.*стоматолог|1с.*стоматолог|mac\s*dent|macdent|stom\s*box|stombox/i,
		requiredArtifacts: [
			"Старая МИС: сначала искать штатную табличную выгрузку пациентов, визитов, оплат и услуг",
			"Старая МИС: если выгрузка неполная, нужна отдельная резервная копия базы и локальный модуль, не прямая запись",
		],
		recommendedRoute:
			"Для старой МИС сначала штатные табличные выгрузки, потом локальный разбор только на копии.",
		nextAction:
			"Открыть старую МИС, найти выгрузку или резервную копию, затем прогнать предпросмотр импорта на первых строках.",
	},
];


export { legacySourceTitles } from "./smartImportsUtils.js";
