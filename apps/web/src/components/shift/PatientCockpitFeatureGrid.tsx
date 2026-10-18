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

interface TileItem {
	id: string;
	hash: string;
	label: string;
	title: string;
	meta: string;
	icon: React.ReactElement;
}

export const PatientCockpitFeatureGrid: React.FC<PatientCockpitFeatureGridProps> = ({
	activeUsableDocuments,
	dashboard,
	activeCommunicationTasks,
	activeImagingStudies,
}) => {
	const handleNavigate = (hash: string) => {
		window.location.hash = hash;
	};

	const tiles: TileItem[] = [
		{
			id: "visit",
			hash: "visit",
			label: "Открыть ЭМК и историю",
			title: "ЭМК / История",
			meta: "Приёмы · диагнозы · зубная карта",
			icon: <History aria-hidden="true" size={24} className="shrink-0" />,
		},
		{
			id: "documents",
			hash: "documents",
			label: "Открыть документы",
			title: "Документы",
			meta: (activeUsableDocuments?.length ?? 0) > 0
				? `${countLabel(activeUsableDocuments?.length ?? 0, "документ", "документа", "документов")} по визиту`
				: "по визиту документов нет",
			icon: <FileText aria-hidden="true" size={24} className="shrink-0" />,
		},
		{
			id: "finance",
			hash: "finance",
			label: "Открыть оплаты",
			title: "Оплаты",
			meta: `${money(dashboard?.billingSummary?.totalPaidRub)} · долг ${money(dashboard?.billingSummary?.totalDueRub)}`,
			icon: <CreditCard aria-hidden="true" size={24} className="shrink-0" />,
		},
		{
			id: "communications",
			hash: "communications",
			label: "Открыть связь и задачи",
			title: "Связь",
			meta: (activeCommunicationTasks?.length ?? 0) > 0
				? countLabel(activeCommunicationTasks?.length ?? 0, "задача", "задачи", "задач")
				: "задач нет",
			icon: <MessageSquare aria-hidden="true" size={24} className="shrink-0" />,
		},
		{
			id: "imaging",
			hash: "imaging",
			label: "Открыть снимки пациента",
			title: "Снимки",
			meta: (activeImagingStudies?.length ?? 0) > 0
				? countLabel(activeImagingStudies?.length ?? 0, "снимок", "снимка", "снимков")
				: "снимков нет",
			icon: <ImageIcon aria-hidden="true" size={24} className="shrink-0" />,
		},
	];

	return (
		<div className="patient-feature-grid" data-testid="patient-feature-grid">
			{tiles.map((tile) => (
				<button
					key={tile.id}
					type="button"
					aria-label={tile.label}
					className="clickable-card min-h-[44px] p-3 min-w-0"
					style={{ textAlign: "left" }}
					onClick={() => handleNavigate(tile.hash)}
					onKeyDown={(e) => {
						if (e.key === "Enter" || e.key === " ") {
							e.preventDefault();
							handleNavigate(tile.hash);
						}
					}}
				>
					{tile.icon}
					<div className="min-w-0">
						<h3 className="break-words leading-tight">{tile.title}</h3>
						<p className="tile-meta break-words leading-tight">{tile.meta}</p>
					</div>
				</button>
			))}
		</div>
	);
};
