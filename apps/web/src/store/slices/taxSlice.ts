export type MedicalDocumentReleaseChannel =
	| "paper"
	| "pdf"
	| "dicom_archive"
	| "secure_link"
	| "physical_media"
	| "other";

import { postVisitCarePresets } from "../../postVisitCareData";
import { loadUiPreferences } from "../../utils/preferencesUtils";

const initialUiPreferences = loadUiPreferences();

/*
 * Памятка после приёма берётся из ТОЙ ЖЕ темы, что стоит в селекте.
 *
 * Тема бралась из сохранённых настроек оператора
 * (initialUiPreferences.postVisitCareTopic), а девять полей текста были жёстко
 * прибиты к пресету filling_restoration. Если в настройках сохранена другая тема
 * — удаление, имплантация, гигиена — врач получал памятку, где тема одна, а
 * текст от другого вмешательства: процедура «Пломба / композитная реставрация»,
 * ограничения, питание и тревожные признаки от пломбы. В документ уходит и тема
 * (careTopic), и текст, а весь блок памятки свёрнут в <details>, поэтому
 * расхождение не видно, пока его не раскроют.
 *
 * Единственный писатель этих девяти полей — applyPostVisitCarePreset в
 * useAppLogic.tsx, и он берёт ровно postVisitCarePresets[тема]. Начальное
 * состояние теперь делает то же самое: один источник правды.
 *
 * Индексация безопасна: loadUiPreferences проверяет тему по списку допустимых
 * значений и при мусоре возвращает filling_restoration, а postVisitCarePresets
 * объявлен как Record<PostVisitCareTopic, …>, то есть покрывает все темы.
 */
const _initialPostVisitCarePreset =
	postVisitCarePresets[initialUiPreferences.postVisitCareTopic];

// biome-ignore lint/suspicious/noExplicitAny: automated suppression
function createSetter(set: any, key: string) {
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	return (val: any) =>
		// biome-ignore lint/suspicious/noExplicitAny: automated suppression
		set((state: any) => ({
			[key]: typeof val === "function" ? val(state[key]) : val,
		}));
}

// biome-ignore lint/suspicious/noExplicitAny: automated suppression
// biome-ignore lint/suspicious/noExplicitAny: automated suppression
export const createTaxSlice = (set: any) => ({
	taxDocumentPayerInn: "",
	setTaxDocumentPayerInn: createSetter(set, "taxDocumentPayerInn"),
	taxApplicationTaxpayerFullName: "",
	setTaxApplicationTaxpayerFullName: createSetter(
		set,
		"taxApplicationTaxpayerFullName",
	),
	taxApplicationTaxpayerInn: "",
	setTaxApplicationTaxpayerInn: createSetter(set, "taxApplicationTaxpayerInn"),
	taxApplicationTaxpayerBirthDate: "",
	setTaxApplicationTaxpayerBirthDate: createSetter(
		set,
		"taxApplicationTaxpayerBirthDate",
	),
	taxApplicationTaxpayerIdentityDocument: "",
	setTaxApplicationTaxpayerIdentityDocument: createSetter(
		set,
		"taxApplicationTaxpayerIdentityDocument",
	),
	taxApplicationRelationship: "self",
	setTaxApplicationRelationship: createSetter(
		set,
		"taxApplicationRelationship",
	),
	taxApplicationForm: initialUiPreferences.taxApplicationForm,
	setTaxApplicationForm: createSetter(set, "taxApplicationForm"),
	taxApplicationDeliveryChannel:
		initialUiPreferences.taxApplicationDeliveryChannel,
	setTaxApplicationDeliveryChannel: createSetter(
		set,
		"taxApplicationDeliveryChannel",
	),
	taxApplicationContact: "",
	setTaxApplicationContact: createSetter(set, "taxApplicationContact"),
	taxApplicationAuthorityDocument: "",
	setTaxApplicationAuthorityDocument: createSetter(
		set,
		"taxApplicationAuthorityDocument",
	),
	taxApplicationRequestedAt: "",
	setTaxApplicationRequestedAt: createSetter(set, "taxApplicationRequestedAt"),
	taxApplicationDuplicateWarningAccepted: false,
	setTaxApplicationDuplicateWarningAccepted: createSetter(
		set,
		"taxApplicationDuplicateWarningAccepted",
	),
	taxDocumentYear:
		initialUiPreferences?.taxDocumentYear ?? new Date().getFullYear(),
	setTaxDocumentYear: (val) =>
		set((state) => ({
			taxDocumentYear:
				typeof val === "function" ? val(state.taxDocumentYear) : val,
		})),
});

// biome-ignore lint/suspicious/noExplicitAny: automated suppression
// biome-ignore lint/suspicious/noExplicitAny: automated suppression
// biome-ignore lint/suspicious/noExplicitAny: automated suppression
// biome-ignore lint/suspicious/noExplicitAny: automated suppression
