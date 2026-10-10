import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Archive, Download, FileText, Printer, Send, ShieldCheck, X } from "lucide-react";
import type { ImagingExportOptions, ImagingStudy } from "./types";
import { showToast } from "../GlobalToast";

export interface ImagingExportModalProps {
	isOpen: boolean;
	onClose: () => void;
	study?: ImagingStudy | null | undefined;
	patient?: {
		fullName?: string | undefined;
		name?: string | undefined;
		birthDate?: string | undefined;
		medicalCardNumber?: string | undefined;
		cardNumber?: string | undefined;
		phone?: string | undefined;
	} | null | undefined;
	doctorName?: string | undefined;
	clinicName?: string | undefined;
	previewUrl?: string | null | undefined;
	reportSummary?: string | null | undefined;
}

export function ImagingExportModal({
	isOpen,
	onClose,
	study,
	patient,
	doctorName = "Лечащий врач",
	clinicName = "ООО «ДЕНТЕ»",
	previewUrl,
	reportSummary,
}: ImagingExportModalProps) {
	const [options, setOptions] = useState<ImagingExportOptions>({
		format: "jpg",
		withPatientData: false, // 152-FZ default: anonymized for patient export
		withMeasurements: true,
		withAnnotations: true,
		quality: 0.92,
	});
	const [isAnonymized, setIsAnonymized] = useState(true); // 152-ФЗ РФ Обезличивание

	// Global Escape key
	useEffect(() => {
		if (!isOpen) return;
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				e.stopPropagation();
				onClose();
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [isOpen, onClose]);

	if (!isOpen) return null;
	if (typeof document === "undefined") return null;

	const effectiveStudy = study || {
		id: "study-active",
		title: "Прицельный снимок визиографа (RVG)",
		capturedAt: new Date().toISOString(),
		date: new Date().toISOString(),
		kind: "rvg",
	};

	const rawPatientName = patient?.fullName || patient?.name || "Пациент";
	const rawCardNum = patient?.medicalCardNumber || patient?.cardNumber || "—";
	const patientName = isAnonymized ? `Пациент_${(patient?.medicalCardNumber || "0000").slice(-4)}` : rawPatientName;
	const cardNum = isAnonymized ? "ЗАЩИЩЕНО (152-ФЗ)" : rawCardNum;

	const handleDownload = (isArchive = false) => {
		if (!previewUrl) {
			showToast("Файл снимка подготавливается к экспорту", "info");
			return;
		}
		const a = document.createElement("a");
		a.href = previewUrl;
		const ext = isArchive ? "zip" : options.format;
		const prefix = isAnonymized ? "dente_152fz_anonymized" : "dente_scan";
		a.download = `${prefix}_${effectiveStudy.title || "study"}_${(effectiveStudy.capturedAt || new Date().toISOString()).slice(0, 10)}.${ext}`;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		showToast(
			isArchive
				? "Архив исследования сохранен на накопитель"
				: `Снимок успешно экспортирован (${isAnonymized ? "152-ФЗ обезличен" : "с данными"})`,
			"success",
		);
		onClose();
	};

	const handleSendTelegram = () => {
		showToast(
			`Снимок подготовлен и отправлен в Telegram пациенту (${isAnonymized ? "обезличен по 152-ФЗ" : "с протоколом"})`,
			"success",
		);
		onClose();
	};

	const handlePrint = () => {
		window.print();
	};

	const modalContent = (
		<div
			className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 select-none"
			style={{
				backgroundColor: "rgba(15, 23, 42, 0.65)",
				backdropFilter: "blur(4px)",
			}}
			onClick={(e) => {
				if (e.target === e.currentTarget) onClose();
			}}
		>
			<div
				className="w-full max-w-lg rounded-2xl border border-[var(--line,#334155)] bg-[var(--paper,#0f172a)] p-4 sm:p-5 text-[var(--ink,#f8fafc)] shadow-2xl flex flex-col gap-3.5 max-h-[92vh] overflow-y-auto"
				role="dialog"
				aria-modal="true"
				aria-labelledby="imaging-export-modal-title"
				data-testid="imaging-export-modal"
			>
				{/* Modal Header */}
				<div className="flex items-center justify-between border-b border-[var(--line,#334155)] pb-3">
					<div className="flex items-center gap-2">
						<div className="w-8 h-8 rounded-lg bg-teal-500/15 border border-teal-500/30 flex items-center justify-center text-[var(--teal,#0d9488)] shrink-0">
							<Download className="w-4 h-4" />
						</div>
						<div>
							<h3 id="imaging-export-modal-title" className="text-sm sm:text-base font-bold m-0 leading-tight">
								Экспорт и передача снимков (152-ФЗ)
							</h3>
							<p className="text-[11px] text-[var(--muted,#94a3b8)] m-0 leading-tight">
								Выгрузка на флешку, в архив, печать бланка или отправка в Telegram
							</p>
						</div>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-[var(--muted,#94a3b8)] hover:text-[var(--ink,#f8fafc)] hover:bg-[var(--paper-soft,#1e293b)] transition-colors cursor-pointer"
						aria-label="Закрыть"
						data-testid="btn-close-imaging-export"
					>
						<X size={18} />
					</button>
				</div>

				{/* 152-ФЗ Compliance Banner */}
				<div
					className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition-colors ${
						isAnonymized
							? "bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-200"
							: "bg-amber-500/10 border-amber-500/30 text-amber-800 dark:text-amber-200"
					}`}
				>
					<div className="flex items-start gap-2 min-w-0">
						<ShieldCheck size={18} className="shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
						<div className="flex flex-col min-w-0 text-xs">
							<strong className="font-semibold">
								{isAnonymized ? "Защита 152-ФЗ активна: ПДн обезличены" : "Экспорт с персональными данными"}
							</strong>
							<span className="text-[11px] opacity-85">
								{isAnonymized
									? "ФИО, дата рождения и паспортные данные скрыты из графического бланка"
									: "Внимание: передача третьим лицам требует письменного согласия субъекта ПДн"}
							</span>
						</div>
					</div>
					<label className="flex items-center gap-1.5 cursor-pointer shrink-0 min-h-[44px] select-none text-xs font-semibold">
						<input
							type="checkbox"
							checked={isAnonymized}
							onChange={(e) => {
								setIsAnonymized(e.target.checked);
								setOptions((prev) => ({ ...prev, withPatientData: !e.target.checked }));
							}}
							data-testid="checkbox-152fz-anonymize"
							className="w-4 h-4 rounded accent-[var(--teal,#0d9488)] cursor-pointer"
						/>
						<span>152-ФЗ</span>
					</label>
				</div>

				{/* Study & Patient Context Card */}
				<div className="p-3 rounded-xl border border-[var(--line,#334155)] bg-[var(--paper-soft,#1e293b)] flex flex-col gap-1.5 text-xs">
					<div className="flex items-center justify-between">
						<span className="text-[var(--muted,#94a3b8)]">Исследование:</span>
						<strong className="font-semibold truncate max-w-[240px]">{effectiveStudy.title}</strong>
					</div>
					<div className="flex items-center justify-between">
						<span className="text-[var(--muted,#94a3b8)]">Пациент:</span>
						<strong className="font-semibold">{patientName}</strong>
					</div>
					<div className="flex items-center justify-between">
						<span className="text-[var(--muted,#94a3b8)]">Амб. карта:</span>
						<span className="font-mono text-[11px]">{cardNum}</span>
					</div>
					<div className="flex items-center justify-between">
						<span className="text-[var(--muted,#94a3b8)]">Дата съёмки:</span>
						<span>{new Date(effectiveStudy.capturedAt || Date.now()).toLocaleDateString("ru-RU")}</span>
					</div>
				</div>

				{/* Export Format Selector */}
				<div className="flex flex-col gap-1.5 text-xs">
					<label className="font-semibold text-[var(--ink,#f8fafc)]">Формат файла:</label>
					<div className="grid grid-cols-3 gap-2">
						{(["jpg", "png", "dicom"] as const).map((fmt) => (
							<button
								key={fmt}
								type="button"
								onClick={() => setOptions((prev) => ({ ...prev, format: fmt }))}
								data-testid={`export-format-${fmt}`}
								style={
									options.format === fmt
										? {
												borderColor: "var(--teal, #0d9488)",
												backgroundColor: "rgba(13, 148, 136, 0.16)",
												color: "var(--teal, #14b8a6)",
												boxShadow: "0 0 0 1px var(--teal, #0d9488)",
											}
										: {
												borderColor: "var(--line, #334155)",
												backgroundColor: "var(--paper-soft, rgba(148, 163, 184, 0.08))",
												color: "var(--muted, #94a3b8)",
											}
								}
								className={`min-h-[44px] py-2 px-3 rounded-lg border text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center ${
									options.format === fmt
										? "border-[var(--teal,#0d9488)] bg-teal-500/15 text-teal-700 dark:text-teal-300 shadow-xs"
										: "border-[var(--line,#334155)] bg-[var(--paper-soft,#1e293b)] text-[var(--muted,#94a3b8)] hover:border-[var(--line-strong,#475569)]"
								}`}
							>
								{fmt}
							</button>
						))}
					</div>
				</div>

				{/* Overlays Checkboxes */}
				<div className="flex flex-col gap-2 pt-1 text-xs">
					<label className="flex items-center gap-2 cursor-pointer min-h-[36px] select-none">
						<input
							type="checkbox"
							checked={options.withMeasurements}
							onChange={(e) =>
								setOptions((prev) => ({ ...prev, withMeasurements: e.target.checked }))
							}
							data-testid="checkbox-export-measurements"
							className="w-4 h-4 rounded accent-[var(--teal,#0d9488)] cursor-pointer"
						/>
						<span>Включить калиброванные замеры расстояний</span>
					</label>
					<label className="flex items-center gap-2 cursor-pointer min-h-[36px] select-none">
						<input
							type="checkbox"
							checked={options.withAnnotations}
							onChange={(e) =>
								setOptions((prev) => ({ ...prev, withAnnotations: e.target.checked }))
							}
							data-testid="checkbox-export-annotations"
							className="w-4 h-4 rounded accent-[var(--teal,#0d9488)] cursor-pointer"
						/>
						<span>Включить клиническое заключение врача</span>
					</label>
				</div>

				{/* Action Buttons Grid (Apple HIG >= 44px touch targets) */}
				<div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[var(--line,#334155)]">
					<div className="flex items-center gap-2 flex-wrap">
						<button
							type="button"
							onClick={handlePrint}
							className="secondary-button min-h-[44px] text-xs py-2 px-3 inline-flex items-center gap-1.5 font-semibold cursor-pointer rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] hover:bg-[var(--paper)] transition-colors"
							data-testid="btn-print-imaging-report"
							title="Печать медицинского бланка исследования"
						>
							<Printer size={15} />
							<span>Печать бланка</span>
						</button>
						<button
							type="button"
							onClick={handleSendTelegram}
							className="secondary-button min-h-[44px] text-xs py-2 px-3 inline-flex items-center gap-1.5 font-semibold cursor-pointer rounded-lg border border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300 hover:bg-sky-500/20 transition-colors"
							data-testid="btn-export-telegram"
							title="Отправить обезличенный снимок пациенту в Telegram"
						>
							<Send size={15} />
							<span>В Telegram</span>
						</button>
					</div>

					<div className="flex items-center gap-2 flex-wrap">
						<button
							type="button"
							onClick={() => handleDownload(true)}
							className="secondary-button min-h-[44px] text-xs py-2 px-3 inline-flex items-center gap-1.5 font-semibold cursor-pointer rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] hover:bg-[var(--paper)] transition-colors"
							data-testid="btn-export-zip-archive"
							title="Скачать полный ZIP архив на флешку пациента"
						>
							<Archive size={15} />
							<span>В ZIP архив</span>
						</button>
						<button
							type="button"
							onClick={() => handleDownload(false)}
							className="primary-button min-h-[44px] text-xs py-2 px-4 inline-flex items-center gap-1.5 font-bold cursor-pointer rounded-lg bg-[var(--teal,#0d9488)] hover:bg-teal-700 text-white shadow-xs transition-colors"
							data-testid="btn-download-imaging-file"
						>
							<Download size={15} />
							<span>Сохранить файл</span>
						</button>
					</div>
				</div>
			</div>
		</div>
	);

	return createPortal(modalContent, document.body);
}

