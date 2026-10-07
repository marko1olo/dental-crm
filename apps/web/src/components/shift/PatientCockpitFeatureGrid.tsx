import React from "react";
import { CreditCard, FileText, History, Image as ImageIcon, MessageSquare } from "lucide-react";
import type { Dashboard } from "@dental/shared";
import { money } from "../../AppHelpers";
import { countLabel } from "../../lib/russianPlural";

export interface PatientCockpitFeatureGridProps {
	readonly activeUsableDocuments: readonly unknown[];
	readonly dashboard?: Dashboard | null | undefined;
	readonly activeCommunicationTasks: readonly unknown[];
	readonly activeImagingStudies: readonly unknown[];
}

/**
 * PatientCockpitFeatureGrid — Сетка быстрых переходов в ЭМК, документы, оплаты, связь и снимки.
 * Ergonomic 44x44px touch targets per Studio Clinical HIG & Mandate 8d.
 */
export const PatientCockpitFeatureGrid: React.FC<PatientCockpitFeatureGridProps> = ({
	activeUsableDocuments,
	dashboard,
	activeCommunicationTasks,
	activeImagingStudies,
}) => {
	const handleNavigate = (hash: string) => {
		window.location.hash = hash;
	};

	return (
		<div className="patient-feature-grid" data-testid="patient-feature-grid">
			<button
				type="button"
				aria-label="Открыть ЭМК и историю"
				className="clickable-card min-h-[44px] p-3 min-w-0"
				style={{ textAlign: "left" }}
				onClick={() => handleNavigate("visit")}
				onKeyDown={(e) => {
					if (e.key === "Enter" || e.key === " ") {
						e.preventDefault();
						handleNavigate("visit");
					}
				}}
			>
				<History aria-hidden="true" size={24} className="shrink-0" />
				<div className="min-w-0">
					<h3 className="break-words leading-tight">ЭМК / История</h3>
					<p className="tile-meta break-words leading-tight">Приёмы · диагнозы · зубная карта</p>
				</div>
			</button>
			<button
				type="button"
				aria-label="Открыть документы"
				className="clickable-card min-h-[44px] p-3 min-w-0"
				style={{ textAlign: "left" }}
				onClick={() => handleNavigate("documents")}
				onKeyDown={(e) => {
					if (e.key === "Enter" || e.key === " ") {
						e.preventDefault();
						handleNavigate("documents");
					}
				}}
			>
				<FileText aria-hidden="true" size={24} className="shrink-0" />
				<div className="min-w-0">
					<h3 className="break-words leading-tight">Документы</h3>
					<p className="tile-meta break-words leading-tight">
						{(activeUsableDocuments?.length ?? 0) > 0
							? `${countLabel(activeUsableDocuments?.length ?? 0, "документ", "документа", "документов")} по визиту`
							: "по визиту документов нет"}
					</p>
				</div>
			</button>
			<button
				type="button"
				aria-label="Открыть оплаты"
				className="clickable-card min-h-[44px] p-3 min-w-0"
				style={{ textAlign: "left" }}
				onClick={() => handleNavigate("finance")}
				onKeyDown={(e) => {
					if (e.key === "Enter" || e.key === " ") {
						e.preventDefault();
						handleNavigate("finance");
					}
				}}
			>
				<CreditCard aria-hidden="true" size={24} className="shrink-0" />
				<div className="min-w-0">
					<h3 className="break-words leading-tight">Оплаты</h3>
					<p className="tile-meta break-words leading-tight">
						{money(dashboard?.billingSummary?.totalPaidRub)} · долг{" "}
						{money(dashboard?.billingSummary?.totalDueRub)}
					</p>
				</div>
			</button>
			<button
				type="button"
				aria-label="Открыть связь и задачи"
				className="clickable-card min-h-[44px] p-3 min-w-0"
				style={{ textAlign: "left" }}
				onClick={() => handleNavigate("communications")}
				onKeyDown={(e) => {
					if (e.key === "Enter" || e.key === " ") {
						e.preventDefault();
						handleNavigate("communications");
					}
				}}
			>
				<MessageSquare aria-hidden="true" size={24} className="shrink-0" />
				<div className="min-w-0">
					<h3 className="break-words leading-tight">Связь</h3>
					<p className="tile-meta break-words leading-tight">
						{(activeCommunicationTasks?.length ?? 0) > 0
							? countLabel(
									activeCommunicationTasks?.length ?? 0,
									"задача",
									"задачи",
									"задач",
								)
							: "задач нет"}
					</p>
				</div>
			</button>
			<button
				type="button"
				aria-label="Открыть снимки пациента"
				className="clickable-card min-h-[44px] p-3 min-w-0"
				style={{ textAlign: "left" }}
				onClick={() => handleNavigate("imaging")}
				onKeyDown={(e) => {
					if (e.key === "Enter" || e.key === " ") {
						e.preventDefault();
						handleNavigate("imaging");
					}
				}}
			>
				<ImageIcon aria-hidden="true" size={24} className="shrink-0" />
				<div className="min-w-0">
					<h3 className="break-words leading-tight">Снимки</h3>
					<p className="tile-meta break-words leading-tight">
						{(activeImagingStudies?.length ?? 0) > 0
							? countLabel(
									activeImagingStudies?.length ?? 0,
									"снимок",
									"снимка",
									"снимков",
								)
							: "снимков нет"}
					</p>
				</div>
			</button>
		</div>
	);
};
