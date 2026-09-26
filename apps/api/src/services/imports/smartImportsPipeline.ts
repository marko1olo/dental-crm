/**
 * Smart Import Pipeline and Preview Builder.
 *
 * Orchestrates line classification, legacy source identification, patient/imaging manifest previews,
 * and dispatches to specialized format parsers (IDENT, D4W, Infodent, CSV).
 */
import {
  type SmartImportMode,
  smartImportPreviewResponseSchema,
  type SmartImportPreviewResponse,
  type SmartImportRequest,
  type SmartImportCommitResponse,
  smartImportCommitResponseSchema
} from "@dental/shared";
import { buildPatientImportPreview, commitPatientImport } from "../../routes/imports.js";
import { parseImagingManifest, commitImagingImport } from "../../routes/imaging.js";
import { classifyLine, buildClinicProfileSuggestion } from "./smartImportsClassification.js";
import { buildPublicLookupTargets } from "./smartImportsClinicLookup.js";
import { buildLegacySources, buildMigrationPlan } from "./smartImportsLegacyPlans.js";
import { emptyPatientText } from "./smartImportsConstants.js";
import { Dental4WindowsXmlParser } from "./d4wParser.js";
import { IdentJsonParser } from "./identParser.js";
import { InfodentCsvParser } from "./infodentParser.js";
import { parseCsv } from "./csvParser.js";

export async function buildSmartImportPreview(
	orgId: string,
	input: { sourceName: string; rawText: string; mode: SmartImportMode },
) {
	const lines = input.rawText.split(/\r?\n/);
	const classifications = lines.map((line, index) =>
		classifyLine(line, index + 1, input.mode),
	);
	const patientLines = classifications
		.filter((line) => line.kind === "patient")
		.map((line) => line.text);
	const imagingLines = classifications
		.filter((line) => line.kind === "imaging")
		.map((line) => line.text);
	const clinicLines = classifications.filter((line) => line.kind === "clinic");
	const legacySourceLines = classifications.filter(
		(line) => line.kind === "legacy_source",
	);
	const patientRawText = patientLines.join("\n");
	const imagingRawText = imagingLines.join("\n");
	const clinicRawText = clinicLines.map((line) => line.text).join("\n");
	const legacySourceRawText = legacySourceLines
		.map((line) => line.text)
		.join("\n");
	const clinicSuggestion = buildClinicProfileSuggestion(clinicLines);
	const publicLookupTargets = buildPublicLookupTargets(
		clinicSuggestion,
		clinicRawText,
	);
	const legacySources = buildLegacySources(legacySourceLines);

	const patientPreview = await buildPatientImportPreview(orgId, {
		sourceName: `${input.sourceName}:patients`,
		sourceKind: "mis_export",
		rawText: patientRawText || emptyPatientText,
	});
	const imagingPreview = await parseImagingManifest(orgId, {
		sourceName: `${input.sourceName}:imaging`,
		sourceKind: "folder_watch",
		rawText: imagingRawText,
	});
	const migrationPlan = buildMigrationPlan({
		patientRows: patientPreview.totalRows,
		patientReadyRows: patientPreview.readyRows,
		imagingRows: imagingPreview.totalRows,
		imagingReadyRows: imagingPreview.readyRows,
		clinicSuggestion,
		publicLookupTargets,
		legacySources,
	});

	return smartImportPreviewResponseSchema.parse({
		sourceName: input.sourceName,
		totalLines: classifications.filter((line) => line.text.trim()).length,
		patientRawText,
		imagingRawText,
		clinicRawText,
		legacySourceRawText,
		patientPreview,
		imagingPreview,
		clinicSuggestion,
		publicLookupTargets,
		legacySources,
		migrationPlan,
		lineClassifications: classifications.filter((line) => line.text.trim()),
		parserNotes: [
			"Умный парсер разделяет смешанную выгрузку на строки пациентов и строки снимков до любой записи.",
			"Факты профиля клиники предлагаются отдельно и не записываются автоматом.",
			"Старая база, архив снимков, архив, сетевая папка и таблицы сначала становятся черновыми кандидатами.",
			"Публичные ссылки используют только название, адрес и ИНН клиники; пациентские данные не уходят в карты или поиск.",
			"Порядок записи: сначала пациенты, затем снимки, чтобы снимки из той же выгрузки могли привязаться к созданным картам.",
			"Предупреждения и заблокированные строки остаются вне базы, пока пользователь не исправит сопоставление или исходные данные.",
		],
	});
}


// Canonical Import Types
export interface CanonicalImportPatient {
  externalId: string;
  fullName: string;
  lastName: string;
  firstName: string;
  middleName: string;
  birthDate: string | null;
  phone: string | null;
  secondaryPhone: string | null;
  email: string | null;
  gender: "male" | "female" | "unknown";
  address: string | null;
  notes: string | null;
  balanceKopecks: number | null;
  balanceRub: number | null;
  sourceSystem: "infodent" | "dental4windows" | "ident" | "generic";
  sourceRow: number;
}

export interface CanonicalDetectedResult {
  format: "d4w_xml" | "ident_json" | "infodent_csv" | "generic_csv" | "free_text";
  patients: CanonicalImportPatient[];
  warnings: string[];
}

export class SmartImportEngine {
  public static detectAndParse(input: string): CanonicalDetectedResult {
    if (Dental4WindowsXmlParser.isD4wXml(input)) {
      const res = Dental4WindowsXmlParser.parse(input);
      return {
        format: "d4w_xml",
        patients: res.patients.map((p, i) => ({
          externalId: p.externalId,
          fullName: p.fullName,
          lastName: p.lastName,
          firstName: p.firstName,
          middleName: p.middleName,
          birthDate: p.birthDate,
          phone: p.phone,
          secondaryPhone: p.secondaryPhone,
          email: p.email,
          gender: p.gender,
          address: p.address,
          notes: p.notes,
          balanceKopecks: p.balanceKopecks,
          balanceRub: p.balanceRub,
          sourceSystem: "dental4windows",
          sourceRow: i + 1,
        })),
        warnings: res.warnings,
      };
    }
    if (IdentJsonParser.isIdentJson(input)) {
      const res = IdentJsonParser.parse(input);
      return {
        format: "ident_json",
        patients: res.patients.map((p, i) => ({
          externalId: p.id,
          fullName: p.fullName,
          lastName: p.lastName,
          firstName: p.firstName,
          middleName: p.middleName,
          birthDate: p.birthDate,
          phone: p.phone,
          secondaryPhone: p.secondaryPhone,
          email: p.email,
          gender: p.gender,
          address: p.address,
          notes: p.notes,
          balanceKopecks: p.balanceKopecks,
          balanceRub: p.balanceRub,
          sourceSystem: "ident",
          sourceRow: i + 1,
        })),
        warnings: res.warnings,
      };
    }
    const infodent = InfodentCsvParser.parse(input);
    if (infodent.patients.length > 0) {
      return {
        format: "infodent_csv",
        patients: infodent.patients.map((p) => ({
          externalId: p.externalId,
          fullName: p.fullName,
          lastName: p.lastName,
          firstName: p.firstName,
          middleName: p.middleName,
          birthDate: p.birthDate,
          phone: p.phone,
          secondaryPhone: p.secondaryPhone,
          email: p.email,
          gender: p.gender,
          address: p.address,
          notes: p.notes,
          balanceKopecks: p.balanceKopecks,
          balanceRub: p.balanceRub,
          sourceSystem: "infodent",
          sourceRow: p.sourceRow,
        })),
        warnings: infodent.warnings,
      };
    }
    return {
      format: "free_text",
      patients: [],
      warnings: ["Текст разобран стандартным строковым классификатором."],
    };
  }

  public static async buildPreview(orgId: string, input: SmartImportRequest): Promise<SmartImportPreviewResponse> {
    return await buildSmartImportPreview(orgId, input);
  }
}
