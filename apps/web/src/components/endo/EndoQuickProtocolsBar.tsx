import React, { useState } from "react";
import { Activity, Check, RotateCcw, Zap, Sparkles } from "lucide-react";
import {
	type EndoCanalData,
	type EndoToothClinicalData,
	applyPrimaryEndoProtocol,
	applyRetreatmentEndoProtocol,
	applyObturationPermanentProtocol,
	applyExpressApicalEndoProtocol,
	generateEndoProtocol043,
	getDefaultCanalsForTooth,
} from "@dental/shared";
import { getToothAnatomicalNameRu } from "../../lib/clinicalProtocols043";
import { showToast } from "../GlobalToast";
import { useVisitStore } from "../../store/visitStore";
import { EndoCanalLogModal } from "./EndoCanalLogModal";

export interface EndoQuickProtocolsBarProps {
	readonly toothNumber: number;
	readonly className?: string;
	readonly onProtocolApplied?: (text: string, canals: EndoCanalData[]) => void;
}

/**
 * 1-Клик панель быстрого применения протоколов эндодонтии у кресла (30 секунд).
 * Мандаты 8e, 8k, 8n: CRM != тренажер реальности.
 * Тач-таргеты >= 44px, ноль эмодзи, чистое внесение в Форму 043/у.
 */
export const EndoQuickProtocolsBar: React.FC<EndoQuickProtocolsBarProps> = ({
	toothNumber,
	className = "",
	onProtocolApplied,
}) => {
	const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

	const toothTitle = getToothAnatomicalNameRu(toothNumber);

	const applyAndDispatch = (
		protocolName: string,
		presetFn: (canals: EndoCanalData[], toothNum: number) => {
			canals: EndoCanalData[];
			irrigation: string;
			rotarySystem: string;
			radiologyControl: string;
		},
	) => {
		const baseCanals = getDefaultCanalsForTooth(toothNumber);
		const result = presetFn(baseCanals, toothNumber);
		const protocolText = generateEndoProtocol043({
			toothNumber,
			toothTitle,
			canals: result.canals,
			irrigation: result.irrigation,
			rotarySystem: result.rotarySystem,
			radiologyControl: result.radiologyControl,
		});

		// 1. Inject to useVisitStore
		try {
			useVisitStore.getState().setVisitNoteForm((prev) => {
				const existingObj = prev.objectiveStatus?.trim() || "";
				return {
					...prev,
					objectiveStatus: existingObj
						? `${existingObj}\n\n${protocolText}`
						: protocolText,
				};
			});
		} catch {
			// fallback
		}

		// 2. Global custom event for visit note listeners
		try {
			window.dispatchEvent(
				new CustomEvent("dente-apply-soap-protocol", {
					detail: {
						soap: { treatmentDescription: protocolText },
						mode: "smart_append",
					},
				}),
			);
		} catch {
			// fallback
		}

		if (onProtocolApplied) {
			onProtocolApplied(protocolText, result.canals);
		}

		showToast(
			`Протокол «${protocolName}» для зуба #${toothNumber} внесен в Форму 043/у!`,
			"success",
		);
	};

	return (
		<div
			className={`p-3 rounded-2xl bg-[var(--surface,#f8fafc)] dark:bg-slate-850 border border-[var(--line,#e2e8f0)] dark:border-slate-800 space-y-2 ${className}`}
			data-testid="endo-quick-protocols-bar"
		>
			<div className="flex items-center justify-between gap-2 flex-wrap">
				<div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-rose-700 dark:text-rose-300">
					<Activity size={16} />
					<span>Эндодонтия зуба {toothNumber} · 1-клик протоколы (30 сек):</span>
				</div>

				<button
					type="button"
					onClick={() => setIsDetailModalOpen(true)}
					data-testid="btn-open-detail-endo-modal"
					className="min-h-[44px] px-3.5 py-1.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-[var(--paper,#ffffff)] dark:bg-slate-800 border border-[var(--line,#cbd5e1)] dark:border-slate-700 flex items-center gap-1.5 transition-all cursor-pointer"
				>
					<Sparkles size={14} className="text-rose-600 dark:text-rose-400" />
					<span>Журнал каналов (детально)</span>
				</button>
			</div>

			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
				{/* 1. Первичное эндо */}
				<button
					type="button"
					data-testid="quick-btn-primary-endo"
					onClick={() =>
						applyAndDispatch(
							"Первичное эндо (ProTaper Gold + Metapex)",
							applyPrimaryEndoProtocol,
						)
					}
					className="min-h-[44px] px-3 py-2 rounded-xl text-xs font-black bg-rose-600 hover:bg-rose-500 active:scale-98 text-white flex items-center justify-center gap-2 shadow-sm shadow-rose-600/20 transition-all cursor-pointer text-center"
					title="ProTaper Gold SX-F2, NaOCl 3% + EDTA 17% с УЗ, временное вложение Metapex/Calcept на 7–14 дней"
				>
					<Zap size={15} className="shrink-0" />
					<span>Первичное эндо (Metapex)</span>
				</button>

				{/* 2. Повторное эндо */}
				<button
					type="button"
					data-testid="quick-btn-retreatment-endo"
					onClick={() =>
						applyAndDispatch(
							"Повторное эндо (D-RaCe + ревизия)",
							applyRetreatmentEndoProtocol,
						)
					}
					className="min-h-[44px] px-3 py-2 rounded-xl text-xs font-black bg-amber-600 hover:bg-amber-500 active:scale-98 text-white flex items-center justify-center gap-2 shadow-sm shadow-amber-600/20 transition-all cursor-pointer text-center"
					title="Распломбировка гуттаперчи D-RaCe/Retreatment, ревизия устьев, временное пломбирование Metapex"
				>
					<RotateCcw size={15} className="shrink-0" />
					<span>Повторное эндо (ретритмент)</span>
				</button>

				{/* 3. Постоянная обтурация */}
				<button
					type="button"
					data-testid="quick-btn-obturation-endo"
					onClick={() =>
						applyAndDispatch(
							"Постоянная обтурация (латеральная / горячая гуттаперча + AH Plus)",
							applyObturationPermanentProtocol,
						)
					}
					className="min-h-[44px] px-3 py-2 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-500 active:scale-98 text-white flex items-center justify-center gap-2 shadow-sm shadow-emerald-600/20 transition-all cursor-pointer text-center"
					title="Латеральная компакция / горячая гуттаперча GuttaCore/System B с силером AH Plus"
				>
					<Check size={16} className="shrink-0" />
					<span>Обтурация (GuttaCore/AH Plus)</span>
				</button>

				{/* 4. Обтурация до апекса (Apex 0.0 + RVG) */}
				<button
					type="button"
					data-testid="quick-btn-express-apical-endo"
					onClick={() =>
						applyAndDispatch(
							"Обтурация до апекса (Apex 0.0 + RVG)",
							applyExpressApicalEndoProtocol,
						)
					}
					className="min-h-[44px] px-3 py-2 rounded-xl text-xs font-black bg-teal-600 hover:bg-teal-500 active:scale-98 text-white flex items-center justify-center gap-2 shadow-sm shadow-teal-600/20 transition-all cursor-pointer text-center"
					title="Каналы обработаны и обтурированы до физиологического апекса (длина подтверждена апекслокатором Apex 0.0 и контрольным снимком)"
				>
					<Check size={16} className="shrink-0" />
					<span>До апекса (Apex 0.0 + RVG)</span>
				</button>
			</div>

			{isDetailModalOpen && (
				<EndoCanalLogModal
					isOpen={isDetailModalOpen}
					onClose={() => setIsDetailModalOpen(false)}
					toothNumber={toothNumber}
					onInsertToProtocol={(text, canals) => {
						if (onProtocolApplied) onProtocolApplied(text, canals);
						setIsDetailModalOpen(false);
					}}
				/>
			)}
		</div>
	);
};
