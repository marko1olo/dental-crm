import {
	Activity,
	AlertTriangle,
	Camera,
	CheckCircle2,
	ChevronDown,
	Clipboard,
	Clock,
	FileText,
	Lock,
	Paperclip,
	Printer,
	Search,
	ShieldCheck,
	Stethoscope,
	X,
} from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { emptyVisitNoteForm } from "../AppHelpers";
import { useAppLogicContext } from "../contexts/AppLogicContext";
import { getIcdColor, ICD_GROUP_COLORS, ICD10_DICTIONARY } from "../lib/icd10";
import { useVisitStore } from "../store/visitStore";
import {
	type CryptoProCertificate,
	checkCryptoProPlugin,
	getPersonalCertificates,
	signBase64WithCertificate,
} from "../utils/cryptoPro";
import { showToast } from "./GlobalToast";
import { SmartMicrophoneButton } from "./SmartMicrophoneButton";
import { useVisitDiaryLogic } from "./useVisitDiaryLogic";
import { VisitDiaryPhotoUpload } from "./VisitDiaryPhotoUpload";
import { VisitDiaryTemplateSelector } from "./VisitDiaryTemplateSelector";
import { CryptoProSigner } from "./visit/CryptoProSigner";
import { VisitDiaryHeader } from "./visit/VisitDiaryHeader";
import { VisitIcdDropdown } from "./visit/VisitIcdDropdown";
import { VisitDiaryPrintPreview } from "./visit/VisitDiaryPrintPreview";

interface DiaryState {
	anamnesis: string;
	statusLocalis: string;
	diagnosisIcd10: string;
	diagnosisTooth: string;
	treatmentDescription: string;
	complications: string;
	comorbidities: string;
}

const EMPTY_DIARY: DiaryState = {
	anamnesis: "",
	statusLocalis: "",
	diagnosisIcd10: "",
	diagnosisTooth: "",
	treatmentDescription: "",
	complications: "",
	comorbidities: "",
};

interface Template {
	id: string;
	title: string;
	category?: string;
	specialty?: string;
	prefilledAnamnesis?: string;
	prefilledObjective?: string;
	prefilledTreatment?: string;
	defaultIcd10?: string;
	defaultIcd10Label?: string;
	isBuiltIn?: boolean;
}

interface VisitDiaryEditorProps {
	visitId: string;
	patientId: string;
}

export const VisitDiaryEditor: React.FC<VisitDiaryEditorProps> = ({
	visitId,
	patientId,
}) => {
	const {
		diary,
		setDiary,
		diaryId,
		isLocked,
		lockedAt,
		diaryHash,
		lastSavedAt,
		revisionCount,
		isSaving,
		showScanner,
		setShowScanner,
		trayBarcode,
		setTrayBarcode,
		showIcdDropdown,
		setShowIcdDropdown,
		icdSearch,
		setIcdSearch,
		showPreview,
		setShowPreview,
		doSave,
		doLock,
		icdRef,
	} = useVisitDiaryLogic(visitId, patientId);

	// ICD-10 extracted to VisitIcdDropdown

	const handleAutoResize = (
		e:
			| React.ChangeEvent<HTMLTextAreaElement>
			| React.FocusEvent<HTMLTextAreaElement>,
	) => {
		e.target.style.height = "auto";
		e.target.style.height = e.target.scrollHeight + "px";
	};

	// PrintPreviewContent extracted to VisitDiaryPrintPreview

	return (
		<div className="bg-zinc-950/90 backdrop-blur-xl border border-zinc-800/80 rounded-2xl p-5 shadow-[0_0_60px_-15px_rgba(16,185,129,0.15)] flex flex-col gap-5 relative overflow-hidden group no-print">
			{/* Glow on hover */}
			<div className="absolute -inset-px bg-gradient-to-r from-emerald-500/0 via-emerald-500/5 to-blue-500/0 rounded-2xl opacity-0 group-hover:opacity-100 transition duration-1000 pointer-events-none" />

			{/* ── Header ── */}
			<VisitDiaryHeader
				lastSavedAt={lastSavedAt}
				revisionCount={revisionCount}
				isLocked={isLocked}
				setShowPreview={setShowPreview}
				setDiary={setDiary}
				setIcdSearch={setIcdSearch}
			/>

			{/* ── SOAP Fields grid ── */}
			<div className="relative grid grid-cols-1 lg:grid-cols-2 gap-4">
				{/* S — Subjective (Жалобы) */}
				<div className="flex flex-col space-y-1.5 h-full">
					<label className="text-xs tracking-widest uppercase text-zinc-400 font-semibold flex items-center gap-1.5 w-full">
						<Stethoscope className="w-3 h-3 text-blue-400" />
						<span className="text-blue-400 font-mono font-bold">S</span> —
						Жалобы и анамнез
						{!isLocked && (
							<div className="ml-auto">
								<SmartMicrophoneButton
									context="visit"
									sterileMode={false}
									className="hover:bg-zinc-800/80 transition-colors p-1"
									onResult={(text) =>
										setDiary((p) => ({
											...p,
											anamnesis: p.anamnesis ? p.anamnesis + " " + text : text,
										}))
									}
								/>
							</div>
						)}
					</label>
					<textarea
						id="diary-anamnesis"
						disabled={isLocked}
						style={{ minHeight: "96px", overflowY: "hidden" }}
						className="auto-resize-ta flex-1 w-full bg-zinc-900/60 border border-zinc-800 rounded-xl p-3.5 text-sm text-zinc-200 focus:ring-1 focus:ring-blue-500/50 outline-none disabled:opacity-50 resize-none transition-all"
						value={diary.anamnesis}
						onChange={(e) => {
							handleAutoResize(e);
							setDiary((p) => ({ ...p, anamnesis: e.target.value }));
						}}
						onFocus={handleAutoResize}
						placeholder="Со слов пациента: жалобы на боли, чувствительность..."
					/>
				</div>

				{/* O — Objective (Status Localis) */}
				<div className="flex flex-col space-y-1.5 h-full">
					<label className="text-xs tracking-widest uppercase text-zinc-400 font-semibold flex items-center gap-1.5 w-full">
						<Search className="w-3 h-3 text-purple-400" />
						<span className="text-purple-400 font-mono font-bold">O</span> —
						Объективно (Status Localis)
						{!isLocked && (
							<div className="ml-auto">
								<SmartMicrophoneButton
									context="visit"
									sterileMode={false}
									className="hover:bg-zinc-800/80 transition-colors p-1"
									onResult={(text) =>
										setDiary((p) => ({
											...p,
											statusLocalis: p.statusLocalis
												? p.statusLocalis + " " + text
												: text,
										}))
									}
								/>
							</div>
						)}
					</label>
					<textarea
						id="diary-status-localis"
						disabled={isLocked}
						style={{ minHeight: "96px", overflowY: "hidden" }}
						className="auto-resize-ta flex-1 w-full bg-zinc-900/60 border border-zinc-800 rounded-xl p-3.5 text-sm text-zinc-200 focus:ring-1 focus:ring-purple-500/50 outline-none disabled:opacity-50 resize-none transition-all"
						value={diary.statusLocalis}
						onChange={(e) => {
							handleAutoResize(e);
							setDiary((p) => ({ ...p, statusLocalis: e.target.value }));
						}}
						onFocus={handleAutoResize}
						placeholder="Внешний осмотр, перкуссия, пальпация, ЭОД, рентген..."
					/>
				</div>

				{/* A — Assessment (МКБ-10) + FDI Tooth */}
				<div className="lg:col-span-2 bg-zinc-900/40 p-4 rounded-xl border border-zinc-800/60 space-y-3">
					<div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
						{/* ICD-10 Search */}
						<VisitIcdDropdown
							isLocked={isLocked}
							diagnosisIcd10={diary.diagnosisIcd10}
							icdSearch={icdSearch}
							showIcdDropdown={showIcdDropdown}
							icdRef={icdRef as React.RefObject<HTMLDivElement>}
							setDiagnosisIcd10={(code) => {
								setDiary((prev) => ({ ...prev, diagnosisIcd10: code }));
							}}
							setIcdSearch={setIcdSearch}
							setShowIcdDropdown={setShowIcdDropdown}
						/>

						{/* FDI Tooth */}
						<div className="space-y-1.5">
							<label className="text-xs tracking-widest uppercase text-zinc-400 font-semibold">
								Зуб (FDI)
							</label>
							<input
								id="diary-tooth"
								disabled={isLocked}
								className="w-full bg-zinc-900/80 border border-zinc-700 rounded-xl p-3 text-sm text-zinc-200 focus:ring-2 focus:ring-amber-500/50 outline-none disabled:opacity-50 font-mono text-center"
								value={diary.diagnosisTooth}
								onChange={(e) =>
									setDiary((p) => ({ ...p, diagnosisTooth: e.target.value }))
								}
								placeholder="16, 36..."
								maxLength={8}
							/>
						</div>
					</div>
				</div>

				{/* P — Plan (Treatment) */}
				<div className="space-y-1.5 lg:col-span-2">
					<label className="text-xs tracking-widest uppercase text-zinc-400 font-semibold flex items-center gap-1.5 w-full">
						<FileText className="w-3 h-3 text-emerald-400" />
						<span className="text-emerald-400 font-mono font-bold">P</span> —
						Лечение и рекомендации
						{!isLocked && (
							<div className="ml-auto">
								<SmartMicrophoneButton
									context="visit"
									sterileMode={false}
									className="hover:bg-zinc-800/80 transition-colors p-1"
									onResult={(text) =>
										setDiary((p) => ({
											...p,
											treatmentDescription: p.treatmentDescription
												? p.treatmentDescription + " " + text
												: text,
										}))
									}
								/>
							</div>
						)}
					</label>
					<textarea
						id="diary-treatment"
						disabled={isLocked}
						style={{ minHeight: "96px", overflowY: "hidden" }}
						className="auto-resize-ta w-full bg-zinc-900/60 border border-zinc-800 rounded-xl p-3.5 text-sm text-zinc-200 focus:ring-1 focus:ring-emerald-500/50 outline-none disabled:opacity-50 resize-none transition-all"
						value={diary.treatmentDescription}
						onChange={(e) => {
							handleAutoResize(e);
							setDiary((p) => ({ ...p, treatmentDescription: e.target.value }));
						}}
						onFocus={handleAutoResize}
						placeholder="Анестезия, проведённые манипуляции, рекомендации..."
					/>
				</div>

				{/* Complications & Comorbidities */}
				<div className="space-y-1.5 lg:col-span-2">
					<label className="text-xs tracking-widest uppercase text-zinc-400 font-semibold flex items-center gap-1.5">
						<AlertTriangle className="w-3 h-3 text-rose-400" />
						Осложнения и сопутствующие заболевания
					</label>
					<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
						<textarea
							disabled={isLocked}
							style={{ minHeight: "72px", overflowY: "hidden" }}
							className="auto-resize-ta w-full bg-zinc-900/60 border border-zinc-800 rounded-xl p-3.5 text-sm text-zinc-200 focus:ring-1 focus:ring-rose-500/50 outline-none disabled:opacity-50 resize-none transition-all"
							value={diary.complications}
							onChange={(e) => {
								handleAutoResize(e);
								setDiary((p) => ({ ...p, complications: e.target.value }));
							}}
							onFocus={handleAutoResize}
							placeholder="Осложнения лечения..."
						/>
						<textarea
							disabled={isLocked}
							style={{ minHeight: "72px", overflowY: "hidden" }}
							className="auto-resize-ta w-full bg-zinc-900/60 border border-zinc-800 rounded-xl p-3.5 text-sm text-zinc-200 focus:ring-1 focus:ring-rose-500/50 outline-none disabled:opacity-50 resize-none transition-all"
							value={diary.comorbidities}
							onChange={(e) => {
								handleAutoResize(e);
								setDiary((p) => ({ ...p, comorbidities: e.target.value }));
							}}
							onFocus={handleAutoResize}
							placeholder="Сопутствующие заболевания (если есть)..."
						/>
					</div>
				</div>

				{/* Attachments (Photos) */}
				<VisitDiaryPhotoUpload
					visitId={visitId}
					diaryId={diaryId}
					isLocked={isLocked}
				/>
			</div>

			{/* ── Actions Footer ── */}
			{!isLocked ? (
				<div className="relative flex flex-col sm:flex-row items-center justify-end gap-3 border-t border-zinc-800/60 pt-4">
					<span className="text-xs text-zinc-600 flex items-center gap-1 mr-auto hidden sm:flex">
						<AlertTriangle className="w-3 h-3" /> Автосохранение каждые 30 сек
					</span>
					<button
						onClick={() => setShowScanner(true)}
						className="w-full sm:w-auto px-5 py-2 text-sm text-blue-400 hover:text-white bg-blue-500/10 hover:bg-blue-600 border border-blue-500/30 rounded-xl transition-all flex items-center justify-center gap-2"
					>
						<Activity className="w-4 h-4" />
						{trayBarcode ? `Лоток: ${trayBarcode}` : "Сканировать Лоток"}
					</button>
					<button
						id="diary-save-btn"
						onClick={() => doSave(false)}
						disabled={isSaving}
						className="w-full sm:w-auto px-5 py-2 text-sm text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-xl transition-all"
					>
						{isSaving ? "Сохраняю..." : "Сохранить черновик"}
					</button>
					<CryptoProSigner
						diaryHash={diaryHash}
						isLocked={isLocked}
						lockedAt={lockedAt}
						onLock={async (thumbprint, signature) => {
							await doLock(thumbprint, signature);
						}}
					/>
				</div>
			) : (
				<div className="border-t border-zinc-800/60 pt-4 flex items-center gap-3 text-xs text-zinc-500">
					<ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
					<span>
						Дневник подписан
						{lockedAt ? ` • ${new Date(lockedAt).toLocaleString("ru-RU")}` : ""}
						.
						{diaryHash && (
							<span className="ml-2 font-mono text-zinc-600">
								{diaryHash.slice(0, 16)}…
							</span>
						)}
					</span>
					<button
						onClick={() => setShowPreview(true)}
						className="ml-auto flex items-center gap-1 text-zinc-400 hover:text-zinc-200 transition-colors"
					>
						<Printer className="w-3.5 h-3.5" /> Форма 043/у
					</button>
				</div>
			)}

			{showScanner &&
				createPortal(
					<div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
						<div className="w-full max-w-sm bg-zinc-900 border border-zinc-700 rounded-2xl p-6 shadow-[0_20px_60px_rgba(0,0,0,0.9)] relative overflow-hidden animate-in zoom-in-95 duration-200">
							{/* The laser line */}
							<div
								className="absolute left-0 right-0 h-0.5 bg-red-500 shadow-[0_0_20px_10px_rgba(239,68,68,0.6)] z-50 pointer-events-none"
								style={{ animation: "visitScanLaser 2s linear infinite" }}
							/>

							{/* Scanning area border */}
							<div className="absolute inset-0 border-[3px] border-zinc-800 rounded-2xl pointer-events-none m-2" />
							<div className="absolute top-2 left-2 w-8 h-8 border-t-4 border-l-4 border-red-500/70 rounded-tl-xl pointer-events-none" />
							<div className="absolute top-2 right-2 w-8 h-8 border-t-4 border-r-4 border-red-500/70 rounded-tr-xl pointer-events-none" />
							<div className="absolute bottom-2 left-2 w-8 h-8 border-b-4 border-l-4 border-red-500/70 rounded-bl-xl pointer-events-none" />
							<div className="absolute bottom-2 right-2 w-8 h-8 border-b-4 border-r-4 border-red-500/70 rounded-br-xl pointer-events-none" />

							<button
								onClick={() => setShowScanner(false)}
								className="absolute top-4 right-4 text-zinc-400 hover:text-white transition-colors"
							>
								<X className="w-5 h-5" />
							</button>
							<h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
								<Activity className="w-5 h-5 text-red-400" />
								Сканер СанПиН
							</h2>
							<p className="text-sm text-zinc-300 mb-6 font-medium">
								Наведите сканер на штрихкод стерильного лотка или введите
								вручную.
							</p>
							<input
								autoFocus
								className="w-full bg-black border border-zinc-700 rounded-xl px-4 py-3 text-white focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all font-mono"
								placeholder="000000000000"
								onKeyDown={(e) => {
									if (e.key === "Enter") {
										const val = e.currentTarget.value.trim();
										if (val) {
											setTrayBarcode(val);
											showToast("Лоток привязан", "success");
											setShowScanner(false);
										}
									}
								}}
							/>
						</div>
					</div>,
					document.body,
				)}

			{/* ── Print CSS ── */}
			<style
				dangerouslySetInnerHTML={{
					__html: `
        @media print {
          body > *:not(.print-layer) { display: none !important; }
          html, body { background: white !important; height: auto !important; overflow: visible !important; }
          .print-layer { display: block !important; position: absolute; left: 0; top: 0; width: 100% !important; background: white !important; color: black !important; }
          .no-print { display: none !important; }
          .print-content { box-shadow: none !important; max-height: none !important; overflow: visible !important; border-radius: 0 !important; }
          #print-043 { overflow: visible !important; }
          .page-break-avoid { page-break-inside: avoid; }
        }
        @keyframes visitScanLaser {
          0% { top: 10%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 90%; opacity: 0; }
        }
      `,
				}}
			/>

			{/* ── Portals ── */}
			{showPreview &&
				typeof window !== "undefined" &&
				createPortal(
					<VisitDiaryPrintPreview
						diary={diary}
						isLocked={isLocked}
						diaryHash={diaryHash}
						lockedAt={lockedAt}
						revisionCount={revisionCount}
						setShowPreview={setShowPreview}
					/>,
					document.body
				)}
		</div>
	);
};
