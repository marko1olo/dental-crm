/**
 * canonicalCatalogFixturesB.ts — Фикстуры брендов Astra, Zimmer, Megagen, BioHorizons, Alpha-Bio, Ankylos (Мандат 8b <= 120 строк).
 */

import type { CanonicalImplantFixture } from "./canonicalCatalogTypes";
import { createFixture } from "./canonicalCatalogFixturesA";
import { SURGICAL_KITS } from "./canonicalSurgicalKits";

export function buildGroupBFixtures(): CanonicalImplantFixture[] {
	const items: CanonicalImplantFixture[] = [];
	const astraKit = SURGICAL_KITS.astra_facilitate!;
	for (const diam of [3.6, 4.2, 4.8]) {
		for (const len of [8.0, 9.0, 11.0, 13.0]) {
			items.push(createFixture("astra_tech", "OsseoSpeed EV", "EV-", diam, len, diam, diam * 0.75, 2.5, "conical_seal", "EV", "#8b5cf6", true, astraKit, 3850000, "Conical Seal Design"));
		}
	}
	const zimmerKit = SURGICAL_KITS.zimmer_guided!;
	for (const diam of [3.7, 4.1, 4.7]) {
		for (const len of [8.0, 10.0, 11.5, 13.0]) {
			items.push(createFixture("zimmer", "Tapered Screw-Vent (TSV)", "TSV", diam, len, diam, diam * 0.7, 2.0, "internal_hex", "TSV", "#3b82f6", true, zimmerKit, 3100000, "Шестигранник Lead-in"));
		}
	}
	const megagenKit = SURGICAL_KITS.megagen_r2gate!;
	for (const diam of [4.0, 4.5, 5.0]) {
		for (const len of [8.5, 10.0, 11.5, 13.0]) {
			items.push(createFixture("megagen", "AnyRidge Knife Thread", "AR", diam, len, 4.5, diam * 0.65, 4.0, "anyridge_hex_cone", "AnyRidge", "#06b6d4", true, megagenKit, 2400000, "Ножевидная резьба Knife Thread"));
		}
	}
	const biohorizonsKit = SURGICAL_KITS.osstem_oneguide!;
	for (const diam of [3.8, 4.6]) {
		for (const len of [9.0, 10.5, 12.0]) {
			items.push(createFixture("biohorizons", "Tapered Internal", "TL", diam, len, diam, diam * 0.7, 2.0, "internal_hex", "Regular", "#d97706", true, biohorizonsKit, 2600000, "Шейка Laser-Lok"));
		}
	}
	const alphabioKit = SURGICAL_KITS.mis_mguide!;
	for (const diam of [3.75, 4.2]) {
		for (const len of [8.0, 10.0, 11.5, 13.0]) {
			items.push(createFixture("alphabio", "SPI Spiral", "SPI-", diam, len, diam, diam * 0.65, 4.5, "internal_hex", "Standard", "#ef4444", true, alphabioKit, 1600000, "Спиральный имплантат"));
		}
	}
	const ankylosKit = SURGICAL_KITS.ankylos_expertease!;
	const ankylosSizes = [{ code: "A", diam: 3.5, color: "#059669" }, { code: "B", diam: 4.5, color: "#2563eb" }];
	for (const sz of ankylosSizes) {
		for (const len of [8.0, 9.5, 11.0, 14.0]) {
			items.push(createFixture("ankylos", "Ankylos C/X", "ANK-", sz.diam, len, sz.diam, sz.diam * 0.8, 0.0, "tissue_care_cone", sz.code, sz.color, false, ankylosKit, 3300000, "Конус TissueCare 5.7°"));
		}
	}
	return items;
}
