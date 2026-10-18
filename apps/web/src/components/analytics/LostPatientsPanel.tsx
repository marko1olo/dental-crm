import type React from "react";
import { useState } from "react";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import type { RecallCohortData } from "./analyticsWidgetData.js";
import { LostPatientOfferModal } from "./LostPatientOfferModal";
import { LostPatientsRecallCohortsTable } from "./LostPatientsRecallCohortsTable";
import { LostPatientsHeader } from "./lostPatientsModules/LostPatientsHeader";
import { LostPatientsKpiGrid } from "./lostPatientsModules/LostPatientsKpiGrid";
import { LostPatientsRiskList } from "./lostPatientsModules/LostPatientsRiskList";
import { LostPatientsRiskListControls } from "./lostPatientsModules/LostPatientsRiskListControls";
import type { ChairConfig, LostPatientRow, TabMode } from "./lostPatientsModules/lostPatientTypes";
import { useLostPatientOffer } from "./lostPatientsModules/useLostPatientOffer";
import { useLostPatientsData } from "./lostPatientsModules/useLostPatientsData";

export type { ChairConfig, LostPatientRow };

export interface LostPatientsPanelProps {
	recallCohorts?: RecallCohortData[];
	chairConfigs?: ChairConfig[];
}

export const LostPatientsPanel: React.FC<LostPatientsPanelProps> = ({
	recallCohorts = [],
}) => {
	const { setSelectedPatientId, clinicName } = useAppLogicContext();
	const [activeTab, setActiveTab] = useState<TabMode>("risk_list");

	const {
		patients,
		loading,
		error,
		searchQuery,
		setSearchQuery,
		categoryFilter,
		setCategoryFilter,
		riskBandFilter,
		setRiskBandFilter,
		filteredPatients,
		kpis,
		fetchLostPatients,
	} = useLostPatientsData(recallCohorts);

	const {
		selectedOfferPatient,
		activeOffer,
		copiedText,
		openMenuPatientId,
		handleGenerateOffer,
		handleCopyOffer,
		handleCloseOffer,
		toggleMenu,
	} = useLostPatientOffer(clinicName || undefined);

	const handleOpenPatientCard = (patientId: string) => {
		setSelectedPatientId?.(patientId);
		window.location.hash = "#patients";
	};

	return (
		<div
			data-testid="lost-patients-panel"
			className="rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] shadow-sm p-4 sm:p-5 my-4 pb-12 sm:pb-5"
		>
			<LostPatientsHeader
				totalPatientsCount={patients.length}
				filteredPatientsCount={filteredPatients.length}
				activeTab={activeTab}
				onTabChange={setActiveTab}
				loading={loading}
				onRefresh={fetchLostPatients}
			/>

			<LostPatientsKpiGrid kpis={kpis} />

			{activeTab === "risk_list" && (
				<div>
					<LostPatientsRiskListControls
						searchQuery={searchQuery}
						onSearchChange={setSearchQuery}
						categoryFilter={categoryFilter}
						onCategoryChange={setCategoryFilter}
						riskBandFilter={riskBandFilter}
						onRiskBandChange={setRiskBandFilter}
					/>

					<LostPatientsRiskList
						loading={loading}
						error={error}
						filteredPatients={filteredPatients}
						openMenuPatientId={openMenuPatientId}
						onToggleMenu={toggleMenu}
						onOpenCard={handleOpenPatientCard}
						onGenerateOffer={handleGenerateOffer}
					/>
				</div>
			)}

			{activeTab === "recall_cohorts" && (
				<LostPatientsRecallCohortsTable recallCohorts={recallCohorts} />
			)}

			{selectedOfferPatient && activeOffer && (
				<LostPatientOfferModal
					patient={selectedOfferPatient}
					activeOffer={activeOffer}
					copiedText={copiedText}
					onCopy={handleCopyOffer}
					onClose={handleCloseOffer}
				/>
			)}
		</div>
	);
};

export default LostPatientsPanel;
