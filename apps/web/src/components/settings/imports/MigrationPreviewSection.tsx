import React from "react";
import type {
	DocumentIngestionResponse,
	DocumentIngestionTarget,
	ImportIntakeResponse,
	ImportPreviewResponse,
	ImportSourceKind,
} from "@dental/shared";
import {
	CheckCircle2,
	Database,
	FileText,
	Image as ImageIcon,
	UploadCloud,
} from "lucide-react";
import { SmartMicrophoneButton } from "../../SmartMicrophoneButton";
import { importRowStatusLabels } from "./constants";
import { humanizeMigrationText, patientImportRowWarningText } from "./helpers";
import type { InputChangeEvent, TextInputChangeEvent } from "./types";

export interface MigrationPreviewSectionProps {
	settingsTab: string;
	typedImportSourceKinds: ImportSourceKind[];
	importSourceKind: ImportSourceKind;
	importSourceLabels: Record<string, any>;
	typedDocumentIngestionTargets: DocumentIngestionTarget[];
	documentIngestionTarget: DocumentIngestionTarget;
	ingestionTargetLabels: Record<string, string>;
	isDocumentIngesting: boolean;
	typedDocumentIngestion: DocumentIngestionResponse | null | undefined;
	documentDetectedKindLabel: (kind: string) => string;
	documentIngestionQualityLabels: Record<string, string>;
	importText: string;
	patientImportInputReady: boolean;
	isImportLoading: boolean;
	isImportCommitting: boolean;
	typedImportIntake: ImportIntakeResponse | null | undefined;
	typedImportPreview: ImportPreviewResponse | null | undefined;
	importCommit: any;
	setImportSourceKind: (k: ImportSourceKind) => void;
	setImportPreview: (p: any) => void;
	setImportCommit: (c: any) => void;
	setImportIntake: (i: any) => void;
	setDocumentIngestionTarget: (t: DocumentIngestionTarget) => void;
	ingestImportFile: (f: File | undefined) => void;
	setImportText: (t: string | ((prev: string) => string)) => void;
	previewImport: () => void;
	commitImport: () => void;
}

export function MigrationPreviewSection({
	settingsTab,
	typedImportSourceKinds,
	importSourceKind,
	importSourceLabels,
	typedDocumentIngestionTargets,
	documentIngestionTarget,
	ingestionTargetLabels,
	isDocumentIngesting,
	typedDocumentIngestion,
	documentDetectedKindLabel,
	documentIngestionQualityLabels,
	importText,
	patientImportInputReady,
	isImportLoading,
	isImportCommitting,
	typedImportIntake,
	typedImportPreview,
	importCommit,
	setImportSourceKind,
	setImportPreview,
	setImportCommit,
	setImportIntake,
	setDocumentIngestionTarget,
	ingestImportFile,
	setImportText,
	previewImport,
	commitImport,
}: MigrationPreviewSectionProps) {
	if (settingsTab !== "imports") return null;

	return (
		<section
			className="import-studio"
			aria-label="Миграция из старой программы"
		>
			<div className="import-copy">
				<Database aria-hidden="true" />
				<div>
					<p className="eyebrow">Мастер переноса</p>
					<h2>Любой источник сначала проходит предпросмотр</h2>
					<p>
						Здесь живут таблицы, Excel, экспорт старых МИС, OCR с фото
						бумажного журнала, диктовка и свободный текст. В базу ничего не
						пишется без подтверждения.
					</p>
				</div>
			</div>

			<div
				role="toolbar"
				className="import-source-grid"
				aria-label="Источник импорта"
			>
				{(typedImportSourceKinds ?? []).map((kind) => (
					<button
						className={`source-card ${importSourceKind === kind ? "active" : ""}`}
						type="button"
						key={kind}
						aria-pressed={importSourceKind === kind}
						onClick={() => {
							setImportSourceKind(kind);
							setImportPreview(null);
							setImportCommit(null);
						}}
					>
						<strong>{importSourceLabels[kind]?.title ?? kind}</strong>
						<span>{importSourceLabels[kind]?.detail ?? ""}</span>
					</button>
				))}
			</div>

			<section
				className="document-ingestion-panel"
				aria-label="Извлечение текста из файла"
			>
				<div className="document-ingestion-head">
					<FileText aria-hidden="true" />
					<div>
						<strong>Архивы, PDF, Office-файлы, таблицы и текст</strong>
						<span>
							Сначала извлечь текст и таблицы, потом отправить в
							предпросмотр. Без прямой записи в базу.
						</span>
					</div>
				</div>
				<section
					className="document-ingestion-targets"
					aria-label="Куда отправить извлеченный текст"
				>
					{(typedDocumentIngestionTargets ?? []).map((target) => (
						<button
							className={documentIngestionTarget === target ? "active" : ""}
							key={target}
							type="button"
							aria-pressed={documentIngestionTarget === target}
							onClick={() => setDocumentIngestionTarget(target)}
						>
							{ingestionTargetLabels[target] ?? target}
						</button>
					))}
				</section>
				<label className="document-file-upload">
					<UploadCloud aria-hidden="true" />
					<span>
						{isDocumentIngesting ? "Разбираю файл" : "Выбрать файл"}
					</span>
					<small>
						До 8 МБ. Архивы и Office-файлы разбираются встроенным
						извлекателем; PDF без OCR работает в ограниченном режиме.
					</small>
					<input
						accept=".txt,.csv,.tsv,.json,.xml,.html,.htm,.rtf,.zip,.pdf,.doc,.xls,.ppt,.docx,.xlsx,.xlsm,.xlsb,.pptx,.odt,.ods,.odp,image/jpeg,image/png,image/webp"
						type="file"
						onChange={(event: InputChangeEvent) =>
							void ingestImportFile(event.currentTarget.files?.[0])
						}
					/>
				</label>
				{typedDocumentIngestion ? (
					<div className="document-ingestion-result">
						<div className="document-ingestion-stats">
							<span>
								{documentDetectedKindLabel(
									typedDocumentIngestion.detectedKind,
								)}
							</span>
							<span>{typedDocumentIngestion.rowCount} строк</span>
							<span>{typedDocumentIngestion.tableCount} таблиц</span>
							<span>
								{Math.round(typedDocumentIngestion.byteSize / 1024)} КБ
							</span>
							<span>
								{typedDocumentIngestion.extractedFiles.length} файлов
							</span>
						</div>
						<div
							className={`document-quality quality-${typedDocumentIngestion.quality.extractionQuality}`}
						>
							<div>
								<strong>
									{
										documentIngestionQualityLabels[
											typedDocumentIngestion.quality.extractionQuality
										]
									}
								</strong>
								<span>
									{Math.round(
										typedDocumentIngestion.quality.confidence * 100,
									)}
									% ·{" "}
									{
										ingestionTargetLabels[
											typedDocumentIngestion.quality.suggestedTarget
										]
									}
								</span>
							</div>
							<p>{typedDocumentIngestion.quality.nextAction}</p>
							{(typedDocumentIngestion.quality?.signals ?? []).length ? (
								<div className="document-signal-row">
									{(typedDocumentIngestion.quality?.signals ?? [])
										.slice(0, 10)
										.map((signal) => (
											<span key={signal}>
												{humanizeMigrationText(signal)}
											</span>
										))}
								</div>
							) : null}
						</div>
						{(typedDocumentIngestion.extractedFiles ?? []).length ? (
							<section
								className="document-extracted-files"
								aria-label="Извлеченные файлы архива"
							>
								{(typedDocumentIngestion.extractedFiles ?? [])
									.slice(0, 8)
									.map((file) => (
										<span key={`${file.fileName}-${file.detectedKind}`}>
											{documentDetectedKindLabel(file.detectedKind)} ·{" "}
											{file.rowCount} строк · {file.fileName}
										</span>
									))}
							</section>
						) : null}
						<p>
							{typedDocumentIngestion.textPreview || "Текст не извлечен"}
						</p>
						<div className="recognition-notes">
							{(typedDocumentIngestion.routes ?? [])
								.slice(0, 4)
								.map((route) => (
									<span key={route.target}>
										{ingestionTargetLabels[route.target]}:{" "}
										{route.enabled ? "готово" : "пропустить"} ·{" "}
										{route.reason}
									</span>
								))}
							{(typedDocumentIngestion.warnings ?? []).map((warning) => (
								<span key={warning}>{humanizeMigrationText(warning)}</span>
							))}
						</div>
					</div>
				) : null}
			</section>

			<div className="import-workbench">
				<textarea
					aria-label="Данные для проверки импорта"
					placeholder={
						importSourceKind === "image_ocr"
							? "Вставьте распознанный текст (OCR) со страницы бумажного журнала регистрации пациентов..."
							: "Вставьте выгрузку из старой программы или из Excel.\nПо строке на пациента, поля через точку с запятой:\nФИО;Телефон;Дата рождения;Комментарий"
					}
					value={importText}
					onChange={(event: TextInputChangeEvent) => {
						setImportText(event.target.value);
						setImportPreview(null);
						setImportCommit(null);
						setImportIntake(null);
					}}
				/>
				<div className="import-tool-row">
					<SmartMicrophoneButton
						context="general"
						style={{
							color: "var(--slate-500)",
							borderColor: "var(--slate-300)",
						}}
						onResult={(text) => {
							setImportText((current: string) =>
								current ? `${current}\n${text}` : text,
							);
						}}
					/>
					<button
						className="secondary-button"
						type="button"
						onClick={() => {
							setImportSourceKind("image_ocr");
							setImportPreview(null);
							setImportCommit(null);
							setImportIntake(null);
						}}
						title="Режим распознавания фото бумажного журнала (OCR)"
					>
						<ImageIcon aria-hidden="true" /> Фото журнала
					</button>
					<button
						className="primary-button"
						type="button"
						onClick={previewImport}
						disabled={isImportLoading || !patientImportInputReady}
						aria-busy={isImportLoading || undefined}
					>
						<UploadCloud aria-hidden="true" />{" "}
						{isImportLoading ? "Проверяю" : "Проверить"}
					</button>
				</div>
				{!patientImportInputReady ? (
					<p
						className="import-empty-guidance"
						role="status"
						aria-live="polite"
					>
						Вставьте список пациентов, OCR журнала или надиктуйте импорт перед
						проверкой.
					</p>
				) : null}
			</div>

			{typedImportIntake ? (
				<div className="recognition-notes">
					{(typedImportIntake.recognitionNotes ?? []).map((note) => (
						<span key={note}>{note}</span>
					))}
				</div>
			) : null}

			{typedImportPreview ? (
				<div className="import-preview">
					<div className="import-stats">
						<span>{typedImportPreview.totalRows} строк</span>
						<span>{typedImportPreview.readyRows} готово</span>
						<span>{typedImportPreview.warningRows} предупреждения</span>
						<span>{typedImportPreview.blockedRows} к исправлению</span>
					</div>
					<div className="import-actions">
						<button
							className="secondary-button"
							type="button"
							onClick={commitImport}
							disabled={
								isImportCommitting ||
								!patientImportInputReady ||
								typedImportPreview.readyRows === 0
							}
							aria-busy={isImportCommitting || undefined}
						>
							<CheckCircle2 aria-hidden="true" />{" "}
							{isImportCommitting ? "Записываю" : "Импортировать готовые"}
						</button>
						{importCommit ? (
							<span>
								Записано: {importCommit.importedCount}. Пропущено:{" "}
								{importCommit.skippedCount}.
							</span>
						) : (
							<span>В базу попадут только строки без предупреждений.</span>
						)}
					</div>
					<div className="import-rows">
						{(typedImportPreview.rows ?? []).map((row, idx) => (
							<article
								className={`import-row import-${row?.status}`}
								key={row?.rowNumber ?? `imp-row-${idx}`}
							>
								<strong>
									{row?.fullName ?? `Строка ${row?.rowNumber}`}
								</strong>
								<span>
									{importRowStatusLabels[row?.status ?? ""] ?? row?.status}
								</span>
								<span>{row?.phone ?? "нет телефона"}</span>
								<span>{row?.birthDate ?? "нет даты"}</span>
								<p>
									{patientImportRowWarningText(
										row?.warnings ?? [],
										row?.notes,
									)}
								</p>
							</article>
						))}
					</div>
				</div>
			) : null}
		</section>
	);
}
