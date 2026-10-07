import React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Camera, MessageSquare, AlertOctagon } from "lucide-react";
import { denteAdminSecretRequestHeaders } from "../../AppHelpers";
import { showToast } from "../GlobalToast";
import type { LabPromptDialogState } from "../../pages/LabOrdersPage";
import {
	type DentalLabOrderData,
	type CanonicalLabOrderStatus,
	CANONICAL_LAB_STATUSES,
	buildLabAppointmentDraft,
	MATERIALS,
	calculateMaterialTotalCostKopecks,
	addWorkingDays,
	ONE_CLICK_LAB_DEFAULTS,
	type ExpressLabPreset,
} from "../lab/labMath";
import type { ShadeGuideSystem } from "./LabOrdersQuickForm";
import { useOptionalAppLogicContext } from "../../contexts/AppLogicContext";
import type { LabOrder } from "./LabOrdersPanel";

export function useLabOrdersPanelLogic(patientId?: string) {
	const appLogic = useOptionalAppLogicContext();
	const [orders, setOrders] = useState<LabOrder[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// Modals & Drawer state
	const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
	const [isLabHubOpen, setIsLabHubOpen] = useState(false);
	const [isTrackerModalOpen, setIsTrackerModalOpen] = useState(false);
	const [selectedOrderForEdit, setSelectedOrderForEdit] = useState<DentalLabOrderData | null>(null);
	const [isTrackingDrawerOpen, setIsTrackingDrawerOpen] = useState(false);
	const [selectedOrderForTracking, setSelectedOrderForTracking] = useState<DentalLabOrderData | null>(null);
	const [openMenuOrderId, setOpenMenuOrderId] = useState<string | null>(null);
	const [modalInitialTab, setModalInitialTab] = useState<"main" | "shades" | "stages" | "print">("main");
	const cardMenuRef = useRef<HTMLDivElement | null>(null);

	// Action Prompt Modal State (Mandates 8e, 8n)
	const [promptState, setPromptState] = useState<LabPromptDialogState | null>(null);

	// Fast Presets dropdown state
	const [isPresetsMenuOpen, setIsPresetsMenuOpen] = useState(false);
	const presetsMenuRef = useRef<HTMLDivElement | null>(null);

	useEffect(() => {
		if (!isPresetsMenuOpen) return;
		const handleClickOutside = (e: MouseEvent) => {
			if (presetsMenuRef.current && !presetsMenuRef.current.contains(e.target as Node)) {
				setIsPresetsMenuOpen(false);
			}
		};
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				setIsPresetsMenuOpen(false);
			}
		};
		document.addEventListener("mousedown", handleClickOutside);
		document.addEventListener("keydown", handleKeyDown);
		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
			document.removeEventListener("keydown", handleKeyDown);
		};
	}, [isPresetsMenuOpen]);

	useEffect(() => {
		if (!openMenuOrderId) return;
		const handleClickOutside = (e: MouseEvent) => {
			if (cardMenuRef.current && !cardMenuRef.current.contains(e.target as Node)) {
				setOpenMenuOrderId(null);
			}
		};
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				setOpenMenuOrderId(null);
			}
		};
		document.addEventListener("mousedown", handleClickOutside);
		document.addEventListener("keydown", handleKeyDown);
		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
			document.removeEventListener("keydown", handleKeyDown);
		};
	}, [openMenuOrderId]);

	// Quick Inline Create State
	const [showQuickForm, setShowQuickForm] = useState(false);
	const [selectedTeeth, setSelectedTeeth] = useState<number[]>([]);
	const [restorationType, setRestorationType] = useState("single_crown");
	const [material, setMaterial] = useState("zirconia_multilayer");
	const [shadeSystem, setShadeSystem] = useState<ShadeGuideSystem>("classical");
	const [colorVita, setColorVita] = useState("A2");
	const [stumpShade, setStumpShade] = useState<string | null>("");
	const [cementGap] = useState(30);
	const [fittingDate, setFittingDate] = useState("");
	const [dueDate, setDueDate] = useState("");
	const [clinicalNotes, setClinicalNotes] = useState("");
	const [submitting, setSubmitting] = useState(false);

	// Calculated material cost in whole kopecks
	const calculatedMaterialCostKopecks = useMemo(() => {
		return calculateMaterialTotalCostKopecks(material, selectedTeeth.length || 1);
	}, [material, selectedTeeth.length]);

	const fetchOrders = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			const query = patientId
				? `?patientId=${encodeURIComponent(patientId)}`
				: "";
			const res = await fetch(`/api/clinical/lab-orders${query}`, {
				headers: denteAdminSecretRequestHeaders(),
			});
			if (!res.ok) {
				throw new Error("Не удалось загрузить список заказов лаборатории");
			}
			const data = await res.json();
			setOrders(
				Array.isArray(data)
					? data
					: Array.isArray(data?.orders)
					? data.orders
					: Array.isArray(data?.data)
					? data.data
					: [],
			);
		} catch (err: any) {
			setError(err.message || "Ошибка загрузки заказов ЗТЛ");
		} finally {
			setLoading(false);
		}
	}, [patientId]);

	useEffect(() => {
		fetchOrders();
		const handleRefresh = () => {
			void fetchOrders();
		};
		window.addEventListener("dente-lab-order-created", handleRefresh);
		return () => {
			window.removeEventListener("dente-lab-order-created", handleRefresh);
		};
	}, [fetchOrders]);

	// Status Transition Handler
	const handleStatusTransition = async (orderId: string, targetStatus: CanonicalLabOrderStatus) => {
		const apiStatusMap: Record<CanonicalLabOrderStatus, string> = {
			sent: "sent",
			ready: "received",
			fitting: "refitting",
			completed: "completed",
		};
		const statusToSend = apiStatusMap[targetStatus] || "sent";
		const stageToSend =
			targetStatus === "fitting"
				? "fitting_in_mouth"
				: targetStatus === "ready"
					? "ready_in_clinic"
					: targetStatus === "completed"
						? "completed"
						: "sent_to_lab";

		// Optimistic update
		const previousOrders = orders;
		setOrders((prev) =>
			prev.map((o) => (o.id === orderId ? { ...o, status: statusToSend } : o)),
		);

		try {
			const res = await fetch(`/api/clinical/lab-orders/${orderId}`, {
				method: "PUT",
				headers: {
					"Content-Type": "application/json",
					...denteAdminSecretRequestHeaders(),
				},
				body: JSON.stringify({ status: statusToSend, stage: stageToSend }),
			});

			if (!res.ok) {
				const errData = await res.json().catch(() => ({}));
				throw new Error(errData.message || "Не удалось обновить статус наряда");
			}

			showToast(
				`Статус наряда ЗТЛ изменен на: ${CANONICAL_LAB_STATUSES.find((s) => s.id === targetStatus)?.label}`,
				"success",
			);
			fetchOrders();
		} catch (err: any) {
			setOrders(previousOrders);
			showToast(err.message || "Ошибка смены статуса наряда", "error");
		}
	};

	// Schedule Slot Planning on Ready Date
	const handleScheduleAppointment = (order: LabOrder) => {
		const draftInfo = buildLabAppointmentDraft(order);
		if (!draftInfo || !draftInfo.targetDateIso) {
			showToast("У наряда ЗТЛ не указан срок готовности", "warning");
			return;
		}

		if (appLogic?.updateNewAppointmentDraft) {
			appLogic.updateNewAppointmentDraft("patientId", order.patientId);
			if (order.doctorId) {
				appLogic.updateNewAppointmentDraft("doctorUserId", order.doctorId);
			}
			appLogic.updateNewAppointmentDraft("startsAt", draftInfo.targetDateIso);
			appLogic.updateNewAppointmentDraft("reason", draftInfo.reason);
			if (appLogic.setShowCreateForm) {
				appLogic.setShowCreateForm(true);
			}
		}

		window.location.hash = "#schedule";
		const dateFormatted = new Date(draftInfo.targetDateIso).toLocaleDateString("ru-RU", {
			day: "numeric",
			month: "long",
		});
		showToast(
			`Слот приема запланирован на дату готовности ЗТЛ: ${dateFormatted} (${draftInfo.reason})`,
			"success",
		);
	};

	const copyPortalLink = (token: string) => {
		const url = `${window.location.origin}/#/portal/lab-order/${token}`;
		navigator.clipboard.writeText(url);
		showToast("Ссылка для зуботехника скопирована в буфер обмена", "success");
	};

	const handleDeleteOrder = async (id: string) => {
		try {
			const res = await fetch(`/api/clinical/lab-orders/${id}`, {
				method: "DELETE",
				headers: denteAdminSecretRequestHeaders(),
			});
			if (res.ok) {
				showToast("Заказ ЗТЛ удален", "success");
				fetchOrders();
			} else {
				showToast("Ошибка удаления заказа", "error");
			}
		} catch (err: any) {
			showToast(err.message || "Ошибка удаления заказа", "error");
		}
	};

	const handleOpenPrintOrder = (order: LabOrder) => {
		setSelectedOrderForEdit(order as any);
		setModalInitialTab("print");
		setIsOrderModalOpen(true);
	};

	const handleOpenTrackingDrawer = (order: LabOrder) => {
		setSelectedOrderForTracking(order as any);
		setIsTrackingDrawerOpen(true);
	};

	const handleAttachBitePhoto = (order: LabOrder) => {
		setOpenMenuOrderId(null);
		setPromptState({
			title: "Фото прикуса / 3D-скан (ЗТЛ)",
			description: `Укажите URL или ссылку на фото прикуса, окклюдограмму или 3D-снимок для наряда #${order.id.slice(0, 8)}.`,
			icon: React.createElement(Camera, { className: "w-4 h-4 text-teal-600 dark:text-teal-400" }),
			initialValue: order.attachedImageUrl || "",
			placeholder: "https://... или storage/scans/bite_photo.jpg",
			submitLabel: "Прикрепить фото",
			submitVariant: "teal",
			onSubmit: (url: string) => {
				setPromptState(null);
				void fetch(`/api/clinical/lab-orders/${order.id}`, {
					method: "PATCH",
					headers: {
						"Content-Type": "application/json",
						...denteAdminSecretRequestHeaders(),
					},
					body: JSON.stringify({ attachedImageUrl: url.trim() || null }),
				}).then((res) => {
					if (res.ok) {
						showToast("Фото прикуса сохранено в наряде ЗТЛ", "success");
						void fetchOrders();
					} else {
						showToast("Не удалось сохранить фото", "error");
					}
				}).catch(() => showToast("Ошибка сети при сохранении фото", "error"));
			},
		});
	};

	const handleTechnicianComment = (order: LabOrder) => {
		setOpenMenuOrderId(null);
		setPromptState({
			title: "Комментарий зубному технику",
			description: `Клиническое уточнение границ уступа, цвета по VITA, рельефа фиссур или анатомии для наряда #${order.id.slice(0, 8)}.`,
			icon: React.createElement(MessageSquare, { className: "w-4 h-4 text-teal-600 dark:text-teal-400" }),
			initialValue: order.labComments || "",
			placeholder: "Например: поднутрения с дистальной стороны не заливать, уступ плечевой 0.8мм...",
			submitLabel: "Сохранить комментарий",
			submitVariant: "teal",
			multiline: true,
			onSubmit: (comment: string) => {
				setPromptState(null);
				void fetch(`/api/clinical/lab-orders/${order.id}`, {
					method: "PATCH",
					headers: {
						"Content-Type": "application/json",
						...denteAdminSecretRequestHeaders(),
					},
					body: JSON.stringify({ labComments: comment.trim() || null }),
				}).then((res) => {
					if (res.ok) {
						showToast("Комментарий технику обновлен", "success");
						void fetchOrders();
					} else {
						showToast("Не удалось обновить комментарий", "error");
					}
				}).catch(() => showToast("Ошибка сети", "error"));
			},
		});
	};

	const handleRepeatFitting = (order: LabOrder) => {
		void handleStatusTransition(order.id, "fitting");
		showToast(`Наряд переведен на этап повторной примерки (зуб ${order.toothFdi || "—"})`, "success");
	};

	const handleReclamation = (order: LabOrder) => {
		setOpenMenuOrderId(null);
		const defaultReason = "Несоответствие цвета VITA / переделка по гарантии (0 ₽)";
		setPromptState({
			title: "Оформление рекламации ЗТЛ",
			description: "Перевод наряда на гарантийную доработку (0 ₽). Выберите причину из списка или введите подробное описание дефекта:",
			icon: React.createElement(AlertOctagon, { className: "w-4 h-4 text-rose-600 dark:text-rose-400" }),
			initialValue: defaultReason,
			placeholder: "Опишите дефект конструкции...",
			submitLabel: "Оформить рекламацию (0 ₽)",
			submitVariant: "danger",
			multiline: true,
			quickPresets: [
				"Несоответствие цвета VITA / переделка по гарантии (0 ₽)",
				"Скол облицовочной керамики",
				"Балансир каркаса / неплотное краевое прилегание",
				"Завышение по прикусу / окклюзионная интерференция",
				"Некорректная анатомическая форма / контактный пункт",
			],
			onSubmit: (reason: string) => {
				setPromptState(null);
				if (!reason.trim()) return;
				void fetch(`/api/clinical/lab-orders/${order.id}`, {
					method: "PATCH",
					headers: {
						"Content-Type": "application/json",
						...denteAdminSecretRequestHeaders(),
					},
					body: JSON.stringify({
						clinicalNotes: `${order.clinicalNotes ? `${order.clinicalNotes}\n` : ""}[РЕКЛАМАЦИЯ]: ${reason.trim()}`,
					}),
				}).then((res) => {
					if (res.ok) {
						showToast("Рекламация зафиксирована в наряде ЗТЛ", "success");
						void fetchOrders();
					} else {
						showToast("Не удалось зафиксировать рекламацию", "error");
					}
				}).catch(() => showToast("Ошибка сети", "error"));
			},
		});
	};

	const handleQuickSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!patientId) {
			showToast("ID пациента обязателен", "error");
			return;
		}

		setSubmitting(true);
		try {
			const isBridge = restorationType === "bridge" && selectedTeeth.length > 1;
			const toothFdiStr =
				selectedTeeth.length > 0
					? selectedTeeth.join(", ")
					: "Общий наряд / Челюсть целиком";
			const bridgeNote = isBridge
				? `Мостовидный протез (${selectedTeeth.length} ед.: ${selectedTeeth.join("-")})`
				: null;

			const fullNotes = [
				clinicalNotes,
				fittingDate ? `Примерка каркаса/бисквита: ${new Date(fittingDate).toLocaleDateString("ru-RU")}` : null,
				bridgeNote,
				`Шкала: ${shadeSystem === "3d_master" ? "VITA 3D-Master" : shadeSystem === "bleach" ? "Bleach" : "VITA Classical"}`,
				stumpShade ? `Культя: ${stumpShade}` : null,
				`Зазор: ${cementGap} мкм`,
			]
				.filter(Boolean)
				.join(" | ");

			const finalPriceRub = calculatedMaterialCostKopecks / 100;
			const matObj = MATERIALS.find((m) => m.id === material);

			const res = await fetch("/api/clinical/lab-orders", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					...denteAdminSecretRequestHeaders(),
				},
				body: JSON.stringify({
					patientId,
					toothFdi: toothFdiStr,
					material: matObj?.name || material,
					colorVita,
					dueDate: dueDate ? new Date(dueDate).toISOString() : null,
					clinicalNotes: fullNotes || null,
					priceRub: finalPriceRub,
				}),
			});

			if (!res.ok) {
				const errorData = await res.json().catch(() => ({}));
				throw new Error(errorData.message || "Не удалось создать наряд в ЗТЛ");
			}

			const createdOrder = await res.json();

			if (selectedTeeth.length > 0 && createdOrder?.id) {
				const itemErrors: number[] = [];
				for (const tooth of selectedTeeth) {
					try {
						const itemRes = await fetch(
							`/api/clinical/lab-orders/${createdOrder.id}/items`,
							{
								method: "POST",
								headers: {
									"Content-Type": "application/json",
									...denteAdminSecretRequestHeaders(),
								},
								body: JSON.stringify({
									toothFdi: tooth,
									restorationType,
									material: matObj?.name || material,
									shadeFinal: colorVita,
									shadeStump: stumpShade || null,
									cementGapMicrons: cementGap,
									priceRub: finalPriceRub / selectedTeeth.length,
								}),
							},
						);
						if (!itemRes.ok) {
							itemErrors.push(tooth);
						}
					} catch {
						itemErrors.push(tooth);
					}
				}
				if (itemErrors.length > 0) {
					showToast(
						`Внимание: часть позиций не удалось привязать (зубы ${itemErrors.join(", ")})`,
						"warning",
					);
				}
			}

			showToast("Наряд в лабораторию успешно оформлен!", "success");
			setShowQuickForm(false);
			setSelectedTeeth([]);
			setFittingDate("");
			setDueDate("");
			setClinicalNotes("");
			await fetchOrders();
		} catch (err: any) {
			showToast(err.message || "Ошибка создания наряда в ЗТЛ", "error");
		} finally {
			setSubmitting(false);
		}
	};

	const handleOneClickCreate = async (teethOverride?: number[]) => {
		if (!patientId) {
			showToast("ID пациента обязателен", "error");
			return;
		}

		const targetTeeth =
			teethOverride && teethOverride.length > 0
				? teethOverride
				: selectedTeeth.length > 0
					? selectedTeeth
					: [21];

		setSubmitting(true);
		try {
			const isBridge = targetTeeth.length > 1;
			const toothFdiStr = targetTeeth.join(", ");
			const due = addWorkingDays(new Date(), ONE_CLICK_LAB_DEFAULTS.workingDays);
			const dueDateIso = due.toISOString();
			const dueDateFormatted = due.toLocaleDateString("ru-RU");
			const finalPriceRub =
				calculateMaterialTotalCostKopecks(ONE_CLICK_LAB_DEFAULTS.materialId, targetTeeth.length) / 100;

			const fullNotes = [
				"• Оформить наряд ЗТЛ: Коронка (диоксид циркония Katana ML / E.max)",
				`• Конструкция: ${isBridge ? `Мостовидный протез (${targetTeeth.length} ед.: ${targetTeeth.join("-")})` : "Одиночная коронка"}`,
				`• Расцветка: VITA Classical ${ONE_CLICK_LAB_DEFAULTS.colorVita}`,
				`• Срок изготовления: 7 рабочих дней (до ${dueDateFormatted})`,
				`• Цементный зазор: ${ONE_CLICK_LAB_DEFAULTS.cementGapMicrons} мкм`,
			].join("\n");

			const res = await fetch("/api/clinical/lab-orders", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					...denteAdminSecretRequestHeaders(),
				},
				body: JSON.stringify({
					patientId,
					doctorId: appLogic?.activeDoctor?.id || null,
					toothFdi: toothFdiStr,
					material: ONE_CLICK_LAB_DEFAULTS.materialName,
					colorVita: ONE_CLICK_LAB_DEFAULTS.colorVita,
					dueDate: dueDateIso,
					clinicalNotes: fullNotes,
					priceRub: finalPriceRub,
				}),
			});

			if (!res.ok) {
				const errorData = await res.json().catch(() => ({}));
				throw new Error(errorData.message || "Не удалось создать наряд в ЗТЛ");
			}

			const createdOrder = await res.json();

			if (targetTeeth.length > 0 && createdOrder?.id) {
				for (const tooth of targetTeeth) {
					try {
						await fetch(`/api/clinical/lab-orders/${createdOrder.id}/items`, {
							method: "POST",
							headers: {
								"Content-Type": "application/json",
								...denteAdminSecretRequestHeaders(),
							},
							body: JSON.stringify({
								toothFdi: tooth,
								restorationType: isBridge ? "bridge" : "single_crown",
								material: ONE_CLICK_LAB_DEFAULTS.materialId,
								shadeFinal: ONE_CLICK_LAB_DEFAULTS.colorVita,
								translucencyLevel: ONE_CLICK_LAB_DEFAULTS.translucency,
								cementGapMicrons: ONE_CLICK_LAB_DEFAULTS.cementGapMicrons,
								priceRub: finalPriceRub / targetTeeth.length,
							}),
						});
					} catch {
						// Non-blocking item fallback
					}
				}
			}

			showToast(
				`Наряд ЗТЛ успешно оформлен для зубов ${toothFdiStr} (Цирконий A2, срок до ${dueDateFormatted})!`,
				"success",
				6000,
			);
			setShowQuickForm(false);
			setSelectedTeeth([]);
			await fetchOrders();
			window.dispatchEvent(
				new CustomEvent("dente-lab-order-created", { detail: { order: createdOrder } }),
			);
		} catch (err: any) {
			showToast(err.message || "Ошибка создания наряда в ЗТЛ", "error");
		} finally {
			setSubmitting(false);
		}
	};

	const handleExpressPresetCreate = async (preset: ExpressLabPreset, teethOverride?: number[]) => {
		if (!patientId) {
			showToast("ID пациента обязателен", "error");
			return;
		}

		const targetTeeth =
			teethOverride && teethOverride.length > 0
				? teethOverride
				: selectedTeeth.length > 0
					? selectedTeeth
					: [21];

		setSubmitting(true);
		try {
			const isBridge = targetTeeth.length > 1;
			const toothFdiStr = targetTeeth.join(", ");
			const due = addWorkingDays(new Date(), preset.workingDays);
			const dueDateIso = due.toISOString();
			const dueDateFormatted = due.toLocaleDateString("ru-RU");
			const finalPriceRub = preset.priceRub * targetTeeth.length;

			const fullNotes = [
				`• Оформить наряд ЗТЛ: ${preset.title}`,
				`• Конструкция: ${isBridge ? `Мостовидный протез (${targetTeeth.length} ед.: ${targetTeeth.join("-")})` : preset.shortDesc}`,
				`• Расцветка: VITA Classical ${preset.colorVita}`,
				`• Срок изготовления: ${preset.workingDays} рабочих дней (до ${dueDateFormatted})`,
				`• Цементный зазор: ${preset.cementGapMicrons} мкм`,
			].join("\n");

			const matObj = MATERIALS.find((m) => m.id === preset.materialId);

			const res = await fetch("/api/clinical/lab-orders", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					...denteAdminSecretRequestHeaders(),
				},
				body: JSON.stringify({
					patientId,
					doctorId: appLogic?.activeDoctor?.id || null,
					toothFdi: toothFdiStr,
					material: matObj?.name || preset.materialId,
					colorVita: preset.colorVita,
					dueDate: dueDateIso,
					clinicalNotes: fullNotes,
					priceRub: finalPriceRub,
				}),
			});

			if (!res.ok) {
				const errorData = await res.json().catch(() => ({}));
				throw new Error(errorData.message || "Не удалось создать наряд в ЗТЛ");
			}

			const createdOrder = await res.json();

			if (targetTeeth.length > 0 && createdOrder?.id) {
				for (const tooth of targetTeeth) {
					try {
						await fetch(`/api/clinical/lab-orders/${createdOrder.id}/items`, {
							method: "POST",
							headers: {
								"Content-Type": "application/json",
								...denteAdminSecretRequestHeaders(),
							},
							body: JSON.stringify({
								toothFdi: tooth,
								restorationType: isBridge ? "bridge" : preset.constructionType,
								material: preset.materialId,
								shadeFinal: preset.colorVita,
								cementGapMicrons: preset.cementGapMicrons,
								priceRub: finalPriceRub / targetTeeth.length,
							}),
						});
					} catch {
						// Item attachment non-blocking
					}
				}
			}

			showToast(
				`Наряд «${preset.title}» оформлен для зубов ${toothFdiStr} (срок до ${dueDateFormatted})!`,
				"success",
				6000,
			);
			setShowQuickForm(false);
			setSelectedTeeth([]);
			await fetchOrders();
			window.dispatchEvent(
				new CustomEvent("dente-lab-order-created", { detail: { order: createdOrder } }),
			);
		} catch (err: any) {
			showToast(err.message || "Ошибка создания наряда в ЗТЛ", "error");
		} finally {
			setSubmitting(false);
		}
	};

	return {
		appLogic,
		orders,
		loading,
		error,
		isOrderModalOpen,
		setIsOrderModalOpen,
		isLabHubOpen,
		setIsLabHubOpen,
		isTrackerModalOpen,
		setIsTrackerModalOpen,
		selectedOrderForEdit,
		setSelectedOrderForEdit,
		isTrackingDrawerOpen,
		setIsTrackingDrawerOpen,
		selectedOrderForTracking,
		openMenuOrderId,
		setOpenMenuOrderId,
		modalInitialTab,
		setModalInitialTab,
		cardMenuRef,
		promptState,
		setPromptState,
		isPresetsMenuOpen,
		setIsPresetsMenuOpen,
		presetsMenuRef,
		showQuickForm,
		setShowQuickForm,
		selectedTeeth,
		setSelectedTeeth,
		restorationType,
		setRestorationType,
		material,
		setMaterial,
		shadeSystem,
		setShadeSystem,
		colorVita,
		setColorVita,
		stumpShade,
		setStumpShade,
		fittingDate,
		setFittingDate,
		dueDate,
		setDueDate,
		clinicalNotes,
		setClinicalNotes,
		submitting,
		calculatedMaterialCostKopecks,
		fetchOrders,
		handleStatusTransition,
		handleScheduleAppointment,
		copyPortalLink,
		handleDeleteOrder,
		handleOpenPrintOrder,
		handleOpenTrackingDrawer,
		handleAttachBitePhoto,
		handleTechnicianComment,
		handleRepeatFitting,
		handleReclamation,
		handleQuickSubmit,
		handleOneClickCreate,
		handleExpressPresetCreate,
	};
}
