/**
 * ScannerPatientIntakePanel.tsx
 *
 * Patient selection, instant search, OCR recognition inspector, and
 * new patient intake workflow with the 1 Primary CTA button (Mandate 8am).
 */

import React from "react";
import {
	CheckCircle,
	FileText,
	Plus,
	Search,
	Sparkles,
	UploadCloud,
	User,
	UserCheck,
	UserPlus,
	X,
} from "lucide-react";
import type { useScannerCockpit } from "./useScannerCockpit";

export interface ScannerPatientIntakePanelProps {
	cockpit: ReturnType<typeof useScannerCockpit>;
}

export const ScannerPatientIntakePanel: React.FC<ScannerPatientIntakePanelProps> = ({ cockpit }) => {
	const {
		intakeMode,
		setIntakeMode,
		searchQuery,
		setSearchQuery,
		searchResults,
		isSearching,
		selectedPatient,
		setSelectedPatient,
		handleSelectPatient,
		recentAttachments,
		isLoadingAttachments,
		newPatientForm,
		setNewPatientForm,
		extractedPassport,
		extractedOms,
		extractedSnils,
		applyOcrToNewPatientForm,
		handleSaveAttachmentToPatient,
		handleCreatePatientAndAttach,
		isUploading,
	} = cockpit;

	const hasOcrData = Boolean(
		extractedPassport?.isValidSeriesNumber ||
			extractedSnils?.formatted ||
			extractedOms?.policyNumber,
	);

	return (
		<div className="scanner-intake-card">
			{/* Mode Switch: Existing vs New Patient */}
			<div className="scanner-mode-switch">
				<button
					type="button"
					onClick={() => setIntakeMode("existing")}
					className={`scanner-mode-switch-btn ${intakeMode === "existing" ? "active" : ""}`}
				>
					<span className="inline-flex items-center gap-1.5 justify-center">
						<UserCheck size={14} />
						<span>Прикрепить к карте</span>
					</span>
				</button>
				<button
					type="button"
					onClick={() => setIntakeMode("new")}
					className={`scanner-mode-switch-btn ${intakeMode === "new" ? "active" : ""}`}
				>
					<span className="inline-flex items-center gap-1.5 justify-center">
						<UserPlus size={14} />
						<span>Новый пациент</span>
					</span>
				</button>
			</div>

			{intakeMode === "existing" ? (
				<>
					{/* Existing Patient Selection Mode */}
					{selectedPatient ? (
						<div className="flex flex-col gap-3">
							<div className="scanner-selected-patient-card">
								<div className="scanner-patient-avatar">
									{selectedPatient.fullName
										.split(" ")
										.map((n) => n[0])
										.slice(0, 2)
										.join("")
										.toUpperCase() || "П"}
								</div>
								<div className="scanner-patient-details">
									<span className="scanner-patient-name">{selectedPatient.fullName}</span>
									<span className="scanner-patient-meta">
										{selectedPatient.phone || "Телефон не указан"}
										{selectedPatient.birthDate ? ` • ${selectedPatient.birthDate}` : ""}
										{selectedPatient.cardNumber ? ` • Карта ${selectedPatient.cardNumber}` : ""}
									</span>
								</div>
								<button
									type="button"
									onClick={() => setSelectedPatient(null)}
									className="p-1.5 text-[var(--muted)] hover:text-[var(--ink)] cursor-pointer"
									title="Выбрать другого пациента"
								>
									<X size={18} />
								</button>
							</div>

							{/* Recent Attachments of Selected Patient */}
							<div className="flex flex-col gap-1.5 mt-1">
								<span className="scanner-form-label">
									Документы в карте ({isLoadingAttachments ? "…" : recentAttachments.length}):
								</span>
								{recentAttachments.length > 0 ? (
									<div className="scanner-recent-attachments">
										{recentAttachments.map((att) => (
											<div key={att.id} className="scanner-attachment-item">
												<div className="flex items-center gap-2 overflow-hidden">
													<FileText size={14} className="text-[var(--teal)] shrink-0" />
													<span className="truncate">{att.fileName}</span>
												</div>
												{att.url && (
													<a
														href={att.url}
														target="_blank"
														rel="noreferrer"
														className="text-xs font-semibold text-[var(--teal)] hover:underline shrink-0 ml-2"
													>
														Открыть
													</a>
												)}
											</div>
										))}
									</div>
								) : (
									<p className="text-xs text-[var(--muted)] italic py-1">
										В карте пока нет прикрепленных сканов
									</p>
								)}
							</div>
						</div>
					) : (
						<div className="flex flex-col gap-2">
							<div className="scanner-search-wrapper">
								<Search size={16} className="scanner-search-icon" />
								<input
									type="text"
									value={searchQuery}
									onChange={(e) => setSearchQuery(e.target.value)}
									placeholder="Поиск пациента по ФИО или телефону…"
									className="scanner-search-input dente-search-input"
								/>
							</div>

							{/* Search Results Dropdown List */}
							<div className="flex flex-col gap-1 max-h-52 overflow-y-auto mt-1">
								{isSearching ? (
									<p className="text-xs text-[var(--muted)] text-center py-2">
										Поиск по картотеке…
									</p>
								) : searchResults.length > 0 ? (
									searchResults.map((p) => (
										<button
											key={p.id}
											type="button"
											onClick={() => handleSelectPatient(p)}
											className="flex items-center justify-between p-2 rounded-lg bg-[var(--paper-soft)] hover:bg-[var(--line)] border border-transparent hover:border-[var(--line)] text-left cursor-pointer transition-colors"
										>
											<div className="flex items-center gap-2 min-w-0">
												<User size={14} className="text-[var(--teal)] shrink-0" />
												<div className="truncate">
													<span className="text-xs font-semibold text-[var(--ink)] block truncate">
														{p.fullName}
													</span>
													<span className="text-[11px] text-[var(--muted)] block">
														{p.phone || "Без телефона"}
														{p.birthDate ? ` • ${p.birthDate}` : ""}
													</span>
												</div>
											</div>
											<Plus size={14} className="text-[var(--teal)] shrink-0 ml-2" />
										</button>
									))
								) : searchQuery.trim() ? (
									<div className="text-center py-4">
										<p className="text-xs text-[var(--muted)] mb-2">
											Пациент «{searchQuery}» не найден в базе
										</p>
										<button
											type="button"
											onClick={() => {
												setNewPatientForm((prev) => ({
													...prev,
													fullName: searchQuery,
												}));
												setIntakeMode("new");
											}}
											className="scanner-secondary-btn inline-flex"
										>
											<UserPlus size={14} />
											<span>Завести новую медкарту</span>
										</button>
									</div>
								) : (
									<p className="text-xs text-[var(--muted)] text-center py-3">
										Введите имя, фамилию или телефон для поиска
									</p>
								)}
							</div>
						</div>
					)}
				</>
			) : (
				/* New Patient Quick Registration Intake Form */
				<div className="scanner-form-grid">
					{hasOcrData && (
						<button
							type="button"
							onClick={applyOcrToNewPatientForm}
							className="inline-flex items-center justify-between p-2.5 rounded-xl bg-[var(--teal-surface)] border border-[var(--teal)] text-xs text-[var(--teal-dark)] font-semibold cursor-pointer hover:bg-[var(--teal-surface)]/80"
						>
							<span className="inline-flex items-center gap-1.5">
								<Sparkles size={14} className="text-[var(--teal)]" />
								<span>Заполнить реквизиты из распознанного скана</span>
							</span>
							<CheckCircle size={14} />
						</button>
					)}

					<div className="scanner-form-field">
						<label className="scanner-form-label">ФИО пациента *</label>
						<input
							type="text"
							value={newPatientForm.fullName}
							onChange={(e) =>
								setNewPatientForm((prev) => ({ ...prev, fullName: e.target.value }))
							}
							placeholder="Иванов Иван Иванович"
							className="scanner-form-input"
						/>
					</div>

					<div className="grid grid-cols-2 gap-2">
						<div className="scanner-form-field">
							<label className="scanner-form-label">Телефон</label>
							<input
								type="tel"
								value={newPatientForm.phone}
								onChange={(e) =>
									setNewPatientForm((prev) => ({ ...prev, phone: e.target.value }))
								}
								placeholder="+7 (999) 000-00-00"
								className="scanner-form-input"
							/>
						</div>
						<div className="scanner-form-field">
							<label className="scanner-form-label">Дата рождения</label>
							<input
								type="date"
								value={newPatientForm.birthDate}
								onChange={(e) =>
									setNewPatientForm((prev) => ({ ...prev, birthDate: e.target.value }))
								}
								className="scanner-form-input"
							/>
						</div>
					</div>

					<div className="grid grid-cols-2 gap-2">
						<div className="scanner-form-field">
							<label className="scanner-form-label">Паспорт (серия и номер)</label>
							<div className="flex gap-1.5">
								<input
									type="text"
									value={newPatientForm.passportSeries}
									onChange={(e) =>
										setNewPatientForm((prev) => ({ ...prev, passportSeries: e.target.value }))
									}
									placeholder="45 14"
									className="scanner-form-input w-20"
								/>
								<input
									type="text"
									value={newPatientForm.passportNumber}
									onChange={(e) =>
										setNewPatientForm((prev) => ({ ...prev, passportNumber: e.target.value }))
									}
									placeholder="123456"
									className="scanner-form-input flex-1"
								/>
							</div>
						</div>
						<div className="scanner-form-field">
							<label className="scanner-form-label">Код подразделения</label>
							<input
								type="text"
								value={newPatientForm.passportIssuerCode}
								onChange={(e) =>
									setNewPatientForm((prev) => ({
										...prev,
										passportIssuerCode: e.target.value,
									}))
								}
								placeholder="770-001"
								className="scanner-form-input"
							/>
						</div>
					</div>

					<div className="grid grid-cols-2 gap-2">
						<div className="scanner-form-field">
							<label className="scanner-form-label">СНИЛС</label>
							<input
								type="text"
								value={newPatientForm.snils}
								onChange={(e) =>
									setNewPatientForm((prev) => ({ ...prev, snils: e.target.value }))
								}
								placeholder="123-456-789 00"
								className="scanner-form-input"
							/>
						</div>
						<div className="scanner-form-field">
							<label className="scanner-form-label">Полис ОМС</label>
							<input
								type="text"
								value={newPatientForm.omsPolicy}
								onChange={(e) =>
									setNewPatientForm((prev) => ({ ...prev, omsPolicy: e.target.value }))
								}
								placeholder="16-значный номер"
								className="scanner-form-input"
							/>
						</div>
					</div>
				</div>
			)}

			{/* OCR Inspector Information Card (shows detected fields) */}
			{hasOcrData && (
				<div className="scanner-ocr-badge-box">
					<div className="scanner-ocr-header">
						<span>Распознанные данные документа</span>
						<Sparkles size={14} />
					</div>
					{extractedPassport?.isValidSeriesNumber && (
						<div className="scanner-ocr-field-row">
							<span className="scanner-ocr-label">Паспорт:</span>
							<span className="scanner-ocr-val">
								{extractedPassport.series} {extractedPassport.number}
								{extractedPassport.issuerCode ? ` (код ${extractedPassport.issuerCode})` : ""}
							</span>
						</div>
					)}
					{extractedSnils?.formatted && (
						<div className="scanner-ocr-field-row">
							<span className="scanner-ocr-label">СНИЛС:</span>
							<span className="scanner-ocr-val">
								{extractedSnils.formatted}{" "}
								{extractedSnils.isValidChecksum ? (
									<span className="text-[var(--teal)] font-bold ml-1">(верно)</span>
								) : (
									<span className="text-[var(--warn-fg,#f59e0b)] font-bold ml-1">(проверить)</span>
								)}
							</span>
						</div>
					)}
					{extractedOms?.policyNumber && (
						<div className="scanner-ocr-field-row">
							<span className="scanner-ocr-label">Полис ОМС:</span>
							<span className="scanner-ocr-val">{extractedOms.policyNumber}</span>
						</div>
					)}
				</div>
			)}

			{/* The Single Primary CTA Button (Mandate 8am & Mandate 8e) */}
			<div className="mt-2">
				{intakeMode === "existing" ? (
					<button
						type="button"
						data-testid="scanner-save-attachment-button"
						onClick={() => void handleSaveAttachmentToPatient()}
						className="scanner-primary-cta"
					>
						<UploadCloud size={17} />
						<span>
							{isUploading ? "Сохранение документа…" : "Прикрепить к карте пациента"}
						</span>
					</button>
				) : (
					<button
						type="button"
						data-testid="scanner-create-patient-button"
						onClick={() => void handleCreatePatientAndAttach()}
						className="scanner-primary-cta"
					>
						<UserPlus size={17} />
						<span>
							{isUploading ? "Создание медкарты…" : "Создать пациента и прикрепить скан"}
						</span>
					</button>
				)}
			</div>
		</div>
	);
};
export default ScannerPatientIntakePanel;
