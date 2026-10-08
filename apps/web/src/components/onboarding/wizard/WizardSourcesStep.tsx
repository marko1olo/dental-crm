import React from "react";
import type {
	DocumentIngestionTarget,
	ImagingSourceKind,
	ImportSourceKind,
	PricelistSourceKind,
	SmartImportMode,
} from "@dental/shared";
import type { WizardSourcesStepProps } from "./types";

export function WizardSourcesStep({
	pricelistSourceKindLabels,
	pricelistSourceKind,
	setPricelistSourceKind,
	clearPricelistImage,
	setPricelistAnalysis,
	importSourceLabels,
	importSourceKind,
	setImportSourceKind,
	setImportPreview,
	setImportCommit,
	smartImportModeLabels,
	smartImportMode,
	setSmartImportMode,
	setSmartImportPreview,
	setSmartImportCommit,
	ingestionTargetLabels,
	documentIngestionTarget,
	setDocumentIngestionTarget,
	imagingSourceChoices,
	imagingImportSourceKind,
	imagingSourceLabels,
	setImagingImportSourceKind,
	setImagingImportPreview,
	setImagingImportCommit,
	setDicomSeriesPreview,
	dicomWebEndpointUrl,
	setDicomWebEndpointUrl,
	setDicomWebCheck,
	setDicomViewerLaunchManifest,
	setDicomViewerToolStateBundle,
	setDicomViewerWorkbenchManifest,
	ohifBaseUrl,
	setOhifBaseUrl,
	setSettingsTab,
}: WizardSourcesStepProps) {
	return (
		<div className="onboarding-panel">
			<div>
				<h3>Источники данных</h3>
				<p>
					Выберите рабочие источники один раз. Система сохранит эти
					настройки автоматически и будет использовать их в прайсах,
					переносе пациентов, документах, снимках и внешнем просмотре КТ,
					пока клиника сама их не поменяет.
				</p>
			</div>
			<section
				className="onboarding-source-config"
				aria-label="Быстрая настройка источников данных"
			>
				<section className="onboarding-source-section">
					<div>
						<strong>Прайс клиники</strong>
						<span>
							Откуда администратор чаще всего заносит цены и материалы.
						</span>
					</div>
					<fieldset
						className="onboarding-source-choice-row"
						aria-label="Источник прайса"
						style={{ border: "none", padding: 0, margin: 0 }}
					>
						<legend className="sr-only">Источник прайса</legend>
						{(
							Object.keys(
								pricelistSourceKindLabels,
							) as PricelistSourceKind[]
						).map((kind) => (
							<button
								className={pricelistSourceKind === kind ? "active" : ""}
								key={kind}
								type="button"
								aria-pressed={pricelistSourceKind === kind}
								onClick={() => {
									setPricelistSourceKind(kind);
									if (kind !== "photo_ocr") clearPricelistImage();
									setPricelistAnalysis(null);
								}}
							>
								{pricelistSourceKindLabels[kind]}
							</button>
						))}
					</fieldset>
				</section>
				<section className="onboarding-source-section">
					<div>
						<strong>Перенос пациентов</strong>
						<span>Основной формат старой базы или бумажного журнала.</span>
					</div>
					<fieldset
						className="onboarding-source-choice-row"
						aria-label="Источник переноса пациентов"
						style={{ border: "none", padding: 0, margin: 0 }}
					>
						<legend className="sr-only">Источник переноса пациентов</legend>
						{(Object.keys(importSourceLabels) as ImportSourceKind[]).map(
							(kind) => (
								<button
									className={importSourceKind === kind ? "active" : ""}
									key={kind}
									type="button"
									aria-pressed={importSourceKind === kind}
									onClick={() => {
										setImportSourceKind(kind);
										setImportPreview(null);
										setImportCommit(null);
									}}
								>
									{importSourceLabels[kind].title}
								</button>
							),
						)}
					</fieldset>
				</section>
				<section className="onboarding-source-section">
					<div>
						<strong>Смешанная выгрузка</strong>
						<span>
							Как разбирать файл, где вместе пациенты, снимки и служебные
							строки.
						</span>
					</div>
					<fieldset
						className="onboarding-source-choice-row"
						aria-label="Режим смешанного импорта"
						style={{ border: "none", padding: 0, margin: 0 }}
					>
						<legend className="sr-only">Режим смешанного импорта</legend>
						{(Object.keys(smartImportModeLabels) as SmartImportMode[]).map(
							(mode) => (
								<button
									className={smartImportMode === mode ? "active" : ""}
									key={mode}
									type="button"
									aria-pressed={smartImportMode === mode}
									onClick={() => {
										setSmartImportMode(mode);
										setSmartImportPreview(null);
										setSmartImportCommit(null);
									}}
								>
									{smartImportModeLabels[mode].title}
								</button>
							),
						)}
					</fieldset>
				</section>
				<section className="onboarding-source-section">
					<div>
						<strong>Документы и файлы</strong>
						<span>
							Куда по умолчанию отправлять распознанный документ, таблицу,
							архив или фото.
						</span>
					</div>
					<fieldset
						className="onboarding-source-choice-row"
						aria-label="Маршрут распознанных документов"
						style={{ border: "none", padding: 0, margin: 0 }}
					>
						<legend className="sr-only">
							Маршрут распознанных документов
						</legend>
						{(
							Object.keys(
								ingestionTargetLabels,
							) as DocumentIngestionTarget[]
						).map((target) => (
							<button
								className={
									documentIngestionTarget === target ? "active" : ""
								}
								key={target}
								type="button"
								aria-pressed={documentIngestionTarget === target}
								onClick={() => setDocumentIngestionTarget(target)}
							>
								{ingestionTargetLabels[target]}
							</button>
						))}
					</fieldset>
				</section>
				<section className="onboarding-source-section onboarding-source-section-wide">
					<div>
						<strong>Снимки и КТ</strong>
						<span>
							Основной поток RVG, ОПТГ, КТ, архива снимков или локальных
							папок.
						</span>
					</div>
					<fieldset
						className="onboarding-source-choice-row"
						aria-label="Источник снимков"
						style={{ border: "none", padding: 0, margin: 0 }}
					>
						<legend className="sr-only">Источник снимков</legend>
						{imagingSourceChoices.map((kind) => (
							<button
								className={imagingImportSourceKind === kind ? "active" : ""}
								key={kind}
								type="button"
								aria-pressed={imagingImportSourceKind === kind}
								onClick={() => {
									setImagingImportSourceKind(kind);
									setImagingImportPreview(null);
									setImagingImportCommit(null);
									setDicomSeriesPreview(null);
								}}
							>
								{imagingSourceLabels[kind]}
							</button>
						))}
					</fieldset>
				</section>
				<section className="onboarding-source-section onboarding-source-section-wide">
					<div>
						<strong>Архив снимков и внешний просмотр</strong>
						<span>
							Адреса просмотрщика сохраняются вместе с остальными
							настройками источников.
						</span>
					</div>
					<div className="onboarding-source-url-grid">
						<label>
							Адрес архива снимков
							<input
								value={dicomWebEndpointUrl}
								onChange={(event) => {
									setDicomWebEndpointUrl(event.target.value);
									setDicomWebCheck(null);
									setDicomViewerLaunchManifest(null);
									setDicomViewerToolStateBundle(null);
									setDicomViewerWorkbenchManifest(null);
								}}
								placeholder="http://127.0.0.1:8042/dicom-web"
							/>
						</label>
						<label>
							Адрес внешнего просмотра
							<input
								value={ohifBaseUrl}
								onChange={(event) => {
									setOhifBaseUrl(event.target.value);
									setDicomViewerLaunchManifest(null);
									setDicomViewerWorkbenchManifest(null);
								}}
								placeholder="http://127.0.0.1:3000"
							/>
						</label>
					</div>
				</section>
			</section>
			<div className="onboarding-source-grid">
				<span>
					Автосохранено: прайс, импорт, документы, снимки, архив и внешний
					просмотр
				</span>
				<button
					type="button"
					onClick={() => {
						setSettingsTab("prices");
						window.location.hash = "settings/prices";
					}}
				>
					Открыть прайс
				</button>
				<button
					type="button"
					onClick={() => {
						setSettingsTab("imports");
						window.location.hash = "settings/imports";
					}}
				>
					Открыть перенос
				</button>
				<button
					type="button"
					onClick={() => {
						setSettingsTab("sources");
						window.location.hash = "settings/sources";
					}}
				>
					Открыть снимки
				</button>
			</div>
		</div>
	);
}
