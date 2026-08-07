import {
	type ClinicalToothStatus,
	type ClinicalToothSurface,
	clinicalToothStatusAliases,
	clinicalToothSurfaceAliases,
} from "../AppHelpers";

export function confirmedDocumentLiteral(value: boolean, label: string): true {
	if (!value) {
		throw new Error(
			`Не подтверждено обязательное условие документа: ${label}.`,
		);
	}
	return true;
}

export function documentTextLines(value: string): string[] {
	return value
		.split(/\r?\n/)
		.map((line) => line.trim())
		.filter(Boolean);
}

export function compactDocumentText(
	...values: Array<string | null | undefined>
): string {
	return values
		.map((value) => value?.trim() ?? "")
		.filter(Boolean)
		.join("\n");
}

export function normalizeClinicalToothAlias(value: string): string {
	return value
		.trim()
		.toLocaleLowerCase("ru-RU")
		.replaceAll("ё", "е")
		.replace(/[.]+/g, "")
		.replace(/\s+/g, " ");
}

export function clinicalToothSurfacesValue(
	value: string,
): ClinicalToothSurface[] {
	const surfaces = value
		.split(/[,+;/]+/)
		.map(
			(part) => clinicalToothSurfaceAliases[normalizeClinicalToothAlias(part)],
		)
		.filter((surface): surface is ClinicalToothSurface => Boolean(surface));
	return surfaces.length ? Array.from(new Set(surfaces)) : ["not_applicable"];
}

export function clinicalToothStatusValue(value: string): ClinicalToothStatus {
	return (
		clinicalToothStatusAliases[normalizeClinicalToothAlias(value)] ?? "planned"
	);
}
