import React, { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import {
	type OrthoData,
	getTodayString,
	parseLegacyOrthoNotes,
	parseOrthoProgress,
} from "./orthodonticProgressSerialization";
import { useOrthodonticActions } from "./useOrthodonticActions";
import { useOrthodonticQuickClinicalActions } from "./useOrthodonticQuickClinicalActions";
import { OrthodonticEditForm } from "./OrthodonticEditForm";
import { OrthodonticTrackerDisplay } from "./OrthodonticTrackerDisplay";
import { OrthodonticQuickActionsBar } from "./OrthodonticQuickActionsBar";

export function OrthodonticProgressWidget({ patientId }: { patientId: string }) {
	const { dashboard, auth, loadDashboard } = useAppLogicContext();
	const [isEditing, setIsEditing] = useState(false);
	const [saving, setSaving] = useState(false);

	const patient = (dashboard?.patients ?? []).find(
		(p: { id?: string }) => p?.id === patientId,
	);

	const orthoFromProfile = parseOrthoProgress(
		patient?.administrativeProfile?.orthodonticProgress,
	);
	const { cleanNotes, legacyOrtho } = parseLegacyOrthoNotes(patient?.notes);
	const ortho: OrthoData | null = orthoFromProfile || legacyOrtho || null;

	const [formCurrent, setFormCurrent] = useState(ortho?.currentAligner ?? 1);
	const [formTotal, setFormTotal] = useState(ortho?.totalAligners ?? 40);
	const [formStart, setFormStart] = useState(ortho?.startDate ?? getTodayString());

	const [prevPatientId, setPrevPatientId] = useState(patientId);
	if (patientId !== prevPatientId) {
		setPrevPatientId(patientId);
		setIsEditing(false);
		setFormCurrent(ortho?.currentAligner ?? 1);
		setFormTotal(ortho?.totalAligners ?? 40);
		setFormStart(ortho?.startDate ?? getTodayString());
	}

	if (!patient) return null;

	const { handleSave, handleResetWidget, handleQuickIncrement } = useOrthodonticActions({
		patientId, patient, ortho, legacyOrtho, cleanNotes, saving, setSaving, setIsEditing, loadDashboard, auth,
	});
	const { handleQuickIssueSet, handleQuickWireChange, handleQuickLigatureActivate } =
		useOrthodonticQuickClinicalActions({
			patientId, ortho, saving, setSaving, loadDashboard, auth,
		});

	const handleStartEdit = () => {
		setFormCurrent(ortho?.currentAligner ?? 1);
		setFormTotal(ortho?.totalAligners ?? 40);
		setFormStart(ortho?.startDate ?? getTodayString());
		setIsEditing(true);
	};

	return (
		<motion.div
			data-testid="orthodontic-progress-widget"
			className="ortho-progress-widget bg-[var(--paper)] text-[var(--ink)] border border-[var(--glass-border)] rounded-2xl p-5 mt-4 shadow-sm"
			initial={{ opacity: 0, y: 10 }}
			animate={{ opacity: 1, y: 0 }}
		>
			<AnimatePresence mode="wait">
				{isEditing ? (
					<OrthodonticEditForm
						formCurrent={formCurrent}
						setFormCurrent={setFormCurrent}
						formTotal={formTotal}
						setFormTotal={setFormTotal}
						formStart={formStart}
						setFormStart={setFormStart}
						saving={saving}
						hasActiveTracker={ortho !== null}
						onSubmit={(e) => handleSave(e, formCurrent, formTotal, formStart)}
						onCancel={() => setIsEditing(false)}
						onReset={handleResetWidget}
					/>
				) : (
					<motion.div
						key="view"
						initial={{ opacity: 0, x: 10 }}
						animate={{ opacity: 1, x: 0 }}
						exit={{ opacity: 0, x: -10 }}
					>
						<OrthodonticTrackerDisplay ortho={ortho} onStartEdit={handleStartEdit}>
							<OrthodonticQuickActionsBar
								saving={saving}
								currentAligner={ortho?.currentAligner ?? 1}
								totalAligners={ortho?.totalAligners ?? 40}
								onQuickIncrement={handleQuickIncrement}
								onQuickIssueSet={handleQuickIssueSet}
								onQuickWireChange={handleQuickWireChange}
								onQuickLigatureActivate={handleQuickLigatureActivate}
							/>
						</OrthodonticTrackerDisplay>
					</motion.div>
				)}
			</AnimatePresence>
		</motion.div>
	);
}
