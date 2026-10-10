import type { ProtocolTemplate } from "@dental/shared";
import {
	Check,
	ClipboardCheck,
	Edit2,
	Plus,
	Search,
	ShieldCheck,
	Sparkles,
	Trash2,
	X,
} from "lucide-react";
import { useState } from "react";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import {
	actionFailureToast,
	NO_RESPONSE_CAUSE,
} from "../../lib/panelStateText";
import { useSettingsDerivations } from "../../useSettingsDerivations";
import { EmptyState } from "../EmptyState";
import { showToast } from "../GlobalToast";
import { AutoclaveLog257Modal } from "../sanpin/autoclaveLog/AutoclaveLog257Modal.js";
import "./SettingsProtocolsTab.css";
import { logger } from "../../utils/logger";
import {
	ICD10_CLINICAL_PRESETS,
	PROTOCOL_CLINICAL_SNIPPETS,
	STANDARD_PROTOCOLS_SEED,
	type ProtocolSnippet,
} from "./protocolSnippetHelpers";
import { SettingsProtocolsEditForm } from "./SettingsProtocolsEditForm";

async function refusalMessage(
	response: Response,
	action: string,
): Promise<string> {
	let serverMessage = "";
	try {
		const payload = (await response.json()) as { message?: unknown };
		if (typeof payload.message === "string")
			serverMessage = payload.message.trim();
	} catch {
		// Тело не разобралось
	}
	if (serverMessage && /[А-Яа-яЁё]/.test(serverMessage)) {
		return `${action}: ${serverMessage}`;
	}
	logger.error(
		`[SettingsProtocolsTab] ${response.url} ответил ${response.status}: ${serverMessage || "без сообщения"}`,
	);
	return actionFailureToast(action, response.status);
}

export function SettingsProtocolsTab() {
	const appLogic = useAppLogicContext();
	const derivations = useSettingsDerivations();
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	const mergedProps = Object.assign({}, appLogic, derivations) as any;
	const {
		dashboard,
		loadDashboard,
		specialtyLabels,
		documentLabels,
		imagingKindLabels,
		auth,
	} = mergedProps;

	const typedProtocolTemplates = (dashboard?.protocolTemplates ||
		[]) as ProtocolTemplate[];

	const [isEditing, setIsEditing] = useState<boolean>(false);
	const [editingId, setEditingId] = useState<string | null>(null);
	const [editForm, setEditForm] = useState<Partial<ProtocolTemplate>>({});
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [isAutoclaveModalOpen, setIsAutoclaveModalOpen] = useState<boolean>(false);
	const [searchQuery, setSearchQuery] = useState("");
	const [selectedSpecialtyFilter, setSelectedSpecialtyFilter] = useState<string>("all");

	const handleAppendSnippet = (snippet: ProtocolSnippet) => {
		setEditForm((prev) => {
			const current = prev[snippet.targetField] || "";
			const next = current ? `${current}\n${snippet.text}` : snippet.text;
			return { ...prev, [snippet.targetField]: next };
		});
		showToast(`Добавлен блок: ${snippet.label}`, "info");
	};

	const filteredTemplates = typedProtocolTemplates.filter((t) => {
		const q = searchQuery.trim().toLowerCase();
		const matchesSearch =
			!q ||
			t.title.toLowerCase().includes(q) ||
			t.visitReason.toLowerCase().includes(q) ||
			(t.diagnosisHints ?? []).some((h) => h.toLowerCase().includes(q)) ||
			(t.safetyWarnings ?? []).some((w) => w.toLowerCase().includes(q));
		const matchesSpecialty =
			selectedSpecialtyFilter === "all" || t.specialty === selectedSpecialtyFilter;
		return matchesSearch && matchesSpecialty;
	});

	const handleCreateNew = () => {
		setEditingId(null);
		setEditForm({
			specialty: "universal",
			title: "Новый шаблон",
			visitReason: "Первичный прием",
			defaultDurationMinutes: 30,
			complaintPrompt: "",
			objectiveTemplate: "",
			treatmentPlanTemplate: "",
			diagnosisHints: [],
			requiredDocuments: [],
			suggestedImaging: [],
			safetyWarnings: [],
		});
		setIsEditing(true);
	};

	const handleEdit = (template: ProtocolTemplate) => {
		setEditingId(template.id);
		setEditForm({ ...template });
		setIsEditing(true);
	};

	const handleCancel = () => {
		setIsEditing(false);
		setEditingId(null);
		setEditForm({});
		setError(null);
	};

	const handleSave = async () => {
		setError(null);
		setLoading(true);
		try {
			const method = editingId ? "PUT" : "POST";
			const url = editingId
				? `/api/settings/protocols/${editingId}`
				: "/api/settings/protocols";

			const res = await fetch(url, {
				method,
				headers: auth.settingsAccessHeaders({
					"Content-Type": "application/json",
				}),
				body: JSON.stringify(editForm),
			});

			if (!res.ok) {
				setError(await refusalMessage(res, "Шаблон не сохранён"));
				return;
			}

			if (typeof loadDashboard === "function") {
				await loadDashboard();
			}
			setIsEditing(false);
			setEditingId(null);
			setEditForm({});
			showToast("Шаблон сохранён", "success");
			// biome-ignore lint/suspicious/noExplicitAny: automated suppression
		} catch (err: any) {
			logger.error(err);
			showToast(
				actionFailureToast(
					"Шаблон не сохранён",
					(err as { status?: number })?.status ?? null,
				),
				"error",
			);
			setError(`Шаблон не сохранён: ${NO_RESPONSE_CAUSE}.`);
		} finally {
			setLoading(false);
		}
	};

	const handleDelete = async (id: string) => {
		setLoading(true);
		try {
			const res = await fetch(`/api/settings/protocols/${id}`, {
				method: "DELETE",
				headers: auth.settingsAccessHeaders(),
			});

			if (!res.ok) {
				showToast(await refusalMessage(res, "Шаблон не удалён"), "error");
				setLoading(false);
				return;
			}
			if (typeof loadDashboard === "function") {
				await loadDashboard();
			}
			showToast("Шаблон удалён", "success");
			// biome-ignore lint/suspicious/noExplicitAny: automated suppression
		} catch (err: any) {
			logger.error(err);
			showToast(
				actionFailureToast(
					"Шаблон не удалён",
					(err as { status?: number })?.status ?? null,
				),
				"error",
			);
			setLoading(false);
		}
	};

	const handleSeedStandardProtocols = async () => {
		setLoading(true);
		try {
			let createdCount = 0;
			for (const proto of STANDARD_PROTOCOLS_SEED) {
				const res = await fetch("/api/settings/protocols", {
					method: "POST",
					headers: auth.settingsAccessHeaders({
						"Content-Type": "application/json",
					}),
					body: JSON.stringify(proto),
				});
				if (res.ok) createdCount++;
			}
			if (typeof loadDashboard === "function") {
				await loadDashboard();
			}
			showToast(
				createdCount > 0
					? `Добавлено ${createdCount} стандартных клинических протоколов!`
					: "Протоколы уже загружены",
				"success",
			);
		} catch (err) {
			logger.error("[protocols] сбой загрузки шаблонов", err);
			showToast("Сбой загрузки стандартных протоколов", "error");
		} finally {
			setLoading(false);
		}
	};

	if (isEditing) {
		return (
			<SettingsProtocolsEditForm
				editingId={editingId}
				editForm={editForm}
				setEditForm={setEditForm}
				error={error}
				loading={loading}
				specialtyLabels={specialtyLabels}
				onSave={handleSave}
				onCancel={handleCancel}
				onAppendSnippet={handleAppendSnippet}
			/>
		);
	}

	return (
		<section
			className="protocol-settings animate-fade-in"
			aria-label="Библиотека клинических протоколов"
		>
			<div
				className="import-copy"
				style={{
					display: "flex",
					justifyContent: "space-between",
					alignItems: "flex-start",
				}}
			>
				<div style={{ display: "flex", gap: "1rem" }}>
					<ClipboardCheck aria-hidden="true" />
					<div>
						<p className="eyebrow">Протоколы</p>
						<h2>Шаблоны приема по специальностям</h2>
						<p>
							Настройте протоколы для ускорения заполнения медкарты и автоподбора диагнозов МКБ-10.
						</p>
					</div>
				</div>
				<div className="dente-segmented-bar" role="toolbar" aria-label="Управление шаблонами протоколов">
					<button
						type="button"
						className="dente-segmented-item"
						onClick={handleSeedStandardProtocols}
						disabled={loading}
						title="Подключить стандартные протоколы клиники"
					>
						<Sparkles size={14} style={{ color: "var(--teal)" }} />
						<span>Базовые протоколы</span>
					</button>
					<button
						type="button"
						className="dente-segmented-item"
						onClick={() => setIsAutoclaveModalOpen(true)}
						title="Журнал контроля работы стерилизаторов и автоклавирования"
						data-testid="protocols-open-autoclave-log-btn"
					>
						<ShieldCheck size={14} style={{ color: "var(--teal)" }} />
						<span>Журнал стерилизации</span>
					</button>
					<button
						type="button"
						className="dente-segmented-item active"
						onClick={handleCreateNew}
						title="Добавить новый шаблон протокола"
					>
						<Plus size={14} />
						<span>Добавить шаблон</span>
					</button>
				</div>
			</div>

			{!dashboard ? (
				<EmptyState
					icon={<ClipboardCheck aria-hidden="true" />}
					title="Загружаем шаблоны протоколов..."
					description="Это займёт пару секунд."
				/>
			) : typedProtocolTemplates.length === 0 ? (
				<EmptyState
					icon={<ClipboardCheck aria-hidden="true" />}
					title="Шаблонов приёма пока нет"
					description="Шаблон подставляет врачу причину визита, длительность, нужные документы и снимки. Подключите стандартный пакет или добавьте вручную."
					action={
						<div
							style={{
								display: "flex",
								gap: "8px",
								flexWrap: "wrap",
								justifyContent: "center",
							}}
						>
							<button
								className="primary-button"
								type="button"
								onClick={handleSeedStandardProtocols}
								disabled={loading}
								style={{
									display: "inline-flex",
									alignItems: "center",
									gap: "6px",
									minHeight: "44px",
								}}
							>
								<Sparkles size={16} /> Подключить базовые протоколы клиники
							</button>
							<button
								className="secondary-button"
								type="button"
								onClick={handleCreateNew}
								style={{
									display: "inline-flex",
									alignItems: "center",
									gap: "6px",
									minHeight: "44px",
								}}
							>
								<Plus size={16} /> Добавить вручную
							</button>
						</div>
					}
				/>
			) : (
				<>
					{/* Поиск и быстрый фильтр по специальностям */}
					<div className="flex items-center justify-between gap-3 flex-wrap my-4 p-3 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)]">
						<div className="dente-search-wrap flex-1 min-w-[240px]">
							<Search className="dente-search-icon" size={14} aria-hidden="true" />
							<input
								type="search"
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								placeholder="Быстрый поиск по названию, причине визита или МКБ-10..."
								className="dente-search-input"
								data-testid="input-search-protocols"
							/>
							{searchQuery && (
								<button
									type="button"
									onClick={() => setSearchQuery("")}
									className="dente-search-clear"
									aria-label="Очистить поиск"
								>
									<X size={13} />
								</button>
							)}
						</div>
						<div className="dente-filter-chips" role="group" aria-label="Фильтр протоколов по специальностям">
							{[
								{ key: "all", label: "Все" },
								{ key: "therapist", label: "Терапевт" },
								{ key: "surgeon", label: "Хирург" },
								{ key: "orthopedist", label: "Ортопед" },
								{ key: "hygienist", label: "Гигиенист" },
								{ key: "universal", label: "Универсальный" },
							].map((f) => {
								const count = f.key === "all"
									? typedProtocolTemplates.length
									: typedProtocolTemplates.filter((t) => t.specialty === f.key).length;
								return (
									<button
										key={f.key}
										type="button"
										onClick={() => setSelectedSpecialtyFilter(f.key)}
										className={`dente-filter-chip ${selectedSpecialtyFilter === f.key ? "active" : ""}`}
										data-active={selectedSpecialtyFilter === f.key}
									>
										<span>{f.label}</span>
										{count > 0 && <span className="opacity-70 text-[10px] ml-1 font-mono">({count})</span>}
									</button>
								);
							})}
						</div>
					</div>

					{filteredTemplates.length === 0 ? (
						<div className="p-8 text-center text-xs text-[var(--muted)] bg-[var(--paper-soft)] rounded-xl border border-[var(--line)]">
							Шаблоны протоколов по заданному запросу или специальности не найдены.
						</div>
					) : (
						<div className="protocol-settings-grid">
							{filteredTemplates.map((template) => (
								<article className="protocol-settings-card" key={template.id}>
									<div className="protocol-settings-head">
										<div className="flex items-center justify-between gap-1 flex-wrap mb-1">
											<span>
												{specialtyLabels?.[template.specialty] ?? template.specialty}
											</span>
											{(template.diagnosisHints ?? []).length > 0 && (
												<div className="flex items-center gap-1 flex-wrap">
													{template.diagnosisHints?.map((code) => (
														<span
															key={code}
															className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-teal-500/15 text-teal-800 dark:text-teal-300 border border-teal-500/30"
															title={`МКБ-10: ${code}`}
														>
															МКБ {code}
														</span>
													))}
												</div>
											)}
										</div>
										<strong>{template.title}</strong>
										<p>
											{template.visitReason} · {template.defaultDurationMinutes} мин
										</p>
									</div>
									<section
										className="protocol-token-row"
										aria-label="Документы протокола"
									>
										{(template.requiredDocuments ?? []).map((kind) => (
											<span key={kind}>{documentLabels?.[kind] ?? kind}</span>
										))}
									</section>
									<section
										className="protocol-token-row protocol-token-row-soft"
										aria-label="Снимки протокола"
									>
										{(template.suggestedImaging ?? []).map((kind) => (
											<span key={kind}>{imagingKindLabels?.[kind] ?? kind}</span>
										))}
									</section>
									<ul>
										{(template.safetyWarnings ?? []).slice(0, 2).map((warning) => (
											<li key={warning}>{warning}</li>
										))}
									</ul>
									<div
										style={{ display: "flex", gap: "0.5rem", marginTop: "1rem" }}
									>
										<button
											className="secondary-button"
											type="button"
											style={{
												minWidth: "44px",
												minHeight: "44px",
												display: "inline-flex",
												alignItems: "center",
												justifyContent: "center",
											}}
											onClick={() => handleEdit(template)}
											title="Редактировать"
											aria-label={`Редактировать шаблон «${template.title}»`}
										>
											<Edit2 size={16} />
										</button>
										<button
											className="secondary-button"
											type="button"
											style={{
												backgroundColor: "var(--bad-bg)",
												color: "var(--bad-fg)",
												minWidth: "44px",
												minHeight: "44px",
												display: "inline-flex",
												alignItems: "center",
												justifyContent: "center",
											}}
											onClick={() => handleDelete(template.id)}
											title="Удалить"
											aria-label={`Удалить шаблон «${template.title}»`}
											disabled={loading}
										>
											<Trash2 size={16} />
										</button>
									</div>
								</article>
							))}
						</div>
					)}
				</>
			)}

			<AutoclaveLog257Modal
				isOpen={isAutoclaveModalOpen}
				onClose={() => setIsAutoclaveModalOpen(false)}
				initialTab="journal_257"
			/>
		</section>
	);
}
