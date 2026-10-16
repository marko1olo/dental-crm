import React from "react";
import { Link as LinkIcon, UserPlus } from "lucide-react";
import { PanelLoadFailure } from "../../PanelLoadFailure";
import { panelStateText, type PanelSubject } from "../../../lib/panelStateText";
import { FamilyCreateForm } from "./FamilyCreateForm";
import { FamilyLinkSearchForm } from "./FamilyLinkSearchForm";

export const FAMILY_SUBJECT: PanelSubject = {
	notLoadedTitle: "Семейный счет не прочитан",
	accusative: "семейный счет пациента",
	emptyTitle: "Пациент не состоит в семейной группе",
	emptyHint: "Семья нужна, когда за лечение платят из общего кошелька: родители за детей, супруги друг за друга.",
	failureConsequence: "Не создавайте семью по этому экрану: возможно, пациент уже в ней состоит, и появится второй общий счет. Сначала обновите.",
};

interface FamilyEmptyActionsProps {
	readonly loadFailure?: { status: number | null } | null | undefined;
	readonly onRetryLoad?: (() => void) | undefined;
	readonly onFamilyDataChanged: () => void;
	readonly isCreating: boolean;
	readonly setIsCreating: (v: boolean) => void;
	readonly isLinking: boolean;
	readonly setIsLinking: (v: boolean) => void;
	readonly newFamilyName: string;
	readonly setNewFamilyName: (name: string) => void;
	readonly searchQuery: string;
	readonly setSearchQuery: (q: string) => void;
	readonly searchResults: any[];
	readonly searchLoading: boolean;
	readonly searchFailed: boolean;
	readonly loading: boolean;
	readonly patientName: string | null;
	readonly handleCreateFamily: () => void;
	readonly handleLinkFamily: (familyId: string) => void;
}

export const FamilyEmptyActions: React.FC<FamilyEmptyActionsProps> = (props) => {
	const {
		loadFailure, onRetryLoad, onFamilyDataChanged,
		isCreating, setIsCreating, isLinking, setIsLinking,
		newFamilyName, setNewFamilyName, searchQuery, setSearchQuery,
		searchResults, searchLoading, searchFailed, loading, patientName,
		handleCreateFamily, handleLinkFamily,
	} = props;

	if (loadFailure) {
		return (
			<div className="mt-3">
				<PanelLoadFailure subject={FAMILY_SUBJECT} status={loadFailure.status} onRetry={onRetryLoad ?? onFamilyDataChanged} />
			</div>
		);
	}

	return (
		<div className="mt-3">
			<p className="text-xs text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
				{panelStateText(FAMILY_SUBJECT, { phase: "empty" }).title}. {panelStateText(FAMILY_SUBJECT, { phase: "empty" }).hint} Создайте новую семью или привяжите пациента к существующей.
			</p>
			{isCreating ? (
				<FamilyCreateForm newFamilyName={newFamilyName} setNewFamilyName={setNewFamilyName} loading={loading} onCreate={handleCreateFamily} onCancel={() => setIsCreating(false)} />
			) : isLinking ? (
				<FamilyLinkSearchForm searchQuery={searchQuery} setSearchQuery={setSearchQuery} searchResults={searchResults} searchLoading={searchLoading} searchFailed={searchFailed} loading={loading} onSelectFamily={handleLinkFamily} onCancel={() => { setIsLinking(false); setSearchQuery(""); }} />
			) : (
				<div className="dente-segmented-bar w-full" role="group" aria-label="Действия с семьей">
					<button
						type="button"
						className="dente-segmented-item flex-1"
						onClick={() => {
							const namePart = typeof patientName === "string" ? patientName.trim().split(" ")[0] : "";
							setNewFamilyName(`Семья ${namePart}`.trim());
							setIsCreating(true);
						}}
					>
						<UserPlus size={14} /> <span>Создать семью</span>
					</button>
					<button type="button" className="dente-segmented-item flex-1" onClick={() => setIsLinking(true)}>
						<LinkIcon size={14} /> <span>Привязать</span>
					</button>
				</div>
			)}
		</div>
	);
};
