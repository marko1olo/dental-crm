import type React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
	Calendar,
	Check,
	CheckCircle2,
	Clock,
	Copy,
	ExternalLink,
	FlaskConical,
	Layers,
	Link,
	Loader2,
	MoreVertical,
	Palette,
	Plus,
	RefreshCw,
	Send,
	Sparkles,
	Trash2,
	X,
} from "lucide-react";
import { denteAdminSecretRequestHeaders, money } from "../AppHelpers";
import { showToast } from "./GlobalToast";
import { LAB_ORDER_PORTAL_PATH } from "../lib/publicPortalRoute";
import { LabOrdersPage } from "../pages/LabOrdersPage";
import { DentalLabOrderModal } from "./lab/DentalLabOrderModal";
import { LabTrackingDrawer } from "./lab/LabTrackingDrawer";
import {
	type DentalLabOrderData,
	type CanonicalLabOrderStatus,
	CANONICAL_LAB_STATUSES,
	mapToCanonicalStatus,
	buildLabAppointmentDraft,
	MATERIALS,
	VITA_CLASSICAL_SHADES,
	VITA_3D_MASTER_SHADES,
	VITA_BLEACH_SHADES,
	SHADE_SWATCH_MAP,
	STUMP_NATURAL_DIE_SHADES,
	calculateMaterialTotalCostKopecks,
} from "./lab/labMath";
import { useOptionalAppLogicContext } from "../contexts/AppLogicContext";
import "./LabOrdersPanel.css";

export interface LabOrder {
	id: string;
	patientId: string;
	patientName: string;
	doctorId: string | null;
	doctorName: string | null;
	secureToken: string;
	toothFdi: string | null;
	material: string | null;
	colorVita: string | null;
	status: string;
	dueDate: string | null;
	clinicalNotes: string | null;
	labComments: string | null;
	attachedImageUrl: string | null;
	priceRub: number | null;
	createdAt: string;
	updatedAt: string;
}

export interface LabItem {
	id: string;
	toothFdi: number;
	restorationType: string;
	material: string;
	shadeSystem: string;
	shadeFinal: string;
	shadeStump: string | null;
	cementGapMicrons: number;
	priceRub: number | null;
}

interface LabOrdersPanelProps {
	patientId?: string;
}

const RESTORATION_TYPES = [
	{ value: "single_crown", label: "Коронка анатомическая" },
	{ value: "bridge", label: "Мостовидный протез" },
	{ value: "veneer", label: "Керамический винир E.max" },
	{ value: "inlay_onlay", label: "Вкладка / Накладка" },
	{ value: "custom_abutment_tibase", label: "Абатмент Ti-Base + коронка" },
	{ value: "all_on_4_6", label: "Тотал All-on-4 / All-on-6" },
	{ value: "pmma_provisional", label: "Временная коронка PMMA" },
	{ value: "occlusal_splint", label: "Окклюзионная сплинт-каппа" },
];

export function LabOrdersPanel({ patientId }: LabOrdersPanelProps) {
	if (!patientId) {
		return <LabOrdersPage />;
	}

	const appLogic = useOptionalAppLogicContext();
	const [orders, setOrders] = useState<LabOrder[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// Modals & Drawer state
	const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
	const [selectedOrderForEdit, setSelectedOrderForEdit] = useState<DentalLabOrderData | null>(null);
	const [isTrackingDrawerOpen, setIsTrackingDrawerOpen] = useState(false);
	const [selectedOrderForTracking, setSelectedOrderForTracking] = useState<DentalLabOrderData | null>(null);
	const [openMenuOrderId, setOpenMenuOrderId] = useState<string | null>(null);
	const cardMenuRef = useRef<HTMLDivElement | null>(null);

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
	const [shadeSystem, setShadeSystem] = useState<"classical" | "3d_master" | "bleach">("classical");
	const [colorVita, setColorVita] = useState("A2");
	const [stumpShade, setStumpShade] = useState<string>("");
	const [cementGap, setCementGap] = useState(30);
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
	}, [fetchOrders]);

	const toggleTooth = (tooth: number) => {
		setSelectedTeeth((prev) =>
			prev.includes(tooth)
				? prev.filter((t) => t !== tooth)
				: [...prev, tooth].sort((a, b) => a - b),
		);
	};

	const selectQuadrant = (teeth: number[]) => {
		setSelectedTeeth((prev) => {
			const allSelected = teeth.every((t) => prev.includes(t));
			if (allSelected) {
				return prev.filter((t) => !teeth.includes(t));
			}
			return Array.from(new Set([...prev, ...teeth])).sort((a, b) => a - b);
		});
	};

	// 1-Click Status Transition Handler
	const handleStatusTransition = async (orderId: string, targetStatus: CanonicalLabOrderStatus) => {
		// Map canonical status to API status
		const apiStatusMap: Record<CanonicalLabOrderStatus, string> = {
			sent: "sent",
			ready: "received",
			fitting: "fitting",
			completed: "completed",
		};
		const statusToSend = apiStatusMap[targetStatus] || "sent";

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
				body: JSON.stringify({ status: statusToSend }),
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

	// 1-Click Schedule Slot Planning on Ready Date
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
		if (!window.confirm("Удалить заказ зуботехнической лаборатории?")) return;
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

	const handleQuickSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!patientId) {
			showToast("ID пациента обязателен", "error");
			return;
		}

		if (selectedTeeth.length === 0) {
			showToast("Выберите хотя бы один зуб в зубной формуле", "warning");
			return;
		}

		setSubmitting(true);
		try {
			const isBridge = restorationType === "bridge" && selectedTeeth.length > 1;
			const toothFdiStr = isBridge
				? `${selectedTeeth[0]}–${selectedTeeth[selectedTeeth.length - 1]} (мост, ${selectedTeeth.length} ед.: ${selectedTeeth.join(", ")})`
				: selectedTeeth.join(", ");

			const fullNotes = [
				clinicalNotes,
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
				for (const tooth of selectedTeeth) {
					await fetch(`/api/clinical/lab-orders/${createdOrder.id}/items`, {
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
					}).catch(() => {});
				}
			}

			showToast("Наряд в лабораторию успешно оформлен!", "success");
			setShowQuickForm(false);
			setSelectedTeeth([]);
			setDueDate("");
			setClinicalNotes("");
			await fetchOrders();
		} catch (err: any) {
			showToast(err.message || "Ошибка создания наряда в ЗТЛ", "error");
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<div className="lab-orders-panel">
			{/* Dense Header & 32px Toolbar */}
			<div className="lab-orders-header">
				<div>
					<h3>
						<FlaskConical className="w-4 h-4 text-[var(--teal)]" />
						Зуботехническая лаборатория (CAD/CAM ЗТЛ)
					</h3>
					<div className="text-xs text-[var(--muted)] mt-0.5">
						Наряды ЗТЛ, материалы, расцветка VITA Classical / 3D-Master и точный учет себестоимости
					</div>
				</div>

				<div className="lab-orders-toolbar">
					<button
						type="button"
						onClick={fetchOrders}
						className="lab-btn-32"
						title="Обновить список"
					>
						<RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-[var(--teal)]" : ""}`} />
					</button>

					<button
						type="button"
						onClick={() => {
							setSelectedOrderForEdit(null);
							setIsOrderModalOpen(true);
						}}
						className="lab-btn-32 is-primary"
					>
						<Sparkles className="w-3.5 h-3.5" />
						+ Полный наряд CAD/CAM
					</button>

					<button
						type="button"
						onClick={() => setShowQuickForm(!showQuickForm)}
						className="lab-btn-32"
					>
						{showQuickForm ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
						{showQuickForm ? "Отмена" : "Быстрый наряд"}
					</button>
				</div>
			</div>

			{/* Inline Quick Creation Form */}
			{showQuickForm && (
				<form
					onSubmit={handleQuickSubmit}
					className="bg-[var(--paper-soft)] border border-[var(--line)] rounded-xl p-3.5 space-y-3 shadow-sm"
				>
					<div className="flex items-center justify-between">
						<span className="text-xs font-bold text-[var(--ink)] flex items-center gap-1.5">
							<FlaskConical className="w-3.5 h-3.5 text-[var(--teal)]" />
							Параметры ортопедической работы (Быстрое оформление)
						</span>
						<span className="text-xs font-mono font-bold text-[var(--teal)]">
							Себестоимость: {money(calculatedMaterialCostKopecks / 100)}
						</span>
					</div>

					{/* Tooth Selection FDI formula with Upper / Lower / Bridge / Reset */}
					<div className="space-y-1.5">
						<div className="flex items-center justify-between text-xs text-[var(--muted)] flex-wrap gap-1">
							<span className="font-medium">
								Зубы по FDI:{" "}
								<strong className="text-[var(--ink)]">
									{selectedTeeth.length > 0
										? restorationType === "bridge" && selectedTeeth.length > 1
											? `${selectedTeeth[0]}–${selectedTeeth[selectedTeeth.length - 1]} (мост, ${selectedTeeth.length} ед.: ${selectedTeeth.join(", ")})`
											: selectedTeeth.join(", ")
										: "не выбрано"}
								</strong>
							</span>
							<div className="flex items-center gap-1.5">
								<button
									type="button"
									onClick={() => selectQuadrant([18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28])}
									className="px-2 py-0.5 rounded text-[11px] font-bold border border-[var(--line)] bg-[var(--paper)] hover:border-[var(--teal)] text-[var(--ink)] transition-colors"
								>
									Верхняя
								</button>
								<button
									type="button"
									onClick={() => selectQuadrant([48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38])}
									className="px-2 py-0.5 rounded text-[11px] font-bold border border-[var(--line)] bg-[var(--paper)] hover:border-[var(--teal)] text-[var(--ink)] transition-colors"
								>
									Нижняя
								</button>
								{selectedTeeth.length > 0 && (
									<button
										type="button"
										onClick={() => setSelectedTeeth([])}
										className="px-2 py-0.5 rounded text-[11px] font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
									>
										Сбросить
									</button>
								)}
							</div>
						</div>

						{/* Upper Jaw */}
						<div className="flex flex-wrap gap-1">
							{[18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28].map((t) => (
								<button
									key={t}
									type="button"
									onClick={() => toggleTooth(t)}
									className={`min-h-[28px] h-7 px-1.5 rounded-md text-xs font-bold font-mono border transition-all ${
										selectedTeeth.includes(t)
											? "bg-[var(--teal)] text-white border-[var(--teal-dark)] shadow-xs"
											: "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)] hover:border-[var(--teal)]"
									}`}
									title={`Зуб ${t}`}
								>
									{t}
								</button>
							))}
						</div>

						{/* Lower Jaw */}
						<div className="flex flex-wrap gap-1">
							{[48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38].map((t) => (
								<button
									key={t}
									type="button"
									onClick={() => toggleTooth(t)}
									className={`min-h-[28px] h-7 px-1.5 rounded-md text-xs font-bold font-mono border transition-all ${
										selectedTeeth.includes(t)
											? "bg-[var(--teal)] text-white border-[var(--teal-dark)] shadow-xs"
											: "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)] hover:border-[var(--teal)]"
									}`}
									title={`Зуб ${t}`}
								>
									{t}
								</button>
							))}
						</div>
					</div>

					{/* Construction Type and Material */}
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
						<div>
							<label className="block text-[11px] font-bold text-[var(--muted)] mb-1">
								Вид конструкции
							</label>
							<select
								value={restorationType}
								onChange={(e) => setRestorationType(e.target.value)}
								className="w-full h-8 px-2 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-xs text-[var(--ink)] focus:ring-1 focus:ring-[var(--teal)]"
							>
								{RESTORATION_TYPES.map((rt) => (
									<option key={rt.value} value={rt.value}>
										{rt.label}
									</option>
								))}
							</select>
						</div>

						<div>
							<label className="block text-[11px] font-bold text-[var(--muted)] mb-1">
								Материал (Копеечный учет)
							</label>
							<select
								value={material}
								onChange={(e) => setMaterial(e.target.value)}
								className="w-full h-8 px-2 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-xs text-[var(--ink)] focus:ring-1 focus:ring-[var(--teal)]"
							>
								{MATERIALS.map((m) => (
									<option key={m.id} value={m.id}>
										{m.name} ({money((m as any).unitCostRub || 6500)})
									</option>
								))}
							</select>
						</div>
					</div>

					{/* Interactive VITA Shade Palette with Tone Previews */}
					<div className="space-y-2 p-2.5 rounded-lg bg-[var(--paper)]">
						<div className="flex items-center justify-between flex-wrap gap-2">
							<div className="flex items-center gap-1.5">
								<span className="text-[11px] font-bold text-[var(--ink)]">
									Цвет керамики VITA:
								</span>
								<span className="px-2 py-0.5 rounded text-[11px] font-bold bg-[var(--teal-soft,rgba(13,148,136,0.15))] text-[var(--teal)] border border-[var(--teal-soft,rgba(13,148,136,0.3))]">
									{colorVita}
								</span>
							</div>

							{/* Shade Scale Tabs */}
							<div className="flex items-center gap-1">
								<button
									type="button"
									onClick={() => {
										setShadeSystem("classical");
										if (!VITA_CLASSICAL_SHADES.includes(colorVita as any)) setColorVita("A2");
									}}
									className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors ${
										shadeSystem === "classical"
											? "bg-[var(--teal)] text-white border-[var(--teal)]"
											: "bg-[var(--paper-soft)] text-[var(--muted)] border-[var(--line)] hover:text-[var(--ink)]"
									}`}
								>
									VITA Classical
								</button>
								<button
									type="button"
									onClick={() => {
										setShadeSystem("3d_master");
										if (!VITA_3D_MASTER_SHADES.includes(colorVita as any)) setColorVita("2M2");
									}}
									className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors ${
										shadeSystem === "3d_master"
											? "bg-[var(--teal)] text-white border-[var(--teal)]"
											: "bg-[var(--paper-soft)] text-[var(--muted)] border-[var(--line)] hover:text-[var(--ink)]"
									}`}
								>
									3D-Master
								</button>
								<button
									type="button"
									onClick={() => {
										setShadeSystem("bleach");
										if (!VITA_BLEACH_SHADES.includes(colorVita as any)) setColorVita("BL2");
									}}
									className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors ${
										shadeSystem === "bleach"
											? "bg-[var(--teal)] text-white border-[var(--teal)]"
											: "bg-[var(--paper-soft)] text-[var(--muted)] border-[var(--line)] hover:text-[var(--ink)]"
									}`}
								>
									Bleach
								</button>
							</div>
						</div>

						{/* Swatch Chips Grid with Tone Previews */}
						{shadeSystem === "classical" && (
							<div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5 pt-1">
								{VITA_CLASSICAL_SHADES.map((s) => {
									const swatch = SHADE_SWATCH_MAP[s];
									const isSelected = colorVita === s;
									return (
										<button
											key={s}
											type="button"
											onClick={() => setColorVita(s)}
											className={`h-7 px-1.5 rounded-md border text-[11px] font-bold font-mono flex items-center justify-center gap-1.5 transition-all ${
												isSelected
													? "bg-[var(--teal)] text-white border-[var(--teal-dark)] ring-1 ring-[var(--teal)] shadow-xs"
													: "bg-[var(--paper-soft)] text-[var(--ink)] border-[var(--line)] hover:border-[var(--teal)]"
											}`}
											title={`VITA ${s}: ${swatch?.desc || ""}`}
										>
											<span
												className="w-2.5 h-2.5 rounded-full shrink-0 border"
												style={{
													backgroundColor: swatch?.bg || "#efe2d0",
													borderColor: swatch?.border || "#ccc",
												}}
											/>
											<span>{s}</span>
										</button>
									);
								})}
							</div>
						)}

						{shadeSystem === "3d_master" && (
							<div className="grid grid-cols-4 sm:grid-cols-7 lg:grid-cols-9 gap-1.5 pt-1 max-h-36 overflow-y-auto pr-1">
								{VITA_3D_MASTER_SHADES.map((s) => {
									const swatch = SHADE_SWATCH_MAP[s];
									const isSelected = colorVita === s;
									return (
										<button
											key={s}
											type="button"
											onClick={() => setColorVita(s)}
											className={`h-7 px-1.5 rounded-md border text-[10px] font-bold font-mono flex items-center justify-center gap-1 transition-all ${
												isSelected
													? "bg-[var(--teal)] text-white border-[var(--teal-dark)] ring-1 ring-[var(--teal)] shadow-xs"
													: "bg-[var(--paper-soft)] text-[var(--ink)] border-[var(--line)] hover:border-[var(--teal)]"
											}`}
											title={`3D-Master ${s}: ${swatch?.desc || ""}`}
										>
											<span
												className="w-2 h-2 rounded-full shrink-0 border"
												style={{
													backgroundColor: swatch?.bg || "#efe2d0",
													borderColor: swatch?.border || "#ccc",
												}}
											/>
											<span>{s}</span>
										</button>
									);
								})}
							</div>
						)}

						{shadeSystem === "bleach" && (
							<div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5 pt-1">
								{VITA_BLEACH_SHADES.map((s) => {
									const swatch = SHADE_SWATCH_MAP[s];
									const isSelected = colorVita === s;
									return (
										<button
											key={s}
											type="button"
											onClick={() => setColorVita(s)}
											className={`h-7 px-1.5 rounded-md border text-[11px] font-bold font-mono flex items-center justify-center gap-1.5 transition-all ${
												isSelected
													? "bg-[var(--teal)] text-white border-[var(--teal-dark)] ring-1 ring-[var(--teal)] shadow-xs"
													: "bg-[var(--paper-soft)] text-[var(--ink)] border-[var(--line)] hover:border-[var(--teal)]"
											}`}
											title={`Bleach ${s}: ${swatch?.desc || ""}`}
										>
											<span
												className="w-2.5 h-2.5 rounded-full shrink-0 border"
												style={{
													backgroundColor: swatch?.bg || "#ffffff",
													borderColor: swatch?.border || "#eee",
												}}
											/>
											<span>{s}</span>
										</button>
									);
								})}
							</div>
						)}
					</div>

					{/* Deadline & Clinical Notes */}
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
						<div>
							<label className="block text-[11px] font-bold text-[var(--muted)] mb-1">
								Срок сдачи / Дедлайн ЗТЛ
							</label>
							<input
								type="date"
								value={dueDate}
								onChange={(e) => setDueDate(e.target.value)}
								className="w-full h-8 px-2 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-xs text-[var(--ink)] focus:ring-1 focus:ring-[var(--teal)]"
							/>
						</div>

						<div>
							<label className="block text-[11px] font-bold text-[var(--muted)] mb-1">
								Клинические примечания технику
							</label>
							<input
								type="text"
								placeholder="Контакты, прикус, мамелоны..."
								value={clinicalNotes}
								onChange={(e) => setClinicalNotes(e.target.value)}
								className="w-full h-8 px-2 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-xs text-[var(--ink)] focus:ring-1 focus:ring-[var(--teal)]"
							/>
						</div>
					</div>

					<div className="flex justify-end gap-2 pt-1">
						<button
							type="button"
							onClick={() => setShowQuickForm(false)}
							className="lab-btn-32"
						>
							Отмена
						</button>
						<button
							type="submit"
							disabled={submitting}
							className="lab-btn-32 is-primary"
						>
							<Send className="w-3.5 h-3.5" />
							{submitting ? "Оформление..." : "Отправить наряд в ЗТЛ"}
						</button>
					</div>
				</form>
			)}

			{error && <div className="lab-order-warning">{error}</div>}

			{/* Orders List */}
			{loading && orders.length === 0 ? (
				<div className="py-6 text-center text-xs text-[var(--muted)] flex items-center justify-center gap-2">
					<Loader2 className="w-4 h-4 animate-spin text-[var(--teal)]" />
					Загрузка нарядов лаборатории...
				</div>
			) : orders.length === 0 ? (
				<div
					style={{
						padding: "2rem 1.5rem",
						textAlign: "center",
						background: "var(--paper-soft)",
						borderRadius: "12px",
						border: "1px dashed var(--line)",
						display: "flex",
						flexDirection: "column",
						alignItems: "center",
						gap: "0.75rem",
						margin: "0.5rem 0",
					}}
				>
					<FlaskConical size={36} color="var(--teal, #0d9488)" />
					<div style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--ink)" }}>
						Нет оформленных нарядов в зуботехническую лабораторию
					</div>
					<div style={{ fontSize: "0.825rem", color: "var(--muted)", maxWidth: "420px" }}>
						Оформите заказ-наряд на изготовление коронок, виниров, вкладок или съемных протезов по данному пациенту.
					</div>
					<button
						type="button"
						onClick={() => {
							setSelectedOrderForEdit(null);
							setIsOrderModalOpen(true);
						}}
						className="primary-button min-h-[40px] px-4 flex items-center gap-1.5 text-xs font-bold rounded-xl shadow-sm cursor-pointer"
						data-testid="empty-state-add-first-patient-lab-order-btn"
					>
						<Plus size={15} />
						<span>+ Оформить заказ-наряд в лабораторию</span>
					</button>
				</div>
			) : (
				<div className="lab-orders-list">
					{orders.map((order) => {
						const canonicalStatus = mapToCanonicalStatus(order.status);

						return (
							<div key={order.id} className="lab-order-card">
								{/* Card Top Row */}
								<div className="lab-order-main-row">
									<div className="lab-order-info-group">
										<div className="fdi-badge-compact">
											Зуб {order.toothFdi || "—"}
										</div>
										<div className="lab-order-title-block">
											<strong>{order.patientName || "Пациент"}</strong>
											<div className="lab-order-spec-line">
												<span className="lab-order-spec-chip">{order.material || "Цирконий"}</span>
												<span>·</span>
												<span>Цвет VITA: <strong className="text-[var(--teal)]">{order.colorVita || "A2"}</strong></span>
												{order.doctorName && (
													<>
														<span>·</span>
														<span>Врач: {order.doctorName}</span>
													</>
												)}
												{order.dueDate && (
													<>
														<span>·</span>
														<span className="text-[var(--ink)] font-semibold flex items-center gap-1">
															<Calendar className="w-3 h-3 text-[var(--teal)]" />
															Срок: {new Date(order.dueDate).toLocaleDateString("ru-RU")}
														</span>
													</>
												)}
											</div>
										</div>
									</div>

									{/* Cost */}
									<div className="lab-card-financials">
										<span>Себестоимость:</span>
										<span className="lab-card-price">
											{order.priceRub != null ? money(order.priceRub) : "—"}
										</span>
									</div>
								</div>

								{/* Compact 1-Line 4-Status Progression Strip */}
								<div className="lab-status-strip-1line" role="group" aria-label="Статус наряда ЗТЛ">
									{CANONICAL_LAB_STATUSES.map((st) => {
										const isActive = canonicalStatus === st.id;
										return (
											<button
												key={st.id}
												type="button"
												onClick={() => handleStatusTransition(order.id, st.id)}
												className={`lab-status-step ${isActive ? `is-active status-${st.id}` : ""}`}
												title={`Переключить статус на: ${st.label}`}
											>
												{isActive && <Check className="w-3 h-3" />}
												<span>{st.shortLabel}</span>
											</button>
										);
									})}
								</div>

								{/* Clinical Notes (if present) */}
								{order.clinicalNotes && (
									<p className="text-xs text-[var(--muted)] italic line-clamp-1 m-0">
										«{order.clinicalNotes}»
									</p>
								)}

								{/* Card Bottom 32px Action Toolbar */}
								<div className="lab-card-footer">
									<div className="flex items-center gap-1 text-xs text-[var(--muted)]">
										<Clock className="w-3 h-3" />
										<span>Создан: {new Date(order.createdAt).toLocaleDateString("ru-RU")}</span>
									</div>

									<div className="lab-card-actions">
										<button
											type="button"
											onClick={() => handleScheduleAppointment(order)}
											className="lab-btn-32 is-primary"
											title="Запланировать слот приема в расписании на дату готовности работы (Primary Action)"
										>
											<Calendar className="w-3.5 h-3.5" />
											<span>Запланировать прием</span>
										</button>

										<div
											className="relative inline-flex"
											ref={openMenuOrderId === order.id ? cardMenuRef : null}
										>
											<button
												type="button"
												onClick={() =>
													setOpenMenuOrderId((prev) =>
														prev === order.id ? null : order.id,
													)
												}
												className="lab-btn-32 !px-2"
												title="Дополнительные действия с нарядом"
												aria-label="Меню действий"
												aria-haspopup="menu"
												aria-expanded={openMenuOrderId === order.id}
											>
												<MoreVertical className="w-3.5 h-3.5" />
											</button>

											{openMenuOrderId === order.id && (
												<div
													className="absolute right-0 bottom-full mb-1 w-48 p-1.5 rounded-xl bg-[var(--paper-strong,var(--paper,#ffffff))] border border-[var(--line,#cbd5e1)] shadow-xl z-50 flex flex-col gap-1 text-xs text-[var(--ink,#0f172a)] backdrop-blur-md"
													role="menu"
													aria-label="Меню действий наряда"
												>
													<button
														type="button"
														onClick={() => {
															setOpenMenuOrderId(null);
															setSelectedOrderForEdit(order as any);
															setIsOrderModalOpen(true);
														}}
														className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left hover:bg-[var(--paper-soft,#f1f5f9)] transition-colors cursor-pointer"
														role="menuitem"
													>
														<FlaskConical className="w-3.5 h-3.5 text-[var(--teal)]" />
														<span>Детали наряда</span>
													</button>

													<button
														type="button"
														onClick={() => {
															setOpenMenuOrderId(null);
															setSelectedOrderForTracking(order as any);
															setIsTrackingDrawerOpen(true);
														}}
														className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left hover:bg-[var(--paper-soft,#f1f5f9)] transition-colors cursor-pointer"
														role="menuitem"
													>
														<Layers className="w-3.5 h-3.5 text-indigo-500" />
														<span>Трекинг этапов</span>
													</button>

													{order.secureToken && (
														<button
															type="button"
															onClick={() => {
																setOpenMenuOrderId(null);
																copyPortalLink(order.secureToken);
															}}
															className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left hover:bg-[var(--paper-soft,#f1f5f9)] transition-colors cursor-pointer"
															role="menuitem"
														>
															<Link className="w-3.5 h-3.5 text-sky-500" />
															<span>Ссылка технику</span>
														</button>
													)}

													<div className="h-[1px] bg-[var(--line,#e2e8f0)] my-0.5" />

													<button
														type="button"
														onClick={() => {
															setOpenMenuOrderId(null);
															handleDeleteOrder(order.id);
														}}
														className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer font-semibold"
														role="menuitem"
													>
														<Trash2 className="w-3.5 h-3.5" />
														<span>Удалить наряд</span>
													</button>
												</div>
											)}
										</div>
									</div>
								</div>
							</div>
						);
					})}
				</div>
			)}

			{/* Full CAD/CAM Order Modal */}
			<DentalLabOrderModal
				isOpen={isOrderModalOpen}
				onClose={() => setIsOrderModalOpen(false)}
				initialOrder={selectedOrderForEdit}
				patientId={patientId}
				onOrderSaved={() => fetchOrders()}
			/>

			{/* 7-Stage Tracking Drawer */}
			<LabTrackingDrawer
				isOpen={isTrackingDrawerOpen}
				onClose={() => setIsTrackingDrawerOpen(false)}
				order={selectedOrderForTracking}
				onStageUpdate={async (orderId, newStage) => {
					await fetchOrders();
				}}
			/>
		</div>
	);
}

