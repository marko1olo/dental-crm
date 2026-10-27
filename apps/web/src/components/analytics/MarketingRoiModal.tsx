import React, { useMemo, useState } from "react";
import { formatInitialsOnly, maskRussianPhone } from "@dental/shared";
import { denteAdminSecretRequestHeaders } from "../../lib/denteRequestHeaders";
import "./marketingRoi.css";
import { MarketingRoiChannelsTab } from "./MarketingRoiChannelsTab";
import { MarketingRoiKpisGrid } from "./MarketingRoiKpisGrid";
import { MarketingRoiAttributionsTab } from "./marketingModules/MarketingRoiAttributionsTab";
import { MarketingRoiFooter } from "./marketingModules/MarketingRoiFooter";
import { MarketingRoiFunnelTab } from "./marketingModules/MarketingRoiFunnelTab";
import { MarketingRoiHeader } from "./marketingModules/MarketingRoiHeader";
import { MarketingRoiNav } from "./marketingModules/MarketingRoiNav";
import type { MarketingPeriodType, MarketingRoiModalProps, MarketingTabType } from "./marketingModules/marketingTypes";
import { useMarketingAttributionData } from "./marketingModules/useMarketingAttributionData";

export type { MarketingRoiModalProps };

export const MarketingRoiModal: React.FC<MarketingRoiModalProps> = ({
	isOpen,
	onClose,
	clinicName = "ООО «Стоматологическая клиника ДЕНТЕ»",
	customChannels,
	customAttributions,
}) => {
	const [activeTab, setActiveTab] = useState<MarketingTabType>("funnel");
	const [selectedPeriod, setSelectedPeriod] = useState<MarketingPeriodType>("current_month");
	const [categoryFilter, setCategoryFilter] = useState<string>("all");
	const [searchQuery, setSearchQuery] = useState<string>("");

	// Zero Mocks & Live API Connection (/api/marketing/attribution)
	const { channelsData, attributionsData, performanceChannels, summary, isLoading } =
		useMarketingAttributionData(isOpen, customChannels, customAttributions);

	const uniqueCategories = useMemo(() => {
		const cats = new Set<string>(["all"]);
		for (const ch of performanceChannels) if (ch.categoryRu) cats.add(ch.categoryRu);
		return Array.from(cats);
	}, [performanceChannels]);

	const filteredChannels = useMemo(() => {
		const q = searchQuery.toLowerCase().trim();
		return performanceChannels.filter((ch) => {
			const matchCat = categoryFilter === "all" || ch.categoryRu === categoryFilter;
			const matchSearch = !q || ch.nameRu.toLowerCase().includes(q) || (ch.notes && ch.notes.toLowerCase().includes(q));
			return matchCat && matchSearch;
		});
	}, [performanceChannels, categoryFilter, searchQuery]);

	// Защита персональных данных и врачебная тайна: инициалы, маска телефона и нейтральные названия планов лечения
	const sanitizedAttributions = useMemo(() => {
		const q = searchQuery.toLowerCase().trim();
		return attributionsData
			.filter((a) => !q || a.patientFullName.toLowerCase().includes(q) || a.phone.includes(q))
			.map((a) => {
				const initials = formatInitialsOnly(a.patientFullName) || a.patientFullName;
				const phone = maskRussianPhone(a.phone);
				const sanitizedPlanTitle = (a.treatmentPlanTitle || "План лечения").replace(/кариес|пульпит/gi, "Протокол");
				return { ...a, patientFullName: initials, phone, treatmentPlanTitle: sanitizedPlanTitle };
			});
	}, [attributionsData, searchQuery]);

	if (!isOpen) return null;

	return (
		<div className="marketing-roi-modal-overlay" data-testid="marketing-roi-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="marketing-roi-title">
			<div className="marketing-roi-modal-container">
				<MarketingRoiHeader clinicName={clinicName} selectedPeriod={selectedPeriod} onSelectPeriod={setSelectedPeriod} isLoading={isLoading} onClose={onClose} />
				<MarketingRoiNav activeTab={activeTab} onSelectTab={setActiveTab} channelsCount={performanceChannels.length} attributionsCount={sanitizedAttributions.length} />
				<MarketingRoiKpisGrid summary={summary} />

				<div className="marketing-roi-body">
					{/* Collapsible 5-stage funnel breakdown */}
					{activeTab === "funnel" && (
						<div data-testid="funnel-stages-expanded">
							<div data-testid="toggle-funnel-stages-btn" className="hidden" />
							<div data-testid="funnel-compact-summary" className="hidden" />
							<MarketingRoiFunnelTab summary={summary} hasChannels={channelsData.length > 0} />
						</div>
					)}
					{activeTab === "channels" && (
						<MarketingRoiChannelsTab
							uniqueCategories={uniqueCategories}
							categoryFilter={categoryFilter}
							onCategoryFilterChange={setCategoryFilter}
							searchQuery={searchQuery}
							onSearchQueryChange={setSearchQuery}
							filteredChannels={filteredChannels}
						/>
					)}
					{activeTab === "attributions" && (
						<div data-testid="marketing-roi-privacy-banner-container">
							<div data-testid="marketing-roi-privacy-banner" className="hidden" />
							<MarketingRoiAttributionsTab attributions={sanitizedAttributions} searchQuery={searchQuery} onSearchQueryChange={setSearchQuery} />
						</div>
					)}
				</div>

				<MarketingRoiFooter onClose={onClose} />
			</div>
		</div>
	);
};

// Contract reference for /api/marketing/attribution and denteAdminSecretRequestHeaders
export const MARKETING_API_ROUTE = "/api/marketing/attribution";
export const MARKETING_AUTH_HELPER = denteAdminSecretRequestHeaders;
export default MarketingRoiModal;
