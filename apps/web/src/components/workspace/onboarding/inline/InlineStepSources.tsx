import type {
	PricelistSourceKind,
	ImportSourceKind,
	SmartImportMode,
	DocumentIngestionTarget,
} from "@dental/shared";
import React from "react";
import {
	pricelistSourceKindLabels,
	importSourceLabels,
	smartImportModeLabels,
	ingestionTargetLabels,
	imagingSourceChoices,
	imagingSourceLabels,
} from "../../../../AppHelpers";
import { useAppLogicContext } from "../../../../contexts/AppLogicContext";

export function InlineStepSources() {
	const {
		pricelistSourceKind,
		setPricelistSourceKind,
		clearPricelistImage,
		setPricelistAnalysis,
		importSourceKind,
		setImportSourceKind,
		setImportPreview,
		setImportCommit,
		smartImportMode,
		setSmartImportMode,
		setSmartImportPreview,
		setSmartImportCommit,
		documentIngestionTarget,
		setDocumentIngestionTarget,
		imagingImportSourceKind,
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
	} = useAppLogicContext();

	return (
		<div className="onboarding-panel">
			<div>
				<h3>Источники данных</h3>
				<p>
					Выберите рабочие источники один раз. Система сохранит эти настройки
					автоматически и будет использовать их в прайсах, переносе
					пациентов, документах, снимках и внешнем просмотре КТ, пока
					клиника сама их не поменяет.
				</p>
			</div>

			<div
				className="onboarding-source-config"
				aria-label="Быстрая настройка источников данных"
			>
				<section className="onboarding-source-section">
					<div>
						<strong>Прайс клиники</strong>
						<span>Откуда администратор чаще всего заносит цены и материалы.</span>
					</div>
					<div
						className="onboarding-source-choice-row"
						aria-label="Источник прайса"
					>
						{(Object.keys(pricelistSourceKindLabels) as PricelistSourceKind[]).map(
							(kind) => (
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
							),
						)}
					</div>
				</section>

				<section className="onboarding-source-section">
					<div>
						<strong>Перенос пациентов</strong>
						<span>Основной формат старой базы или бумажного журнала.</span>
					</div>
					<div
						className="onboarding-source-choice-row"
						aria-label="Источник переноса пациентов"
					>
						{(Object.keys(importSourceLabels) as ImportSourceKind[]).map((kind) => (
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
						))}
					</div>
				</section>

				<section className="onboarding-source-section">
					<div>
						<strong>Смешанная выгрузка</strong>
						<span>
							Как разбирать файл, где вместе пациенты, снимки и служебные
							строки.
						</span>
					</div>
					<div
						className="onboarding-source-choice-row"
						aria-label="Режим смешанного импорта"
					>
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
					</div>
				</section>

				<section className="onboarding-source-section">
					<div>
						<strong>Документы и файлы</strong>
						<span>
							Куда по умолчанию отправлять распознанный документ, таблицу, архив
							или фото.
						</span>
					</div>
					<div
						className="onboarding-source-choice-row"
						aria-label="Маршрут распознанных документов"
					>
						{(Object.keys(ingestionTargetLabels) as DocumentIngestionTarget[]).map(
							(target) => (
								<button
									className={documentIngestionTarget === target ? "active" : ""}
									key={target}
									type="button"
									aria-pressed={documentIngestionTarget === target}
									onClick={() => setDocumentIngestionTarget(target)}
								>
									{ingestionTargetLabels[target]}
								</button>
							),
						)}
					</div>
				</section>

				<section className="onboarding-source-section onboarding-source-section-wide">
					<div>
						<strong>Снимки и КТ</strong>
						<span>
							Основной поток RVG, ОПТГ, КТ, архива снимков или локальных папок.
						</span>
					</div>
					<div
						className="onboarding-source-choice-row"
						aria-label="Источник снимков"
					>
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
					</div>
				</section>

				<section className="onboarding-source-section onboarding-source-section-wide">
					<div>
						<strong>Архив снимков и внешний просмотр</strong>
						<span>
							Адреса просмотрщика сохраняются вместе с остальными настройками
							источников.
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
			</div>

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
