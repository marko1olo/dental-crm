import React, { useState, useEffect, useMemo } from "react";
import {
	Activity,
	AlertTriangle,
	Check,
	Coins,
	FileText,
	History,
	Layers,
	ShieldCheck,
	Sparkles,
	X,
} from "lucide-react";
import {
	type ToothData,
	type ToothState,
	TOOTH_STATE_LABELS,
} from "./ToothChart";
import { type FurcationGrade } from "./anatomicalToothGeometries";
import {
	getToothFolkAndAnatomicalNameRu,
	getToothAnatomicalNameRu,
} from "../../lib/clinicalProtocols043";
import { ORDER_804N_PROCEDURES } from "./OdontogramLiveInvoice";
import { showToast } from "../GlobalToast";
import { SoundFeedbackService } from "../../services/audio/SoundFeedbackService";

export interface ToothCardModalProps {
	isOpen: boolean;
	onClose: () => void;
	toothNumber: number;
	toothData?: ToothData | undefined;
	onUpdateTooth?: ((toothNumber: number, updates: Partial<ToothData>) => void) | undefined;
	onOpenHistory?: ((toothNumber: number) => void) | undefined;
	onOpenEndo?: ((toothNumber: number) => void) | undefined;
	className?: string | undefined;
}

const AVAILABLE_SURFACES = [
	{ code: "O", name: "Окклюзионная (O)", desc: "Жевательная поверхность" },
	{ code: "M", name: "Медиальная (M)", desc: "Передняя контактная грань" },
	{ code: "D", name: "Дистальная (D)", desc: "Задняя контактная грань" },
	{ code: "V", name: "Вестибулярная (V)", desc: "Щёчная / губная грань" },
	{ code: "L", name: "Язычная / Нёбная (L/P)", desc: "Внутренняя грань" },
	{ code: "K", name: "Контактная (К)", desc: "Аппроксимальная поверхность" },
	{ code: "A", name: "Апикальная (А)", desc: "Пришеечная / корневая область" },
] as const;

export const ToothCardModal: React.FC<ToothCardModalProps> = ({
	isOpen,
	onClose,
	toothNumber,
	toothData,
	onUpdateTooth,
	onOpenHistory,
	onOpenEndo,
	className = "",
}) => {
	const [currentState, setCurrentState] = useState<ToothState>(toothData?.state ?? "Healthy");
	const [selectedSurfaces, setSelectedSurfaces] = useState<string[]>(
		toothData?.surfaces ? [...toothData.surfaces] : [],
	);
	const [mobility, setMobility] = useState<0 | 1 | 2 | 3>(
		(toothData?.mobility ?? 0) as 0 | 1 | 2 | 3,
	);
	const [boneLoss, setBoneLoss] = useState<0 | 1 | 2 | 3>(
		(toothData?.boneLossLevel ?? 0) as 0 | 1 | 2 | 3,
	);
	const [furcation, setFurcation] = useState<FurcationGrade>(
		(toothData?.furcationGrade ?? 0) as FurcationGrade,
	);

	useEffect(() => {
		if (toothData) {
			setCurrentState(toothData.state);
			setSelectedSurfaces(toothData.surfaces ? [...toothData.surfaces] : []);
			setMobility((toothData.mobility ?? 0) as 0 | 1 | 2 | 3);
			setBoneLoss((toothData.boneLossLevel ?? 0) as 0 | 1 | 2 | 3);
			setFurcation((toothData.furcationGrade ?? 0) as FurcationGrade);
		} else {
			setCurrentState("Healthy");
			setSelectedSurfaces([]);
			setMobility(0);
			setBoneLoss(0);
			setFurcation(0);
		}
	}, [toothData, toothNumber]);

	const anatomicalTitle = useMemo(() => {
		return getToothFolkAndAnatomicalNameRu(toothNumber);
	}, [toothNumber]);

	const handleToggleSurface = (code: string) => {
		setSelectedSurfaces((prev) =>
			prev.includes(code) ? prev.filter((s) => s !== code) : [...prev, code],
		);
	};

	const handleSave = () => {
		if (onUpdateTooth) {
			const updates: Partial<ToothData> = {
				state: currentState,
			};
			if (selectedSurfaces.length > 0) updates.surfaces = selectedSurfaces;
			if (mobility > 0) updates.mobility = mobility as 0 | 1 | 2 | 3;
			if (boneLoss > 0) updates.boneLossLevel = boneLoss;
			if (furcation > 0) updates.furcationGrade = furcation;
			onUpdateTooth(toothNumber, updates);
		}
		SoundFeedbackService.getInstance().playActionSuccess();
		showToast(`Клиническая карточка зуба #${toothNumber} обновлена`, "success", 3000);
		onClose();
	};

	if (!isOpen) return null;

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
			role="dialog"
			aria-modal="true"
			aria-labelledby="tooth-card-modal-title"
			data-testid="tooth-card-modal"
		>
			<div
				className={`relative w-full max-w-xl max-h-[90vh] flex flex-col rounded-2xl bg-[var(--paper,#ffffff)] dark:bg-zinc-900 border border-[var(--odontogram-border-subtle,#e2e8f0)] dark:border-zinc-800 shadow-2xl overflow-hidden text-[var(--odontogram-ink,#0f172a)] dark:text-zinc-100 ${className}`.trim()}
				onClick={(e) => e.stopPropagation()}
			>
				{/* Modal Header */}
				<div className="flex items-center justify-between px-5 py-4 border-b border-[var(--odontogram-border-subtle,#e2e8f0)] dark:border-zinc-800 bg-[var(--odontogram-surface,#f8fafc)] dark:bg-zinc-950">
					<div className="flex items-center gap-3">
						<div className="w-10 h-10 rounded-xl bg-indigo-500/15 text-indigo-700 dark:text-indigo-400 font-mono font-black text-lg flex items-center justify-center shrink-0 border border-indigo-500/25">
							{toothNumber}
						</div>
						<div>
							<h2
								id="tooth-card-modal-title"
								className="text-base font-black tracking-tight"
							>
								Клиническая карта зуба #{toothNumber}
							</h2>
							<p className="text-xs text-[var(--odontogram-ink-muted,#64748b)]">
								{anatomicalTitle}
							</p>
						</div>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-500 transition-colors cursor-pointer"
						aria-label="Закрыть карточку зуба"
						data-testid="tooth-card-close-btn"
					>
						<X size={18} />
					</button>
				</div>

				{/* Body Content */}
				<div className="flex-1 overflow-y-auto p-5 space-y-5">
					{/* Status Selector */}
					<div>
						<label className="text-xs font-bold text-[var(--odontogram-ink-muted,#64748b)] block mb-2">
							Клинический статус (диагноз / состояние):
						</label>
						<div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
							{(
								[
									{ state: "Healthy", label: "Здоров (0)", color: "emerald" },
									{ state: "Caries", label: "Кариес (C)", color: "amber" },
									{ state: "Filled", label: "Пломба (F)", color: "teal" },
									{ state: "Pulpitis", label: "Пульпит (P)", color: "rose" },
									{ state: "Periodontitis", label: "Периодонтит (Pt)", color: "orange" },
									{ state: "Crown", label: "Коронка (Cr)", color: "blue" },
									{ state: "Implant", label: "Имплант (Imp)", color: "amber" },
									{ state: "Planned_Implant", label: "Имплант (план)", color: "indigo" },
									{ state: "Missing", label: "Отсутствует (X)", color: "zinc" },
								] as const
							).map((opt) => {
								const isSelected = currentState === opt.state;
								return (
									<button
										key={opt.state}
										type="button"
										onClick={() => setCurrentState(opt.state as ToothState)}
										className={`min-h-[44px] sm:min-h-[36px] px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer select-none flex items-center justify-between ${
											isSelected
												? "bg-indigo-600 text-white border-indigo-600 shadow-xs font-black ring-2 ring-indigo-500/40"
												: "bg-[var(--odontogram-surface,#f8fafc)] dark:bg-zinc-800 text-[var(--odontogram-ink,#0f172a)] dark:text-zinc-200 border-[var(--odontogram-border-subtle,#e2e8f0)] dark:border-zinc-700 hover:border-indigo-400"
										}`}
										data-testid={`tooth-card-state-${opt.state}`}
									>
										<span>{opt.label}</span>
										{isSelected && <Check size={14} className="shrink-0" />}
									</button>
								);
							})}
						</div>
					</div>

					{/* Surfaces Selector */}
					<div>
						<div className="flex items-center justify-between mb-2">
							<label className="text-xs font-bold text-[var(--odontogram-ink-muted,#64748b)]">
								Поражённые поверхности (1 клик):
							</label>
							<span className="text-xs font-mono font-bold text-[var(--teal,#0d9488)]">
								{selectedSurfaces.length > 0 ? `[${selectedSurfaces.join("")}]` : "вся коронка"}
							</span>
						</div>
						<div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
							{AVAILABLE_SURFACES.map((surf) => {
								const isSelected = selectedSurfaces.includes(surf.code);
								return (
									<button
										key={surf.code}
										type="button"
										onClick={() => handleToggleSurface(surf.code)}
										className={`min-h-[44px] sm:min-h-[36px] px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer select-none flex items-center justify-between ${
											isSelected
												? "bg-teal-600 text-white border-teal-600 shadow-xs font-black"
												: "bg-[var(--odontogram-surface,#f8fafc)] dark:bg-zinc-800 text-[var(--odontogram-ink,#0f172a)] dark:text-zinc-200 border-[var(--odontogram-border-subtle,#e2e8f0)] dark:border-zinc-700 hover:border-teal-500"
										}`}
										title={surf.desc}
										data-testid={`tooth-card-surf-${surf.code}`}
									>
										<span className="font-mono font-black">{surf.code}</span>
										<span className="text-[10px] opacity-80 truncate ml-1">{surf.name}</span>
										{isSelected && <Check size={12} className="shrink-0 ml-1" />}
									</button>
								);
							})}
						</div>
					</div>

					{/* Periodontal & Bone Status */}
					<div className="p-3.5 rounded-xl bg-[var(--odontogram-surface,#f8fafc)] dark:bg-zinc-950 border border-[var(--odontogram-border-subtle,#e2e8f0)] dark:border-zinc-800 space-y-3">
						<span className="text-xs font-bold text-[var(--odontogram-ink-muted,#64748b)] block">
							Пародонтологический статус зуба:
						</span>
						<div className="grid grid-cols-3 gap-3 text-xs">
							<div>
								<span className="text-[10px] text-zinc-500 block mb-1">Подвижность</span>
								<select
									value={mobility}
									onChange={(e) => setMobility(Number(e.target.value) as 0 | 1 | 2 | 3)}
									className="w-full min-h-[36px] px-2 py-1 rounded-lg bg-[var(--paper,#ffffff)] dark:bg-zinc-800 border border-[var(--odontogram-border-subtle,#e2e8f0)] dark:border-zinc-700 font-bold"
								>
									<option value={0}>0 — норма</option>
									<option value={1}>I степень</option>
									<option value={2}>II степень</option>
									<option value={3}>III степень</option>
								</select>
							</div>
							<div>
								<span className="text-[10px] text-zinc-500 block mb-1">Атрофия кости</span>
								<select
									value={boneLoss}
									onChange={(e) => setBoneLoss(Number(e.target.value) as 0 | 1 | 2 | 3)}
									className="w-full min-h-[36px] px-2 py-1 rounded-lg bg-[var(--paper,#ffffff)] dark:bg-zinc-800 border border-[var(--odontogram-border-subtle,#e2e8f0)] dark:border-zinc-700 font-bold"
								>
									<option value={0}>0 — нет</option>
									<option value={1}>I (до 1/3 длины)</option>
									<option value={2}>II (до 1/2 длины)</option>
									<option value={3}>III (более 2/3)</option>
								</select>
							</div>
							<div>
								<span className="text-[10px] text-zinc-500 block mb-1">Фуркация</span>
								<select
									value={furcation}
									onChange={(e) => setFurcation(Number(e.target.value) as FurcationGrade)}
									className="w-full min-h-[36px] px-2 py-1 rounded-lg bg-[var(--paper,#ffffff)] dark:bg-zinc-800 border border-[var(--odontogram-border-subtle,#e2e8f0)] dark:border-zinc-700 font-bold"
								>
									<option value={0}>0 — нет</option>
									<option value={1}>Класс I</option>
									<option value={2}>Класс II</option>
									<option value={3}>Класс III</option>
								</select>
							</div>
						</div>
					</div>

					{/* Quick Links: History & Endo */}
					<div className="flex items-center gap-2">
						{onOpenHistory && (
							<button
								type="button"
								onClick={() => {
									onOpenHistory(toothNumber);
									onClose();
								}}
								className="min-h-[44px] sm:min-h-[36px] flex-1 px-3 py-1.5 rounded-xl border border-[var(--odontogram-border-subtle,#e2e8f0)] dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
								data-testid="tooth-card-open-history-btn"
							>
								<History size={14} className="text-indigo-600" />
								<span>История зуба</span>
							</button>
						)}
						{onOpenEndo && (
							<button
								type="button"
								onClick={() => {
									onOpenEndo(toothNumber);
									onClose();
								}}
								className="min-h-[44px] sm:min-h-[36px] flex-1 px-3 py-1.5 rounded-xl border border-[var(--odontogram-border-subtle,#e2e8f0)] dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
								data-testid="tooth-card-open-endo-btn"
							>
								<Activity size={14} className="text-rose-600" />
								<span>Журнал каналов (Эндо)</span>
							</button>
						)}
					</div>
				</div>

				{/* Footer Controls */}
				<div className="flex items-center justify-between px-5 py-3.5 border-t border-[var(--odontogram-border-subtle,#e2e8f0)] dark:border-zinc-800 bg-[var(--odontogram-surface,#f8fafc)] dark:bg-zinc-950">
					<button
						type="button"
						onClick={onClose}
						className="min-h-[44px] sm:min-h-[36px] px-4 py-1.5 rounded-xl border border-[var(--odontogram-border-subtle,#e2e8f0)] dark:border-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-xs font-bold transition-all cursor-pointer"
					>
						Отмена
					</button>

					<button
						type="button"
						onClick={handleSave}
						className="min-h-[44px] sm:min-h-[38px] px-6 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer active:scale-98"
						data-testid="tooth-card-save-btn"
					>
						<Check size={16} />
						<span>Сохранить в формулу</span>
					</button>
				</div>
			</div>
		</div>
	);
};
