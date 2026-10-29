import React from "react";
import {
	CheckCircle2,
	Receipt,
	X,
	Check,
} from "lucide-react";
import { BracesBracket } from "../icons/DentalIcons";
import { CashRegisterCheckoutModal } from "../billing/CashRegisterCheckoutModal";
import { CephalometricAnalysisModal } from "./CephalometricAnalysisModal";
import { OrthodonticPhotoProtocolModal } from "../diagnostics/OrthodonticPhotoProtocolModal";
import { showToast } from "../GlobalToast";
import type { OrthoCalculatedService804n } from "./orthoServicesCatalog";
import { useOrthodonticVisitScreen } from "./visitScreen/useOrthodonticVisitScreen";
import { OrthoActivationCard } from "./visitScreen/OrthoActivationCard";
import { OrthoArchwiresAndTractionCard } from "./visitScreen/OrthoArchwiresAndTractionCard";
import { OrthoDiagnosticsStrip } from "./visitScreen/OrthoDiagnosticsStrip";
import { OrthoBillingAndDiarySummary } from "./visitScreen/OrthoBillingAndDiarySummary";

export interface OrthodonticVisitScreenProps {
	readonly isOpen?: boolean;
	readonly onClose?: () => void;
	readonly patientId?: string;
	readonly patientName?: string;
	readonly clinicName?: string;
	readonly clinicPhone?: string;
	readonly doctorName?: string;
	readonly selectedTooth?: number | null;
	readonly onAddToInvoice?: (services: OrthoCalculatedService804n[]) => void;
}

export const OrthodonticVisitScreen: React.FC<OrthodonticVisitScreenProps> = (props) => {
	const {
		isOpen = true,
		onClose,
		patientName = "Пациент",
		clinicName = "Стоматологическая клиника DENTE",
		clinicPhone = "+7 (999) 000-00-00",
		doctorName = "Лечащий врач-ортодонт",
	} = props;

	const s = useOrthodonticVisitScreen(props);

	if (!isOpen) return null;

	return (
		<div
			className="fixed inset-0 z-[10050] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 overflow-y-auto overflow-x-clip max-w-[100vw]"
			role="dialog"
			aria-modal="true"
			aria-labelledby="ortho-protocol-title"
			data-testid="orthodontic-visit-protocol-widget"
		>
			<div className="relative w-full max-w-5xl bg-[var(--paper)] border border-[var(--line)] rounded-t-[24px] sm:rounded-2xl shadow-2xl flex flex-col h-[94vh] sm:h-auto sm:max-h-[94vh] overflow-hidden overflow-x-clip">
				{/* Mobile Drag Handle (Apple HIG 36x5px) */}
				<div data-testid="ortho-mobile-drag-handle-container" className="sm:hidden flex justify-center pt-2.5 pb-1 shrink-0 bg-[var(--paper)]">
					<div data-testid="ortho-mobile-drag-handle" className="w-9 h-1 rounded-full bg-[var(--line)]" />
				</div>

				{/* Header */}
				<header className="flex items-center justify-between px-4 py-2.5 bg-[var(--paper)] border-b border-[var(--line)] shrink-0">
					<div className="flex items-center gap-2.5 min-w-0 mr-2 shrink-0">
						<div className="w-8 h-8 rounded-xl bg-[var(--paper-soft)] text-[var(--primary)] flex items-center justify-center border border-[var(--line)] shrink-0">
							<BracesBracket size={18} />
						</div>
						<div className="min-w-0">
							<h2 id="ortho-protocol-title" className="text-sm font-bold text-[var(--ink)] m-0 whitespace-nowrap">
								Ортодонтический протокол приёма
							</h2>
							<p className="text-xs text-[var(--muted)] m-0 truncate">
								{patientName} · <span className="hidden sm:inline">Брекеты, дуги, сечения и эластики</span><span className="sm:hidden">Ортодонтия</span>
							</p>
						</div>
					</div>

					<div className="flex items-center gap-1.5 shrink-0">
						<button
							type="button"
							onClick={s.handleApplyExpressNorm}
							className="secondary-button shrink-0 flex items-center gap-1.5 border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--primary)] font-bold text-xs cursor-pointer shadow-xs min-h-[32px] h-8 px-2.5"
							data-testid="ortho-toolbar-norm-btn"
							title="1-клик фиксация нормы (Мандат 8e): Физиологический ортогнатический прикус"
						>
							<CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
							<span className="hidden md:inline">Физиологический прикус</span>
							<span className="md:hidden">Норма</span>
						</button>

						<button
							type="button"
							onClick={s.handleAddServicesToInvoice}
							className="secondary-button shrink-0 !hidden xl:!inline-flex h-8 px-2.5 text-xs font-semibold border-[var(--line)]"
							data-testid="add-ortho-services-to-invoice-btn"
							title="Начислить услуги в чек/смету визита"
							aria-label="Начислить услуги в чек/смету"
						>
							<Receipt size={14} />
							<span>Услуги</span>
							<span
								className="px-1.5 py-0.2 rounded-full text-[11px] font-bold bg-[var(--paper-soft)] text-[var(--ink)] border border-[var(--line)] min-w-[18px] text-center"
								data-testid="ortho-services-count-badge"
							>
								{s.calculatedServices.length}
							</span>
						</button>

						<button
							type="button"
							onClick={s.handleApplyToVisitNote}
							className="secondary-button shrink-0 !hidden sm:!inline-flex h-8 px-3 text-xs font-bold border-[var(--line)]"
							data-testid="apply-to-form-043-btn"
							title="Вставить протокол в медицинскую карту приёма"
							aria-label="В медицинскую карту"
						>
							<CheckCircle2 size={14} className="text-teal-600 dark:text-teal-400" />
							<span>В карту</span>
						</button>

						{onClose && (
							<button
								type="button"
								onClick={onClose}
								className="secondary-button w-8 h-8 !p-0 rounded-xl text-[var(--muted)] hover:text-[var(--ink)] flex items-center justify-center shrink-0 cursor-pointer border-[var(--line)]"
								title="Закрыть"
								aria-label="Закрыть протокол"
							>
								<X size={16} />
							</button>
						)}
					</div>
				</header>

				{/* Mobile Segmented Bar (Apple HIG) */}
				<div className="sm:hidden flex border-b border-[var(--line)] bg-[var(--paper-soft)] p-1 shrink-0">
					<button
						type="button"
						onClick={() => s.setMobileTab("controls")}
						className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all min-h-[36px] ${
							s.mobileTab === "controls" ? "bg-[var(--paper)] text-[var(--teal)] shadow-xs" : "text-[var(--muted)]"
						}`}
					>
						Манипуляции и дуги
					</button>
					<button
						type="button"
						onClick={() => s.setMobileTab("preview")}
						className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all min-h-[36px] flex items-center justify-center gap-1 ${
							s.mobileTab === "preview" ? "bg-[var(--paper)] text-[var(--teal)] shadow-xs" : "text-[var(--muted)]"
						}`}
					>
						<span>Чек и дневник</span>
						<span className="px-1.5 py-0.2 rounded-full text-[10px] bg-[var(--teal)]/10 text-[var(--teal)] font-bold">
							{s.calculatedServices.length}
						</span>
					</button>
				</div>

				{/* Body Content (Desktop Grid) */}
				<div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-0 overflow-y-auto overflow-x-clip">
					{/* Left Column: Clinical Controls (7 cols) */}
					<div className={`lg:col-span-7 p-4 sm:p-5 flex flex-col gap-4 border-b lg:border-b-0 lg:border-r border-[var(--line)] overflow-y-auto ${s.mobileTab === "controls" ? "flex" : "hidden sm:flex"}`}>
						<OrthoActivationCard
							stageFilter={s.stageFilter}
							setStageFilter={s.setStageFilter}
							targetArch={s.targetArch}
							setTargetArch={s.setTargetArch}
							bracketSystem={s.bracketSystem}
							setBracketSystem={s.setBracketSystem}
							bracketSlot={s.bracketSlot}
							setBracketSlot={s.setBracketSlot}
							alignerStep={s.alignerStep}
							setAlignerStep={s.setAlignerStep}
							alignerTotal={s.alignerTotal}
							setAlignerTotal={s.setAlignerTotal}
							alignerDaysPerStep={s.alignerDaysPerStep}
							setAlignerDaysPerStep={s.setAlignerDaysPerStep}
							onApplyExpressNorm={s.handleApplyExpressNorm}
						/>

						<OrthoDiagnosticsStrip
							onOpenPhotoModal={() => s.setIsPhotoModalOpen(true)}
							onOpenCephModal={() => s.setIsCephModalOpen(true)}
							anbClass={s.anbClass}
							setAnbClass={s.setAnbClass}
							setAnbAngle={s.setAnbAngle}
							isPhotoCompleted={s.isPhotoCompleted}
						/>

						<OrthoArchwiresAndTractionCard
							archwireMaterial={s.archwireMaterial}
							setArchwireMaterial={s.setArchwireMaterial}
							archwireSection={s.archwireSection}
							setArchwireSection={s.setArchwireSection}
							selectedActions={s.selectedActions}
							setSelectedActions={s.setSelectedActions}
							elasticScheme={s.elasticScheme}
							setElasticScheme={s.setElasticScheme}
							elasticSize={s.elasticSize}
							setElasticSize={s.setElasticSize}
							elasticWear={s.elasticWear}
							setElasticWear={s.setElasticWear}
						/>
					</div>

					{/* Right Column: Billing & Diary Summary (5 cols) */}
					<div className={`lg:col-span-5 p-4 sm:p-5 flex flex-col gap-4 bg-[var(--paper-soft)] overflow-y-auto ${s.mobileTab === "preview" ? "flex" : "hidden sm:flex"}`}>
						<OrthoBillingAndDiarySummary
							calculatedServices={s.calculatedServices}
							totalRub={s.totalRub}
							generatedProtocol={s.generatedProtocol}
							onAddToInvoice={s.handleAddServicesToInvoice}
							onQuickCheckout={() => {
								s.handleAddServicesToInvoice();
								s.setIsCheckoutOpen(true);
							}}
							onPrintCard={s.handlePrintCard}
							onCopyPatientMemo={s.handleCopyPatientMemo}
							onPrintMemo={s.handlePrintMemo}
							onCommitProtocol={s.handleCommitAndClose}
						/>
					</div>
				</div>

				{/* Mobile Sticky Bottom Floating Bar (Apple HIG Natural Thumb Zone) */}
				<div className="sm:hidden sticky bottom-0 inset-x-0 p-3 bg-[var(--paper)]/95 backdrop-blur-md border-t border-[var(--line)] flex items-center gap-2 shrink-0 z-20 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
					{s.mobileTab === "controls" ? (
						<>
							<button
								type="button"
								onClick={() => s.setMobileTab("preview")}
								className="secondary-button min-h-[44px] h-11 px-3 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shrink-0 border-[var(--line)]"
							>
								<Receipt size={15} className="text-[var(--teal)]" />
								<span>Чек ({s.calculatedServices.length})</span>
							</button>
							<button
								type="button"
								onClick={s.handleCommitAndClose}
								className="primary-button flex-1 min-h-[44px] h-11 px-3 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 bg-[#0d9488] hover:bg-[#0f766e] text-white shadow-md active:scale-[0.98]"
							>
								<Check size={16} />
								<span className="truncate">Зафиксировать протокол</span>
							</button>
						</>
					) : (
						<>
							<button
								type="button"
								onClick={() => s.setMobileTab("controls")}
								className="secondary-button min-h-[44px] h-11 px-3 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shrink-0 border-[var(--line)]"
							>
								<span>← Назад к дугам</span>
							</button>
							<button
								type="button"
								onClick={s.handleCommitAndClose}
								className="primary-button flex-1 min-h-[44px] h-11 px-3 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 bg-[#0d9488] hover:bg-[#0f766e] text-white shadow-md active:scale-[0.98]"
							>
								<Check size={16} />
								<span className="truncate">Зафиксировать протокол</span>
							</button>
						</>
					)}
				</div>

				{/* Modals: Checkout, Ceph, Photo */}
				{s.isCheckoutOpen && (
					<CashRegisterCheckoutModal
						isOpen={s.isCheckoutOpen}
						onClose={() => s.setIsCheckoutOpen(false)}
						patientName={patientName}
						initialAmountKopecks={Math.round(s.totalRub * 100)}
						invoiceDraftItems={s.calculatedServices.map((srv, idx) => {
							const itemQuantity = (srv as any).quantity ?? 1;
							const itemName = (srv as any).name ?? (srv as any).nameRu ?? "Ортодонтическая услуга";
							return {
								id: `ortho-srv-${idx}`,
								code: srv.code,
								name: itemName,
								category: "orthodontics",
								priceKopecks: Math.round(srv.priceRub * 100),
								quantity: itemQuantity,
								totalKopecks: Math.round(srv.priceRub * itemQuantity * 100),
							};
						})}
					/>
				)}

				<CephalometricAnalysisModal
					isOpen={s.isCephModalOpen}
					onClose={() => s.setIsCephModalOpen(false)}
					patientName={patientName}
				/>

				<OrthodonticPhotoProtocolModal
					isOpen={s.isPhotoModalOpen}
					onClose={() => s.setIsPhotoModalOpen(false)}
					patientName={patientName}
					doctorName={doctorName}
					clinicName={clinicName}
					onSaveSession={() => {
						s.setIsPhotoCompleted(true);
						s.setIsPhotoModalOpen(false);
						showToast("Сессия клинического фотопротокола сохранена", "success");
					}}
				/>
			</div>
		</div>
	);
};

export default OrthodonticVisitScreen;
