import React from "react";
import {
	CheckCircle2,
	Check,
	ShieldCheck,
	RotateCcw,
	Send,
	ExternalLink,
	Camera,
	X,
	FileText,
} from "lucide-react";
import { DentalCrown } from "../icons/DentalIcons.js";

export interface LinkedChairsideLabOrderInfo {
	readonly id?: string | undefined;
	readonly orderNumber?: string | undefined;
	readonly toothFdi?: string | number | undefined;
	readonly material?: string | undefined;
	readonly colorVita?: string | undefined;
	readonly stumpShade?: string | undefined;
	readonly workType?: string | undefined;
	readonly constructionType?: string | undefined;
	readonly technicianName?: string | undefined;
	readonly warrantyPassport?: string | undefined;
	readonly status?: string | undefined;
	readonly stage?: string | undefined;
}

export interface OrthopedicsChairsideTopBarProps {
	readonly selectId: string;
	readonly activeTeethInput: string;
	readonly onChangeActiveTeethInput: (val: string) => void;
	readonly activeXrayUrl: string | null;
	readonly onDetachXray: () => void;
	readonly jawScope: "upper" | "lower" | "both" | "none";
	readonly onChangeJawScope: (scope: "upper" | "lower" | "both" | "none") => void;
	readonly selectedMaterial: string;
	readonly onChangeSelectedMaterial: (material: string) => void;
}

export function OrthopedicsChairsideTopBar({
	selectId,
	activeTeethInput,
	onChangeActiveTeethInput,
	activeXrayUrl,
	onDetachXray,
	jawScope,
	onChangeJawScope,
	selectedMaterial,
	onChangeSelectedMaterial,
}: OrthopedicsChairsideTopBarProps) {
	return (
		<div className="flex flex-wrap items-center justify-between gap-2.5 pb-3 mb-3 border-b border-[var(--line)]">
			<div className="flex items-center gap-2">
				<DentalCrown size={20} className="text-[var(--teal)] shrink-0" />
				<div className="leading-tight">
					<div className="flex items-center gap-2">
						<h3 className="text-sm font-bold text-[var(--ink)] tracking-tight">
							Ортопедический протокол у кресла
						</h3>
					</div>
					<p className="text-xs text-[var(--muted)]">
						Клинические протоколы · Оттенки VITA · Наряды ЗТЛ
					</p>
				</div>
			</div>

			<div className="flex items-center gap-2 flex-wrap">
				<div className="flex items-center gap-1.5">
					<label
						htmlFor={`${selectId}-teeth`}
						className="text-xs font-semibold text-[var(--ink)]"
					>
						Зуб(ы):
					</label>
					<input
						id={`${selectId}-teeth`}
						type="text"
						value={activeTeethInput}
						onChange={(e) => onChangeActiveTeethInput(e.target.value)}
						placeholder="16, 21"
						aria-label="Номера зубов FDI"
						className="min-h-[48px] sm:min-h-[36px] w-24 px-3 text-xs font-mono font-bold rounded-lg border border-[var(--line)] bg-[var(--paper-subtle)] text-[var(--ink)] focus:outline-hidden focus:ring-2 focus:ring-[var(--teal)]"
						data-testid="ortho-teeth-input"
					/>
				</div>

				<div
					className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[var(--line)] bg-[var(--paper-subtle)] text-xs min-h-[48px] sm:min-h-[36px]"
					data-testid="attached-xray-badge"
				>
					<Camera
						size={16}
						className={
							activeXrayUrl
								? "text-[var(--teal)] shrink-0"
								: "text-[var(--muted)] shrink-0"
						}
					/>
					{activeXrayUrl ? (
						<div className="flex items-center gap-1.5">
							<span className="text-[var(--teal)] font-bold truncate max-w-[110px]" title="Снимок визита прикреплен к наряду ЗТЛ">
								Снимок привязан
							</span>
							<button
								type="button"
								onClick={onDetachXray}
								className="text-xs text-[var(--muted)] hover:text-rose-500 cursor-pointer font-bold px-1 inline-flex items-center"
								title="Открепить снимок"
							>
								<X className="w-3 h-3" />
							</button>
						</div>
					) : (
						<span className="text-[var(--muted)] font-medium">Без снимка</span>
					)}
				</div>

				<div
					className="p-1 bg-[var(--paper-subtle)] rounded-lg border border-[var(--line)] inline-flex items-center gap-1 shrink-0"
					data-testid="jaw-scope-selector"
					role="group"
					aria-label="Область челюсти"
				>
					<button
						type="button"
						onClick={() => onChangeJawScope(jawScope === "upper" ? "none" : "upper")}
						className={`min-h-[44px] sm:min-h-[32px] px-3 text-xs font-bold rounded-md transition-all cursor-pointer whitespace-nowrap ${
							jawScope === "upper"
								? "bg-[var(--teal)] text-white shadow-xs border border-[var(--teal)]"
								: "secondary-button"
						}`}
						title="Верхняя челюсть (ВЧ)"
						data-testid="jaw-scope-upper-btn"
					>
						ВЧ
					</button>
					<button
						type="button"
						onClick={() => onChangeJawScope(jawScope === "lower" ? "none" : "lower")}
						className={`min-h-[44px] sm:min-h-[32px] px-3 text-xs font-bold rounded-md transition-all cursor-pointer whitespace-nowrap ${
							jawScope === "lower"
								? "bg-[var(--teal)] text-white shadow-xs border border-[var(--teal)]"
								: "secondary-button"
						}`}
						title="Нижняя челюсть (НЧ)"
						data-testid="jaw-scope-lower-btn"
					>
						НЧ
					</button>
					<button
						type="button"
						onClick={() => onChangeJawScope(jawScope === "both" ? "none" : "both")}
						className={`min-h-[44px] sm:min-h-[32px] px-3 text-xs font-bold rounded-md transition-all cursor-pointer whitespace-nowrap ${
							jawScope === "both"
								? "bg-[var(--teal)] text-white shadow-xs border border-[var(--teal)]"
								: "secondary-button"
						}`}
						title="Обе челюсти"
						data-testid="jaw-scope-both-btn"
					>
						Обе
					</button>
				</div>

				<select
					value={selectedMaterial}
					onChange={(e) => onChangeSelectedMaterial(e.target.value)}
					aria-label="Материал конструкции"
					className="min-h-[48px] sm:min-h-[36px] px-3 text-xs font-medium rounded-lg border border-[var(--line)] bg-[var(--paper-subtle)] text-[var(--ink)] focus:outline-hidden focus:ring-2 focus:ring-[var(--teal)]"
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
	);
}

export interface OrthopedicsChairsideLabOrderBannerProps {
	readonly readinessHeadline: string;
	readonly orderNumber: string;
	readonly technicianName: string;
	readonly selectedMaterial: string;
	readonly selectedShade: string;
	readonly warrantyPassport: string;
	readonly fittingConfirmed: boolean;
	readonly onConfirmFitting: () => void;
	readonly onOpenPassportA4?: (() => void) | undefined;
}

export function OrthopedicsChairsideLabOrderBanner({
	readinessHeadline,
	orderNumber,
	technicianName,
	selectedMaterial,
	selectedShade,
	warrantyPassport,
	fittingConfirmed,
	onConfirmFitting,
	onOpenPassportA4,
}: OrthopedicsChairsideLabOrderBannerProps) {
	return (
		<div
			data-testid="ortho-chairside-linked-lab-order-banner"
			className="mb-3 p-3 rounded-lg border border-[var(--teal-border,rgba(20,184,166,0.3))] bg-[var(--teal-subtle,rgba(20,184,166,0.06))] flex flex-wrap items-center justify-between gap-2.5"
		>
			<div className="min-w-0 flex-1 space-y-1">
				<div className="flex items-center gap-2 flex-wrap">
					<CheckCircle2 size={16} className="text-[var(--teal)] shrink-0" />
					<span
						data-testid="ortho-chairside-readiness-headline"
						className="text-xs font-bold text-[var(--ink)]"
					>
						{readinessHeadline}
					</span>
					<span className="px-2 py-0.5 rounded bg-[var(--teal-subtle)] text-[var(--teal)] border border-[var(--teal-border)] text-[11px] font-mono font-bold">
						A16.07.004
					</span>
				</div>
				<div
					data-testid="ortho-chairside-bound-attributes"
					className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-medium text-[var(--muted)]"
				>
					<span>
						Наряд: <strong className="font-mono text-[var(--ink)]">{orderNumber}</strong>
					</span>
					<span>
						Техник: <strong className="text-[var(--ink)]">{technicianName}</strong>
					</span>
					<span>
						Материал: <strong className="text-[var(--ink)]">{selectedMaterial} ({selectedShade})</strong>
					</span>
					<span>
						Гарантийный паспорт: <strong className="font-mono text-[var(--ink)]">{warrantyPassport}</strong>
					</span>
				</div>
			</div>
			<div className="flex items-center gap-2 shrink-0 flex-wrap">
				{onOpenPassportA4 && (
					<button
						type="button"
						data-testid="banner-orthopedic-passport-btn"
						onClick={onOpenPassportA4}
						className="secondary-button min-h-[48px] sm:min-h-[36px] px-3.5 py-1.5 text-xs font-bold inline-flex items-center gap-1.5 shrink-0"
						title="Сформировать Паспорт ортопедической конструкции и Гарантийный талон (А4)"
					>
						<FileText size={15} className="text-[var(--teal)] shrink-0" />
						<span>Паспорт (А4)</span>
					</button>
				)}
				<button
					type="button"
					data-testid="ortho-chairside-confirm-fitting-btn"
					onClick={onConfirmFitting}
					className={`min-h-[48px] sm:min-h-[36px] px-4 py-1.5 rounded-lg text-xs font-bold inline-flex items-center gap-2 transition-colors cursor-pointer shrink-0 ${
						fittingConfirmed
							? "bg-emerald-600 text-white shadow-xs"
							: "primary-button"
					}`}
				>
					<Check size={16} />
					<span>
						{fittingConfirmed ? (
							<>
								<span className="hidden sm:inline">Примерка и фиксация подтверждены (A16.07.004)</span>
								<span className="sm:hidden">Фиксация (A16.07.004)</span>
							</>
						) : (
							<>
								<span className="hidden sm:inline">Подтвердить примерку / фиксацию (A16.07.004)</span>
								<span className="sm:hidden">Фиксация (A16.07.004)</span>
							</>
						)}
					</span>
				</button>
			</div>
		</div>
	);
}

export interface OrthopedicsChairsideFooterBarProps {
	readonly overrideActive: boolean;
	readonly overrideReason: string;
	readonly onToggleOverride: () => void;
	readonly onChangeOverrideReason: (val: string) => void;
	readonly isWarrantyRework: boolean;
	readonly onToggleWarrantyRework: () => void;
	readonly warrantyLiabilityType: "clinic_warranty" | "lab_defect";
	readonly onSelectWarrantyLiability: (val: "clinic_warranty" | "lab_defect") => void;
	readonly labOrderSentNumber: string | null;
	readonly isLabOrderSending: boolean;
	readonly onImmediateSendToLab: () => void;
	readonly onOpenLabOrder?: (() => void) | undefined;
	readonly onOpenPassportA4?: (() => void) | undefined;
}

export function OrthopedicsChairsideFooterBar({
	overrideActive,
	overrideReason,
	onToggleOverride,
	onChangeOverrideReason,
	isWarrantyRework,
	onToggleWarrantyRework,
	warrantyLiabilityType,
	onSelectWarrantyLiability,
	labOrderSentNumber,
	isLabOrderSending,
	onImmediateSendToLab,
	onOpenLabOrder,
	onOpenPassportA4,
}: OrthopedicsChairsideFooterBarProps) {
	return (
		<div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-[var(--line)]">
			<div className="flex items-center gap-2 flex-wrap flex-1 min-w-[280px]">
				<button
					type="button"
					onClick={onToggleOverride}
					className={`min-h-[48px] sm:min-h-[36px] px-4 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
						overrideActive
							? "bg-emerald-700 text-white shadow-xs"
							: "secondary-button"
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
						onChange={(e) => onChangeOverrideReason(e.target.value)}
						placeholder="Причина клинического оверрайда"
						aria-label="Причина клинического оверрайда"
						className="min-h-[48px] sm:min-h-[36px] flex-1 px-3 text-xs rounded-lg border border-emerald-500/40 bg-[var(--paper-subtle)] text-[var(--ink)] focus:outline-hidden"
					/>
				)}
			</div>

			<div className="flex items-center gap-1.5 flex-wrap">
				<button
					type="button"
					onClick={onToggleWarrantyRework}
					className={`min-h-[48px] sm:min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border ${
						isWarrantyRework
							? "bg-rose-50 dark:bg-rose-950/40 border-rose-400 text-rose-700 dark:text-rose-300 ring-1 ring-rose-400 shadow-2xs"
							: "secondary-button"
					}`}
					data-testid="chairside-warranty-rework-toggle"
					title="Повторное изготовление по гарантии: пациент 0 ₽, расчет затрат как обязательства клиники или брак ЗТЛ"
				>
					<RotateCcw size={15} className={isWarrantyRework ? "text-rose-600 dark:text-rose-400" : "text-[var(--muted)]"} />
					<span>{isWarrantyRework ? "Гарантия: 0 ₽ с пациента" : "Гарантийная замена (0 ₽)"}</span>
				</button>

				{isWarrantyRework && (
					<div className="flex items-center rounded-lg border border-rose-300 dark:border-rose-800 overflow-hidden text-xs">
						<button
							type="button"
							onClick={() => onSelectWarrantyLiability("clinic_warranty")}
							className={`min-h-[48px] sm:min-h-[36px] px-2.5 font-bold cursor-pointer transition-colors ${
								warrantyLiabilityType === "clinic_warranty"
									? "bg-rose-600 text-white"
									: "bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-subtle)]"
							}`}
							title="Гарантийные обязательства клиники (клиника оплачивает ЗТЛ)"
							data-testid="chairside-liability-clinic"
						>
							Гарантия клиники
						</button>
						<button
							type="button"
							onClick={() => onSelectWarrantyLiability("lab_defect")}
							className={`min-h-[48px] sm:min-h-[36px] px-2.5 font-bold cursor-pointer transition-colors border-l border-rose-300 dark:border-rose-800 ${
								warrantyLiabilityType === "lab_defect"
									? "bg-rose-600 text-white"
									: "bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-subtle)]"
							}`}
							title="Брак ЗТЛ (лаборатория переделывает бесплатно 0 ₽)"
							data-testid="chairside-liability-lab"
						>
							Брак ЗТЛ (0 ₽)
						</button>
					</div>
				)}
			</div>

			<div className="flex items-center gap-2 flex-wrap">
				{labOrderSentNumber && (
					<span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-bold px-2 py-1 rounded bg-emerald-500/10 border border-emerald-500/30 inline-flex items-center gap-1">
						<CheckCircle2 size={12} className="shrink-0" />
						<span>Отправлен {labOrderSentNumber}</span>
					</span>
				)}

				{onOpenPassportA4 && (
					<button
						type="button"
						onClick={onOpenPassportA4}
						className="secondary-button min-h-[48px] sm:min-h-[36px] px-3.5 py-1.5 text-xs font-bold flex items-center gap-1.5"
						data-testid="open-orthopedic-passport-btn"
						title="Сформировать Паспорт ортопедической конструкции и Гарантийный талон (А4)"
					>
						<FileText size={15} className="text-[var(--teal)] shrink-0" />
						<span>Паспорт (А4)</span>
					</button>
				)}

				<button
					type="button"
					onClick={onImmediateSendToLab}
					disabled={isLabOrderSending}
					className="primary-button min-h-[48px] sm:min-h-[36px] px-4 py-1.5 text-xs font-bold flex items-center gap-2"
					data-testid="direct-send-lab-order-btn"
					title="Отправить заказ-наряд в зуботехническую лабораторию"
				>
					<Send size={15} />
					<span>{isLabOrderSending ? "Отправка в ЗТЛ..." : "Отправить в ЗТЛ"}</span>
				</button>

				{onOpenLabOrder && (
					<button
						type="button"
						onClick={onOpenLabOrder}
						className="secondary-button min-h-[48px] sm:min-h-[36px] px-4 py-1.5 text-xs font-bold text-[var(--teal)] flex items-center gap-2"
						data-testid="open-lab-order-constructor-btn"
						title="Открыть конструктор заказ-нарядов зуботехнической лаборатории"
					>
						<span>Наряд ЗТЛ</span>
						<ExternalLink size={15} />
					</button>
				)}
			</div>
		</div>
	);
}
