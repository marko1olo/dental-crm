import React, { useState, useMemo } from "react";
import {
	ShieldCheck,
	Sparkles,
	Search,
	Phone,
	Calendar,
	Clock,
	Copy,
	Check,
	X,
	AlertCircle,
	UserCheck,
	Send,
	ExternalLink,
} from "lucide-react";
import type { Dashboard } from "@dental/shared";
import {
	findPreventiveInspectionCandidates,
	type PreventiveInspectionCandidate,
	type PreventiveInspectionCategory,
} from "./doctorFreeSlotsEngine";
import { isDemoShowcaseMode } from "../../lib/demoMode";
import { showToast } from "../GlobalToast";
import { openWhatsAppChat } from "../../store/telephonyStore";

export interface PreventiveInspectionModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly dashboard: Dashboard;
	readonly onBookPatient: (candidate: PreventiveInspectionCandidate) => void;
}

const DEMO_SHOWCASE_PREVENTIVE_CANDIDATES: PreventiveInspectionCandidate[] = [
	{
		patientId: "demo-pat-morozov",
		patientFullName: "Морозов Александр Сергеевич",
		patientPhone: "+7 (916) 333-22-11",
		category: "implant_warranty",
		categoryTitle: "Осмотр по гарантии (имплантация)",
		lastVisitDate: "2026-04-03",
		daysSinceLastVisit: 184,
		monthsSinceLastVisit: 6,
		lastDoctorId: "doc-smirnov",
		lastDoctorName: "Д-р Смирнов А.П.",
		recommendedProcedureName: "Контроль остеоинтеграции и прицельный снимок",
		warrantyNotice: "Обязателен для сохранения гарантии на установленный имплантат",
		suggestedChannelMessage:
			"Здравствуйте, Александр Сергеевич! В клинике DENTE подошёл срок контрольного осмотра по гарантии на имплантацию (прошло 6 мес.). Осмотр необходим для подтверждения стабильности имплантата. Сможем подобрать удобное время?",
	},
	{
		patientId: "demo-pat-belova",
		patientFullName: "Белова Екатерина Дмитриевна",
		patientPhone: "+7 (925) 555-44-33",
		category: "orthopedic_warranty",
		categoryTitle: "Осмотр по гарантии (коронки и протезирование)",
		lastVisitDate: "2026-04-05",
		daysSinceLastVisit: 182,
		monthsSinceLastVisit: 6,
		lastDoctorId: "doc-smirnov",
		lastDoctorName: "Д-р Смирнов А.П.",
		recommendedProcedureName: "Контрольный осмотр циркониевых коронок и прикуса",
		warrantyNotice: "Необходим для сохранения гарантии на ортопедическую конструкцию",
		suggestedChannelMessage:
			"Здравствуйте, Екатерина Дмитриевна! В клинике DENTE подошёл срок контрольного осмотра по гарантии на коронки и конструкции (прошло 6 мес.). Сможем подобрать удобное время?",
	},
	{
		patientId: "demo-pat-kuznetsov",
		patientFullName: "Кузнецов Дмитрий Павлович",
		patientPhone: "+7 (903) 777-88-99",
		category: "hygiene_6m",
		categoryTitle: "Плановый профосмотр каждые 6 месяцев",
		lastVisitDate: "2026-04-01",
		daysSinceLastVisit: 186,
		monthsSinceLastVisit: 6,
		lastDoctorId: "doc-kuznetsova",
		lastDoctorName: "Д-р Кузнецова Е.В.",
		recommendedProcedureName: "Профгигиена Air-Flow и осмотр полости рта",
		suggestedChannelMessage:
			"Здравствуйте, Дмитрий Павлович! Прошло 6 мес. с вашего последнего визита в клинику DENTE. Напоминаем о плановом профосмотре каждые 6 месяцев и профгигиене для здоровья зубов и дёсен. Сможем подобрать время?",
	},
	{
		patientId: "demo-pat-vasilieva",
		patientFullName: "Васильева Анна Андреевна",
		patientPhone: "+7 (916) 444-11-22",
		category: "ortho_retention",
		categoryTitle: "Контрольный осмотр ортодонта",
		lastVisitDate: "2026-03-25",
		daysSinceLastVisit: 193,
		monthsSinceLastVisit: 6,
		lastDoctorId: "doc-kuznetsova",
		lastDoctorName: "Д-р Кузнецова Е.В.",
		recommendedProcedureName: "Контроль стабильности ретейнеров после снятия брекетов",
		suggestedChannelMessage:
			"Здравствуйте, Анна Андреевна! В клинике DENTE подошёл срок планового контроля ортодонта (прошло 6 мес.). Необходим осмотр фиксации ретейнеров. Сможем подобрать удобное время?",
	},
];

export const PreventiveInspectionModal: React.FC<PreventiveInspectionModalProps> = ({
	isOpen,
	onClose,
	dashboard,
	onBookPatient,
}) => {
	const [activeCategory, setActiveCategory] = useState<PreventiveInspectionCategory | "all">("all");
	const [searchQuery, setSearchQuery] = useState("");
	const [copiedId, setCopiedId] = useState<string | null>(null);

	const doctors = useMemo(() => {
		return (dashboard?.clinicSettings?.staff ?? [])
			.filter((s) => s.active && (s.role === "doctor" || s.role === "owner"))
			.map((d) => ({ id: d.id, fullName: d.fullName }));
	}, [dashboard?.clinicSettings?.staff]);

	const calculatedCandidates = useMemo(() => {
		const raw = findPreventiveInspectionCandidates({
			patients: dashboard?.patients ?? [],
			appointments: dashboard?.appointments ?? [],
			doctors,
			clinicName: dashboard?.clinicSettings?.profile?.clinicName || "клинике DENTE",
			minDaysSinceVisit: 150,
			maxDaysSinceVisit: 365,
		});

		if (raw.length === 0 && isDemoShowcaseMode()) {
			return DEMO_SHOWCASE_PREVENTIVE_CANDIDATES;
		}
		return raw;
	}, [dashboard?.patients, dashboard?.appointments, doctors, dashboard?.clinicSettings?.profile?.clinicName]);

	const filteredCandidates = useMemo(() => {
		return calculatedCandidates.filter((c) => {
			if (activeCategory !== "all" && c.category !== activeCategory) {
				return false;
			}
			if (searchQuery.trim()) {
				const q = searchQuery.toLowerCase();
				const matchesName = c.patientFullName.toLowerCase().includes(q);
				const matchesPhone = (c.patientPhone || "").includes(q);
				const matchesDoctor = (c.lastDoctorName || "").toLowerCase().includes(q);
				return matchesName || matchesPhone || matchesDoctor;
			}
			return true;
		});
	}, [calculatedCandidates, activeCategory, searchQuery]);

	const counts = useMemo(() => {
		return {
			all: calculatedCandidates.length,
			warranty: calculatedCandidates.filter(
				(c) => c.category === "implant_warranty" || c.category === "orthopedic_warranty",
			).length,
			hygiene: calculatedCandidates.filter((c) => c.category === "hygiene_6m").length,
			ortho: calculatedCandidates.filter((c) => c.category === "ortho_retention").length,
		};
	}, [calculatedCandidates]);

	const handleCopyMessage = (candidate: PreventiveInspectionCandidate) => {
		if (typeof navigator !== "undefined" && navigator.clipboard) {
			void navigator.clipboard.writeText(candidate.suggestedChannelMessage);
			setCopiedId(candidate.patientId);
			showToast("Текст приглашения скопирован в буфер", "success");
			setTimeout(() => setCopiedId(null), 2000);
		}
	};

	const handleOpenWhatsApp = (candidate: PreventiveInspectionCandidate) => {
		if (!candidate.patientPhone) {
			showToast("У пациента не указан номер телефона", "warning");
			return;
		}
		openWhatsAppChat(candidate.patientPhone, candidate.suggestedChannelMessage);
	};

	if (!isOpen) return null;

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs select-none"
			data-testid="preventive-inspection-modal"
			role="dialog"
			aria-modal="true"
			aria-label="Сервисный контроль: осмотры по гарантии и профгигиена"
		>
			<div className="w-full max-w-4xl max-h-[92vh] rounded-3xl bg-[var(--paper,#ffffff)] border border-[var(--line,#e2e8f0)] shadow-2xl flex flex-col overflow-hidden text-[var(--ink,#0f172a)]">
				{/* Header */}
				<div className="px-4 sm:px-6 py-4 border-b border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] flex items-center justify-between">
					<div className="flex items-center gap-3">
						<div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-700 dark:text-amber-400 flex items-center justify-center border border-amber-500/30 shrink-0">
							<ShieldCheck className="w-5 h-5" />
						</div>
						<div>
							<h2 className="text-base font-bold m-0 flex items-center gap-2">
								Сервисный контроль: осмотры по гарантии и профгигиена
							</h2>
							<p className="text-xs text-[var(--muted,#64748b)] m-0 mt-0.5">
								Пациенты, у которых прошло 6 месяцев с последнего приёма • Ожидают приглашения: <strong>{counts.all}</strong>
							</p>
						</div>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="h-8 w-8 rounded-lg border border-[var(--line,#e2e8f0)] flex items-center justify-center text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] hover:bg-[var(--paper)] transition-colors cursor-pointer"
						aria-label="Закрыть окно сервисного контроля"
						data-testid="btn-close-preventive-modal"
					>
						<X className="w-4 h-4" />
					</button>
				</div>

				{/* Category Tabs & Search Bar */}
				<div className="p-3.5 sm:p-4 border-b border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] space-y-3">
					<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
						{/* Category Tabs */}
						<div className="flex gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
							<button
								type="button"
								onClick={() => setActiveCategory("all")}
								className={`h-7 px-2.5 rounded-lg text-xs font-semibold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 whitespace-nowrap shadow-2xs ${
									activeCategory === "all"
										? "border border-transparent font-bold"
										: "border border-[var(--line,#cbd5e1)] bg-[var(--paper-soft,#f8fafc)] text-[var(--ink,#0f172a)] hover:border-[var(--teal,var(--brand-primary))]"
								}`}
								style={activeCategory === "all" ? { color: "var(--on-teal, #ffffff)", backgroundColor: "var(--teal-fill, var(--teal, #0d9488))" } : undefined}
								data-testid="tab-preventive-all"
							>
								<span>Все пациенты</span>
								<span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${activeCategory === "all" ? "bg-black/25 text-white" : "bg-black/10 text-current"}`}>
									{counts.all}
								</span>
							</button>

							<button
								type="button"
								onClick={() => setActiveCategory("implant_warranty")}
								className={`h-7 px-2.5 rounded-lg text-xs font-semibold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 whitespace-nowrap shadow-2xs ${
									activeCategory === "implant_warranty"
										? "bg-amber-600 !text-white shadow-xs font-bold"
										: "border border-[var(--line,#cbd5e1)] bg-[var(--paper-soft,#f8fafc)] text-amber-800 dark:text-amber-300 hover:border-amber-500"
								}`}
								style={activeCategory === "implant_warranty" ? { color: "#ffffff", backgroundColor: "#d97706" } : undefined}
								data-testid="tab-preventive-warranty"
							>
								<ShieldCheck size={13} className="shrink-0" />
								<span>Осмотр по гарантии</span>
								<span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${activeCategory === "implant_warranty" ? "bg-black/25 text-white" : "bg-black/10 text-current"}`}>
									{counts.warranty}
								</span>
							</button>

							<button
								type="button"
								onClick={() => setActiveCategory("hygiene_6m")}
								className={`h-7 px-2.5 rounded-lg text-xs font-semibold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 whitespace-nowrap shadow-2xs ${
									activeCategory === "hygiene_6m"
										? "border border-transparent font-bold"
										: "border border-[var(--line,#cbd5e1)] bg-[var(--paper-soft,#f8fafc)] text-[var(--ink,#0f172a)] hover:border-[var(--teal,var(--brand-primary))]"
								}`}
								style={activeCategory === "hygiene_6m" ? { color: "var(--on-teal, #ffffff)", backgroundColor: "var(--teal-fill, var(--teal, #0d9488))" } : undefined}
								data-testid="tab-preventive-hygiene"
							>
								<Sparkles size={13} className={`shrink-0 ${activeCategory === "hygiene_6m" ? "text-current" : "text-[var(--teal)]"}`} />
								<span>Плановый профосмотр (6 мес.)</span>
								<span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${activeCategory === "hygiene_6m" ? "bg-black/25 text-white" : "bg-black/10 text-current"}`}>
									{counts.hygiene}
								</span>
							</button>

							{counts.ortho > 0 && (
								<button
									type="button"
									onClick={() => setActiveCategory("ortho_retention")}
									className={`h-7 px-2.5 rounded-lg text-xs font-semibold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
										activeCategory === "ortho_retention"
											? "bg-purple-600 !text-white shadow-xs font-bold"
											: "border border-[var(--line,#cbd5e1)] bg-[var(--paper-soft,#f8fafc)] text-purple-800 dark:text-purple-300 hover:border-purple-500"
									}`}
									style={activeCategory === "ortho_retention" ? { color: "#ffffff", backgroundColor: "#9333ea" } : undefined}
									data-testid="tab-preventive-ortho"
								>
									<span>Ортодонтия</span>
									<span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${activeCategory === "ortho_retention" ? "bg-black/25 text-white" : "bg-black/10 text-current"}`}>
										{counts.ortho}
									</span>
								</button>
							)}
						</div>

						{/* Search Input */}
						<div className="relative w-full sm:w-64 shrink-0">
							<Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--muted)] pointer-events-none" />
							<input
								type="text"
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								placeholder="Поиск по пациенту, телефону..."
								className="w-full h-7 pl-8 pr-2.5 rounded-lg text-xs border border-[var(--line,#cbd5e1)] bg-[var(--paper-soft,#f8fafc)] text-[var(--ink)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--teal)]"
								data-testid="preventive-search-input"
							/>
						</div>
					</div>
				</div>

				{/* Candidates List Body */}
				<div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-3 [scrollbar-width:thin]">
					{filteredCandidates.length === 0 ? (
						<div className="py-12 text-center text-[var(--muted,#64748b)] space-y-2">
							<ShieldCheck className="w-8 h-8 mx-auto text-slate-400 opacity-60" />
							<p className="text-sm font-medium">Нет пациентов, требующих осмотра по выбранному фильтру.</p>
							<p className="text-xs">Все пациенты либо уже записаны на повторный приём, либо ещё не подошёл 6-месячный срок.</p>
						</div>
					) : (
						filteredCandidates.map((c) => {
							const isWarranty = c.category === "implant_warranty" || c.category === "orthopedic_warranty";
							return (
								<div
									key={c.patientId}
									className={`p-3.5 rounded-2xl border transition-all ${
										isWarranty
											? "bg-amber-500/5 dark:bg-amber-950/20 border-amber-500/30"
											: "bg-[var(--paper-soft,#f8fafc)] border-[var(--line,#e2e8f0)]"
									}`}
									data-testid={`preventive-card-${c.patientId}`}
								>
									<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--line,#e2e8f0)] pb-2.5">
										<div className="space-y-1 min-w-0">
											<div className="flex items-center gap-2 flex-wrap">
												<span className="font-bold text-sm text-[var(--ink)]">
													{c.patientFullName}
												</span>
												<span
													className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
														isWarranty
															? "bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/35"
															: "bg-[var(--teal)]/15 text-[var(--teal-dark,var(--teal))] border-[var(--teal)]/30"
													}`}
												>
													{c.categoryTitle}
												</span>
												{c.warrantyNotice && (
													<span className="text-[10px] text-amber-700 dark:text-amber-300 font-medium">
														• {c.warrantyNotice}
													</span>
												)}
											</div>
											<div className="flex items-center gap-3 text-xs text-[var(--muted)] flex-wrap">
												{c.patientPhone && (
													<span className="flex items-center gap-1 font-mono text-[11px]">
														<Phone size={11} className="text-[var(--teal)]" />
														{c.patientPhone}
													</span>
												)}
												<span className="flex items-center gap-1">
													<Calendar size={11} />
													Был на приёме: <strong>{c.lastVisitDate}</strong> ({c.monthsSinceLastVisit} мес. назад)
												</span>
												{c.lastDoctorName && (
													<span className="flex items-center gap-1">
														<UserCheck size={11} />
														Врач: <strong>{c.lastDoctorName}</strong>
													</span>
												)}
											</div>
										</div>

										{/* 1-Click Action Buttons */}
										<div className="flex items-center gap-1.5 shrink-0">
											{c.patientPhone && (
												<button
													type="button"
													onClick={() => handleOpenWhatsApp(c)}
													className="h-7 px-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
													title="Открыть WhatsApp и отправить вежливое приглашение"
													data-testid={`btn-whatsapp-${c.patientId}`}
												>
													<Send size={11} />
													<span>WhatsApp</span>
												</button>
											)}

											<button
												type="button"
												onClick={() => handleCopyMessage(c)}
												className="h-7 px-2 rounded-lg border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
												title="Скопировать вежливый текст приглашения (152-ФЗ)"
												data-testid={`btn-copy-msg-${c.patientId}`}
											>
												{copiedId === c.patientId ? (
													<Check size={11} className="text-emerald-600" />
												) : (
													<Copy size={11} />
												)}
												<span>{copiedId === c.patientId ? "Скопировано" : "Текст"}</span>
											</button>

											<button
												type="button"
												onClick={() => {
													onBookPatient(c);
													onClose();
												}}
												className="h-7 px-2.5 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs transition-all hover:opacity-90 active:scale-95"
												style={{ backgroundColor: "var(--teal-fill, var(--teal, #0d9488))", color: "var(--on-teal, #ffffff)" }}
												title="Записать пациента на плановый осмотр в 1 клик"
												data-testid={`btn-book-preventive-${c.patientId}`}
											>
												<Calendar size={12} />
												<span>Записать</span>
											</button>
										</div>
									</div>

									{/* Procedure & Suggested Text preview */}
									<div className="mt-2 text-xs text-[var(--muted)] flex items-center justify-between gap-2">
										<span className="truncate">
											Рекомендуемая процедура: <strong>{c.recommendedProcedureName}</strong>
										</span>
									</div>
								</div>
							);
						})
					)}
				</div>

				{/* Footer */}
				<div className="px-5 py-3 border-t border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] flex items-center justify-between text-xs">
					<div className="text-[var(--muted,#64748b)]">
						Все приглашения составлены в строгом соответствии с 152-ФЗ (без разглашения диагнозов и зубов).
					</div>
					<button
						type="button"
						onClick={onClose}
						className="h-8 px-4 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper)] text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft)] text-xs font-semibold cursor-pointer"
					>
						Закрыть
					</button>
				</div>
			</div>
		</div>
	);
};
