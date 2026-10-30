/**
 * @dental/web/components/orthodontics/workspaceModal/OrthoWorkspaceHeader.tsx
 * Шапка и селектор табов ортодонтического рабочего стола (Apple HIG, Мандаты 8e, 8am).
 * Тактильный Drag Handle 36x5px, тач-таргеты >= 44px, быстрая кнопка «Норма».
 */

import React from "react";
import { X, Sparkles, Layers, Activity, Sliders } from "lucide-react";
import { BracesBracket } from "../../icons/DentalIcons";

export interface OrthoWorkspaceHeaderProps {
	titleId: string;
	patientName: string;
	doctorName: string;
	activeTab: "visit" | "ceph" | "aligners";
	onSelectTab: (tab: "visit" | "ceph" | "aligners") => void;
	onApplyNorm: () => void;
	onClose: () => void;
	skeletalClass: string;
	alignerCurrentStep: number;
	alignerTotalSteps: number;
}

export const OrthoWorkspaceHeader: React.FC<OrthoWorkspaceHeaderProps> = ({
	titleId,
	patientName,
	doctorName,
	activeTab,
	onSelectTab,
	onApplyNorm,
	onClose,
	skeletalClass,
	alignerCurrentStep,
	alignerTotalSteps,
}) => {
	return (
		<>
			{/* Apple HIG Drag Handle для мобильных устройств (36x5px) */}
			<div className="sm:hidden flex justify-center pt-2.5 pb-1 bg-[var(--paper)] shrink-0">
				<div
					className="w-9 h-[5px] rounded-full bg-[var(--line-strong,rgba(150,150,150,0.5))]"
					aria-hidden="true"
				/>
			</div>

			{/* Шапка модального окна */}
			<header className="flex items-center justify-between px-3 sm:px-6 py-2.5 sm:py-3 border-b border-[var(--line)] bg-[var(--paper)] shrink-0 gap-2">
				<div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
					<div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[var(--paper-soft)] text-[#0d9488] flex items-center justify-center border border-[var(--line)] shrink-0 shadow-xs">
						<BracesBracket size={20} className="sm:w-[22px] sm:h-[22px]" />
					</div>
					<div className="min-w-0 flex-1">
						<h2 id={titleId} className="text-sm sm:text-lg font-bold text-[var(--ink)] truncate m-0">
							<span className="sm:hidden">Ортодонтия</span>
							<span className="hidden sm:inline">Рабочий стол ортодонта</span>
						</h2>
						<p className="text-xs text-[var(--muted)] truncate m-0">
							{patientName} · Врач: {doctorName}
						</p>
					</div>
				</div>

				<div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
					<button
						type="button"
						onClick={onApplyNorm}
						className="secondary-button min-h-[44px] h-9 sm:h-10 px-2.5 sm:px-3 text-xs font-semibold flex items-center gap-1.5 border-[var(--line)] hover:bg-[var(--paper-soft)] cursor-pointer text-[#0d9488] transition-colors"
						title="1-клик фиксация физиологической нормы (Класс I, интактный статус)"
					>
						<Sparkles size={15} className="text-emerald-500 shrink-0" />
						<span className="hidden sm:inline">Норма в 1 клик</span>
						<span className="sm:hidden">Норма</span>
					</button>
					<button
						type="button"
						onClick={onClose}
						className="w-10 h-10 sm:w-11 sm:h-11 min-h-[44px] min-w-[44px] rounded-xl text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-soft)] flex items-center justify-center border border-[var(--line)] cursor-pointer transition-colors"
						aria-label="Закрыть"
					>
						<X size={18} />
					</button>
				</div>
			</header>

			{/* Навигационный переключатель вкладок (Apple HIG Segmented Control, тач-таргеты >= 44px) */}
			<nav
				className="flex px-3 sm:px-6 py-2 bg-[var(--paper-soft)] border-b border-[var(--line)] gap-1.5 sm:gap-2 shrink-0"
				aria-label="Вкладки рабочего стола ортодонта"
			>
				<button
					type="button"
					onClick={() => onSelectTab("visit")}
					className={`flex-1 min-h-[44px] py-2 px-2 sm:px-3 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5 sm:gap-2 transition-all cursor-pointer ${
						activeTab === "visit"
							? "bg-[var(--paper)] text-[var(--ink)] shadow-xs border border-[var(--line)]"
							: "text-[var(--muted)] hover:text-[var(--ink)]"
					}`}
				>
					<Layers size={16} className={activeTab === "visit" ? "text-[#0d9488]" : ""} />
					<span className="hidden sm:inline">Визит и активация дуг</span>
					<span className="sm:hidden">Дуги</span>
				</button>

				<button
					type="button"
					onClick={() => onSelectTab("ceph")}
					className={`flex-1 min-h-[44px] py-2 px-2 sm:px-3 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5 sm:gap-2 transition-all cursor-pointer ${
						activeTab === "ceph"
							? "bg-[var(--paper)] text-[var(--ink)] shadow-xs border border-[var(--line)]"
							: "text-[var(--muted)] hover:text-[var(--ink)]"
					}`}
				>
					<Activity size={16} className={activeTab === "ceph" ? "text-[#0d9488]" : ""} />
					<span className="hidden sm:inline">ТРГ Цефалометрия</span>
					<span className="sm:hidden">ТРГ</span>
					<span className="px-1.5 py-0.5 rounded-full text-[10px] bg-[#0d9488]/10 text-[#0d9488] font-bold">
						Класс {skeletalClass}
					</span>
				</button>

				<button
					type="button"
					onClick={() => onSelectTab("aligners")}
					className={`flex-1 min-h-[44px] py-2 px-2 sm:px-3 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5 sm:gap-2 transition-all cursor-pointer ${
						activeTab === "aligners"
							? "bg-[var(--paper)] text-[var(--ink)] shadow-xs border border-[var(--line)]"
							: "text-[var(--muted)] hover:text-[var(--ink)]"
					}`}
				>
					<Sliders size={16} className={activeTab === "aligners" ? "text-[#0d9488]" : ""} />
					<span>Элайнеры</span>
					<span className="px-1.5 py-0.5 rounded-full text-[10px] bg-[var(--paper)] text-[var(--muted)] font-mono border border-[var(--line)]">
						{`${alignerCurrentStep}/${alignerTotalSteps}`}
					</span>
				</button>
			</nav>
		</>
	);
};

export default OrthoWorkspaceHeader;
