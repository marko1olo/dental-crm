/**
 * apps/web/src/components/settings/migration/MigrationDiscoveryPanel.tsx
 *
 * Панель результатов автоматического поиска баз на сервере.
 *
 * Mandate 8b: Строго <= 800 строк.
 * Mandate 8d: Ноль мультяшных эмодзи.
 */

import type { DiscoveryResponse } from "./migrationTypes";

export function MigrationDiscoveryPanel(props: {
	discovery: DiscoveryResponse;
	onClose: () => void;
}) {
	const { discovery } = props;
	return (
		<div className="mw-discovery">
			<header>
				<strong>Найдено на сервере</strong>
				<span className="mw-discovery-meta">
					просмотрено {discovery.scan.filesScanned} файлов за{" "}
					{(discovery.scan.elapsedMs / 1000).toFixed(1)} с
				</span>
				<button
					type="button"
					className="mw-alert-close"
					onClick={props.onClose}
					aria-label="Закрыть"
				>
					×
				</button>
			</header>

			{discovery.readySources.length > 0 && (
				<section>
					<h4>Читаются сразу — {discovery.summary.readable}</h4>
					<ul className="mw-discovery-list">
						{discovery.readySources.slice(0, 10).map((source) => (
							<li key={source.filePath}>
								<span className="mw-d-name">{source.fileName}</span>
								<span className="mw-d-format">{source.format}</span>
								<span className="mw-d-path">{source.filePath}</span>
								{source.details.length > 0 && (
									<span className="mw-d-details">
										{source.details.join(" ")}
									</span>
								)}
							</li>
						))}
					</ul>
				</section>
			)}

			{discovery.needsExportSources.length > 0 && (
				<section>
					<h4>
						Требуют выгрузки из своей программы —{" "}
						{discovery.summary.needsExport}
					</h4>
					<ul className="mw-discovery-list">
						{discovery.needsExportSources.slice(0, 10).map((source) => (
							<li key={source.filePath}>
								<span className="mw-d-name">{source.fileName}</span>
								<span className="mw-d-format">
									{source.format}
									{source.version !== null && ` · ${source.version}`}
								</span>
								<span className="mw-d-path">{source.filePath}</span>
								{source.guidance !== null && (
									<span className="mw-d-guidance">{source.guidance}</span>
								)}
							</li>
						))}
					</ul>
				</section>
			)}

			{discovery.imagingFolders.length > 0 && (
				<section>
					<h4>Каталоги со снимками</h4>
					<ul className="mw-discovery-list">
						{discovery.imagingFolders.slice(0, 5).map((folder) => (
							<li key={folder.directory}>
								<span className="mw-d-name">
									{folder.fileCount} файлов DICOM
								</span>
								<span className="mw-d-path">{folder.directory}</span>
							</li>
						))}
					</ul>
				</section>
			)}

			{discovery.warnings.map((warning) => (
				<p className="mw-discovery-warning" key={warning}>
					{warning}
				</p>
			))}
		</div>
	);
}
