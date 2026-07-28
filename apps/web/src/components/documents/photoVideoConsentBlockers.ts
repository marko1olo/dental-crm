import type { PhotoVideoConsentMaterial } from "@dental/shared";

/**
 * Что мешает создать согласие на фото, видео и снимки — весь перечень сразу.
 *
 * ЧТО ВИДЕЛ АДМИНИСТРАТОР. Вид «Фото, видео и снимки» — это одиннадцать галочек
 * подряд и два текстовых поля. Ни одна галочка не помечена обязательной, и по
 * виду они неотличимы: рядом стоят разрешения, которые ВЫБИРАЕТ ПАЦИЕНТ
 * (лаборатория, консилиум, обучение, маркетинг, узнаваемая публикация), и
 * отметки, которые клиника обязана поставить, иначе документа не будет.
 *
 * В чистом хранилище пусты именно обязательные: список видов материалов пустой,
 * обе обязательные отметки сняты (documentStore.ts:1940-1953). Проверка согласия
 * (validatePhotoVideoConsent в documentValidators.ts:1187) — цепочка `??`, она
 * отдаёт одну позицию за нажатие, поэтому на каждом новом согласии это было три
 * отказа подряд: «Отметьте хотя бы один тип фото, видео или снимков», затем
 * «Подтвердите, что фото, видео и снимки вносятся в медицинскую карту
 * пациента», затем «Подтвердите, что внешнее использование возможно только
 * после обезличивания…».
 *
 * ОСОБО — ПРАВИЛО, КОТОРОЕ НЕВОЗМОЖНО УГАДАТЬ. Отметка «Разрешена узнаваемая
 * публикация лица или улыбки» сама по себе недействительна: проверка отказывает,
 * если не отмечено ни обучение, ни маркетинг. На экране об этой связи не было ни
 * слова, а галочка стояла отдельной строкой и читалась как самостоятельное
 * разрешение. Администратор отмечал ровно то, что разрешил пациент, и получал
 * отказ без объяснения связи.
 *
 * ЧТО ЗДЕСЬ. Тот же разбор, но целиком и до нажатия, пересчитываемый по ходу
 * заполнения. Порядок позиций совпадает с порядком проверки, поэтому перечень
 * читается как та же последовательность отказов, только сразу вся.
 *
 * ПОЧЕМУ КОПИЯ ПРАВИЛА, А НЕ ВЫЗОВ ВАЛИДАТОРА. Валидатор физически не умеет
 * отдать больше одной позиции (`a ?? b ?? c` останавливается на первой непустой)
 * и требует весь DocumentState, которого у формы нет.
 *
 * НЕЗАКРЫТЫЙ ДОЛГ, ЧЕСТНО. Сторожа расхождения с валидатором здесь нет: правка
 * ограничена каталогом components/documents, а тесты живут в src/tests. У
 * договора платных услуг такую же копию правила сторожит
 * tests/paidContractRequiredFields.test.ts; такой же сторож нужен и сюда, он
 * заявлен долгом в отчёте пакета.
 */

/** Одно невыполненное условие согласия на фото и видео. */
export interface PhotoVideoConsentBlocker {
	/** Ключ поля состояния: устойчив к переименованию подписи. */
	field: string;
	/** Подпись ровно как в форме — человек ищет её глазами. */
	label: string;
	/** Что именно сделать. Тупиковых подсказок быть не должно. */
	hint: string;
}

export interface PhotoVideoConsentBlockersReview {
	/** Сколько условий проверяет согласие. */
	requiredCount: number;
	/** Невыполненные, в том же порядке, в каком о них ругается проверка. */
	blockers: PhotoVideoConsentBlocker[];
}

export interface PhotoVideoConsentBlockersInput {
	materials: readonly PhotoVideoConsentMaterial[];
	clinicalRecordUseConfirmed: boolean;
	anonymizationConfirmed: boolean;
	revocationChannel: string;
	recognizablePublicationAllowed: boolean;
	marketingUseAllowed: boolean;
	educationUseAllowed: boolean;
}

export function photoVideoConsentBlockersReview(
	input: PhotoVideoConsentBlockersInput,
): PhotoVideoConsentBlockersReview {
	const checks: Array<PhotoVideoConsentBlocker & { ok: boolean }> = [
		{
			field: "photoVideoMaterials",
			label: "Виды материалов",
			hint: "отметьте хотя бы один вид: что именно снимают этому пациенту",
			ok: input.materials.length > 0,
		},
		{
			field: "photoVideoClinicalRecordUseConfirmed",
			label: "Внесение в медицинскую карту",
			hint: "поставьте отметку: снимки хранятся в карте пациента, без неё согласие не создастся",
			ok: input.clinicalRecordUseConfirmed,
		},
		{
			field: "photoVideoAnonymizationConfirmed",
			label: "Обезличивание вне клиники",
			hint: "поставьте отметку, когда объяснили пациенту, что за пределами клиники материалы используются без его данных",
			ok: input.anonymizationConfirmed,
		},
		{
			field: "photoVideoRevocationChannel",
			label: "Как пациент отзывает согласие",
			hint: "текст стёрт — впишите своими словами, куда пациенту обращаться, чтобы отозвать согласие",
			ok: String(input.revocationChannel ?? "").trim() !== "",
		},
		{
			field: "photoVideoRecognizablePublicationAllowed",
			label: "Узнаваемая публикация лица или улыбки",
			hint: "сама по себе она недействительна — отметьте обучение или маркетинг либо снимите узнаваемую публикацию",
			ok:
				!input.recognizablePublicationAllowed ||
				input.marketingUseAllowed ||
				input.educationUseAllowed,
		},
	];

	return {
		requiredCount: checks.length,
		blockers: checks
			.filter((check) => !check.ok)
			.map(({ field, label, hint }) => ({ field, label, hint })),
	};
}
