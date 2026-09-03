import { GENERAL_TEMPLATES_HTML } from "./generalAndContracts.js";
import { ORTHO_AND_DIAGNOSTIC_TEMPLATES_HTML } from "./orthoAndDiagnosticConsents.js";
import { SURGERY_AND_IMPLANT_TEMPLATES_HTML } from "./surgeryAndImplantConsents.js";
import {
	SHARED_DOCUMENT_CSS,
	renderDocHeader,
	renderPatientInfoBlock,
	renderSignaturesBlock,
} from "./templateStyles.js";
import { THERAPY_AND_PERIO_TEMPLATES_HTML } from "./therapyAndPerioConsents.js";

export * from "./templateStyles.js";

/**
 * Объединенный реестр всех 49 HTML-бланков Минздрава РФ
 */
export const ALL_DEFAULT_TEMPLATES_BY_ALIAS: Record<string, string> = {
	...GENERAL_TEMPLATES_HTML,
	...THERAPY_AND_PERIO_TEMPLATES_HTML,
	...SURGERY_AND_IMPLANT_TEMPLATES_HTML,
	...ORTHO_AND_DIAGNOSTIC_TEMPLATES_HTML,
};

/**
 * Возвращает канонический HTML-шаблон для любого из 49 бланков по его stomxId, alias или названию.
 */
export function getDefaultTemplateContentHtml(
	stomxId?: number | null,
	systemAlias?: string | null,
	name?: string | null,
): string {
	const cleanAlias = (systemAlias ?? "").trim();
	if (cleanAlias && ALL_DEFAULT_TEMPLATES_BY_ALIAS[cleanAlias]) {
		return ALL_DEFAULT_TEMPLATES_BY_ALIAS[cleanAlias];
	}

	// Поиск по stomxId
	const stomxMap: Record<number, string> = {
		1: "invoice-act",
		2: "medplan",
		3: "outpatient-card",
		4: "dental-work-order",
		5: "doctor-schedule",
		6: "x-ray-protocol",
		7: "fns-payment-certificate",
		8: "orthodontic-card",
		9: "stock-remains",
		11: "orthodontic-card-epicrisis",
		12: "medplan-agg",
		13: "invoice-xray-act",
		15: "x-ray-dose-load",
		16: "dms-act",
		18: "orthodontic-card-observation",
		50: "loan",
		51: "medplan-agg-tooth",
		52: "director-ai-report",
		53: "anketa_obshchego_sostoyaniya_zdorovya",
		54: "garantijnyj_pasport",
		55: "dogovor_na_okazanie_med_uslug",
		56: "dogovor_na_okazanie_med_uslug_nesovershennoletnego",
		57: "ids_anesteziya",
		58: "ids_viniry",
		59: "ids_glubokij_karies",
		60: "ids_implant",
		61: "ids_na_lechenie_poverkhnostnogo_i_srednego_kariesa",
		62: "ids_na_medicinskoe_vmeshatelstvo",
		63: "ids_nesemnye_ortopedicheskie_konstrukcii",
		64: "ids_obshchee_dlya_nesovershennoletnikh",
		65: "ids_ortodontiya_obshchee",
		66: "ids_ortopediya",
		67: "ids_otbelivanie",
		68: "ids_parodontologiya",
		69: "ids_prof_gigiena",
		70: "ids_pulpit",
		71: "ids_rentgen",
		72: "ids_sedaciya",
		73: "ids_sinus_lifting",
		74: "ids_semnye_ortopedicheskie_konstrukcii",
		75: "ids_terapiya",
		76: "ids_udalenie_zuba",
		77: "ids_fotoprotokol",
		78: "ids_khirurgiya",
		79: "ids_endodonticheskoe_lechenie",
		80: "otkaz_v_peredache_dannykh_v_egisz",
		81: "otkaz_ot_lecheniya",
		82: "polozhenie_o_garantiyakh",
		83: "soglasie_na_obrabku_pd",
	};

	if (stomxId && stomxMap[stomxId]) {
		const alias = stomxMap[stomxId];
		if (ALL_DEFAULT_TEMPLATES_BY_ALIAS[alias]) {
			return ALL_DEFAULT_TEMPLATES_BY_ALIAS[alias];
		}
	}

	// Качественный фоллбек для нестандартного шаблона
	const docTitle = (name ?? cleanAlias ?? "МЕДИЦИНСКИЙ ДОКУМЕНТ").toUpperCase();
	return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/><title>${docTitle}</title>${SHARED_DOCUMENT_CSS}</head>
<body>
<div class="doc-wrapper">
  ${renderDocHeader()}
  <div class="doc-title">${docTitle}</div>
  ${renderPatientInfoBlock()}
  <p class="doc-paragraph">
    Настоящий медицинский документ оформлен в стоматологической клинике <strong>{{Клиника.Название}}</strong> 
    врачом <strong>{{АктивныйВрач.Должность}} {{АктивныйВрач.ФИО}}</strong> для пациента <strong>{{Пациент.ФИО}}</strong>.
  </p>
  ${renderSignaturesBlock()}
</div>
</body>
</html>
`;
}
