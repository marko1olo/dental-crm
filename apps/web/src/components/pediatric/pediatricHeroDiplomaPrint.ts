/**
 * PEDIATRIC HERO DIPLOMA PRINT (CANONICAL ALIAS)
 * SSOT delegates strictly to ./diploma/diplomaPrint
 * Retains 100% backward compatibility for all existing tests and call sites.
 */

import {
	printBraveryDiploma,
	generateBraveryDiplomaHtml,
	type PrintBraveryDiplomaOptions,
} from "./diploma/diplomaPrint";

export type HeroDiplomaPrintOptions = PrintBraveryDiplomaOptions;

export function generateHeroDiplomaHtml(options: HeroDiplomaPrintOptions): string {
	return generateBraveryDiplomaHtml(options);
}

export function printHeroDiploma(options: HeroDiplomaPrintOptions): void {
	printBraveryDiploma(options);
}
