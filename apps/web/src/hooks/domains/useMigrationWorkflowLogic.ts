import { useCallback } from "react";
import { showToast } from "../../components/GlobalToast";
import { actionFailureToast } from "../../lib/panelStateText";
import { logger } from "../../utils/logger";
import type { ImportIntakeResponse, ImportCommitResponse } from "@dental/shared";

export interface MigrationWorkflowLogicProps {
	migrationQueries: any;
	importText: string | null;
	importSourceKind: string | null;
	importPreview: any;
	setImportIntake: (intake: any) => void;
	setImportPreview: (preview: any) => void;
	setImportCommit: (commit: any) => void;
	setIsImportLoading: (loading: boolean) => void;
	setIsImportCommitting: (committing: boolean) => void;
}

export function useMigrationWorkflowLogic({
	migrationQueries,
	importText,
	importSourceKind,
	importPreview,
	setImportIntake,
	setImportPreview,
	setImportCommit,
	setIsImportLoading,
	setIsImportCommitting,
}: MigrationWorkflowLogicProps) {
	const previewImport = useCallback(async () => {
		const rawText = (importText || "").trim();
		if (!rawText) {
			showToast(
				"Cannot Preview Import: Text is empty.",
				"error",
			);
			return;
		}
		setIsImportLoading(true);
		try {
			const res = await migrationQueries.previewImport({
				sourceName: "manual_input",
				sourceKind: importSourceKind || "csv_text",
				rawText,
			});
			const intake = (await res.json()) as ImportIntakeResponse;
			setImportIntake(intake);
			setImportPreview(intake?.preview ?? null);
			setImportCommit(null);
		} catch (e) {
			logger.error("[import preview] error", e);
			setImportIntake(null);
			setImportPreview(null);
			showToast(
				actionFailureToast(
					"Import preview failed",
					(e as { status?: number })?.status ?? null,
				),
				"error",
			);
		} finally {
			setIsImportLoading(false);
		}
	}, [
		importText,
		importSourceKind,
		migrationQueries,
		setImportIntake,
		setImportPreview,
		setImportCommit,
		setIsImportLoading,
	]);

	const commitImport = useCallback(async () => {
		const rawText = (importText || "").trim();
		if (!rawText || !importPreview) {
			showToast(
				"Cannot Commit Import: Missing data or preview.",
				"error",
			);
			return;
		}
		setIsImportCommitting(true);
		try {
			const res = await migrationQueries.commitImport({
				sourceName: "manual_input",
				sourceKind: importSourceKind || "csv_text",
				rawText,
			});
			const commit = (await res.json()) as ImportCommitResponse;
			setImportCommit(commit);
			setImportPreview(commit?.preview ?? importPreview);
			showToast(
				`Successfully imported ${commit?.importedCount ?? 0}, skipped ${commit?.skippedCount ?? 0}.`,
				"success",
			);
		} catch (e) {
			logger.error("[import commit] error", e);
			showToast(
				actionFailureToast(
					"Import commit failed",
					(e as { status?: number })?.status ?? null,
				),
				"error",
			);
		} finally {
			setIsImportCommitting(false);
		}
	}, [
		importText,
		importSourceKind,
		importPreview,
		migrationQueries,
		setImportCommit,
		setImportPreview,
		setIsImportCommitting,
	]);

	return {
		previewImport,
		commitImport,
	};
}
