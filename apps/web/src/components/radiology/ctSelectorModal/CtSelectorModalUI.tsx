import React, { useId, useRef } from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, HardDrive, Scan, X } from "lucide-react";
import type { CtSelectorModalProps } from "./types";
import { useCtSelector } from "./useCtSelector";
import { CtSelectorLaunchModes } from "./sections/CtSelectorLaunchModes";
import { CtSelectorDownloadsSection } from "./sections/CtSelectorDownloadsSection";
import { CtSelectorDropzoneSection } from "./sections/CtSelectorDropzoneSection";
import { CtSelectorRecentStudiesSection } from "./sections/CtSelectorRecentStudiesSection";

export function CtSelectorModalUI(props: CtSelectorModalProps) {
	const modalId = useId();
	const zipInputRef = useRef<HTMLInputElement | null>(null);
	const folderInputRef = useRef<HTMLInputElement | null>(null);
	const filesInputRef = useRef<HTMLInputElement | null>(null);

	const {
		launchMode,
		setLaunchMode,
		downloads,
		isScanningDownloads,
		refreshDownloads,
		selectedViewerId,
		setSelectedViewerId,
		isDragOver,
		isExtracting,
		extractionStatus,
		extractionPercent,
		patientStudies,
		isLoadingStudies,
		isDesktop,
		launchStudy,
		processFileList,
		processZipFile,
		handleDragOver,
		handleDragLeave,
		handleDrop,
	} = useCtSelector(props);

	const { onClose, patientName, cardNumber, isOpen } = props;

	if (!isOpen) return null;

	const modalContent = (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-xs select-none"
			data-testid="ct-selector-modal-backdrop"
			onClick={(e) => {
				if (e.target === e.currentTarget) onClose();
			}}
			role="dialog"
			aria-modal="true"
			aria-labelledby={`${modalId}-title`}
		>
			<div
				className="w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl border border-[var(--line,#334155)] bg-[var(--paper,#0f172a)] text-[var(--ink,#f8fafc)] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
				data-testid="ct-selector-modal"
				style={{
					backgroundColor: "var(--paper)",
					color: "var(--ink)",
					borderColor: "var(--line)",
				}}
			>
				{/* ШАПКА: Заголовок, контекст пациента, статус десктопа и крестик */}
				<header className="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-[var(--line)] bg-[var(--paper-soft)] shrink-0">
					<div className="flex items-center gap-3 min-w-0">
						<div className="w-9 h-9 rounded-xl bg-teal-500/15 text-teal-600 dark:text-teal-400 border border-teal-500/30 flex items-center justify-center shrink-0">
							<Scan className="w-5 h-5" />
						</div>
						<div className="min-w-0">
							<div className="flex items-center gap-2 flex-wrap">
								<h2
									id={`${modalId}-title`}
									className="text-sm sm:text-base font-bold text-[var(--ink)] m-0 leading-tight"
								>
									Клинический КТ-селектор
								</h2>
								<span
									className="px-2 py-0.5 rounded text-[11px] font-semibold bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30"
									data-testid="badge-ct-3d"
								>
									3D КЛКТ
								</span>
								{isDesktop ? (
									<span className="px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
										<CheckCircle2 size={12} />
										<span>DENTE Desktop (.exe)</span>
									</span>
								) : (
									<div className="flex items-center gap-1.5">
										<span className="px-2 py-0.5 rounded text-[11px] font-medium bg-zinc-500/15 text-[var(--muted)] border border-[var(--line)]">
											Браузер
										</span>
										<a
											href="/download/dente-desktop.exe"
											className="px-2 py-0.5 rounded text-[11px] font-semibold bg-teal-500/15 hover:bg-teal-500/25 text-teal-700 dark:text-teal-300 border border-teal-500/30 flex items-center gap-1 transition-colors no-underline cursor-pointer"
											data-testid="link-download-desktop-app"
											title="Скачать приложение DENTE Desktop для Windows (.exe) с аппаратным ускорением GPU"
										>
											<HardDrive size={11} />
											<span>Скачать .EXE</span>
										</a>
									</div>
								)}
							</div>
							<p className="text-xs text-[var(--muted)] m-0 mt-0.5 truncate">
								{patientName ? (
									<>
										Пациент: <strong className="text-[var(--ink)]">{patientName}</strong>
										{cardNumber ? ` · Медкарта: ${cardNumber}` : ""}
									</>
								) : (
									"Быстрый запуск и добавление КТ-исследований"
								)}
							</p>
						</div>
					</div>

					<button
						type="button"
						onClick={onClose}
						className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-soft)] transition-colors cursor-pointer shrink-0 border border-transparent hover:border-[var(--line)]"
						data-testid="btn-close-ct-selector"
						title="Закрыть окно селектора (Esc)"
					>
						<X size={18} />
					</button>
				</header>

				{/* ТЕЛО МОДАЛКИ: Секции с декомпозированными модулями */}
				<div className="flex-1 overflow-y-auto p-4 sm:p-5 flex flex-col gap-5">
					<CtSelectorLaunchModes
						launchMode={launchMode}
						setLaunchMode={setLaunchMode}
						isDesktop={isDesktop}
						selectedViewerId={selectedViewerId}
						setSelectedViewerId={setSelectedViewerId}
					/>

					<CtSelectorDownloadsSection
						downloads={downloads}
						isScanningDownloads={isScanningDownloads}
						refreshDownloads={refreshDownloads}
						launchStudy={launchStudy}
					/>

					<CtSelectorDropzoneSection
						zipInputRef={zipInputRef}
						folderInputRef={folderInputRef}
						filesInputRef={filesInputRef}
						isDragOver={isDragOver}
						isExtracting={isExtracting}
						extractionStatus={extractionStatus}
						extractionPercent={extractionPercent}
						processFileList={processFileList}
						processZipFile={processZipFile}
						handleDragOver={handleDragOver}
						handleDragLeave={handleDragLeave}
						handleDrop={handleDrop}
					/>

					<CtSelectorRecentStudiesSection
						patientStudies={patientStudies}
						isLoadingStudies={isLoadingStudies}
						launchStudy={launchStudy}
					/>
				</div>

				{/* ПОДВАЛ МОДАЛКИ: Информирование и закрытие */}
				<footer className="flex items-center justify-between gap-3 px-5 py-3 border-t border-[var(--line)] bg-[var(--paper-soft)] shrink-0 text-xs text-[var(--muted)]">
					<div className="flex items-center gap-2">
						<span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
						<span>
							Поддерживает прямое открытие архивов от Picasso, Vatech, Romexis, OnDemand3D
						</span>
					</div>

					<button
						type="button"
						onClick={onClose}
						className="h-8 px-4 rounded-lg border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] font-semibold text-xs transition-colors cursor-pointer"
					>
						Закрыть
					</button>
				</footer>
			</div>
		</div>
	);

	return typeof document !== "undefined"
		? createPortal(modalContent, document.body)
		: modalContent;
}

export default CtSelectorModalUI;
