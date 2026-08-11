import { useCallback } from "react";
import type { ImportIntakeResponse, ImportCommitResponse, ImportSourceKind } from "@dental/shared";
import { actionFailureToast } from "../../lib/panelStateText";
import { logger } from "../../utils/logger";

export interface PatientImportLogicProps {
	importText: string;
	importSourceKind: ImportSourceKind | null;
	migrationQueries: any;
	setImportIntake: (intake: ImportIntakeResponse | null) => void;
	importPreview: any;
	setImportPreview: (preview: any) => void;
	setImportCommit: (commit: ImportCommitResponse | null) => void;
	setIsImportLoading: (loading: boolean) => void;
	setIsImportCommitting: (committing: boolean) => void;
	showToast: (message: string, type?: "success" | "error" | "info" | "warning") => void;
}

export function usePatientImportLogic({
	importText,
	importSourceKind,
	migrationQueries,
	setImportIntake,
	importPreview,
	setImportPreview,
	setImportCommit,
	setIsImportLoading,
	setIsImportCommitting,
	showToast,
}: PatientImportLogicProps) {

	/*
	 * Принимает сырой текст (от ручного ввода или из файла), валидирует базово, и дергает
	 * эндпоинт `buildPatientImportIntake`, который возвращает структуру
	 * `buildPatientImportPreview` (imports.ts:232) в поле `preview`
	 * (importIntakeResponseSchema, packages/shared/src/index.ts:10078). Обратно с
	 * бэка придет `normalizedText` и `recognitionNotes`, если OCR успешно.
	 * Данные затем кладутся в стейт, чтобы юзер посмотрел превью.
	 */
	const previewImport = useCallback(async () => {
		const rawText = (importText || "").trim();
		if (!rawText) {
			showToast(
				"Внимание, пустой текст для импорта: проверьте ввод, OCR и настройки формата.",
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
			// ВАЖНО: сохраняем именно preview-часть
			setImportPreview(intake?.preview ?? null);
			setImportCommit(null);
		} catch (e) {
			logger.error("[import preview] Ошибка при превью", e);
			setImportIntake(null);
			setImportPreview(null);
			showToast(
				actionFailureToast(
					"Ошибка парсинга при превью",
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
		showToast,
	]);

	/*
	 * Этот коммит берет данные, утвержденные юзером, и шлет их на /commit
	 */
	const commitImport = useCallback(async () => {
		const rawText = (importText || "").trim();
		if (!rawText || !importPreview) {
			showToast(
				"Импорт невозможен: сначала необходимо получить превью (preview) и убедиться, что текст не пуст.",
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
				`Импорт выполнен: новых ${commit?.importedCount ?? 0}, пропущено ${commit?.skippedCount ?? 0}.`,
				"success",
			);
		} catch (e) {
			logger.error("[import commit] Ошибка при выполнении", e);
			showToast(
				actionFailureToast(
					"Ошибка базы данных при импорте",
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
		showToast,
	]);

	return {
		previewImport,
		commitImport,
	};
}
