/**
 * Vendor matchers and artifact kind titles for probe diagnostics.
 */
import type { MigrationProbeArtifactKind } from "@dental/shared";

export const migrationProbeVendorMatchers: Array<[string, RegExp]> = [
	["Инфоклиника", /инфоклиника|infoclinica|info\s*clinic/i],
	["ИНФОДЕНТ/Denta Office", /infodent|инфодент|дента\s*офис|denta\s*office/i],
	["Cliniccards", /clinic\s*cards|cliniccards/i],
	["Dental4Windows", /dental\s*4\s*windows|d4w/i],
	["Dental Pro", /dental\s*pro|dentpro/i],
	[
		"DentalSoft/Denta",
		/dental\s*soft|dentasoft|(?:^|[\\/])denta(?:[\\/]|$)|дента\b/i,
	],
	["Clinic365/Dental Cloud", /clinic\s*365|clinic365|dental\s*cloud/i],
	[
		"MedAngel/Medialog/Arnica",
		/medangel|медангел|medialog|медиалог|arnica|арника/i,
	],
	["Sycret Dent", /sycret\s*dent|secret\s*dent|сикрет\s*дент/i],
	["Адента Профессионал", /адента|adenta/i],
	["DentCRM24/Dent.CRM24", /dent\s*crm\s*24|dentcrm24|dent\.crm24/i],
	["Клиентикс Улыбка", /клиентикс|clientix|klientix|ulybka|улыбка/i],
	["2V: Стоматология", /(?:^|[\\/])2v(?:[\\/]|$)|2v.*стоматолог|2v.*dental/i],
	["Future IT Dent", /future\s*it\s*dent|futureitdent|фьючер\s*ит\s*дент/i],
	["32top", /32\s*top|32top/i],
	["MEDODS", /medods|медодс/i],
	["DentalTap", /dental\s*tap|dentaltap/i],
	["IDENT/StomX", /(?:^|[\\/])ident(?:[\\/]|$)|stomx|stom\s*x|стомx|стомикс/i],
	["iStom", /(?:^|[\\/])i[-\s]?stom(?:[\\/]|$)|i[-\s]?stom|ай\s*стом/i],
	["QStoma", /q[-\s]?stoma|кью\s*стома/i],
	[
		"БИТ.Стоматология",
		/бит\.?\s*стоматолог|bit\.?\s*stomatolog|1c.*стоматолог|1с.*стоматолог/i,
	],
	["MacDent", /mac\s*dent|macdent/i],
	["Stombox", /stom\s*box|stombox/i],
	["Sidexis", /sidexis/i],
	["Romexis", /romexis|planmeca/i],
	["Carestream", /carestream|kodak/i],
	["Vatech", /vatech|ezdent/i],
	["OnDemand3D", /ondemand/i],
	["Invivo", /invivo/i],
	["Cliniview", /cliniview|clini\s*view/i],
	["DBSWIN/VistaSoft", /dbswin|vistasoft|durr|dürr|duerr/i],
	["Digora/Soredex", /digora|soredex/i],
	["Trophy/Visiodent", /trophy|visiodent/i],
	["3Shape/Medit", /3shape|medit/i],
	["1C", /(?:^|[\\/])1c|1cv8|1с|\.1cd\b|\.dt\b/i],
	[
		"Firebird/InterBase",
		/firebird|interbase|\.fdb\b|\.gdb\b|\.fbk\b|\.ib\b|\.ibk\b|\.gbk\b/i,
	],
	["Access", /access|\.mdb\b|\.accdb\b/i],
	["SQL Server", /sql\s*server|mssql|\.mdf\b|\.ldf\b|\.bak\b/i],
	["SQLite", /sqlite|\.sqlite3?\b|\.db\b/i],
	[
		"DBF/FoxPro/Clipper",
		/dbf|dbase|foxpro|visual\s*foxpro|clipper|paradox|\.dbf\b|\.dbt\b|\.fpt\b|\.cdx\b|\.idx\b|\.ntx\b|\.ndx\b|\.mdx\b/i,
	],
];

export const migrationProbeArtifactKindTitles: Record<
	MigrationProbeArtifactKind,
	string
> = {
	database: "Файл старой базы",
	dump: "Резервная копия старой базы",
	table: "Табличная выгрузка",
	archive: "Архив",
	dicom: "Файл КТ/снимков",
	image: "Снимок",
	model: "3D модель",
	folder: "Папка",
	unknown: "Неизвестный артефакт",
};



