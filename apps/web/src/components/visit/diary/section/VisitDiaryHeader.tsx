import type React from "react";
import { CheckCircle2, Clock } from "lucide-react";
import { VisitDiaryHeaderActions } from "./VisitDiaryHeaderActions";

export interface VisitDiaryHeaderProps {
	readonly logic: any;
	readonly modals: any;
	readonly onApplyNorm: () => void;
}

export const VisitDiaryHeader: React.FC<VisitDiaryHeaderProps> = ({
	logic,
	modals,
	onApplyNorm,
}) => {
	return (
		<div className="vde-043__header">
			<div className="vde-043__header-title-wrap">
				<div className="vde-043__form-badge">ЭМК</div>
				<h3 className="vde-043__title">Дневник приёма</h3>
				{logic.lastSavedAt ? (
					<span
						className="vde-043__saved-badge"
						title={`Дневник сохранён: ${new Date(logic.lastSavedAt).toLocaleTimeString("ru-RU")}`}
					>
						<CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
						<span>
							{new Date(logic.lastSavedAt).toLocaleTimeString("ru-RU", {
								hour: "2-digit",
								minute: "2-digit",
							})}
						</span>
					</span>
				) : (
					<span
						className="vde-043__saved-badge opacity-60"
						title="Черновик ещё не сохранён на сервере"
					>
						<Clock className="w-3.5 h-3.5 text-amber-500" />
						<span>Черновик</span>
					</span>
				)}
				<span
					className="vde-043__saved-badge"
					data-testid="visit-diary-egisz-badge"
					title="Фоновая отправка в ЕГИСЗ (РЭМД): протокол передается в Минздрав в фоновом режиме без задержек приёма"
				>
					<CheckCircle2 className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
					<span className="text-teal-700 dark:text-teal-300 font-medium">Отправлено в ЕГИСЗ ✓</span>
				</span>
				{logic.isSaving && (
					<span className="vde-043__saving-indicator">
						<span className="vde-043__saving-spinner" />
						<span>Сохраняю...</span>
					</span>
				)}
			</div>

			<VisitDiaryHeaderActions
				isLocked={logic.isLocked}
				isRevising={logic.isRevising}
				beginRevise={logic.beginRevise}
				onApplyNorm={onApplyNorm}
				onOpenTemplates={() => modals.setShowTemplatesModal(true)}
				onOpenPrintPreview={() => logic.setShowPreview(true)}
				onOpenSummary={() => modals.setShowSummaryModal(true)}
				onOpenPrescription={() => modals.setShowPrescriptionModal(true)}
				onOpenRadiology={() => modals.setShowRadiologyReferralModal(true)}
				onOpenTier3Perio={() => modals.setIsTier3PerioModalOpen(true)}
				onOpenEgisz={() => modals.setShowEgiszModal(true)}
				onOpenBranding={() => modals.setShowBrandingCustomizer(true)}
			/>
		</div>
	);
};
