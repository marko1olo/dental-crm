/**
 * ============================================================================
 * SANPIN 3.3686-21 & 2.1.3684-21 DISINFECTION & STERILIZATION REGISTRY ENGINE
 * Цифровой журнал предстерилизационной очистки (ПСО, Форма № 366/у),
 * журнал контроля работы автоклавов и стерилизаторов (Форма № 257/у),
 * учет наработки бактерицидных ламп (Р 3.5.1904-04), генеральные уборки и дезсредства.
 *
 * Master Backward-Compatible Facade (Mandate 8b Modular Decomposition)
 * Delegating to modular engine layers in ./engine/*
 * ============================================================================
 */

// Layer 0: Types & Data Contracts
export * from "./engine/types.js";

// Layer 1: Statutory Norms, Regimes & Russian Number Spelling
export * from "./engine/sanpinNorms.js";

// Layer 2: Autoclave Validation & PSO Sampling Math
export * from "./engine/autoclaveValidation.js";

// Layer 2: Disinfection, Bactericidal Lamps & Cabinet Readiness
export * from "./engine/disinfectionJournals.js";

// Layer 2: Medical Waste Management
export * from "./engine/wasteManagement.js";

// Layer 3: RFC 4180 CSV Exporters
export * from "./engine/journalCsvExporters.js";

// Layer 3: Official Print & HTML Generators
export * from "./engine/journalReportsHtml.js";

// Layer 3: Consolidated Dossier (Inspection Ready) HTML & CSV
export * from "./engine/consolidatedDossierHtml.js";
export * from "./engine/consolidatedDossierCsv.js";
