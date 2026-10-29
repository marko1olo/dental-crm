import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
	FlaskConical,
	X,
	Plus,
	Search,
	CheckCircle2,
	Layers,
	ArrowRight,
} from "lucide-react";
import {
	type DentalLabOrder,
	type LabStageId,
	DENTAL_LAB_CATALOG,
	VITA_SHADES,
	LAB_STAGES,
	PARTNER_LABS,
	SAMPLE_LAB_ORDERS,
	addWorkingDaysRu,
	formatDateIso,
	formatKopecks,
} from "./dentalLabData";
import { DentalLabOrderCard } from "./DentalLabOrderCard";
import { denteAdminSecretRequestHeaders } from "../../lib/denteRequestHeaders";

export interface DentalLabHubModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly initialOrders?: readonly DentalLabOrder[] | DentalLabOrder[];
	readonly onSaveOrder?: (order: DentalLabOrder) => void;
	readonly currentDoctorName?: string;
	readonly currentPatientName?: string;
	readonly currentPatientId?: string;
	readonly currentToothNumber?: string | number;
	readonly treatmentPlanAgeDays?: number;
	readonly isPlanExpired?: boolean;
}

export const DentalLabHubModal: React.FC<DentalLabHubModalProps> = ({
	isOpen,
	onClose,
	initialOrders,
	onSaveOrder,
	currentDoctorName = "Д-р Смирнова Е. В. (Ортопед)",
	currentPatientName = "Ковалев Дмитрий Сергеевич",
	currentPatientId = "pat_direct",
	currentToothNumber = "16",
}) => {
	const [activeTab, setActiveTab] = useState<"active_orders" | "new_order">("active_orders");
	const [orders, setOrders] = useState<DentalLabOrder[]>(() =>
		initialOrders && initialOrders.length > 0 ? [...initialOrders] : [...SAMPLE_LAB_ORDERS],
	);
	const [searchQuery, setSearchQuery] = useState("");
	const [selectedStageFilter, setSelectedStageFilter] = useState<string>("all");
	const [selectedLabFilter, setSelectedLabFilter] = useState<string>("all");
	const [toastMessage, setToastMessage] = useState<string | null>(null);
	const [printingOrder, setPrintingOrder] = useState<DentalLabOrder | null>(null);

	// Express form states (15-second fast creation)
	const [patientName, setPatientName] = useState(currentPatientName);
	const [toothFdi, setToothFdi] = useState(String(currentToothNumber || "16"));
	const [selectedWorkId, setSelectedWorkId] = useState(DENTAL_LAB_CATALOG[0]?.id ?? "crown_zirconia");
	const [selectedShade, setSelectedShade] = useState("A2");
	const [selectedLabId, setSelectedLabId] = useState(PARTNER_LABS[0]?.id ?? "lab_art");
	const [dueDate, setDueDate] = useState<string>(() =>
		formatDateIso(addWorkingDaysRu(new Date(), 7)),
	);
	const [isUrgent, setIsUrgent] = useState(false);
	const [technicianNotes, setTechnicianNotes] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);

	const showToast = useCallback((msg: string) => {
		setToastMessage(msg);
		setTimeout(() => setToastMessage(null), 3000);
	}, []);

	// Live backend Fastify API synchronization
	useEffect(() => {
		if (!isOpen) return;
		let mounted = true;
		const fetchLiveOrders = async () => {
			try {
				const res = await fetch("/api/clinical/lab-orders", {
					headers: denteAdminSecretRequestHeaders({ Accept: "application/json" }),
				});
				if (res.ok) {
					const data = await res.json();
					if (mounted && Array.isArray(data) && data.length > 0) {
						setOrders((prev) => {
							const ids = new Set(prev.map((o) => o.id));
							return [...prev, ...data.filter((d: DentalLabOrder) => !ids.has(d.id))];
						});
					}
				}
			} catch {
				// Standalone / offline mode fallback
			}
		};
		void fetchLiveOrders();
		return () => {
			mounted = false;
		};
	}, [isOpen]);

	const handleAdvanceStage = useCallback(
		async (order: DentalLabOrder, nextStage: LabStageId) => {
			const updated: DentalLabOrder = { ...order, status: nextStage };
			setOrders((prev) => prev.map((o) => (o.id === order.id ? updated : o)));
			onSaveOrder?.(updated);
			showToast(`Статус наряда ${order.orderNumber} изменен`);
			try {
				await fetch(`/api/clinical/lab-orders/${order.id}`, {
					method: "PATCH",
					headers: denteAdminSecretRequestHeaders({ "Content-Type": "application/json" }),
					body: JSON.stringify({ status: nextStage }),
				});
			} catch {
				// Autonomy fallback without blocking doctor
			}
		},
		[onSaveOrder, showToast],
	);

	const handleCreateOrder = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!patientName.trim()) return;
		setIsSubmitting(true);

		const selectedWork =
			DENTAL_LAB_CATALOG.find((w) => w.id === selectedWorkId) ?? DENTAL_LAB_CATALOG[0]!;
		const selectedLab =
			PARTNER_LABS.find((l) => l.id === selectedLabId) ?? PARTNER_LABS[0]!;
		const orderNum = `ЗТЛ-${Math.floor(1000 + Math.random() * 9000)}`;

		const newOrder: DentalLabOrder = {
			id: `lab_ord_${Date.now()}`,
			orderNumber: orderNum,
			patientId: currentPatientId || "pat_direct",
			patientName: patientName.trim(),
			doctorName: currentDoctorName,
			clinicName: "Клиника DENTE",
			toothFdi: toothFdi.trim() || "16",
			workTypeId: selectedWork.id,
			workTitle: selectedWork.title,
			material: selectedWork.material,
			colorVita: selectedShade,
			labId: selectedLab.id,
			labName: selectedLab.name,
			status: "sent",
			createdDate: formatDateIso(new Date()),
			dueDate,
			patientPriceKopecks: selectedWork.defaultPatientPriceKopecks,
			ztlCostKopecks: selectedWork.defaultZtlCostKopecks,
			...(technicianNotes.trim() ? { notes: technicianNotes.trim() } : {}),
			...(isUrgent ? { isUrgent: true } : {}),
		};

		try {
			await fetch("/api/clinical/lab-orders", {
				method: "POST",
				headers: denteAdminSecretRequestHeaders({ "Content-Type": "application/json" }),
				body: JSON.stringify(newOrder),
			});
		} catch {
			// Non-blocking save
		}

		setOrders((prev) => [newOrder, ...prev]);
		onSaveOrder?.(newOrder);

		if (typeof window !== "undefined") {
			window.dispatchEvent(
				new CustomEvent("dente-lab-order-created", {
					detail: { order: newOrder, orderNumber: orderNum },
				}),
			);
		}

		setIsSubmitting(false);
		showToast(`✓ Наряд ${orderNum} отправлен в лабораторию`);
		setActiveTab("active_orders");
		setTechnicianNotes("");
	};

	const filteredOrders = useMemo(() => {
		return orders.filter((o) => {
			const matchesSearch =
				!searchQuery ||
				o.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
				o.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
				o.toothFdi.includes(searchQuery);
			const matchesStage = selectedStageFilter === "all" || o.status === selectedStageFilter;
			const matchesLab = selectedLabFilter === "all" || o.labId === selectedLabFilter;
			return matchesSearch && matchesStage && matchesLab;
		});
	}, [orders, searchQuery, selectedStageFilter, selectedLabFilter]);

	const readyInClinicCount = useMemo(
		() => orders.filter((o) => o.status === "ready_in_clinic").length,
		[orders],
	);

	if (!isOpen) return null;

	return (
		<div
			className="fixed inset-0 !z-[99999] flex items-center justify-center bg-black/70 backdrop-blur-xs p-0 sm:p-4 overflow-y-auto"
			role="dialog"
			aria-modal="true"
			data-testid="dental-lab-hub-modal"
		>
			<style>{`
				body:has([data-testid="dental-lab-hub-modal"]) .mobile-tab-bar,
				body:has([data-testid="dental-lab-hub-modal"]) .dnt-bottom-nav {
					display: none !important;
				}
			`}</style>
			<div className="bg-white dark:bg-slate-900 border-0 sm:border border-slate-200 dark:border-slate-800 rounded-none sm:rounded-2xl w-full max-w-5xl h-full sm:h-auto sm:max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-slate-900 dark:text-slate-100">
				{/* Modal Top Header */}
				<header className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50/70 dark:bg-slate-900/90">
					<div className="flex items-center gap-3">
						<div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 flex items-center justify-center text-teal-600 shrink-0">
							<FlaskConical size={20} />
						</div>
						<div>
							<h2 className="text-base font-bold text-slate-900 dark:text-slate-100 leading-tight">
								Лаборатория и наряды ЗТЛ
							</h2>
							<p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
								Рабочий кабинет ортопеда: заказов {orders.length} • готовы в клинике: {readyInClinicCount}
							</p>
						</div>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="p-2 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 min-h-[44px] min-w-[44px] flex items-center justify-center transition-colors cursor-pointer"
						aria-label="Закрыть окно"
					>
						<X size={20} />
					</button>
				</header>

				{/* Toast notification */}
				{toastMessage && (
					<div className="bg-teal-600 text-white px-4 py-2 text-xs font-semibold flex items-center justify-center gap-2 animate-fadeIn shrink-0">
						<CheckCircle2 size={16} />
						<span>{toastMessage}</span>
					</div>
				)}

				{/* Tabs Navigation */}
				<nav className="flex items-center gap-2 px-5 pt-3 pb-2 border-b border-slate-100 dark:border-slate-800 shrink-0 bg-white dark:bg-slate-900">
					<button
						type="button"
						onClick={() => setActiveTab("active_orders")}
						className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all min-h-[38px] flex items-center gap-1.5 cursor-pointer ${
							activeTab === "active_orders"
								? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700"
								: "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
						}`}
						data-testid="tab-active-lab-orders"
					>
						<Layers size={14} />
						<span>Активные наряды ({orders.length})</span>
					</button>
					<button
						type="button"
						onClick={() => setActiveTab("new_order")}
						className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all min-h-[38px] flex items-center gap-1.5 cursor-pointer ${
							activeTab === "new_order"
								? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700"
								: "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
						}`}
						data-testid="tab-new-lab-order"
					>
						<Plus size={14} />
						<span>Новый заказ-наряд</span>
					</button>
				</nav>

				{/* Tab 1: Active Orders List */}
				{activeTab === "active_orders" && (
					<div className="flex-1 overflow-y-auto p-4 sm:p-5 flex flex-col gap-4">
						<div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
							<div className="relative flex-1">
								<Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
								<input
									type="text"
									value={searchQuery}
									onChange={(e) => setSearchQuery(e.target.value)}
									placeholder="Поиск по пациенту, номеру ЗТЛ или зубу..."
									className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:border-teal-500 min-h-[40px]"
								/>
							</div>
							<div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
								<select
									value={selectedStageFilter}
									onChange={(e) => setSelectedStageFilter(e.target.value)}
									className="w-full sm:w-auto px-2.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 min-h-[40px] focus:outline-hidden"
								>
									<option value="all">Все этапы ({orders.length})</option>
									{LAB_STAGES.map((s) => (
										<option key={s.id} value={s.id}>{s.label} ({orders.filter((o) => o.status === s.id).length})</option>
									))}
								</select>
								<select
									value={selectedLabFilter}
									onChange={(e) => setSelectedLabFilter(e.target.value)}
									className="w-full sm:w-auto px-2.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 min-h-[40px] focus:outline-hidden"
								>
									<option value="all">Все лаборатории</option>
									{PARTNER_LABS.map((l) => (<option key={l.id} value={l.id}>{l.name}</option>))}
								</select>
							</div>
						</div>

						{filteredOrders.length === 0 ? (
							<div className="py-12 text-center text-slate-400 dark:text-slate-500">
								<FlaskConical size={36} className="mx-auto mb-2 opacity-50" />
								<p className="text-sm font-semibold">Нарядов не найдено</p>
								<p className="text-xs mt-1">Оформите новый заказ-наряд во вкладке выше.</p>
							</div>
						) : (
							<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 pb-2">
								{filteredOrders.map((ord) => (
									<DentalLabOrderCard key={ord.id} order={ord} onAdvanceStage={handleAdvanceStage} onOpenDetails={(o) => setPrintingOrder(o)} />
								))}
							</div>
						)}
					</div>
				)}

				{/* Tab 2: Fast Express New Order Form */}
				{activeTab === "new_order" && (
					<form onSubmit={handleCreateOrder} className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col gap-4">
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
							<div>
								<label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">ФИО Пациента</label>
								<input type="text" required value={patientName} onChange={(e) => setPatientName(e.target.value)} placeholder="Иванов Иван Иванович" className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 min-h-[40px] focus:outline-hidden" />
							</div>
							<div>
								<label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Зуб (формула FDI)</label>
								<div className="flex items-center gap-1.5">
									<input type="text" required value={toothFdi} onChange={(e) => setToothFdi(e.target.value)} className="w-20 px-3 py-2 text-xs font-bold text-teal-700 dark:text-teal-400 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 min-h-[40px] focus:outline-hidden" />
									<div className="flex items-center gap-1">
										{["16", "21", "26", "36", "46"].map((t) => (
											<button key={t} type="button" onClick={() => setToothFdi(t)} className={`px-2 py-1 text-[11px] font-bold rounded-lg border min-h-[36px] transition-colors cursor-pointer ${toothFdi === t ? "bg-teal-600 text-white border-teal-600" : "border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300"}`}>{t}</button>
										))}
									</div>
								</div>
							</div>
						</div>

						{/* Construction & Work Type */}
						<div>
							<label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Вид зуботехнической работы</label>
							<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
								{DENTAL_LAB_CATALOG.map((cat) => (
									<button key={cat.id} type="button" onClick={() => { setSelectedWorkId(cat.id); setDueDate(formatDateIso(addWorkingDaysRu(new Date(), cat.standardDays))); }} className={`p-2.5 rounded-xl border text-left flex flex-col justify-between gap-1 transition-all min-h-[60px] cursor-pointer ${selectedWorkId === cat.id ? "border-teal-600 bg-teal-50/60 dark:bg-teal-950/40 text-teal-900 dark:text-teal-100 shadow-2xs" : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/50 text-slate-800 dark:text-slate-200"}`}>
										<span className="font-bold text-xs">{cat.shortTitle}</span>
										<span className="text-[11px] font-semibold text-teal-700 dark:text-teal-400">{formatKopecks(cat.defaultPatientPriceKopecks)} • {cat.standardDays} дн.</span>
									</button>
								))}
							</div>
						</div>

						{/* VITA Shade */}
						<div>
							<label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Оттенок VITA Classical (выбран: {selectedShade})</label>
							<div className="flex flex-wrap items-center gap-1.5 p-2 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800">
								{VITA_SHADES.map((s) => (
									<button key={s.code} type="button" onClick={() => setSelectedShade(s.code)} className={`px-2 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 border transition-all min-h-[32px] cursor-pointer ${selectedShade === s.code ? "border-teal-600 ring-2 ring-teal-500/30 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-bold" : "border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300"}`}>
										<span className="w-2.5 h-2.5 rounded-full border border-slate-400 shrink-0" style={{ backgroundColor: s.hex }} />
										<span>{s.code}</span>
									</button>
								))}
							</div>
						</div>

						{/* Lab & Date */}
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
							<div>
								<label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Лаборатория</label>
								<select value={selectedLabId} onChange={(e) => setSelectedLabId(e.target.value)} className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 min-h-[40px]">
									{PARTNER_LABS.map((lab) => (<option key={lab.id} value={lab.id}>{lab.name}</option>))}
								</select>
							</div>
							<div>
								<label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Срок сдачи в клинику</label>
								<div className="flex items-center gap-2">
									<input type="date" required value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 min-h-[40px]" />
									<label className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer shrink-0">
										<input type="checkbox" checked={isUrgent} onChange={(e) => setIsUrgent(e.target.checked)} className="rounded border-slate-300 text-teal-600 focus:ring-teal-500 w-4 h-4" />
										<span className="font-semibold text-rose-600 dark:text-rose-400">Срочно</span>
									</label>
								</div>
							</div>
						</div>

						{/* Technician Notes */}
						<div>
							<label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Указания технику</label>
							<textarea rows={2} value={technicianNotes} onChange={(e) => setTechnicianNotes(e.target.value)} placeholder="Особенности окклюзии, прикуса, десневого профиля..." className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400" />
						</div>

						{/* Single Primary CTA Button */}
						<div className="sticky bottom-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xs py-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3 shrink-0">
							<button type="button" onClick={() => setActiveTab("active_orders")} className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 min-h-[44px] transition-colors cursor-pointer">
								Отмена
							</button>
							<button type="submit" disabled={isSubmitting} className="px-5 py-2 text-xs font-bold rounded-xl bg-teal-600 hover:bg-teal-700 text-white min-h-[44px] flex items-center gap-2 shadow-xs transition-colors cursor-pointer" data-testid="submit-new-lab-order-btn">
								<span>✓ Отправить заказ в лабораторию</span>
								<ArrowRight size={15} />
							</button>
						</div>
					</form>
				)}

				{/* Printable Blank Preview */}
				{printingOrder && (
					<div className="fixed inset-0 z-[10100] flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true">
						<div className="bg-white text-slate-900 rounded-2xl max-w-2xl w-full p-6 shadow-2xl flex flex-col gap-4 max-h-[90vh] overflow-y-auto">
							<div className="flex items-center justify-between pb-2 border-b border-slate-200">
								<h3 className="font-bold text-sm">Предпросмотр наряда-заказа</h3>
								<button type="button" onClick={() => setPrintingOrder(null)} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center">
									<X size={18} />
								</button>
							</div>
							<DentalLabOrderCard order={printingOrder} isPrintBlankMode={true} />
							<div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
								<button type="button" onClick={() => setPrintingOrder(null)} className="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-300 hover:bg-slate-50 min-h-[44px]">Закрыть</button>
								<button type="button" onClick={() => window.print()} className="px-4 py-2 text-xs font-bold rounded-lg bg-teal-600 hover:bg-teal-700 text-white min-h-[44px]">Распечатать А5</button>
							</div>
						</div>
					</div>
				)}
			</div>
		</div>
	);
};

export const DentalLabOrdersHubModal = DentalLabHubModal;
