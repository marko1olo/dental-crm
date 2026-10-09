/**
 * DENTE CRM — Radiology Report Print Settings Modal (Layer 4)
 * Settings for page size, orientation, legend placement, header and footer metadata.
 */

import React from "react";
import { X } from "lucide-react";
import type { OrientationOption, PageSizeOption, ReportPrintSettings } from "./types";

export interface ReportPrintSettingsModalProps {
	isOpen: boolean;
	settings: ReportPrintSettings;
	onClose: () => void;
	onUpdateSettings: React.Dispatch<React.SetStateAction<ReportPrintSettings>>;
}

export const ReportPrintSettingsModal: React.FC<ReportPrintSettingsModalProps> = ({
	isOpen,
	settings,
	onClose,
	onUpdateSettings,
}) => {
	if (!isOpen) return null;

	return (
		<div
			className="fixed inset-0 z-60 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4"
			data-testid="print-settings-modal"
		>
			<div className="bg-zinc-900 border border-zinc-700 text-zinc-100 rounded-xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-100">
				<div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 bg-zinc-800/60">
					<h3 className="text-xs font-bold uppercase tracking-wider text-zinc-200">
						Параметры печати и страницы
					</h3>
					<button
						type="button"
						onClick={onClose}
						className="text-zinc-400 hover:text-white"
					>
						<X className="w-4 h-4" />
					</button>
				</div>

				<div className="p-4 flex flex-col gap-4 text-xs">
					{/* 1. Paper Size */}
					<div>
						<label className="font-bold text-zinc-300 mb-1.5 block">Размер носителя:</label>
						<div className="grid grid-cols-3 gap-2">
							{(["A4", "14x17_film", "A3"] as PageSizeOption[]).map((size) => (
								<button
									key={size}
									type="button"
									onClick={() => onUpdateSettings((s) => ({ ...s, pageSize: size }))}
									className={`py-1.5 px-2 rounded-md font-semibold text-xs border text-center transition-colors cursor-pointer ${
										settings.pageSize === size
											? "bg-emerald-600 text-white border-emerald-500"
											: "bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-zinc-700"
									}`}
									data-testid={`btn-select-size-${size}`}
								>
									{size === "14x17_film" ? "14x17\" Пленка" : size}
								</button>
							))}
						</div>
					</div>

					{/* 2. Orientation */}
					<div>
						<label className="font-bold text-zinc-300 mb-1.5 block">Ориентация:</label>
						<div className="grid grid-cols-2 gap-2">
							{(["portrait", "landscape"] as OrientationOption[]).map((orient) => (
								<button
									key={orient}
									type="button"
									onClick={() => onUpdateSettings((s) => ({ ...s, orientation: orient }))}
									className={`py-1.5 px-3 rounded-md font-semibold text-xs border text-center transition-colors cursor-pointer ${
										settings.orientation === orient
											? "bg-emerald-600 text-white border-emerald-500"
											: "bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-zinc-700"
									}`}
									data-testid={`btn-select-orient-${orient}`}
								>
									{orient === "portrait" ? "● Книжная" : "○ Альбомная"}
								</button>
							))}
						</div>
					</div>

					{/* 3. Image Information (Legend placement) */}
					<div>
						<label className="font-bold text-zinc-300 mb-1.5 block">Сведения об изображении:</label>
						<div className="flex flex-col gap-1.5">
							<label className="flex items-center gap-2 text-zinc-300 cursor-pointer">
								<input
									type="radio"
									name="legendPlacement"
									checked={settings.legendPlacement === "below"}
									onChange={() => onUpdateSettings((s) => ({ ...s, legendPlacement: "below" }))}
									className="accent-emerald-500"
									data-testid="radio-legend-below"
								/>
								<span>Показывать сведения под изображением (рекомендовано)</span>
							</label>
							<label className="flex items-center gap-2 text-zinc-300 cursor-pointer">
								<input
									type="radio"
									name="legendPlacement"
									checked={settings.legendPlacement === "above"}
									onChange={() => onUpdateSettings((s) => ({ ...s, legendPlacement: "above" }))}
									className="accent-emerald-500"
								/>
								<span>Показывать сведения над изображением</span>
							</label>
							<label className="flex items-center gap-2 text-zinc-300 cursor-pointer">
								<input
									type="radio"
									name="legendPlacement"
									checked={settings.legendPlacement === "hidden"}
									onChange={() => onUpdateSettings((s) => ({ ...s, legendPlacement: "hidden" }))}
									className="accent-emerald-500"
								/>
								<span>Скрыть сведения об изображении</span>
							</label>
						</div>
					</div>

					{/* 4. Header Checkboxes */}
					<div className="border-t border-zinc-800 pt-3">
						<label className="font-bold text-zinc-300 mb-1.5 block">Заголовок (Шапка):</label>
						<div className="grid grid-cols-2 gap-2 text-zinc-300">
							<label className="flex items-center gap-2 cursor-pointer">
								<input
									type="checkbox"
									checked={settings.header.showDate}
									onChange={(e) =>
										onUpdateSettings((s) => ({
											...s,
											header: { ...s.header, showDate: e.target.checked },
										}))
									}
									className="accent-emerald-500 rounded"
									data-testid="cb-header-date"
								/>
								<span>Дата</span>
							</label>
							<label className="flex items-center gap-2 cursor-pointer">
								<input
									type="checkbox"
									checked={settings.header.showPatientInfo}
									onChange={(e) =>
										onUpdateSettings((s) => ({
											...s,
											header: { ...s.header, showPatientInfo: e.target.checked },
										}))
									}
									className="accent-emerald-500 rounded"
									data-testid="cb-header-patient"
								/>
								<span>Пациент</span>
							</label>
							<label className="flex items-center gap-2 cursor-pointer">
								<input
									type="checkbox"
									checked={settings.header.showClinicLogo}
									onChange={(e) =>
										onUpdateSettings((s) => ({
											...s,
											header: { ...s.header, showClinicLogo: e.target.checked },
										}))
									}
									className="accent-emerald-500 rounded"
									data-testid="cb-header-logo"
								/>
								<span>Логотип клиники</span>
							</label>
						</div>
					</div>

					{/* 5. Footer Checkboxes */}
					<div className="border-t border-zinc-800 pt-3">
						<label className="font-bold text-zinc-300 mb-1.5 block">Нижний колонтитул:</label>
						<div className="grid grid-cols-2 gap-2 text-zinc-300">
							<label className="flex items-center gap-2 cursor-pointer">
								<input
									type="checkbox"
									checked={settings.footer.showClinicName}
									onChange={(e) =>
										onUpdateSettings((s) => ({
											...s,
											footer: { ...s.footer, showClinicName: e.target.checked },
										}))
									}
									className="accent-emerald-500 rounded"
									data-testid="cb-footer-name"
								/>
								<span>Название клиники</span>
							</label>
							<label className="flex items-center gap-2 cursor-pointer">
								<input
									type="checkbox"
									checked={settings.footer.showPhone}
									onChange={(e) =>
										onUpdateSettings((s) => ({
											...s,
											footer: { ...s.footer, showPhone: e.target.checked },
										}))
									}
									className="accent-emerald-500 rounded"
									data-testid="cb-footer-phone"
								/>
								<span>Телефон</span>
							</label>
							<label className="flex items-center gap-2 cursor-pointer">
								<input
									type="checkbox"
									checked={settings.footer.showWebsite}
									onChange={(e) =>
										onUpdateSettings((s) => ({
											...s,
											footer: { ...s.footer, showWebsite: e.target.checked },
										}))
									}
									className="accent-emerald-500 rounded"
									data-testid="cb-footer-web"
								/>
								<span>Веб-сайт</span>
							</label>
							<label className="flex items-center gap-2 cursor-pointer">
								<input
									type="checkbox"
									checked={settings.footer.showAddress}
									onChange={(e) =>
										onUpdateSettings((s) => ({
											...s,
											footer: { ...s.footer, showAddress: e.target.checked },
										}))
									}
									className="accent-emerald-500 rounded"
									data-testid="cb-footer-address"
								/>
								<span>Адрес</span>
							</label>
						</div>
					</div>
				</div>

				<div className="px-4 py-3 bg-zinc-800/80 border-t border-zinc-700 flex justify-end gap-2">
					<button
						type="button"
						onClick={onClose}
						className="h-7 px-4 rounded-md text-xs font-semibold bg-zinc-700 hover:bg-zinc-600 text-zinc-200 cursor-pointer"
						data-testid="btn-cancel-print-settings"
					>
						Отмена
					</button>
					<button
						type="button"
						onClick={onClose}
						className="h-7 px-5 rounded-md text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer"
						data-testid="btn-apply-print-settings"
					>
						OK
					</button>
				</div>
			</div>
		</div>
	);
};
