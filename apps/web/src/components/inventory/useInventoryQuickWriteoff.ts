import { useRef, useState } from "react";
import { logger } from "../../utils/logger.js";
import { showToast } from "../GlobalToast.js";

export interface UseInventoryQuickWriteoffParams {
	readonly organizationId: string;
	readonly getHeaders: (extra?: Record<string, string>) => Record<string, string>;
	readonly fetchItems: () => Promise<void>;
}

export function useInventoryQuickWriteoff({
	organizationId,
	getHeaders,
	fetchItems,
}: UseInventoryQuickWriteoffParams) {
	const isWritingOffStandardKitRef = useRef(false);
	const [isWritingOffStandardKit, setIsWritingOffStandardKit] = useState(false);
	const isWritingOffCarpulesRef = useRef(false);
	const [isWritingOffCarpules, setIsWritingOffCarpules] = useState(false);
	const isWritingOffSterilizationKitRef = useRef(false);
	const [isWritingOffSterilizationKit, setIsWritingOffSterilizationKit] = useState(false);
	const isWritingOffShiftBundleRef = useRef(false);
	const [isWritingOffShiftBundle, setIsWritingOffShiftBundle] = useState(false);
	const isWritingOffVisitBundleRef = useRef(false);
	const [isWritingOffVisitBundle, setIsWritingOffVisitBundle] = useState(false);

	/**
	 * Быстрое списание базового набора приёма:
	 * (перчатки, маска, слюноотсос, нагрудник, валики) без поиска по 1000 позициям склада.
	 * Реализует расход сверх остатка (мягкий овердрафт) склада без блокировки приёма.
	 */
	const handleQuickWriteoffStandardKit = async (options?: {
		visitId?: string;
		cabinetId?: string;
		chairId?: string;
		notes?: string;
	}) => {
		if (isWritingOffStandardKitRef.current) return;
		isWritingOffStandardKitRef.current = true;
		setIsWritingOffStandardKit(true);

		try {
			const res = await fetch(
				`/api/inventory/${organizationId}/quick-writeoff-standard-kit`,
				{
					method: "POST",
					headers: getHeaders({
						"Content-Type": "application/json",
					}),
					body: JSON.stringify({
						...(options ?? {}),
						allowSoftOverdraft: true,
						allowOverdraft: true,
					}),
				},
			);

			if (res.ok) {
				const data = await res.json();
				if ((Array.isArray(data.warnings) && data.warnings.length > 0) || data.isOverdraft) {
					const notice = options?.visitId
						? `Требуется оприходование: материал списан с дефицитом по визиту №${options.visitId}`
						: "Внимание: остаток отрицательный (расход сверх остатка / списание с дефицитом), требуется оприходование накладной";
					showToast(notice, "warning");
				} else {
					showToast(
						"Базовый набор приёма списан: перчатки (2 пары), маска (2 шт.), слюноотсос, нагрудник, валики (6 шт.)",
						"success",
					);
				}
				fetchItems();
			} else {
				showToast("Ошибка списания базового набора", "error");
			}
		} catch (e) {
			logger.error(e);
			showToast("Системная ошибка при списании базового набора", "error");
		} finally {
			isWritingOffStandardKitRef.current = false;
			setIsWritingOffStandardKit(false);
		}
	};

	/**
	 * Быстрое списание пустых карпул анестетика (СанПиН 3.3686-21, ПКУ).
	 * Ликвидирует требование комиссии из 3 человек.
	 * Реализует расход сверх остатка (мягкий овердрафт) склада без комиссии.
	 */
	const handleQuickWriteoffCarpules = async (options?: {
		carpulesCount?: number;
		drugName?: string;
		visitId?: string;
		cabinetId?: string;
		chairId?: string;
		disposalReason?: "used_in_procedure" | "partial_dose" | "broken_capsule" | "expired";
		isBroken?: boolean;
		isPartial?: boolean;
		disinfectionMethod?: string;
		notes?: string;
	}) => {
		if (isWritingOffCarpulesRef.current) return;
		isWritingOffCarpulesRef.current = true;
		setIsWritingOffCarpules(true);

		try {
			const res = await fetch(
				`/api/inventory/${organizationId}/quick-writeoff-carpules`,
				{
					method: "POST",
					headers: getHeaders({
						"Content-Type": "application/json",
					}),
					body: JSON.stringify({
						...(options ?? {}),
						allowSoftOverdraft: true,
						allowOverdraft: true,
					}),
				},
			);

			if (res.ok) {
				const data = await res.json();
				if ((Array.isArray(data.warnings) && data.warnings.length > 0) || data.isOverdraft) {
					const notice = options?.visitId
						? `Требуется оприходование: материал списан с дефицитом по визиту №${options.visitId}`
						: "Остаток 0: зафиксирован расход сверх остатка (списание с дефицитом: списание карпул выполнено, накладная в пути)";
					showToast(notice, "warning");
				} else {
					const count = options?.carpulesCount ?? 1;
					const reasonText =
						options?.disposalReason === "broken_capsule"
							? `Бой карпул анестетика (${count} шт., стекло Класс Б)`
							: options?.disposalReason === "partial_dose"
								? `Неполные карпулы анестетика (${count} шт., Класс Б)`
								: `Пустые карпулы анестетика списаны (${count} шт., СанПиН 3.3686-21, ПКУ без комиссии из 3 человек)`;
					showToast(reasonText, "success");
				}
				fetchItems();
			} else {
				showToast("Ошибка списания карпул", "error");
			}
		} catch (e) {
			logger.error(e);
			showToast("Системная ошибка при списании карпул", "error");
		} finally {
			isWritingOffCarpulesRef.current = false;
			setIsWritingOffCarpules(false);
		}
	};

	/**
	 * Быстрое списание пустой карпулы анестетика (Септанест/Убистезин)
	 * по СанПиН 3.3686-21, ПКУ без созыва комиссии из 3 человек.
	 * Расход сверх остатка при задержке оприходования накладной.
	 */
	const handleQuickWriteoffAnestheticCarpule = async (options?: {
		carpulesCount?: number;
		visitId?: string;
		cabinetId?: string;
		chairId?: string;
		notes?: string;
	}) => {
		return handleQuickWriteoffCarpules({
			carpulesCount: options?.carpulesCount ?? 1,
			drugName: "Септанест/Убистезин",
			...(options?.visitId ? { visitId: options.visitId } : {}),
			...(options?.cabinetId ? { cabinetId: options.cabinetId } : {}),
			...(options?.chairId ? { chairId: options.chairId } : {}),
			notes: options?.notes ?? "Быстрое списание карпулы анестетика (Септанест/Убистезин) без комиссии",
		});
	};

	/**
	 * Быстрое списание «Набор стерилизации: 1 лоток + перчатки»
	 * (1 лоток со смотровым набором в крафт-пакете + 2 пары перчаток + дезинфицирующая салфетка)
	 * без созыва комиссии из 3 человек и с мягким овердрафтом склада (Мандат 8e п. 10).
	 */
	const handleQuickWriteoffSterilizationKit = async (options?: {
		visitId?: string;
		cabinetId?: string;
		chairId?: string;
		notes?: string;
	}) => {
		if (isWritingOffSterilizationKitRef.current) return;
		isWritingOffSterilizationKitRef.current = true;
		setIsWritingOffSterilizationKit(true);

		try {
			const res = await fetch(
				`/api/inventory/${organizationId}/quick-writeoff-package`,
				{
					method: "POST",
					headers: getHeaders({
						"Content-Type": "application/json",
					}),
					body: JSON.stringify({
						packageId: "sterilization_kit",
						...(options?.visitId ? { visitId: options.visitId } : {}),
						...(options?.cabinetId ? { cabinetId: options.cabinetId } : {}),
						...(options?.chairId ? { chairId: options.chairId } : {}),
						notes: options?.notes ?? "Быстрое списание: Набор стерилизации: 1 лоток + перчатки",
						allowSoftOverdraft: true,
						allowOverdraft: true,
					}),
				},
			);

			if (res.ok) {
				const data = await res.json();
				if (data.isOverdraft || (Array.isArray(data.warnings) && data.warnings.length > 0)) {
					const notice = options?.visitId
						? `Требуется оприходование: материал списан с дефицитом по визиту №${options.visitId}`
						: "Внимание: остаток отрицательный (расход сверх остатка / списание с дефицитом), требуется оприходование накладной";
					showToast(notice, "warning");
				} else {
					showToast(
						"Набор стерилизации (1 лоток + перчатки) успешно списан",
						"success",
					);
				}
				fetchItems();
			} else {
				showToast("Ошибка списания набора стерилизации", "error");
			}
		} catch (e) {
			logger.error(e);
			showToast("Системная ошибка при списании набора стерилизации", "error");
		} finally {
			isWritingOffSterilizationKitRef.current = false;
			setIsWritingOffSterilizationKit(false);
		}
	};

	/**
	 * Быстрое пакетное списание стандартного расхода смены (комплект терапия / ортопедия / хирургия).
	 * Избавляет персонал от ручного прокликивания 40 позиций.
	 * Реализует расход сверх остатка (мягкий овердрафт) склада без блокировки работы.
	 */
	const handleQuickWriteoffShiftBundle = async (
		bundleType: "therapy" | "orthopedics" | "surgery" = "therapy",
		options?: {
			visitId?: string;
			cabinetId?: string;
			chairId?: string;
			notes?: string;
		},
	) => {
		if (isWritingOffShiftBundleRef.current) return;
		isWritingOffShiftBundleRef.current = true;
		setIsWritingOffShiftBundle(true);

		const bundleNameRu =
			bundleType === "orthopedics"
				? "Ортопедия"
				: bundleType === "surgery"
					? "Хирургия"
					: "Терапия";

		try {
			const res = await fetch(
				`/api/inventory/${organizationId}/quick-writeoff-shift-bundle`,
				{
					method: "POST",
					headers: getHeaders({
						"Content-Type": "application/json",
					}),
					body: JSON.stringify({
						bundleType,
						visitId: options?.visitId,
						cabinetId: options?.cabinetId,
						chairId: options?.chairId,
						notes: options?.notes,
						allowSoftOverdraft: true,
						allowOverdraft: true,
					}),
				},
			);

			if (res.ok) {
				const data = await res.json();
				if ((Array.isArray(data.warnings) && data.warnings.length > 0) || data.isOverdraft) {
					const notice = options?.visitId
						? `Требуется оприходование: материал списан с дефицитом по визиту №${options.visitId}`
						: "Внимание: остаток отрицательный (расход сверх остатка / списание с дефицитом), требуется оприходование накладной";
					showToast(notice, "warning");
				} else {
					showToast(
						`Стандартный расход смены «${bundleNameRu}» успешно списан (${data.deductedItems?.length || 9} позиций: перчатки, маски, салфетки, слюноотсосы, стаканчики, валики)`,
						"success",
					);
				}
				fetchItems();
			} else {
				showToast(`Ошибка списания расхода смены «${bundleNameRu}»`, "error");
			}
		} catch (e) {
			logger.error(e);
			showToast("Системная ошибка при списании расхода смены", "error");
		} finally {
			isWritingOffShiftBundleRef.current = false;
			setIsWritingOffShiftBundle(false);
		}
	};

	/**
	 * Быстрое пакетное списание материалов по типовой карте визита:
	 * - «Терапия»: карпула анестетика + игла + перчатки + слюноотсос + валики + нагрудник
	 * - «Хирургия»: карпула анестетика + игла + скальпель + шовный материал + гемостатическая губка
	 * Реализует расход сверх остатка (мягкий овердрафт) при задержке накладной и списание без созыва комиссии (Мандат 8e п. 10).
	 */
	const handleQuickWriteoffVisitBundle = async (
		visitType: "therapy" | "surgery" = "therapy",
		options?: {
			visitId?: string;
			cabinetId?: string;
			chairId?: string;
			notes?: string;
		},
	) => {
		if (isWritingOffVisitBundleRef.current) return;
		isWritingOffVisitBundleRef.current = true;
		setIsWritingOffVisitBundle(true);

		const visitNameRu = visitType === "surgery" ? "Хирургия" : "Терапия";

		try {
			const res = await fetch(
				`/api/inventory/${organizationId}/quick-writeoff-visit-bundle`,
				{
					method: "POST",
					headers: getHeaders({
						"Content-Type": "application/json",
					}),
					body: JSON.stringify({
						visitType,
						visitId: options?.visitId,
						cabinetId: options?.cabinetId,
						chairId: options?.chairId,
						notes: options?.notes,
						allowSoftOverdraft: true,
						allowOverdraft: true,
					}),
				},
			);

			if (res.ok) {
				const data = await res.json();
				if ((Array.isArray(data.warnings) && data.warnings.length > 0) || data.isOverdraft) {
					const notice = options?.visitId
						? `Требуется оприходование: материал списан с дефицитом по визиту №${options.visitId}`
						: "Внимание: остаток отрицательный (расход сверх остатка / списание с дефицитом), требуется оприходование накладной";
					showToast(notice, "warning");
				} else {
					showToast(
						`Набор «Визит: ${visitNameRu}» успешно списан (${data.deductedItems?.length || (visitType === "surgery" ? 5 : 6)} позиций без комиссии)`,
						"success",
					);
				}
				fetchItems();
			} else {
				showToast(`Ошибка списания набора визита «${visitNameRu}»`, "error");
			}
		} catch (e) {
			logger.error(e);
			showToast("Системная ошибка при списании набора визита", "error");
		} finally {
			isWritingOffVisitBundleRef.current = false;
			setIsWritingOffVisitBundle(false);
		}
	};

	return {
		handleQuickWriteoffStandardKit,
		isWritingOffStandardKit,
		handleQuickWriteoffCarpules,
		isWritingOffCarpules,
		handleQuickWriteoffAnestheticCarpule,
		handleQuickWriteoffSterilizationKit,
		isWritingOffSterilizationKit,
		handleQuickWriteoffShiftBundle,
		isWritingOffShiftBundle,
		handleQuickWriteoffVisitBundle,
		isWritingOffVisitBundle,
	};
}
