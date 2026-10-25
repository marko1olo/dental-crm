/**
 * brandTorqueSpecs.ts — Канонический реестр заводских спецификаций торка ведущих имплантационных систем (SSOT).
 */
import type { ImplantTorqueBrand, BrandTorqueSpec } from "./implantTorqueTypes";

export const IMPLANT_TORQUE_SPECS: Record<ImplantTorqueBrand, BrandTorqueSpec> = {
	straumann: {
		brand: "straumann", brandName: "Straumann", countryRu: "Швейцария",
		screwdriverDefault: "SCS (SynOcta Screwdriver)", screwdriverAsc: "TorcFit Driver / Angled SCS",
		torqueFinalScrewNcm: 35, torqueNarrowScrewNcm: 35,
		torqueMultiUnitAbutmentNcm: 35, torqueMultiUnitBridgeScrewNcm: 15,
		torqueLocatorNcm: 35, torqueHealingCapNcm: 10, torqueLabScrewNcm: 15,
		connectionSafetyNotes: "CrossFit® / TorcFit™ затягивать 35 Н·см. Винты Multi-Unit строго 15 Н·см.",
	},
	nobel_biocare: {
		brand: "nobel_biocare", brandName: "Nobel Biocare", countryRu: "Швейцария / Швеция",
		screwdriverDefault: "Unigrip™", screwdriverAsc: "Omnigrip™ (ASC до 25°)",
		torqueFinalScrewNcm: 35, torqueNarrowScrewNcm: 15,
		torqueMultiUnitAbutmentNcm: 35, torqueMultiUnitBridgeScrewNcm: 15,
		torqueLocatorNcm: 35, torqueHealingCapNcm: 10, torqueLabScrewNcm: 10,
		connectionSafetyNotes: "Conical Connection затягивать 35 Н·см отверткой Unigrip.",
	},
	osstem: {
		brand: "osstem", brandName: "Osstem", countryRu: "Южная Корея",
		screwdriverDefault: "Hex 1.2 mm / Torx", screwdriverAsc: "Osstem Angled Driver",
		torqueFinalScrewNcm: 30, torqueNarrowScrewNcm: 20,
		torqueMultiUnitAbutmentNcm: 30, torqueMultiUnitBridgeScrewNcm: 15,
		torqueLocatorNcm: 30, torqueHealingCapNcm: 10, torqueLabScrewNcm: 10,
		connectionSafetyNotes: "TS III Regular: 30 Н·см. Платформа Mini (Ø3.5): строго 20 Н·см.",
	},
	dentium: {
		brand: "dentium", brandName: "Dentium", countryRu: "Южная Корея",
		screwdriverDefault: "Hex 1.27 mm (0.050 inch)", screwdriverAsc: "Dentium ASC Ball Hex Driver",
		torqueFinalScrewNcm: 30, torqueNarrowScrewNcm: 30,
		torqueMultiUnitAbutmentNcm: 30, torqueMultiUnitBridgeScrewNcm: 15,
		torqueLocatorNcm: 30, torqueHealingCapNcm: 10, torqueLabScrewNcm: 10,
		connectionSafetyNotes: "SuperLine / SimpleLine II: винт абатмента 30 Н·см шестигранником 1.27 мм.",
	},
	ankylos: {
		brand: "ankylos", brandName: "Ankylos (C/X)", countryRu: "Германия (Dentsply Sirona)",
		screwdriverDefault: "Hex 1.0 mm (Ankylos Screwdriver)", screwdriverAsc: "Ankylos Smart Driver",
		torqueFinalScrewNcm: 15, torqueNarrowScrewNcm: 15,
		torqueMultiUnitAbutmentNcm: 25, torqueMultiUnitBridgeScrewNcm: 15,
		torqueLocatorNcm: 25, torqueHealingCapNcm: 10, torqueLabScrewNcm: 10,
		connectionSafetyNotes: "TissueCare Connection (конус Морзе 5.7°): стандартная затяжка винта 15 Н·см отверткой 1.0 мм. Эффект холодной сварки обеспечивает бактериальную герметичность.",
	},
	astra_tech: {
		brand: "astra_tech", brandName: "Astra Tech (EV)", countryRu: "Швеция",
		screwdriverDefault: "Hex EV Driver (1.26 mm)", screwdriverAsc: "Astra Tech Angled Smart Driver",
		torqueFinalScrewNcm: 25, torqueNarrowScrewNcm: 15,
		torqueMultiUnitAbutmentNcm: 25, torqueMultiUnitBridgeScrewNcm: 15,
		torqueLocatorNcm: 25, torqueHealingCapNcm: 10, torqueLabScrewNcm: 10,
		connectionSafetyNotes: "OsseoSpeed EV Conical Seal: стандартная затяжка винта 25 Н·см.",
	},
	megagen: {
		brand: "megagen", brandName: "MegaGen", countryRu: "Южная Корея",
		screwdriverDefault: "Meg-Torq / Hex 1.2 mm", screwdriverAsc: "MegaGen ASC Ball Driver",
		torqueFinalScrewNcm: 35, torqueNarrowScrewNcm: 25,
		torqueMultiUnitAbutmentNcm: 30, torqueMultiUnitBridgeScrewNcm: 15,
		torqueLocatorNcm: 35, torqueHealingCapNcm: 10, torqueLabScrewNcm: 10,
		connectionSafetyNotes: "AnyRidge 5° Morse Taper: клинический винт 35 Н·см.",
	},
	mis: {
		brand: "mis", brandName: "MIS Implants", countryRu: "Израиль",
		screwdriverDefault: "Hex 1.27 mm (0.050 inch)", screwdriverAsc: "MIS Angled Screw Channel Driver",
		torqueFinalScrewNcm: 30, torqueNarrowScrewNcm: 25,
		torqueMultiUnitAbutmentNcm: 30, torqueMultiUnitBridgeScrewNcm: 15,
		torqueLocatorNcm: 30, torqueHealingCapNcm: 10, torqueLabScrewNcm: 10,
		connectionSafetyNotes: "MIS SEVEN, C1, V3: момент затяжки клинического винта 30 Н·см.",
	},
};
