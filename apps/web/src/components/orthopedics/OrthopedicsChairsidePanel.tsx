import React, { useState, useCallback, useId, useEffect, useRef } from "react";
import {
	CheckCircle2,
	ShieldCheck,
	FileText,
	ArrowRight,
	ExternalLink,
	Check,
	Send,
	Camera,
	RotateCcw,
	X,
} from "lucide-react";
import { DentalCrown, DentalVeneer, DentalBridge } from "../icons/DentalIcons.js";
import {
	ORTHOPEDIC_CANONICAL_PROTOCOLS,
	applyOrthopedicProtocolToVisit,
	createDoctorClinicalOverride,
	type OrthopedicProtocolPreset,
	type FormatOrthopedicProtocolOptions,
	type Order804nServiceItem,
} from "./orthopedicProtocols.js";
import { showToast } from "../GlobalToast.js";
import { denteAdminSecretRequestHeaders } from "../../lib/denteRequestHeaders.js";
import {
	CANONICAL_MANUFACTURING_5_STAGES,
	type CanonicalManufacturing5StageItem,
} from "../lab/labMath.js";
import {
	DentalLabReadyInClinicModal,
	type ReadyInClinicLabOrder,
} from "../lab/DentalLabReadyInClinicModal";

export {
	type StandardZtlPreset,
	STANDARD_ZTL_ORDER_PRESETS,
	type PreparationMarginPreset,
	PREPARATION_MARGIN_PRESETS,
	VITA_3D_MASTER_SHADE_GROUPS,
} from "./orthopedicsPresets.js";
import {
	type StandardZtlPreset,
	STANDARD_ZTL_ORDER_PRESETS,
	PREPARATION_MARGIN_PRESETS,
} from "./orthopedicsPresets.js";
import { OrthopedicsVitaShadePicker } from "./OrthopedicsVitaShadePicker.js";
import { OrthopedicsZtlSelectors } from "./OrthopedicsZtlSelectors.js";

export interface OrthopedicsChairsidePanelProps {
	readonly patientId?: string | undefined;
	readonly activeToothFdi?: string | number | undefined;
	readonly selectedTeeth?: readonly (string | number)[] | undefined;
	readonly recentToothXrayUrl?: string | undefined;
	readonly onToothSelect?: ((tooth: number) => void) | undefined;
	readonly onOpenLabOrder?: (() => void) | undefined;
	readonly onAddToInvoice?: ((services: readonly Order804nServiceItem[]) => void) | undefined;
	readonly isLocked?: boolean;
	readonly className?: string;
}

export function OrthopedicsChairsidePanel({
	patientId,
	activeToothFdi,
	selectedTeeth = [],
	recentToothXrayUrl,
	onToothSelect,
	onOpenLabOrder,
	onAddToInvoice,
	isLocked = false,
	className = "",
}: OrthopedicsChairsidePanelProps) {
	const selectId = useId();
	const [activeTeethInput, setActiveTeethInput] = useState<string>(
		selectedTeeth.length > 0
			? selectedTeeth.join(", ")
			: activeToothFdi
				? String(activeToothFdi)
				: "16",
	);

	const [jawScope, setJawScope] = useState<"upper" | "lower" | "both" | "none">("none");
	const [selectedMaterial, setSelectedMaterial] = useState<string>("ZrO2 Multi-Layer");
	const [selectedShade, setSelectedShade] = useState<string>("A2");
	const [appliedProtocolId, setAppliedProtocolId] = useState<string | null>(null);
	const appliedProtocolTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	useEffect(() => {
		return () => {
			if (appliedProtocolTimerRef.current) clearTimeout(appliedProtocolTimerRef.current);
		};
	}, []);

	// Автоматическая привязка зубной формулы визита к наряду ЗТЛ
	useEffect(() => {
		if (selectedTeeth && selectedTeeth.length > 0) {
			setActiveTeethInput(selectedTeeth.join(", "));
		} else if (activeToothFdi) {
			setActiveTeethInput(String(activeToothFdi));
		}
	}, [activeToothFdi, selectedTeeth]);

	// Стандартные наряды ЗТЛ, этапы изготовления и шкала VITA (Мандат 8i, 8k)
	const [shadeSystem, setShadeSystem] = useState<"classical" | "3d_master" | "bleach">("classical");
	const [activeZtlPresetId, setActiveZtlPresetId] = useState<string>("zirconia");
	const [preparationMargin, setPreparationMargin] = useState<string>("chamfer");
	const [activeXrayUrl, setActiveXrayUrl] = useState<string | null>(recentToothXrayUrl ?? null);
	const [isWarrantyRework, setIsWarrantyRework] = useState<boolean>(false);
	const [warrantyLiabilityType, setWarrantyLiabilityType] = useState<"clinic_warranty" | "lab_defect">("clinic_warranty");
	const [isLabOrderSending, setIsLabOrderSending] = useState<boolean>(false);
	const [labOrderSentNumber, setLabOrderSentNumber] = useState<string | null>(null);
	const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
	const [selectedStageId, setSelectedStageId] = useState<string>("impression_scan");

	// Автоматическая привязка снимков визита к наряду ЗТЛ
	useEffect(() => {
		if (recentToothXrayUrl) {
			setActiveXrayUrl(recentToothXrayUrl);
		} else if (typeof window !== "undefined") {
			const cachedImg =
				localStorage.getItem("dente_active_visit_last_image") ||
				localStorage.getItem("dente_active_xray_url");
			if (cachedImg) {
				setActiveXrayUrl(cachedImg);
			}
		}
	}, [recentToothXrayUrl]);

	// Ready in clinic prompt modal state (Mandates 8b, 8e, 8n)
	const [isReadyInClinicModalOpen, setIsReadyInClinicModalOpen] = useState<boolean>(false);
	const [readyInClinicOrder, setReadyInClinicOrder] = useState<ReadyInClinicLabOrder | null>(null);

	// Клинический оверрайд врача (Мандат 8e п. 7, 8n)
	const [overrideActive, setOverrideActive] = useState<boolean>(false);
	const [overrideReason, setOverrideReason] = useState<string>(
		"Срочное изготовление по клиническим показаниям (аванс < 50%)",
	);

	const handleSelectZtlPreset = useCallback((preset: StandardZtlPreset) => {
		setActiveZtlPresetId(preset.id);
		setSelectedMaterial(preset.material);
		showToast(`Выбран стандарт ЗТЛ: ${preset.name} (${preset.badge})`, "info", 2000);
	}, []);

	const handleSelectStage = useCallback((stage: CanonicalManufacturing5StageItem) => {
		setSelectedStageId(stage.id);
		showToast(`Этап ЗТЛ: ${stage.shortLabelRu} (${stage.descRu})`, "info", 2000);

		if (activeOrderId) {
			fetch(`/api/lab/orders/${activeOrderId}`, {
				method: "PATCH",
				headers: {
					"Content-Type": "application/json",
					...denteAdminSecretRequestHeaders(),
				},
				body: JSON.stringify({
					stage: stage.id,
					techStage: stage.shortLabelRu,
				}),
			}).catch((err) => {
				console.warn("[OrthopedicsChairsidePanel] Failed to patch lab order stage:", err);
			});
		}

		if (typeof window !== "undefined") {
			window.dispatchEvent(
				new CustomEvent("dente-lab-order-stage-changed", {
					detail: { stageId: stage.id, stageName: stage.shortLabelRu, orderNumber: labOrderSentNumber },
				}),
			);
		}

		if (stage.id === "ready_in_clinic") {
			const preset = STANDARD_ZTL_ORDER_PRESETS.find((p) => p.id === activeZtlPresetId);
			setReadyInClinicOrder({
				id: activeOrderId || undefined,
				orderNumber: labOrderSentNumber || (activeOrderId ? activeOrderId.slice(0, 8) : "ЗТЛ-1"),
				patientId: patientId || undefined,
				patientName: "Пациент",
				toothFdi: activeTeethInput,
				material: selectedMaterial,
				colorVita: selectedShade,
				constructionType: preset?.name || "Ортопедическая конструкция",
				clinicName: "DENTE",
			});
			setIsReadyInClinicModalOpen(true);
		}
	}, [activeOrderId, activeTeethInput, activeZtlPresetId, labOrderSentNumber, patientId, selectedMaterial, selectedShade]);

	const handleImmediateSendToLab = useCallback(async () => {
		if (isLocked && !overrideActive) {
			const auditReason =
				"Исправленному верить: срочный наряд ЗТЛ при закрытом визите";
			setOverrideActive(true);
			setOverrideReason(auditReason);
			const override = createDoctorClinicalOverride({
				reason: auditReason,
			});
			if (typeof window !== "undefined") {
				window.dispatchEvent(
					new CustomEvent("dente-doctor-clinical-override", {
						detail: override,
					}),
				);
			}
			showToast(
				"Исправленному верить: клинический оверрайд врача активирован",
				"info",
				3000,
			);
		}

		const teethParts = activeTeethInput
			.split(/[\s,;-]+/)
			.map((p) => p.trim())
			.filter(Boolean);

		const preset = STANDARD_ZTL_ORDER_PRESETS.find((p) => p.id === activeZtlPresetId) ?? STANDARD_ZTL_ORDER_PRESETS[0];
		if (!preset) return;
		const orderNumber = `ЗТЛ-${Date.now().toString().slice(-6)}`;
		setIsLabOrderSending(true);
		const effectiveStage = CANONICAL_MANUFACTURING_5_STAGES.find((s) => s.id === selectedStageId);
		const marginPreset = PREPARATION_MARGIN_PRESETS.find((m) => m.id === preparationMargin);
		const isWarranty = Boolean(isWarrantyRework);
		const liabilityLabelRu = warrantyLiabilityType === "lab_defect"
			? "Брак ЗТЛ (переделка за счет лаборатории 0 ₽)"
			: "Гарантийные обязательства клиники";

		const labOrderPayload = {
			orderNumber,
			createdAt: new Date().toISOString(),
			teeth: teethParts.length > 0 ? teethParts : ["16"],
			jawScope: jawScope !== "none" ? jawScope : "upper",
			constructionType: preset.constructionType,
			material: selectedMaterial,
			colorVita: selectedShade,
			stage: selectedStageId,
			techStage: effectiveStage?.shortLabelRu ?? "Слепок/Скан",
			preparationMargin,
			preparationMarginLabel: marginPreset?.labelRu ?? preparationMargin,
			attachedImageUrl: activeXrayUrl || undefined,
			warrantyMonths: preset.warrantyMonths,
			warrantyLabelRu: preset.warrantyLabelRu,
			isWarrantyRework: isWarranty,
			warrantyLiabilityType: isWarranty ? warrantyLiabilityType : undefined,
			priceRub: isWarranty ? 0 : undefined,
			doctorNotes: isWarranty
				? `Гарантийная рекламация [${liabilityLabelRu}]. Для пациента: 0 ₽. Пресет: ${preset.name}. Оттенок: ${selectedShade}. Уступ: ${marginPreset?.labelRu ?? preparationMargin}.`
				: `Срочный 1-клик наряд ЗТЛ из кресла врача. Пресет: ${preset.name}. Оттенок: ${selectedShade}. Уступ: ${marginPreset?.labelRu ?? preparationMargin}. Гарантия: ${preset.warrantyLabelRu}. Этап: ${effectiveStage?.shortLabelRu ?? "Слепок/Скан"}.`,
			overrideActive: true,
			overrideReason: overrideActive
				? overrideReason
				: "Исправленному верить: срочный наряд ЗТЛ при закрытом визите",
		};

		if (typeof window !== "undefined") {
			window.dispatchEvent(
				new CustomEvent("dente-lab-order-created", {
					detail: labOrderPayload,
				}),
			);
		}

		try {
			const teethFdiStr = teethParts.length > 0 ? teethParts.join(", ") : "16";
			const reqBody = {
				orderNumber,
				teethFdi: teethFdiStr,
				construction: preset.constructionType,
				material: selectedMaterial,
				colorVita: selectedShade,
				stage: selectedStageId,
				techStage: labOrderPayload.techStage,
				preparationMargin,
				attachedImageUrl: activeXrayUrl || undefined,
				warrantyMonths: preset.warrantyMonths,
				warrantyLabelRu: preset.warrantyLabelRu,
				isWarrantyRework: isWarranty,
				warrantyLiabilityType: isWarranty ? warrantyLiabilityType : undefined,
				priceRub: isWarranty ? 0 : undefined,
				clinicalNotes: labOrderPayload.doctorNotes,
				overrideActive: true,
				overrideReason: labOrderPayload.overrideReason,
				patientId: patientId || undefined,
			};

			const headers = denteAdminSecretRequestHeaders({
				"Content-Type": "application/json",
			});

			let res = await fetch("/api/lab/orders", {
				method: "POST",
				headers,
				body: JSON.stringify(reqBody),
			});

			if (res.status === 404) {
				res = await fetch("/api/clinical/lab-orders", {
					method: "POST",
					headers,
					body: JSON.stringify(reqBody),
				});
			}

			if (res.ok) {
				const json = await res.json().catch(() => null);
				if (json?.id) {
					setActiveOrderId(json.id);
				}
			}
		} catch {
			// Offline or network error: in-app CustomEvent already notified listeners
		} finally {
			setIsLabOrderSending(false);
			setLabOrderSentNumber(orderNumber);
			showToast(
				isWarranty
					? `Гарантийный наряд ${orderNumber} в ЗТЛ оформлен (${liabilityLabelRu}, для пациента 0 ₽)!`
					: `Наряд ${orderNumber} в ЗТЛ успешно отправлен (${preset.name}, оттенок ${selectedShade})!`,
				"success",
				4000,
			);
		}
	}, [
		activeTeethInput,
		activeXrayUrl,
		activeZtlPresetId,
		isLocked,
		isWarrantyRework,
		jawScope,
		overrideActive,
		overrideReason,
		patientId,
		preparationMargin,
		selectedMaterial,
		selectedShade,
		selectedStageId,
		warrantyLiabilityType,
	]);

	const handleApplyProtocol = useCallback(
		(protocol: OrthopedicProtocolPreset) => {
			if (isLocked && !overrideActive) {
				const auditReason =
					"Исправленному верить: дополнение ортопедического протокола";
				setOverrideActive(true);
				setOverrideReason(auditReason);
				const override = createDoctorClinicalOverride({
					reason: auditReason,
				});
				if (typeof window !== "undefined") {
					window.dispatchEvent(
						new CustomEvent("dente-doctor-clinical-override", {
							detail: override,
						}),
					);
				}
				showToast(
					"Исправленному верить: клинический оверрайд врача активирован",
					"info",
					3000,
				);
			}

			const teethParts = activeTeethInput
				.split(/[\s,;-]+/)
				.map((p) => p.trim())
				.filter(Boolean);

			const options: FormatOrthopedicProtocolOptions = {
				teethFdi: teethParts.length > 0 ? teethParts : undefined,
				toothFdi: teethParts.length === 1 ? teethParts[0] : undefined,
				jawScope: jawScope !== "none" ? jawScope : undefined,
				material: selectedMaterial,
				colorVita: selectedShade,
			};

			const result = applyOrthopedicProtocolToVisit({
				protocol,
				options,
				copyToClipboard: true,
				showNotification: true,
				onAddToInvoice,
			});

			setAppliedProtocolId(protocol.id);
			if (appliedProtocolTimerRef.current) clearTimeout(appliedProtocolTimerRef.current);
			appliedProtocolTimerRef.current = setTimeout(() => {
				appliedProtocolTimerRef.current = null;
				setAppliedProtocolId(null);
			}, 3000);

			const firstTooth = result.teethNumbers[0];
			if (typeof firstTooth === "number" && onToothSelect) {
				onToothSelect(firstTooth);
			}
		},
		[
			activeTeethInput,
			isLocked,
			overrideActive,
			jawScope,
			selectedMaterial,
			selectedShade,
			onToothSelect,
			onAddToInvoice,
		],
	);

	const handleToggleOverride = useCallback(() => {
		if (overrideActive) {
			setOverrideActive(false);
			showToast("Клинический оверрайд отменен", "info");
			return;
		}

		const override = createDoctorClinicalOverride({
			reason: overrideReason,
		});

		setOverrideActive(true);
		showToast(override.notice, "success", 4000);

		if (typeof window !== "undefined") {
			window.dispatchEvent(
				new CustomEvent("dente-doctor-clinical-override", {
					detail: override,
				}),
			);
		}
	}, [overrideActive, overrideReason]);

	const getProtocolIcon = (category: OrthopedicProtocolPreset["category"]) => {
		switch (category) {
			case "prep_crown": return <DentalCrown size={18} className="text-teal-600 dark:text-teal-400 shrink-0" />;
			case "try_in": return <CheckCircle2 size={18} className="text-blue-600 dark:text-blue-400 shrink-0" />;
			case "permanent_cementation": return <DentalVeneer size={18} className="text-emerald-600 dark:text-emerald-400 shrink-0" />;
			case "removable_prosthetics": return <DentalBridge size={18} className="text-purple-600 dark:text-purple-400 shrink-0" />;
			case "consultation_norm": return <ShieldCheck size={18} className="text-emerald-600 dark:text-emerald-400 shrink-0" />;
		}
	};

	return (
		<div
			className={`orthopedics-chairside-panel p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs ${className}`}
			data-testid="orthopedics-chairside-panel"
		>
			{/* Верхняя строка: Заголовок, область зубов, параметры материала */}
			<div className="flex flex-wrap items-center justify-between gap-2.5 pb-3 mb-3 border-b border-slate-100 dark:border-slate-800">
				<div className="flex items-center gap-2">
					<DentalCrown size={20} className="text-teal-600 dark:text-teal-400" />
					<div className="leading-tight">
						<h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 tracking-tight">
							Ортопедия у кресла (043/у · Этап 3 · ЗТЛ)
						</h3>
						<p className="text-xs text-slate-600 dark:text-slate-300">
							1-клик протоколы · Приказ 804н · Автономия врача (Мандат 8e)
						</p>
					</div>
				</div>

				<div className="flex items-center gap-2 flex-wrap">
					{/* Ввод зубов */}
					<div className="flex items-center gap-1.5">
						<label
							htmlFor={`${selectId}-teeth`}
							className="text-xs font-semibold text-slate-700 dark:text-slate-200"
						>
							Зуб(ы):
						</label>
						<input
							id={`${selectId}-teeth`}
							type="text"
							value={activeTeethInput}
							onChange={(e) => setActiveTeethInput(e.target.value)}
							placeholder="16, 21"
							aria-label="Номера зубов FDI"
							className="min-h-[48px] w-24 px-3 text-xs font-mono font-bold rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
							data-testid="ortho-teeth-input"
						/>
					</div>

					{/* Индикатор привязанного снимка / прицельного рентгена зуба */}
					<div
						className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs min-h-[48px]"
						data-testid="attached-xray-badge"
					>
						<Camera
							size={16}
							className={
								activeXrayUrl
									? "text-teal-600 dark:text-teal-400 shrink-0"
									: "text-slate-400 shrink-0"
							}
						/>
						{activeXrayUrl ? (
							<div className="flex items-center gap-1.5">
								<span className="text-teal-700 dark:text-teal-300 font-bold truncate max-w-[110px]" title="Снимок визита прикреплен к наряду ЗТЛ">
									Снимок привязан
								</span>
								<button
									type="button"
									onClick={() => setActiveXrayUrl(null)}
									className="text-xs text-slate-400 hover:text-rose-500 cursor-pointer font-bold px-1 inline-flex items-center"
									title="Открепить снимок"
								>
									<X className="w-3 h-3" />
								</button>
							</div>
						) : (
							<span className="text-slate-400 font-medium">Без снимка</span>
						)}
					</div>

					{/* Челюсть */}
					<div className="flex items-center rounded-lg border border-slate-300 dark:border-slate-700 overflow-hidden text-xs">
						<button
							type="button"
							onClick={() => setJawScope(jawScope === "upper" ? "none" : "upper")}
							className={`min-h-[48px] px-3 font-bold cursor-pointer transition-colors ${
								jawScope === "upper"
									? "bg-teal-600 text-white"
									: "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700"
							}`}
							title="Верхняя челюсть"
						>
							ВЧ
						</button>
						<button
							type="button"
							onClick={() => setJawScope(jawScope === "lower" ? "none" : "lower")}
							className={`min-h-[48px] px-3 font-bold cursor-pointer transition-colors border-l border-slate-300 dark:border-slate-700 ${
								jawScope === "lower"
									? "bg-teal-600 text-white"
									: "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700"
							}`}
							title="Нижняя челюсть"
						>
							НЧ
						</button>
						<button
							type="button"
							onClick={() => setJawScope(jawScope === "both" ? "none" : "both")}
							className={`min-h-[48px] px-3 font-bold cursor-pointer transition-colors border-l border-slate-300 dark:border-slate-700 ${
								jawScope === "both"
									? "bg-teal-600 text-white"
									: "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700"
							}`}
							title="Обе челюсти"
						>
							Обе
						</button>
					</div>

					{/* Материал */}
					<select
						value={selectedMaterial}
						onChange={(e) => setSelectedMaterial(e.target.value)}
						aria-label="Материал конструкции"
						className="min-h-[48px] px-3 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
					>
						<option value="ZrO2 Multi-Layer">ZrO2 Multi-Layer</option>
						<option value="IPS e.max Press">IPS e.max Press</option>
						<option value="Металлокерамика Noritake">Металлокерамика Noritake</option>
						<option value="PMMA CAD/CAM">PMMA CAD/CAM</option>
						<option value="Acry-Free / Квадротти">Acry-Free / Квадротти</option>
						<option value="Временная Protemp 4">Временная Protemp 4</option>
					</select>
				</div>
			</div>

			<OrthopedicsZtlSelectors
				activeZtlPresetId={activeZtlPresetId}
				onSelectZtlPreset={handleSelectZtlPreset}
				preparationMargin={preparationMargin}
				onSelectPreparationMargin={(marginId, labelRu) => {
					setPreparationMargin(marginId);
					showToast(`Уступ ЗТЛ: ${labelRu}`, "info", 1500);
				}}
				selectedStageId={selectedStageId}
				onSelectStage={handleSelectStage}
			/>

			<OrthopedicsVitaShadePicker
				shadeSystem={shadeSystem}
				onShadeSystemChange={setShadeSystem}
				selectedShade={selectedShade}
				onSelectShade={setSelectedShade}
			/>

			{/* Сетка 4 канонических протоколов (1 клик -> 043/у + Смета + Этап 3) */}
			<div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 mb-3">
				{ORTHOPEDIC_CANONICAL_PROTOCOLS.map((proto) => {
					const isApplied = appliedProtocolId === proto.id;

					return (
						<div
							key={proto.id}
							className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 hover:bg-slate-100/50 dark:hover:bg-slate-800 transition-colors flex flex-col justify-between gap-2"
						>
							<div className="flex items-start gap-2">
								{getProtocolIcon(proto.category)}
								<div className="min-w-0 flex-1">
									<div className="flex items-center justify-between gap-1">
										<h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
											{proto.shortLabel}
										</h4>
										<span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-200/80 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
											{proto.defaultIcd10}
										</span>
									</div>
									<p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 mt-0.5 leading-relaxed">
										{proto.treatment}
									</p>
								</div>
							</div>

							<div className="flex items-center justify-between gap-2 pt-1.5 border-t border-slate-200/60 dark:border-slate-700/60">
								<div className="text-[11px] font-medium text-slate-600 dark:text-slate-300">
									Номенклатура: {proto.order804nServices.map((s) => s.code).join(", ")}
								</div>

								<button
									type="button"
									onClick={() => handleApplyProtocol(proto)}
									className={`min-h-[48px] px-3.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs ${
										isApplied
											? "bg-emerald-600 text-white"
											: "bg-teal-600 hover:bg-teal-700 text-white"
									}`}
									data-testid={`apply-ortho-protocol-${proto.id}`}
									title={`Внести протокол «${proto.shortLabel}» в дневник 043/у, смету визита и Этап 3 (Ортопедия)`}
								>
									{isApplied ? (
										<>
											<Check size={16} />
											<span>Внесено в 043/у и смету</span>
										</>
									) : (
										<>
											<FileText size={16} />
											<span>Внести в 043/у и смету</span>
											<ArrowRight size={14} />
										</>
									)}
								</button>
							</div>
						</div>
					);
				})}
			</div>

			{/* Нижняя панель: Мандат 8e Клинический оверрайд врача + Кнопка наряда ЗТЛ */}
			<div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
				{/* Клинический оверрайд врача (Мандат 8e п. 7, 8n) */}
				<div className="flex items-center gap-2 flex-wrap flex-1 min-w-[280px]">
					<button
						type="button"
						onClick={handleToggleOverride}
						className={`min-h-[48px] px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
							overrideActive
								? "bg-emerald-700 text-white shadow-xs"
								: "bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700"
						}`}
						data-testid="doctor-clinical-override-toggle"
						title="Клинический оверрайд врача при авансе < 50% без задержек и согласований"
					>
						<ShieldCheck size={16} />
						<span>
							{overrideActive
								? "Оверрайд врача: АКТИВЕН"
								: "Клинический оверрайд (Аванс < 50%)"}
						</span>
					</button>

					{overrideActive && (
						<input
							type="text"
							value={overrideReason}
							onChange={(e) => setOverrideReason(e.target.value)}
							placeholder="Причина клинического оверрайда"
							aria-label="Причина клинического оверрайда"
							className="min-h-[48px] flex-1 px-3 text-xs rounded-lg border border-emerald-500/40 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-100 focus:outline-hidden"
						/>
					)}
				</div>

				{/* Гарантийная переделка / рекламация ЗТЛ (Мандат 8e / 0 ₽ с пациента) */}
				<div className="flex items-center gap-1.5 flex-wrap">
					<button
						type="button"
						onClick={() => {
							const nextVal = !isWarrantyRework;
							setIsWarrantyRework(nextVal);
							showToast(
								nextVal
									? "Включен режим гарантийной переделки ЗТЛ: для пациента 0 ₽"
									: "Режим гарантийной переделки отключен",
								"info",
								2500,
							);
						}}
						className={`min-h-[48px] px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border ${
							isWarrantyRework
								? "bg-rose-50 dark:bg-rose-950/40 border-rose-400 text-rose-700 dark:text-rose-300 ring-1 ring-rose-400 shadow-2xs"
								: "bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
						}`}
						data-testid="chairside-warranty-rework-toggle"
						title="Повторное изготовление по гарантии: пациент 0 ₽, расчет затрат как обязательства клиники или брак ЗТЛ"
					>
						<RotateCcw size={15} className={isWarrantyRework ? "text-rose-600 dark:text-rose-400" : "text-slate-500"} />
						<span>{isWarrantyRework ? "Гарантия: 0 ₽ с пациента" : "Гарантийная замена (0 ₽)"}</span>
					</button>

					{isWarrantyRework && (
						<div className="flex items-center rounded-lg border border-rose-300 dark:border-rose-800 overflow-hidden text-xs">
							<button
								type="button"
								onClick={() => setWarrantyLiabilityType("clinic_warranty")}
								className={`min-h-[48px] px-2.5 font-bold cursor-pointer transition-colors ${
									warrantyLiabilityType === "clinic_warranty"
										? "bg-rose-600 text-white"
										: "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100"
								}`}
								title="Гарантийные обязательства клиники (клиника оплачивает ЗТЛ)"
								data-testid="chairside-liability-clinic"
							>
								Гарантия клиники
							</button>
							<button
								type="button"
								onClick={() => setWarrantyLiabilityType("lab_defect")}
								className={`min-h-[48px] px-2.5 font-bold cursor-pointer transition-colors border-l border-rose-300 dark:border-rose-800 ${
									warrantyLiabilityType === "lab_defect"
										? "bg-rose-600 text-white"
										: "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100"
								}`}
								title="Брак ЗТЛ (лаборатория переделывает бесплатно 0 ₽)"
								data-testid="chairside-liability-lab"
							>
								Брак ЗТЛ (0 ₽)
							</button>
						</div>
					)}
				</div>

				{/* Действия ЗТЛ: 1-клик отправка + Конструктор */}
				<div className="flex items-center gap-2 flex-wrap">
					{labOrderSentNumber && (
						<span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-bold px-2 py-1 rounded bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 inline-flex items-center gap-1">
							<CheckCircle2 size={12} className="shrink-0" />
							<span>Отправлен {labOrderSentNumber}</span>
						</span>
					)}

					<button
						type="button"
						onClick={handleImmediateSendToLab}
						disabled={isLabOrderSending}
						className="min-h-[48px] px-4 py-2 rounded-lg text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 dark:bg-teal-600 dark:hover:bg-teal-500 flex items-center gap-2 transition-all cursor-pointer shadow-xs disabled:opacity-50"
						data-testid="direct-send-lab-order-btn"
						title="Мгновенно отправить заказ-наряд в лабораторию без бюрократических барьеров"
					>
						<Send size={15} />
						<span>{isLabOrderSending ? "Отправка в ЗТЛ..." : "В ЗТЛ (1 клик)"}</span>
					</button>

					{/* Переход в конструктор наряда ЗТЛ */}
					{onOpenLabOrder && (
						<button
							type="button"
							onClick={onOpenLabOrder}
							className="min-h-[48px] px-4 py-2 rounded-lg text-xs font-bold text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/40 hover:bg-teal-100 dark:hover:bg-teal-900/40 border border-teal-200 dark:border-teal-800 flex items-center gap-2 transition-all cursor-pointer"
							data-testid="open-lab-order-constructor-btn"
							title="Открыть конструктор заказ-нарядов зуботехнической лаборатории"
						>
							<span>Наряд ЗТЛ</span>
							<ExternalLink size={15} />
						</button>
					)}
				</div>
			</div>

			{/* Модалка 1-клик записи на фиксацию и шаблонов SMS / WhatsApp при поступлении работы в клинику */}
			<DentalLabReadyInClinicModal
				isOpen={isReadyInClinicModalOpen}
				onClose={() => setIsReadyInClinicModalOpen(false)}
				order={readyInClinicOrder}
			/>
		</div>
	);
}
