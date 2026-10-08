import type { Dashboard } from "@dental/shared";
import { AlertTriangle, Bot, Check, FileText, Plus, X, Zap } from "lucide-react";
import React from "react";
import { printBlankMedicalContract } from "../../patients/blankContractPrint";
import { DictationHints } from "../../../DictationHints";
import { smartBookingParser } from "../../../lib/smartBookingParser";
import {
	type SmartParsedPayload,
	SmartParsePreview,
} from "../../../SmartParsePreview";
import { SmartMicrophoneButton } from "../../SmartMicrophoneButton";
import { QUICK_APPOINTMENT_REASON_PRESETS } from "./constants";
import type {
	AppointmentCollisionInfo,
	QuickAppointmentReasonPreset,
	SmartActionNote,
} from "./types";

export interface SmartAiBookingBarProps {
	dashboard: Dashboard;
	// biome-ignore lint/suspicious/noExplicitAny: draft payload
	newAppointmentDraft: Record<string, any>;
	newAppointmentSaveState: string;
	showCreateForm: boolean;
	setShowCreateForm: (val: boolean) => void;
	setIsSmartAiOpen?: (val: boolean) => void;
	useManualSelects: boolean;
	setUseManualSelects: (val: boolean) => void;
	smartInputText: string;
	setSmartInputText: (val: string) => void;
	showHints: boolean;
	setShowHints: (val: boolean) => void;
	showSmartPreview: boolean;
	setShowSmartPreview: (val: boolean) => void;
	smartParsedData: SmartParsedPayload | null;
	setSmartParsedData: (val: SmartParsedPayload | null) => void;
	smartActionNote: SmartActionNote | null;
	setSmartActionNote: (val: SmartActionNote | null) => void;
	collision: AppointmentCollisionInfo;
	criticalMissingSteps: string[];
	newAppointmentReadyToCreate: boolean;
	createFailureText: string | null;
	// biome-ignore lint/suspicious/noExplicitAny: draft updater
	updateNewAppointmentDraft: (key: any, value: any) => void;
	handleApplyReasonPreset: (preset: QuickAppointmentReasonPreset) => void;
	handleCreateAppointment: () => Promise<void>;
}

export function SmartAiBookingBar(props: SmartAiBookingBarProps) {
	const {
		dashboard,
		newAppointmentDraft,
		newAppointmentSaveState,
		showCreateForm,
		setShowCreateForm,
		setIsSmartAiOpen,
		useManualSelects,
		setUseManualSelects,
		smartInputText,
		setSmartInputText,
		showHints,
		setShowHints,
		showSmartPreview,
		setShowSmartPreview,
		smartParsedData,
		setSmartParsedData,
		smartActionNote,
		setSmartActionNote,
		collision,
		criticalMissingSteps,
		newAppointmentReadyToCreate,
		createFailureText,
		updateNewAppointmentDraft,
		handleApplyReasonPreset,
		handleCreateAppointment,
	} = props;

	return (
		<div
			className="smart-ai-booking"
			aria-label="Создание записи"
			style={{
				background: "var(--paper)",
				border: "1px solid var(--line)",
				borderRadius: "14px",
				padding: "14px 16px",
				marginBottom: "12px",
				display: "flex",
				flexDirection: "column",
				gap: "10px",
				boxShadow: "var(--shadow-1)",
				color: "var(--ink)",
			}}
		>
			<div className="flex items-center justify-between gap-2">
				<div className="flex items-center gap-2">
					<Bot size={18} className="text-[var(--teal,var(--brand-primary))] shrink-0" />
					<h4 className="font-semibold text-sm text-[var(--teal,var(--brand-primary))] m-0 leading-snug">
						Записать словами: скажите или впишите
					</h4>
				</div>
				{setIsSmartAiOpen && (
					<button
						type="button"
						onClick={() => {
							setIsSmartAiOpen(false);
							setShowCreateForm(false);
						}}
						className="text-button text-xs py-0.5 px-2 opacity-70 hover:opacity-100 cursor-pointer"
						title="Скрыть форму"
					>
						<span className="inline-flex items-center gap-1">
							<X size={12} className="shrink-0" />
							<span>Скрыть</span>
						</span>
					</button>
				)}
			</div>
			<div className="relative flex-1">
				<input
					type="text"
					aria-label="Записать словами: скажите или впишите"
					value={smartInputText}
					placeholder="Например: Петров на чистку завтра в 12:30"
					onFocus={() => setShowHints(true)}
					onBlur={() => setTimeout(() => setShowHints(false), 200)}
					onChange={(e) => setSmartInputText(e.target.value)}
					onKeyDown={(e) => {
						if (e.key === "Enter" && smartInputText.trim()) {
							e.preventDefault();
							const parsed = smartBookingParser(smartInputText, dashboard);
							setSmartParsedData(parsed);
							setSmartActionNote(null);
							setShowSmartPreview(true);
							setShowHints(false);
						}
					}}
					className="w-full p-2.5 sm:p-3 pr-14 min-h-[44px] rounded-xl border border-[var(--line)] text-sm sm:text-base outline-none bg-[var(--paper-soft)] text-[var(--ink)] focus:ring-2 focus:ring-[var(--teal)] focus:border-transparent transition-all"
				/>
				<SmartMicrophoneButton
					context="schedule"
					onResult={(text) => {
						setSmartInputText(text);
						const parsed = smartBookingParser(text, dashboard);
						setSmartParsedData(parsed);
						setSmartActionNote(null);
						setShowSmartPreview(true);
						setShowHints(false);
					}}
					style={{
						position: "absolute",
						right: "8px",
						top: "50%",
						transform: "translateY(-50%)",
					}}
				/>
				<DictationHints isVisible={showHints} type="schedule" />
				<SmartParsePreview
					isVisible={showSmartPreview}
					parsedData={smartParsedData}
					rawText={smartInputText}
					type="schedule"
					onApply={(data: SmartParsedPayload) => {
						const parsedAction = String(data?.action ?? "create");
						const parsedPatientName = String(data?.patientName ?? "");
						const parsedPatientPhone = String(data?.patientPhone ?? "");
						if (parsedAction === "cancel" || parsedAction === "reschedule") {
							setSmartActionNote({
								kind: parsedAction === "cancel" ? "cancel" : "reschedule",
								patientName: parsedPatientName,
								patientPhone: parsedPatientPhone,
							});
							setShowSmartPreview(false);
							return;
						}
						setSmartActionNote(
							!data?.patientId && parsedPatientName
								? {
										kind: "newPatient",
										patientName: parsedPatientName,
										patientPhone: parsedPatientPhone,
									}
								: null,
						);
						if (data) {
							if (data.patientId)
								updateNewAppointmentDraft("patientId", data.patientId);
							if (data.doctorUserId)
								updateNewAppointmentDraft("doctorUserId", data.doctorUserId);
							if (data.assistantUserId)
								updateNewAppointmentDraft(
									"assistantUserId",
									data.assistantUserId,
								);
							if (data.startsAt)
								updateNewAppointmentDraft("startsAt", data.startsAt);
							if (data.endsAt)
								updateNewAppointmentDraft("endsAt", data.endsAt);
							if (data.reason || data.service)
								updateNewAppointmentDraft(
									"reason",
									(data.reason || data.service) ?? "",
								);
							if (data.chairId)
								updateNewAppointmentDraft("chairId", data.chairId);
							if (data.comment || data.note)
								updateNewAppointmentDraft(
									"comment",
									(data.comment || data.note) ?? "",
								);
						}
						setShowSmartPreview(false);
						setSmartInputText("");
						setShowCreateForm(true);
					}}
					onManual={() => {
						setShowSmartPreview(false);
						setShowCreateForm(true);
					}}
					onClose={() => setShowSmartPreview(false)}
				/>
			</div>
			{smartActionNote ? (
				<div
					className="schedule-create-missing"
					id="smart-booking-action-note"
					role="status"
					aria-live="polite"
				>
					{smartActionNote.kind === "cancel" ? (
						<>
							<strong>Это отмена записи, а не новая запись.</strong>
							<p>
								Отменить приём отсюда нельзя: эта форма только записывает.
								Найдите нужный приём в расписании ниже, нажмите на нём
								«Изменить», в строке «Статус» выберите «Отменён» и нажмите
								«Сохранить запись». Освободившееся время сразу станет
								свободным окном.
							</p>
						</>
					) : smartActionNote.kind === "reschedule" ? (
						<>
							<strong>Это перенос записи, а не новая запись.</strong>
							<p>
								Переносить приём нужно на нём самом, иначе у пациента окажется
								два приёма вместо одного. Найдите приём в расписании ниже,
								нажмите «Изменить», поставьте новые «Начало» и «Окончание» и
								нажмите «Сохранить запись».
							</p>
						</>
					) : (
						<>
							<strong>
								Такого пациента в базе нет
								{smartActionNote.patientName
									? `: ${smartActionNote.patientName}`
									: ""}
								{smartActionNote.patientPhone
									? `, телефон ${smartActionNote.patientPhone}`
									: ""}
								.
							</strong>
							<p>
								Записать можно только человека, у которого уже есть карта, —
								поэтому имя и телефон в запись не подставлены, чтобы не выдать
								их за проверенные. Время и услуга из вашей фразы в форму
								перенесены. Заведите карту в разделе «Пациенты», вернитесь
								сюда и выберите его в строке «Пациент».
							</p>
						</>
					)}
				</div>
			) : null}
			<div className="flex justify-between items-center flex-wrap gap-2 pt-1">
				<div className="flex gap-2 sm:gap-3 items-center flex-wrap">
					<button
						type="button"
						data-schedule-create-toggle="true"
						aria-expanded={showCreateForm}
						onClick={() => setShowCreateForm(!showCreateForm)}
						className="secondary-button focus:ring-2 focus:ring-[var(--teal)] focus:outline-none transition-colors"
						style={{ minHeight: "44px", padding: "0 12px", fontSize: "12px" }}
					>
						<span className="hidden sm:inline">
							{showCreateForm
								? "Скрыть ручной ввод"
								: "Показать все поля / Ручной ввод"}
						</span>
						<span className="sm:hidden">
							{showCreateForm ? "Скрыть поля" : "Все поля"}
						</span>
					</button>
					<button
						type="button"
						onClick={() => {
							const selectedPat = (dashboard.patients ?? []).find(
								(p) => p.id === newAppointmentDraft?.patientId,
							);
							const selectedDoc = (dashboard.clinicSettings?.staff ?? []).find(
								(m) => m.id === newAppointmentDraft?.doctorUserId,
							);
							void printBlankMedicalContract(
								selectedPat || null,
								{
									doctorName: selectedDoc?.fullName,
									clinicName:
										dashboard.clinicSettings?.profile?.legalName ||
										dashboard.clinicSettings?.profile?.clinicName,
								},
							);
						}}
						className="min-h-[44px] px-3 rounded-xl border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-800 dark:text-amber-200 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
						title="Распечатать пустой типовой договор со строками _______ для ручного заполнения"
						data-testid="new-appointment-print-blank-contract-btn"
					>
						<FileText size={14} className="text-amber-600 dark:text-amber-400" />
						<span className="hidden sm:inline">Бланк договора (_______)</span>
						<span className="sm:hidden">Бланк договора</span>
					</button>
					<button
						type="button"
						onClick={() => {
							setShowCreateForm(true);
							const emergencyPreset = QUICK_APPOINTMENT_REASON_PRESETS.find((p) => p.id === "emergency");
							if (emergencyPreset) {
								handleApplyReasonPreset(emergencyPreset);
							}
						}}
						className="min-h-[44px] px-3 rounded-xl border border-rose-500/40 bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 dark:text-rose-300 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
						title="Срочная запись: острая боль (30 мин, наложение слотов допустимо)"
						data-testid="header-cito-emergency-btn"
					>
						<Zap size={14} className="text-rose-600 dark:text-rose-400 shrink-0" />
						<span className="hidden sm:inline">Срочная запись (Острая боль)</span>
						<span className="sm:hidden">Срочно (30м)</span>
					</button>
					{showCreateForm && (
						<label className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 cursor-pointer">
							<input
								type="checkbox"
								checked={useManualSelects}
								onChange={(e) => setUseManualSelects(e.target.checked)}
								className="focus:ring-2 focus:ring-[var(--teal)] focus:outline-none"
							/>
							Классические списки
						</label>
					)}
				</div>
				<div className="flex gap-2 items-center">
					{collision.isCitoOverbooking ? (
						<span
							id="new-appointment-cito-overbooking"
							data-testid="cito-overbooking-badge"
							className="save-state font-semibold text-rose-700 dark:text-rose-300 text-xs flex items-center gap-1 bg-rose-500/10 border border-rose-500/30 px-2 py-0.5 rounded-lg"
							role="alert"
							title={`${collision.message || "Запись по острой боли"}. Наложение слота допустимо`}
						>
							<Zap size={13} className="shrink-0 text-rose-600 dark:text-rose-400" />
							<span>Запись по острой боли</span>
						</span>
					) : collision.hasCollision ? (
						<span
							id="new-appointment-create-collision"
							className="save-state font-medium text-amber-700 dark:text-amber-300 text-xs flex items-center gap-1"
							role="alert"
							title={`${collision.message}. Разрешена экстренная запись (острая боль / совмещение допустимо)`}
						>
							<AlertTriangle size={13} className="shrink-0" />
							<span>{collision.message} (совмещение слотов допустимо)</span>
						</span>
					) : newAppointmentReadyToCreate ? (
						<span className="save-state save-state-idle font-medium text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-1">
							<Check size={13} className="shrink-0" />
							<span>Готово к созданию</span>
						</span>
					) : (
						<span
							id="new-appointment-create-missing-short"
							className="save-state save-state-idle font-medium text-amber-600 dark:text-amber-400 text-xs"
							title={`Осталось: ${criticalMissingSteps.join("; ")}`}
						>
							{(() => {
								const shown = criticalMissingSteps
									.slice(0, 2)
									.join(", ");
								const rest = criticalMissingSteps.length - 2;
								return rest > 0
									? `Осталось: ${shown} и ещё ${rest}`
									: `Осталось: ${shown}`;
							})()}
						</span>
					)}
					<button
						type="button"
						data-testid="create-appointment-button"
						onClick={() => void handleCreateAppointment()}
						disabled={newAppointmentSaveState === "saving"}
						aria-busy={newAppointmentSaveState === "saving" || undefined}
						aria-describedby={
							collision.isCitoOverbooking
								? "new-appointment-cito-overbooking"
								: collision.hasCollision
								? "new-appointment-create-collision"
								: !newAppointmentReadyToCreate
									? "new-appointment-create-missing-short"
									: undefined
						}
						className={`primary-button px-4 py-2 min-h-[44px] rounded-xl flex items-center justify-center text-sm font-semibold whitespace-nowrap disabled:opacity-50 cursor-pointer focus:ring-2 focus:outline-none transition-colors shrink-0 ${
							collision.isCitoOverbooking
								? "bg-rose-600 hover:bg-rose-700 text-white focus:ring-rose-500"
								: collision.hasCollision
								? "bg-amber-600 hover:bg-amber-700 text-white focus:ring-amber-500"
								: "bg-[var(--teal-dark)] hover:bg-[var(--teal)] text-white focus:ring-[var(--teal)]"
						}`}
					>
						<Plus size={16} aria-hidden="true" className="mr-1.5 shrink-0" />
						<span>
							{collision.isCitoOverbooking
								? "Записать срочно (Острая боль)"
								: collision.hasCollision
								? "Записать на это время (острая боль)"
								: "Создать запись"}
						</span>
					</button>
				</div>
			</div>
			{createFailureText ? (
				<p className="save-error" role="alert">
					{createFailureText}
				</p>
			) : null}
		</div>
	);
}
