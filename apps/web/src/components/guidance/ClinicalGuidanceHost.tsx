/**
 * DENTE CRM — Clinical Guidance Host Container
 *
 * Authority: .agents/THE_HAMMER_MASTER_PROMPT.md & Rule 7 Universal 3-Tier Architecture
 *
 * Orchestrates:
 * 1. Global Keyboard Shortcuts Modal Overlay (? / F1)
 * 2. Contextual Clinical Help Drawer (Slide-Over Tier 2 Warm Context)
 *
 * Guarantees:
 * - 0 intrusive blocking popups on page load
 * - 1-click on-demand toggle
 * - Event-bus decoupled integration (dente:open-shortcuts-overlay, dente:open-help, dente:close-modals)
 */

import React, { useEffect, useState } from "react";
import { useAppStore } from "../../store/appStore";
import { HelpDrawer } from "../common/HelpDrawer";
import type { ClinicalGuideTab } from "../help";
import { KnowledgeBaseHubModal } from "../knowledge";
import { DoctorClinicalTrainingTour } from "../workspace/DoctorClinicalTrainingTour";
import { InteractiveGuideTour } from "../tutorial/InteractiveGuideTour";
import { ClinicalGuidanceModal } from "./ClinicalGuidanceModal";

export const ClinicalGuidanceHost: React.FC = React.memo(() => {
	const {
		isShortcutsModalOpen,
		setShortcutsModalOpen,
		isHelpDrawerOpen,
		setHelpDrawerOpen,
		activeHelpDrawerTab,
		setActiveHelpDrawerTab,
	} = useAppStore();

	const [isKnowledgeHubOpen, setKnowledgeHubOpen] = useState(false);
	const [knowledgeHubTab, setKnowledgeHubTab] = useState<ClinicalGuideTab>("schedule");

	// Global event listeners
	useEffect(() => {
		const handleOpenShortcuts = () => {
			setHelpDrawerOpen(false);
			setKnowledgeHubOpen(false);
			setShortcutsModalOpen(true);
		};

		const handleOpenHelp = (e: Event) => {
			const customEvent = e as CustomEvent<{ tab?: ClinicalGuideTab }>;
			if (customEvent.detail?.tab) {
				setActiveHelpDrawerTab(customEvent.detail.tab);
			}
			setShortcutsModalOpen(false);
			setKnowledgeHubOpen(false);
			setHelpDrawerOpen(true);
		};

		const handleOpenKnowledgeHub = (e: Event) => {
			const customEvent = e as CustomEvent<{ tab?: ClinicalGuideTab }>;
			if (customEvent.detail?.tab) {
				setKnowledgeHubTab(customEvent.detail.tab);
			}
			setShortcutsModalOpen(false);
			setHelpDrawerOpen(false);
			setKnowledgeHubOpen(true);
		};

		const handleCloseModals = () => {
			setShortcutsModalOpen(false);
			setHelpDrawerOpen(false);
			setKnowledgeHubOpen(false);
		};

		window.addEventListener("dente:open-shortcuts-overlay", handleOpenShortcuts);
		window.addEventListener("dente:open-help", handleOpenHelp);
		window.addEventListener("dente:open-knowledge-hub", handleOpenKnowledgeHub);
		window.addEventListener("dente:close-modals", handleCloseModals);

		return () => {
			window.removeEventListener("dente:open-shortcuts-overlay", handleOpenShortcuts);
			window.removeEventListener("dente:open-help", handleOpenHelp);
			window.removeEventListener("dente:open-knowledge-hub", handleOpenKnowledgeHub);
			window.removeEventListener("dente:close-modals", handleCloseModals);
		};
	}, [setShortcutsModalOpen, setHelpDrawerOpen, setActiveHelpDrawerTab]);

	return (
		<>
			<ClinicalGuidanceModal
				isOpen={isShortcutsModalOpen}
				onClose={() => setShortcutsModalOpen(false)}
				onOpenHelpDrawer={(tab) => {
					setShortcutsModalOpen(false);
					if (tab) {
						setActiveHelpDrawerTab(tab);
					}
					setHelpDrawerOpen(true);
				}}
			/>

			<HelpDrawer
				isOpen={isHelpDrawerOpen}
				onClose={() => setHelpDrawerOpen(false)}
				initialTab={activeHelpDrawerTab as ClinicalGuideTab}
				onOpenShortcutsModal={() => {
					setHelpDrawerOpen(false);
					setShortcutsModalOpen(true);
				}}
				onOpenKnowledgeHub={() => {
					setHelpDrawerOpen(false);
					setKnowledgeHubTab((activeHelpDrawerTab as ClinicalGuideTab) || "schedule");
					setKnowledgeHubOpen(true);
				}}
			/>

			<KnowledgeBaseHubModal
				isOpen={isKnowledgeHubOpen}
				onClose={() => setKnowledgeHubOpen(false)}
				initialTab={knowledgeHubTab}
				onOpenShortcuts={() => {
					setKnowledgeHubOpen(false);
					setShortcutsModalOpen(true);
				}}
			/>

			<DoctorClinicalTrainingTour />
			<InteractiveGuideTour />
		</>
	);
});

ClinicalGuidanceHost.displayName = "ClinicalGuidanceHost";
