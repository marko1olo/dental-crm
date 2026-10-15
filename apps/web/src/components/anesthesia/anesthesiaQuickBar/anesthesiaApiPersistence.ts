import type { AnestheticDrugId, InjectionTechniqueId } from '../anesthesiaCatalog';
import { denteAdminSecretRequestHeaders } from '../../../lib/denteRequestHeaders';

export interface PersistAnesthesiaLogParams {
	patientId?: string | undefined;
	visitId?: string | undefined;
	drugId: AnestheticDrugId;
	techniqueId: InjectionTechniqueId;
	carpulesCount: number;
	patientWeightKg: number;
	patientAgeYears: number;
	isCardioRisk: boolean;
	targetToothNumberFdi?: number | string | undefined;
	diaryEntry: string;
}

function resolveDrugMeta(drugId: AnestheticDrugId) {
	if (drugId === 'articaine_1_100k') {
		return { drugEnum: 'articaine' as const, vasoEnum: '1:100000' as const, concentrationPct: 4.0, brandName: 'Ультракаин Д-С форте' };
	}
	if (drugId === 'septanest_1_100k') {
		return { drugEnum: 'articaine' as const, vasoEnum: '1:100000' as const, concentrationPct: 4.0, brandName: 'Септанест 1:100 000' };
	}
	if (drugId === 'mepivacaine_plain') {
		return { drugEnum: 'mepivacaine' as const, vasoEnum: 'none' as const, concentrationPct: 3.0, brandName: 'Скандонест 3%' };
	}
	if (drugId === 'lidocaine_1_100k') {
		return { drugEnum: 'lidocaine' as const, vasoEnum: '1:100000' as const, concentrationPct: 2.0, brandName: 'Лидокаин 2% с адреналином' };
	}
	if (drugId === 'lidocaine_plain') {
		return { drugEnum: 'lidocaine' as const, vasoEnum: 'none' as const, concentrationPct: 2.0, brandName: 'Лидокаин 2% чистый' };
	}
	if (drugId === 'bupivacaine_05') {
		return { drugEnum: 'bupivacaine' as const, vasoEnum: 'none' as const, concentrationPct: 0.5, brandName: 'Бупивакаин 0.5%' };
	}
	return { drugEnum: 'articaine' as const, vasoEnum: '1:200000' as const, concentrationPct: 4.0, brandName: 'Ультракаин Д-С' };
}

function resolveTechniqueEnum(techniqueId: InjectionTechniqueId) {
	if (techniqueId === 'mandibular_torus') return 'mandibular_block';
	if (techniqueId === 'mental_incisive') return 'mental_block';
	if (techniqueId === 'tuberal') return 'tuberal_block';
	if (techniqueId === 'palatal_greater') return 'palatine_block';
	if (techniqueId === 'incisive_canal') return 'incisive_block';
	if (techniqueId === 'intraligamentary_sta') return 'intraligamentary';
	if (techniqueId === 'intraseptal') return 'intraosseous';
	if (techniqueId === 'application_topical') return 'topical';
	return 'infiltration';
}

export function persistAnesthesiaLog(params: PersistAnesthesiaLogParams): void {
	if (!params.patientId) return;

	const { drugEnum, vasoEnum, concentrationPct, brandName } = resolveDrugMeta(params.drugId);
	const techniqueEnum = resolveTechniqueEnum(params.techniqueId);

	const toothNum =
		typeof params.targetToothNumberFdi === 'number'
			? params.targetToothNumberFdi
			: parseInt(String(params.targetToothNumberFdi || ''), 10);
	const toothNumbers = Number.isInteger(toothNum) && toothNum > 0 ? [toothNum] : [];

	try {
		fetch(`/api/anesthesia/patients/${params.patientId}/logs`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				...denteAdminSecretRequestHeaders(),
			},
			body: JSON.stringify({
				visitId: params.visitId || null,
				technique: techniqueEnum,
				drug: drugEnum,
				drugBrandName: brandName,
				concentrationPct,
				vasoconstrictor: vasoEnum,
				carpuleVolumeMl: 1.7,
				carpulesAdministered: params.carpulesCount,
				patientWeightKg: params.patientWeightKg,
				patientAgeYears: params.patientAgeYears,
				asaClass: params.isCardioRisk ? 'ASA_III' : 'ASA_I',
				hasCardiovascularDisease: params.isCardioRisk,
				aspirationTestPositive: false,
				toothNumbers,
				notes: params.diaryEntry,
				autoDeductInventory: true,
				addToVisitEstimate: Boolean(params.visitId),
			}),
		}).catch((err) => {
			console.warn('[AnesthesiaQuickBar] Failed to log anesthesia to API:', err);
		});
	} catch (err) {
		console.warn('[AnesthesiaQuickBar] Anesthesia API request error:', err);
	}
}

export async function postEmergencyAntishockWriteoff(visitId?: string): Promise<void> {
	await fetch('/api/inventory/quick-writeoff-emergency-antishock', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			...denteAdminSecretRequestHeaders(),
		},
		body: JSON.stringify({
			visitId: visitId || null,
			scenarioId: 'anaphylactic_shock',
			notes: 'Экстренное списание укладки «Антишок» у кресла',
		}),
	});
}
