import {
	Activity,
	Camera,
	Check,
	CheckCircle2,
	ClipboardList,
	Clock,
	Copy,
	Eye,
	FileText,
	Layers,
	MoveHorizontal,
	Plus,
	Printer,
	RotateCcw,
	RotateCw,
	Sliders,
	Smile,
	Sparkles,
	UploadCloud,
	Trash2,
	X,
	Zap,
} from "lucide-react";
import React, { useCallback, useMemo, useRef, useState } from "react";
import {
	BRACKET_SYSTEMS,
	ARCHWIRE_MATERIALS,
	ROUND_SECTIONS,
	RECT_SECTIONS,
	ELASTIC_SCHEMES,
	ELASTIC_SIZES,
	CLINICAL_ACTIONS,
	ALIGNER_ATTACHMENT_PRESETS,
	ORTHODONTIC_QUICK_PRESETS,
	UPPER_TEETH,
	LOWER_TEETH,
	ANTERIOR_TEETH,
	generateOrthodonticSoapNote,
	ANGLE_CLASS_OPTIONS,
	type AngleClass,
	WORKHORSE_ARCHWIRES,
	type WorkhorseArchwireOption,
	type ArchwireMaterial,
	type ArchwireSection,
	type BracketSlot,
	type TargetArch,
	type OrthodonticAngleId,
	ORTHODONTIC_8_ANGLES,
} from "@dental/shared";
import { showToast } from "../GlobalToast";
import { useVisitStore } from "../../store/visitStore";
import { CephalometricAnalysisModal } from "./CephalometricAnalysisModal";
import { OrthoPhotoProtocolModal } from "./OrthoPhotoProtocolModal";
import { OrthodonticExaminationCard } from "./OrthodonticExaminationCard";

export interface OrthodonticStudioModalProps {
	isOpen: boolean;
	onClose: () => void;
	patientId?: string;
	patientName?: string;
	patientCardNumber?: string;
	doctorName?: string;
	clinicName?: string;
	onSaveSuccess?: () => void;
}

export type StudioTab = "examination" | "appliances" | "photos" | "diary" | "soap";

export function OrthodonticStudioModal({
	isOpen,
	onClose,
	patientId = "",
	patientName = "Пациент",
	patientCardNumber = "К-8492",
	doctorName = "Лечащий врач-ортодонт",
	clinicName = "Стоматологическая клиника",
	onSaveSuccess,
}: OrthodonticStudioModalProps) {
	// Active Tab inside Studio: "appliances" | "photos" | "diary" | "soap"
	const [activeTab, setActiveTab] = useState<StudioTab>("appliances");

	// Clinical State: Appliances, Wires, Elastics
	const [bracketSlot, setBracketSlot] = useState<BracketSlot>("0.022");
	const [bracketSystem, setBracketSystem] = useState<string>("damon_q2");
	const [archwireMaterial, setArchwireMaterial] = useState<ArchwireMaterial>("CuNiTi");
	const [archwireSection, setArchwireSection] = useState<ArchwireSection>(".016");
	const [targetArch, setTargetArch] = useState<TargetArch>("both");
	const [elasticScheme, setElasticScheme] = useState<string>("class_ii");
	const [elasticSize, setElasticSize] = useState<string>("kangaroo_1_4");
	const [elasticWear, setElasticWear] = useState<string>("22 часа/сутки");
	const [selectedActions, setSelectedActions] = useState<string[]>(["wire_change", "ligature_change"]);
	const [selectedTeeth, setSelectedTeeth] = useState<number[]>([
		16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26,
		46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36,
	]);
	const [powerChainSpan, setPowerChainSpan] = useState<string>("16-26");
	const [powerChainType, setPowerChainType] = useState<string>("short");
	const [code804n, setCode804n] = useState<string>("A16.07.048");
	const [notes, setNotes] = useState<string>("Плановый ортодонтический визит. Жалоб нет.");
	const [plateScrewTurns, setPlateScrewTurns] = useState<number>(1); // 1/4 оборота

	// Aligner State
	const [activeAttachmentPreset, setActiveAttachmentPreset] = useState<string | null>(null);
	const [alignerSetIssued, setAlignerSetIssued] = useState<{ count: number; days: number } | null>(null);

	// Angle Classification State
	const [angleClass, setAngleClass] = useState<AngleClass>("class_1");

	// 1-Click Fast Workhorse Archwire Handler
	const handleSelectWorkhorseWire = (wire: WorkhorseArchwireOption) => {
		setArchwireMaterial(wire.material);
		setArchwireSection(wire.section);
		if (!selectedActions.includes("wire_change")) {
			setSelectedActions((prev) => [...prev, "wire_change"]);
		}
		showToast(`Установлена рабочая дуга ${wire.label}`, "info");
	};

	// 1-Click Elastic Size Handler (Mandate 8e: zero dead disabled buttons)
	const handleElasticSizeInteraction = useCallback(() => {
		if (elasticScheme === "none") {
			setElasticScheme("class_ii");
			showToast("Схема эластиков: установлен «Класс II (по умолчанию)»", "info");
		}
	}, [elasticScheme]);

	// Photos state (Angle -> imageUrl)
	const [photos, setPhotos] = useState<Record<string, string>>({});
	const [isFullPhotoModalOpen, setIsFullPhotoModalOpen] = useState<boolean>(false);
	const [isCephModalOpen, setIsCephModalOpen] = useState<boolean>(false);

	const fileInputRef = useRef<HTMLInputElement | null>(null);
	const targetPhotoAngleRef = useRef<string | null>(null);

	// 1-Click Preset Handlers
	const handleApplyPreset = (presetId: string) => {
		const preset = ORTHODONTIC_QUICK_PRESETS.find((p) => p.id === presetId);
		if (!preset) return;

		setBracketSystem(preset.systemId);
		setTargetArch(preset.targetArch);
		if (preset.wireMaterial) setArchwireMaterial(preset.wireMaterial);
		if (preset.wireSection) setArchwireSection(preset.wireSection);
		setSelectedActions(preset.actions);
		if (preset.elasticScheme) setElasticScheme(preset.elasticScheme);
		if (preset.elasticSize) setElasticSize(preset.elasticSize);
		if (preset.elasticWear) setElasticWear(preset.elasticWear);
		if (preset.powerChainSpan) setPowerChainSpan(preset.powerChainSpan);
		if (preset.powerChainType) setPowerChainType(preset.powerChainType);
		if (preset.code804n) setCode804n(preset.code804n);
		if (preset.alignerSetIssued !== undefined) setAlignerSetIssued(preset.alignerSetIssued);
		if (preset.activeAttachmentPreset !== undefined) setActiveAttachmentPreset(preset.activeAttachmentPreset);
		setNotes(preset.notes);

		if (preset.teeth && preset.teeth.length > 0) {
			setSelectedTeeth(preset.teeth);
		} else if (preset.systemId === "removable_plate") {
			setSelectedTeeth([16, 11, 21, 26]);
		} else if (preset.targetArch === "upper") {
			setSelectedTeeth([17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27]);
		} else if (preset.targetArch === "lower") {
			setSelectedTeeth([47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37]);
		} else {
			setSelectedTeeth([
				17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27,
				47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37,
			]);
		}

		showToast(`Пресет «${preset.shortLabel}» применён в 1 клик`, "info");
	};

	// Aligner Attachment Handler
	const handleSelectAttachmentPreset = (presetId: string) => {
		const preset = ALIGNER_ATTACHMENT_PRESETS.find((p) => p.id === presetId);
		if (!preset) return;
		setActiveAttachmentPreset(presetId);
		setBracketSystem("aligners");
		setTargetArch("both");
		if (preset.teeth?.length) {
			setSelectedTeeth(preset.teeth);
		}
		setNotes(preset.description);
		showToast(`Аттачменты «${preset.shortLabel}» выбраны`, "info");
	};

	const handleIssueAlignerSet = (count: number, days: number) => {
		setAlignerSetIssued({ count, days });
		showToast(`Выдан сет элайнеров (${count} каппы на ${days} дн.)`, "success");
	};

	// Photo Upload Handlers
	const handleUploadPhoto = (angleId: string, file: File) => {
		const reader = new FileReader();
		reader.onload = (e) => {
			const url = e.target?.result as string;
			setPhotos((prev) => ({ ...prev, [angleId]: url }));
			showToast("Фото ракурса прикреплено", "success");
		};
		reader.readAsDataURL(file);
	};

	const triggerPhotoUpload = (angleId: string) => {
		targetPhotoAngleRef.current = angleId;
		fileInputRef.current?.click();
	};

	const handleDeletePhoto = (angleId: string, e: React.MouseEvent) => {
		e.stopPropagation();
		setPhotos((prev) => {
			const next = { ...prev };
			delete next[angleId];
			return next;
		});
	};

	// FDI Formula toggles
	const handleToggleTooth = (tooth: number) => {
		setSelectedTeeth((prev) =>
			prev.includes(tooth) ? prev.filter((t) => t !== tooth) : [...prev, tooth].sort((a, b) => a - b),
		);
	};

	const handleSelectArch = (arch: TargetArch) => {
		setTargetArch(arch);
		if (arch === "upper") {
			setSelectedTeeth([17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27]);
		} else if (arch === "lower") {
			setSelectedTeeth([47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37]);
		} else {
			setSelectedTeeth([
				17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27,
				47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37,
			]);
		}
	};

	// Generate Statutory Protocol (Form 043/u)
	const generatedProtocol = useMemo(() => {
		return generateOrthodonticSoapNote({
			patientName,
			bracketSlot,
			bracketSystem,
			archwireMaterial,
			archwireSection,
			targetArch,
			elasticScheme,
			elasticSize,
			elasticWear,
			selectedActions,
			selectedTeeth,
			powerChainSpan,
			powerChainType,
			code804n,
			notes,
			activeAttachmentPreset,
			alignerSetIssued,
			plateActivationTurns: plateScrewTurns,
			angleClass,
		});
	}, [
		patientName,
		bracketSlot,
		bracketSystem,
		archwireMaterial,
		archwireSection,
		targetArch,
		elasticScheme,
		elasticSize,
		elasticWear,
		selectedActions,
		selectedTeeth,
		powerChainSpan,
		powerChainType,
		code804n,
		notes,
		activeAttachmentPreset,
		alignerSetIssued,
		plateScrewTurns,
		angleClass,
	]);

	// Apply into Form 043/u (Mandate 8e: zero friction)
	const handleApplyToVisitNote = () => {
		try {
			const bracketSystemLabel = BRACKET_SYSTEMS.find((b) => b.id === bracketSystem)?.label || "Ортодонтическая аппаратура";
			const setVisitNoteForm = useVisitStore.getState().setVisitNoteForm;
			if (setVisitNoteForm) {
				setVisitNoteForm((prev) => ({
					...prev,
					complaint: prev.complaint
						? `${prev.complaint}\n\n[Ортодонтия] ${notes}`
						: `Плановый ортодонтический визит. ${notes}`,
					objectiveStatus: prev.objectiveStatus
						? `${prev.objectiveStatus}\n\n${generatedProtocol}`
						: generatedProtocol,
					treatmentPlan: prev.treatmentPlan
						? `${prev.treatmentPlan}\n\n[Ортодонтия] ${bracketSystemLabel}: Номенклатура ${code804n || "A16.07.048"}`
						: `[Ортодонтия] ${bracketSystemLabel}: Номенклатура ${code804n || "A16.07.048"}`,
				}));
			}

			if (typeof window !== "undefined") {
				window.dispatchEvent(
					new CustomEvent("dente-apply-soap-protocol", {
						detail: {
							protocolText: generatedProtocol,
							title: `Ортодонтия (${bracketSystemLabel})`,
							angleClass,
							soap: {
								complaint: notes || "Плановый визит по графику ортодонтического лечения. Жалоб нет.",
								objective: generatedProtocol,
								treatmentPlan: `Ортодонтическая коррекция (${bracketSystemLabel}) — Номенклатура 804н: ${code804n || "A16.07.048"}`,
								recommendations: "Соблюдение правил гигиены, ношение аппаратуры/эластиков по назначенной схеме.",
								diagnosisIcd10: "К07.2",
							},
							mode: "smart_append",
							immediate: true,
						},
					}),
				);
			}

			if (navigator?.clipboard?.writeText) {
				navigator.clipboard.writeText(generatedProtocol).catch(() => {});
			}

			showToast("Ортодонтический протокол сохранен в карту 043/у", "success");
			onSaveSuccess?.();
			onClose();
		} catch (_err) {
			if (navigator?.clipboard?.writeText) {
				navigator.clipboard.writeText(generatedProtocol).catch(() => {});
			}
			showToast("Протокол скопирован в буфер обмена", "info");
		}
	};

	const handleCopyClipboard = () => {
		if (navigator?.clipboard?.writeText) {
			navigator.clipboard.writeText(generatedProtocol).then(() => {
				showToast("Протокол 043/у скопирован в буфер обмена", "success");
			}).catch(() => {
				showToast("Не удалось скопировать", "error");
			});
		}
	};

	const photosCount = Object.keys(photos).length;

	if (!isOpen) return null;

	// Sequential isolated rendering for submodals: Strict Anti-Matryoshka Law (depth strictly 1)
	if (isFullPhotoModalOpen) {
		return (
			<OrthoPhotoProtocolModal
				isOpen={isFullPhotoModalOpen}
				onClose={() => setIsFullPhotoModalOpen(false)}
				patientId={patientId}
				patientName={patientName}
				doctorName={doctorName}
				clinicName={clinicName}
			/>
		);
	}

	if (isCephModalOpen) {
		return (
			<CephalometricAnalysisModal
				isOpen={isCephModalOpen}
				onClose={() => setIsCephModalOpen(false)}
				patientId={patientId}
				patientName={patientName}
			/>
		);
	}

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto"
			role="dialog"
			aria-modal="true"
			aria-labelledby="ortho-studio-title"
			data-testid="orthodontic-studio-modal"
		>
			{/* Hidden file input */}
			<input
				type="file"
				ref={fileInputRef}
				accept="image/*"
				className="hidden"
				onChange={(e) => {
					const file = e.target.files?.[0];
					if (file && targetPhotoAngleRef.current) {
						handleUploadPhoto(targetPhotoAngleRef.current, file);
					}
					if (fileInputRef.current) fileInputRef.current.value = "";
				}}
			/>

			<div className="relative w-full max-w-6xl bg-[var(--paper,#ffffff)] dark:bg-slate-900 border border-[var(--line,#e2e8f0)] dark:border-slate-800 rounded-2xl shadow-2xl flex flex-col max-h-[95vh] overflow-hidden">
				{/* 1. Studio Header */}
				<div className="flex items-center justify-between px-4 sm:px-5 py-3 bg-[var(--surface,#f8fafc)] dark:bg-slate-800/80 border-b border-[var(--line,#e2e8f0)] dark:border-slate-800 shrink-0">
					<div className="flex items-center gap-3">
						<div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/30">
							<Sparkles size={18} />
						</div>
						<div>
							<h2 id="ortho-studio-title" className="text-base sm:text-lg font-black text-[var(--ink,#0f172a)] dark:text-white m-0">
								Ортодонтический кабинет
							</h2>
							<div className="flex items-center gap-2 text-xs text-[var(--muted,#64748b)] dark:text-slate-400 m-0">
								<span>Пациент: <strong className="text-[var(--ink,#0f172a)] dark:text-slate-200">{patientName}</strong></span>
								<span>•</span>
								<span>Врач: {doctorName}</span>
								<span>•</span>
								<span className="font-semibold text-teal-600 dark:text-teal-400">
									{bracketSystem === "aligners" ? "Элайнеры" : bracketSystem === "removable_plate" ? "Пластинка" : "Брекеты"}
								</span>
							</div>
						</div>
					</div>

					<div className="flex items-center gap-2">
						<button
							type="button"
							onClick={handleApplyToVisitNote}
							className="min-h-[44px] px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
							data-testid="apply-studio-to-043-btn"
							title="Вставить протокол в карту 043/у без визардов"
						>
							<CheckCircle2 size={16} />
							<span>В карту 043/у</span>
						</button>

						<button
							type="button"
							onClick={onClose}
							className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-[var(--surface,#f1f5f9)] dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] dark:hover:text-white transition-colors cursor-pointer"
							aria-label="Закрыть"
						>
							<X size={18} />
						</button>
					</div>
				</div>

				{/* 2. Studio Navigation Toolbar: [Осмотр (StomX)] | [Аппаратура & Активация] | [Фотопротокол] | [Протокол 043/у] | [ТРГ] (Mandate 8d: 1 row 32-36px toolbar) */}
				<div className="h-9 min-h-[36px] max-h-[36px] flex items-center justify-between px-4 py-0 bg-[var(--surface-soft,#f1f5f9)] dark:bg-slate-900 border-b border-[var(--line,#e2e8f0)] dark:border-slate-800 gap-2 overflow-x-auto whitespace-nowrap shrink-0 flex-nowrap">
					<div className="flex items-center gap-1 bg-[var(--paper,#ffffff)] dark:bg-slate-800 p-0.5 rounded-lg border border-[var(--line,#e2e8f0)] dark:border-slate-700 shrink-0">
						<button
							type="button"
							onClick={() => setActiveTab("examination")}
							className={`h-7 px-3 py-1 rounded-md text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
								activeTab === "examination"
									? "bg-amber-500 text-white shadow-xs font-black"
									: "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] dark:hover:text-white"
							}`}
						>
							<ClipboardList size={13} />
							<span>Осмотр & Диагностика (StomX)</span>
						</button>

						<button
							type="button"
							onClick={() => setActiveTab("appliances")}
							className={`h-7 px-3 py-1 rounded-md text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
								activeTab === "appliances"
									? "bg-amber-500 text-white shadow-xs font-black"
									: "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] dark:hover:text-white"
							}`}
						>
							<Sliders size={13} />
							<span>Аппаратура & Активация</span>
						</button>

						<button
							type="button"
							onClick={() => setActiveTab("photos")}
							className={`h-7 px-3 py-1 rounded-md text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
								activeTab === "photos"
									? "bg-amber-500 text-white shadow-xs font-black"
									: "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] dark:hover:text-white"
							}`}
						>
							<Camera size={13} />
							<span>Фотопротокол ({photosCount}/8)</span>
						</button>

						<button
							type="button"
							onClick={() => setActiveTab("diary")}
							className={`h-7 px-3 py-1 rounded-md text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
								activeTab === "diary" || activeTab === "soap"
									? "bg-amber-500 text-white shadow-xs font-black"
									: "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] dark:hover:text-white"
							}`}
						>
							<FileText size={13} />
							<span>Дневник 043/у</span>
						</button>
					</div>

					{/* Tier 3 Specialized Tool: Lateral Ceph TRG Analysis */}
					<div className="flex items-center gap-2 shrink-0">
						<button
							type="button"
							onClick={() => setIsCephModalOpen(true)}
							className="h-7 px-3 py-1 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer shrink-0"
							title="Открыть цефалометрический расчет боковой ТРГ (Штайнер, Твид)"
							data-testid="open-trg-analysis-btn"
						>
							<Activity size={13} />
							<span>Расчет ТРГ (Цефалометрия)</span>
						</button>
					</div>
				</div>

				{/* 3. Studio Main Content */}
				<div className="flex-1 overflow-y-auto p-4 sm:p-5">
					{/* TAB 0: ORTHODONTIC EXAMINATION & FORM 043/U DIAGNOSTICS (STOMX TAXONOMY) */}
					{activeTab === "examination" && (
						<div className="flex flex-col gap-4">
							<OrthodonticExaminationCard
								patientId={patientId}
								patientName={patientName}
								cardNumber={patientCardNumber}
								doctorName={doctorName}
								onProtocolGenerated={(protocolText) => {
									setNotes((prev) => (prev ? `${prev}\n\n${protocolText}` : protocolText));
									setActiveTab("diary");
									showToast("Протокол перенесен в дневник", "success");
								}}
							/>
						</div>
					)}

					{/* TAB 1: APPLIANCES & ACTIVATION */}
					{activeTab === "appliances" && (
						<div className="flex flex-col gap-4">
							{/* 1-Click Fast Ortho Presets (Mandates 8e, 8k) */}
							<div className="bg-amber-500/10 dark:bg-amber-950/30 p-3.5 rounded-xl border border-amber-500/30 flex flex-col gap-2">
								<div className="flex items-center justify-between flex-wrap gap-1">
									<span className="text-xs font-black uppercase tracking-wider text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
										<Zap size={14} className="text-amber-600 dark:text-amber-400 fill-amber-500" />
										Быстрые клинические пресеты (1 клик)
									</span>
									<span className="text-[11px] font-bold text-amber-700/80 dark:text-amber-400/80">
										Автозаполнение параметров и дневника 043/у
									</span>
								</div>

								<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
									{ORTHODONTIC_QUICK_PRESETS.map((p) => (
										<button
											key={p.id}
											type="button"
											onClick={() => handleApplyPreset(p.id)}
											className="min-h-[44px] p-2.5 rounded-xl border border-amber-500/30 hover:border-amber-500 bg-white dark:bg-slate-900 text-left flex items-center gap-2.5 transition-all cursor-pointer hover:shadow-xs active:scale-98"
										>
											<div className="w-7 h-7 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
												<Zap size={13} />
											</div>
											<div className="min-w-0 flex-1">
												<div className="text-xs font-bold leading-tight text-slate-900 dark:text-white truncate">
													{p.shortLabel}
												</div>
												<div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
													{p.label}
												</div>
											</div>
										</button>
									))}
								</div>
							</div>

							{/* 1-Click Angle Malocclusion Classification Bar (I, II/1, II/2, III) */}
							<div
								data-testid="studio-angle-class-selector"
								className="bg-[var(--surface,#f8fafc)] dark:bg-slate-800/40 p-3 rounded-xl border border-[var(--line,#e2e8f0)] dark:border-slate-800 flex flex-col gap-2"
							>
								<div className="flex items-center justify-between">
									<span className="text-xs font-black uppercase tracking-wider text-[var(--muted,#64748b)] dark:text-slate-400 flex items-center gap-1.5">
										<Activity size={14} className="text-blue-500" />
										Прикус по Энглю (1-клик фиксация)
									</span>
									<span className="text-[11px] font-bold text-blue-600 dark:text-blue-400">
										{ANGLE_CLASS_OPTIONS.find((a) => a.id === angleClass)?.shortLabel}
									</span>
								</div>

								<div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
									{ANGLE_CLASS_OPTIONS.map((opt) => {
										const isSelected = angleClass === opt.id;
										return (
											<button
												key={opt.id}
												type="button"
												onClick={() => setAngleClass(opt.id)}
												data-testid={`studio-angle-${opt.id}-btn`}
												className={`min-h-[44px] px-2 py-1.5 rounded-xl border text-center flex flex-col items-center justify-center transition-all cursor-pointer ${
													isSelected
														? "bg-blue-600 text-white border-blue-700 font-black shadow-xs ring-1 ring-blue-400"
														: "bg-[var(--paper,#ffffff)] dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50"
												}`}
												title={opt.desc}
											>
												<span className="text-xs font-bold leading-tight">{opt.shortLabel}</span>
												<span className={`text-[10px] truncate w-full ${isSelected ? "text-blue-100" : "text-slate-400"}`}>
													{opt.id === "class_1" ? "Нейтральный" : opt.id === "class_2_div_1" ? "Протрузия" : opt.id === "class_2_div_2" ? "Ретрузия" : "Мезиальный"}
												</span>
											</button>
										);
									})}
								</div>
							</div>

							{/* Apparatus Type & System Selector */}
							<div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
								{/* System */}
								<div className="sm:col-span-2">
									<span className="block text-xs font-black uppercase tracking-wider text-[var(--muted,#64748b)] dark:text-slate-400 mb-1.5">
										Ортодонтический аппарат / система
									</span>
									<select
										aria-label="Выбор ортодонтической системы"
										value={bracketSystem}
										onChange={(e) => setBracketSystem(e.target.value)}
										className="w-full min-h-[44px] px-3 py-2 bg-[var(--paper,#ffffff)] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-[var(--ink,#0f172a)] dark:text-slate-100 outline-none focus:border-amber-500 cursor-pointer"
									>
										{BRACKET_SYSTEMS.map((s) => (
											<option key={s.id} value={s.id}>
												{s.label} ({s.desc})
											</option>
										))}
									</select>
								</div>

								{/* Bracket Slot (0.018 vs 0.022) */}
								<div>
									<span className="block text-xs font-black uppercase tracking-wider text-[var(--muted,#64748b)] dark:text-slate-400 mb-1.5">
										Паз брекетов
									</span>
									<div className="grid grid-cols-2 gap-2">
										<button
											type="button"
											onClick={() => setBracketSlot("0.018")}
											className={`min-h-[44px] px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer flex flex-col items-center justify-center ${
												bracketSlot === "0.018"
													? "bg-amber-500/15 border-amber-500 text-amber-700 dark:text-amber-300 font-black"
													: "bg-[var(--paper,#ffffff)] dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
											}`}
										>
											<span className="text-sm">0.018"</span>
											<span className="text-[10px] text-slate-500">Низкое трение</span>
										</button>
										<button
											type="button"
											onClick={() => setBracketSlot("0.022")}
											className={`min-h-[44px] px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer flex flex-col items-center justify-center ${
												bracketSlot === "0.022"
													? "bg-amber-500/15 border-amber-500 text-amber-700 dark:text-amber-300 font-black"
													: "bg-[var(--paper,#ffffff)] dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
											}`}
										>
											<span className="text-sm">0.022"</span>
											<span className="text-[10px] text-slate-500">Стандарт MBT</span>
										</button>
									</div>
								</div>
							</div>

							{/* Wires & Sections (if fixed braces) */}
							{bracketSystem !== "aligners" && bracketSystem !== "removable_plate" && (
								<div className="p-3.5 rounded-xl bg-[var(--surface,#f8fafc)] dark:bg-slate-800/40 border border-[var(--line,#e2e8f0)] dark:border-slate-800 flex flex-col gap-3">
									<div className="flex items-center justify-between">
										<span className="text-xs font-black uppercase tracking-wider text-[var(--muted,#64748b)] dark:text-slate-400">
											Дуга: материал и сечение
										</span>
										<span className="text-xs font-bold text-amber-600 dark:text-amber-400">
											Выбрано: {archwireMaterial} {archwireSection}" ({targetArch === "upper" ? "ВЧ" : targetArch === "lower" ? "НЧ" : "ВЧ+НЧ"})
										</span>
									</div>

									{/* Wire Material */}
									<div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
										{ARCHWIRE_MATERIALS.map((mat) => {
											const isSelected = archwireMaterial === mat.id;
											return (
												<button
													key={mat.id}
													type="button"
													onClick={() => setArchwireMaterial(mat.id)}
													className={`min-h-[44px] px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer flex flex-col items-center justify-center ${
														isSelected
															? "bg-teal-500/20 border-teal-500 text-teal-800 dark:text-teal-300 font-black"
															: "bg-[var(--paper,#ffffff)] dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
													}`}
												>
													<span className="text-sm">{mat.badge}</span>
													<span className="text-[10px] text-slate-500 truncate w-full text-center">{mat.label}</span>
												</button>
											);
										})}
									</div>

									{/* Wire Section: Round & Rectangular */}
									<div className="flex flex-col gap-1.5">
										<div className="flex items-center gap-1.5 flex-wrap">
											<span className="text-[11px] font-bold text-slate-400 w-16 shrink-0">Круглые:</span>
											{ROUND_SECTIONS.map((sec) => (
												<button
													key={sec}
													type="button"
													onClick={() => setArchwireSection(sec)}
													className={`min-h-[34px] px-2.5 py-1 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
														archwireSection === sec
															? "bg-amber-500 text-white border-amber-600 font-black shadow-xs"
															: "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
													}`}
												>
													{sec}"
												</button>
											))}
										</div>

										<div className="flex items-center gap-1.5 flex-wrap">
											<span className="text-[11px] font-bold text-slate-400 w-16 shrink-0">Прямоуг.:</span>
											{RECT_SECTIONS.map((sec) => (
												<button
													key={sec}
													type="button"
													onClick={() => setArchwireSection(sec)}
													className={`min-h-[34px] px-2.5 py-1 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
														archwireSection === sec
															? "bg-amber-500 text-white border-amber-600 font-black shadow-xs"
															: "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
													}`}
												>
													{sec}"
												</button>
											))}
										</div>

										{/* Canonical Workhorse Archwires Strip (1-click fast wires) */}
										<div
											data-testid="studio-workhorse-wires-strip"
											className="mt-1 p-2 rounded-xl bg-teal-500/10 dark:bg-teal-950/30 border border-teal-500/30 flex flex-col gap-1.5"
										>
											<div className="flex items-center justify-between">
												<span className="text-[11px] font-black uppercase tracking-wider text-teal-800 dark:text-teal-300 flex items-center gap-1">
													<Zap size={13} className="text-teal-600 dark:text-teal-400" />
													Рабочие дуги ортодонта (1 клик)
												</span>
												<span className="text-[10px] text-teal-700/80 dark:text-teal-400/80 font-bold">
													Мгновенный выбор
												</span>
											</div>

											<div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
												{WORKHORSE_ARCHWIRES.map((wire) => {
													const isSelected = archwireMaterial === wire.material && archwireSection === wire.section;
													return (
														<button
															key={wire.id}
															type="button"
															onClick={() => handleSelectWorkhorseWire(wire)}
															data-testid={`studio-wire-${wire.id}-btn`}
															className={`min-h-[44px] px-2 py-1 rounded-lg border text-left flex flex-col justify-center transition-all cursor-pointer ${
																isSelected
																	? "bg-teal-600 text-white border-teal-700 font-black shadow-xs ring-1 ring-teal-400"
																	: "bg-white dark:bg-slate-900 border-teal-300/60 dark:border-teal-800 hover:border-teal-500 text-slate-800 dark:text-slate-100"
															}`}
															title={wire.desc}
														>
															<span className="text-xs font-bold leading-tight">{wire.label}</span>
															<span className={`text-[10px] truncate ${isSelected ? "text-teal-100" : "text-slate-500 dark:text-slate-400"}`}>
																{wire.material === "SS" ? "Рабочая сталь" : "Нивелирование"}
															</span>
														</button>
													);
												})}
											</div>
										</div>
									</div>
								</div>
							)}

							{/* Removable Plate Activation Panel (if Plate) */}
							{bracketSystem === "removable_plate" && (
								<div className="p-3.5 rounded-xl bg-teal-50/70 dark:bg-teal-950/30 border border-teal-200/80 dark:border-teal-800/50 flex flex-col gap-2.5">
									<div className="flex items-center justify-between">
										<span className="text-xs font-black uppercase tracking-wider text-teal-900 dark:text-teal-300 flex items-center gap-1.5">
											<RotateCw size={14} className="text-teal-600" />
											Активация расширяющего винта пластинки
										</span>
										<span className="text-xs font-bold text-teal-700 dark:text-teal-400">
											{(plateScrewTurns * 0.25).toFixed(2)} мм расширения
										</span>
									</div>
									<div className="flex items-center gap-2">
										<button
											type="button"
											onClick={() => setPlateScrewTurns(1)}
											className={`min-h-[38px] px-3 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
												plateScrewTurns === 1
													? "bg-teal-600 text-white border-teal-700"
													: "bg-white dark:bg-slate-900 border-teal-300 text-teal-800 dark:text-teal-200"
											}`}
										>
											1/4 оборота (+0.25 мм)
										</button>
										<button
											type="button"
											onClick={() => setPlateScrewTurns(2)}
											className={`min-h-[38px] px-3 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
												plateScrewTurns === 2
													? "bg-teal-600 text-white border-teal-700"
													: "bg-white dark:bg-slate-900 border-teal-300 text-teal-800 dark:text-teal-200"
											}`}
										>
											2/4 оборота (+0.50 мм)
										</button>
									</div>
								</div>
							)}

							{/* Aligner Attachments & Sets (if Aligners) */}
							{bracketSystem === "aligners" && (
								<div className="p-3.5 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-800/50 flex flex-col gap-2.5">
									<span className="text-xs font-black uppercase tracking-wider text-indigo-900 dark:text-indigo-300 flex items-center gap-1.5">
										<Sparkles size={14} className="text-indigo-600" />
										Аттачменты элайнеров (1 клик)
									</span>
									<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
										{ALIGNER_ATTACHMENT_PRESETS.map((p) => (
											<button
												key={p.id}
												type="button"
												onClick={() => handleSelectAttachmentPreset(p.id)}
												className={`min-h-[44px] p-2.5 rounded-xl border text-left flex items-start gap-2 transition-all cursor-pointer ${
													activeAttachmentPreset === p.id
														? "bg-indigo-600 text-white border-indigo-700 font-bold"
														: "bg-white dark:bg-slate-900 border-indigo-200 text-slate-800 dark:text-slate-100"
												}`}
											>
												<div className="min-w-0 flex-1">
													<div className="text-xs font-bold leading-tight">{p.shortLabel}</div>
													<div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{p.label}</div>
												</div>
											</button>
										))}
									</div>
									<div className="flex items-center gap-2 pt-1">
										<button
											type="button"
											onClick={() => handleIssueAlignerSet(2, 14)}
											className="min-h-[38px] px-3 py-1.5 text-xs font-bold rounded-lg border bg-white dark:bg-slate-900 border-teal-300 text-teal-800 dark:text-teal-300 cursor-pointer"
										>
											+ Сет 2 каппы (14 дн.)
										</button>
										<button
											type="button"
											onClick={() => handleIssueAlignerSet(4, 28)}
											className="min-h-[38px] px-3 py-1.5 text-xs font-bold rounded-lg border bg-white dark:bg-slate-900 border-teal-300 text-teal-800 dark:text-teal-300 cursor-pointer"
										>
											+ Сет 4 каппы (28 дн.)
										</button>
									</div>
								</div>
							)}

							{/* Intermaxillary Elastics */}
							<div className="p-3.5 rounded-xl bg-[var(--surface,#f8fafc)] dark:bg-slate-800/40 border border-[var(--line,#e2e8f0)] dark:border-slate-800 flex flex-col gap-2">
								<span className="text-xs font-black uppercase tracking-wider text-[var(--muted,#64748b)] dark:text-slate-400 flex items-center gap-1.5">
									<Zap size={14} className="text-purple-500" />
									Межчелюстные эластики (тяга)
								</span>
								<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
									<select
										aria-label="Схема эластиков"
										value={elasticScheme}
										onChange={(e) => setElasticScheme(e.target.value)}
										className="min-h-[38px] px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-[var(--ink,#0f172a)] dark:text-slate-100 outline-none"
									>
										{ELASTIC_SCHEMES.map((e) => (
											<option key={e.id} value={e.id}>
												{e.label}
											</option>
										))}
									</select>
									<select
										aria-label="Размер эластиков"
										disabled={false}
										value={elasticSize}
										onClick={handleElasticSizeInteraction}
										onFocus={handleElasticSizeInteraction}
										onChange={(e) => {
											handleElasticSizeInteraction();
											setElasticSize(e.target.value);
										}}
										className="min-h-[38px] px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-[var(--ink,#0f172a)] dark:text-slate-100 outline-none"
									>
										{ELASTIC_SIZES.map((s) => (
											<option key={s.id} value={s.id}>
												{s.label} ({s.strength})
											</option>
										))}
									</select>
								</div>
							</div>

							{/* FDI Formula */}
							<div className="p-3.5 rounded-xl bg-[var(--surface,#f8fafc)] dark:bg-slate-800/40 border border-[var(--line,#e2e8f0)] dark:border-slate-800">
								<div className="flex items-center justify-between mb-2">
									<span className="text-xs font-black uppercase tracking-wider text-[var(--muted,#64748b)] dark:text-slate-400 flex items-center gap-1.5">
										<Layers size={14} />
										Зубная формула (зона фиксации/активации)
									</span>
									<div className="flex items-center gap-1">
										<button
											type="button"
											onClick={() => handleSelectArch("upper")}
											className="px-2 py-1 text-[11px] font-bold rounded border bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-300 cursor-pointer"
										>
											Вся ВЧ
										</button>
										<button
											type="button"
											onClick={() => handleSelectArch("lower")}
											className="px-2 py-1 text-[11px] font-bold rounded border bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-300 cursor-pointer"
										>
											Вся НЧ
										</button>
										<button
											type="button"
											onClick={() => handleSelectArch("both")}
											className="px-2 py-1 text-[11px] font-bold rounded border bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-300 cursor-pointer"
										>
											Обе
										</button>
										<button
											type="button"
											onClick={() => setSelectedTeeth(ANTERIOR_TEETH)}
											className="px-2 py-1 text-[11px] font-bold rounded border bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-300 cursor-pointer"
										>
											Фронт
										</button>
									</div>
								</div>

								{/* Upper row */}
								<div className="flex items-center justify-center gap-0.5 overflow-x-auto py-0.5">
									{UPPER_TEETH.map((tooth, idx) => {
										const isSelected = selectedTeeth.includes(tooth);
										const isMidline = idx === 7;
										return (
											<React.Fragment key={tooth}>
												<button
													type="button"
													onClick={() => handleToggleTooth(tooth)}
													className={`w-7 h-7 sm:w-8 sm:h-8 text-xs font-bold rounded flex items-center justify-center transition-all cursor-pointer ${
														isSelected
															? "bg-blue-600 text-white font-black"
															: "bg-white dark:bg-slate-900 border border-slate-200 text-slate-700 dark:text-slate-300"
													}`}
												>
													{tooth}
												</button>
												{isMidline && <div className="w-1.5 h-6 bg-slate-300 dark:bg-slate-700 mx-0.5" />}
											</React.Fragment>
										);
									})}
								</div>

								{/* Lower row */}
								<div className="flex items-center justify-center gap-0.5 overflow-x-auto py-0.5 mt-1">
									{LOWER_TEETH.map((tooth, idx) => {
										const isSelected = selectedTeeth.includes(tooth);
										const isMidline = idx === 7;
										return (
											<React.Fragment key={tooth}>
												<button
													type="button"
													onClick={() => handleToggleTooth(tooth)}
													className={`w-7 h-7 sm:w-8 sm:h-8 text-xs font-bold rounded flex items-center justify-center transition-all cursor-pointer ${
														isSelected
															? "bg-blue-600 text-white font-black"
															: "bg-white dark:bg-slate-900 border border-slate-200 text-slate-700 dark:text-slate-300"
													}`}
												>
													{tooth}
												</button>
												{isMidline && <div className="w-1.5 h-6 bg-slate-300 dark:bg-slate-700 mx-0.5" />}
											</React.Fragment>
										);
									})}
								</div>
							</div>
						</div>
					)}

					{/* TAB 2: PHOTO PROTOCOL (ZERO BLOCKERS) */}
					{activeTab === "photos" && (
						<div className="flex flex-col gap-4">
							<div className="flex items-center justify-between flex-wrap gap-2">
								<div>
									<h3 className="text-sm font-bold text-slate-900 dark:text-white m-0">
										Стандартный фотопротокол (8 ракурсов)
									</h3>
									<p className="text-xs text-slate-500 m-0">
										Прикрепление снимков в 1 клик · Сохранение доступно при любом числе фото
									</p>
								</div>

								<button
									type="button"
									onClick={() => setIsFullPhotoModalOpen(true)}
									className="min-h-[38px] px-3 py-1.5 rounded-xl bg-[var(--surface,#f1f5f9)] dark:bg-slate-800 hover:bg-slate-200 text-slate-800 dark:text-slate-200 text-xs font-bold border border-slate-300 dark:border-slate-700 flex items-center gap-1.5 cursor-pointer"
								>
									<Camera size={14} />
									<span>Развернутая фотосетка & калибровка</span>
								</button>
							</div>

							{/* 8 Photo Slots Grid */}
							<div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
								{ORTHODONTIC_8_ANGLES.map((angle) => {
									const imgUrl = photos[angle.id];
									const hasPhoto = Boolean(imgUrl);

									return (
										<div
											key={angle.id}
											className="flex flex-col rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-2xs"
										>
											<div className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
												<span className="font-bold text-slate-800 dark:text-slate-200 truncate">
													{angle.shortLabelRu}
												</span>
												<span className="text-[10px] text-slate-400">
													{angle.category === "extraoral" ? "Лицо" : "Окклюзия"}
												</span>
											</div>

											<div
												className="h-32 bg-slate-950 flex items-center justify-center relative cursor-pointer group"
												onClick={() => triggerPhotoUpload(angle.id)}
											>
												{hasPhoto ? (
													<>
														<img
															src={imgUrl}
															alt={angle.titleRu}
															className="w-full h-full object-cover"
														/>
														<button
															type="button"
															onClick={(e) => handleDeletePhoto(angle.id, e)}
															className="absolute top-1.5 right-1.5 w-6 h-6 rounded-md bg-rose-600 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
															title="Удалить снимок"
														>
															<Trash2 size={12} />
														</button>
													</>
												) : (
													<div className="text-center p-2 flex flex-col items-center">
														<UploadCloud size={22} className="text-slate-500 mb-1" />
														<span className="text-[11px] text-slate-400 font-medium">
															Загрузить кадр
														</span>
													</div>
												)}
											</div>
										</div>
									);
								})}
							</div>
						</div>
					)}

					{/* TAB 3: CLINICAL DIARY FORM 043/U */}
					{(activeTab === "diary" || activeTab === "soap") && (
						<div className="flex flex-col gap-3">
							<div className="flex items-center justify-between">
								<span className="text-xs font-black uppercase tracking-wider text-[var(--muted,#64748b)] dark:text-slate-400 flex items-center gap-1.5">
									<FileText size={15} className="text-amber-500" />
									Протокол карты 043/у
								</span>
								<button
									type="button"
									onClick={handleCopyClipboard}
									className="min-h-[34px] px-3 py-1 text-xs font-bold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center gap-1.5 cursor-pointer"
								>
									<Copy size={13} />
									<span>Копировать</span>
								</button>
							</div>

							<div className="min-h-[320px] max-h-[460px] p-3 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-mono text-xs text-slate-800 dark:text-slate-200 overflow-y-auto whitespace-pre-wrap leading-relaxed shadow-inner">
								{generatedProtocol}
							</div>
						</div>
					)}
				</div>

				{/* 4. Studio Footer */}
				<div className="flex items-center justify-between px-4 sm:px-5 py-3 bg-[var(--surface,#f8fafc)] dark:bg-slate-800/80 border-t border-[var(--line,#e2e8f0)] dark:border-slate-800 shrink-0 gap-3">
					<div className="text-xs text-slate-500 dark:text-slate-400">
						Автономия врача · Свобода сохранения черновиков
					</div>

					<div className="flex items-center gap-2">
						<button
							type="button"
							onClick={onClose}
							className="min-h-[44px] px-4 py-2 rounded-xl bg-[var(--surface,#f1f5f9)] dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-bold text-xs cursor-pointer transition-colors"
						>
							Закрыть
						</button>

						<button
							type="button"
							onClick={handleApplyToVisitNote}
							className="min-h-[44px] px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs sm:text-sm flex items-center gap-2 shadow-md transition-all cursor-pointer"
						>
							<Check size={16} />
							<span>Вставить в дневник 043/у (1 клик)</span>
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}

export default OrthodonticStudioModal;
