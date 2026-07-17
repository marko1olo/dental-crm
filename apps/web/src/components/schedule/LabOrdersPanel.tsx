import {
	Calendar,
	DollarSign,
	FlaskConical,
	Link,
	Plus,
	Trash2,
} from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import { useAppStore } from "../../store/appStore";
import { showToast } from "../GlobalToast";

interface LabOrder {
	id: string;
	patientId: string;
	patientName: string;
	doctorId: string | null;
	doctorName: string | null;
	secureToken: string;
	toothFdi: string | null;
	material: string | null;
	colorVita: string | null;
	status:
		| "draft"
		| "sent"
		| "in_progress"
		| "shipped"
		| "received"
		| "refitting"
		| "completed";
	dueDate: string | null;
	clinicalNotes: string | null;
	labComments: string | null;
	attachedImageUrl: string | null;
	priceRub: number | null;
	createdAt: string;
}

export function LabOrdersPanel({ patientId }: { patientId: string }) {
	const { auth, dashboard } = useAppLogicContext();
	const liveStatus = useAppStore(
		(state) => state.labOrderStatuses[patientId],
	);
	const [orders, setOrders] = useState<LabOrder[]>([]);
	const [isLoading, setIsLoading] = useState(false);

	// Form state for new ZTL order
	const [toothFdi, setToothFdi] = useState("");
	const [material, setMaterial] = useState("zirconia");
	const [colorVita, setColorVita] = useState("A3");
	const [dueDate, setDueDate] = useState("");
	const [clinicalNotes, setClinicalNotes] = useState("");
	const [priceRub, setPriceRub] = useState("");
	const [doctorId, setDoctorId] = useState("");

	const staff = dashboard?.clinicSettings?.staff || [];
	const doctors = staff.filter(
		(s: any) => s.role === "doctor" || s.role === "Врач" || s.role === "admin",
	);

	useEffect(() => {
		if (doctors.length > 0 && !doctorId) {
			setDoctorId(doctors[0].id);
		}
	}, [doctors, doctorId]);

	const fetchOrders = async () => {
		try {
			setIsLoading(true);
			const res = await fetch(
				`/api/clinical/lab-orders?patientId=${patientId}`,
				{
					headers: auth.denteClinicalReadHeaders(),
				},
			);
			if (res.ok) {
				const data = await res.json();
				setOrders(Array.isArray(data) ? data : []);
			}
		} catch (e) {
			console.error("Failed to load lab orders", e);
		} finally {
			setIsLoading(false);
		}
	};

	useEffect(() => {
		if (patientId) {
			fetchOrders();
		}
	}, [patientId]);

	// A technician changing an order from the guest portal broadcasts over WS
	// into the app store; refetch so the clinic view reflects it live instead of
	// only on remount.
	useEffect(() => {
		if (patientId && liveStatus) {
			fetchOrders();
		}
	}, [liveStatus]);

	const handleCreateOrder = async (e: React.FormEvent) => {
		e.preventDefault();
		try {
			const res = await fetch("/api/clinical/lab-orders", {
				method: "POST",
				headers: auth.denteClinicalReadHeaders({
					"Content-Type": "application/json",
				}),
				body: JSON.stringify({
					patientId,
					doctorId: doctorId || null,
					toothFdi: toothFdi || null,
					material,
					colorVita,
					dueDate: dueDate || null,
					clinicalNotes,
					priceRub: priceRub ? parseInt(priceRub) : null,
				}),
			});

			if (res.ok) {
				showToast(
					"Заказ зуботехнической лаборатории (ЗТЛ) успешно создан",
					"success",
				);
				setToothFdi("");
				setDueDate("");
				setClinicalNotes("");
				setPriceRub("");
				fetchOrders();
			} else {
				const err = await res.json().catch(() => ({}));
				showToast(err.message || "Ошибка создания заказа ЗТЛ", "error");
			}
		} catch (e) {
			showToast("Системная ошибка", "error");
		}
	};

	const handleDeleteOrder = async (id: string) => {
		if (!window.confirm("Удалить заказ зуботехнической лаборатории?")) return;
		try {
			const res = await fetch(`/api/clinical/lab-orders/${id}`, {
				method: "DELETE",
				headers: auth.denteClinicalReadHeaders(),
			});
			if (res.ok) {
				showToast("Заказ удален", "success");
				fetchOrders();
			} else {
				showToast("Ошибка удаления", "error");
			}
		} catch (e) {
			showToast("Системная ошибка", "error");
		}
	};

	const handleStatusChange = async (
		id: string,
		status: LabOrder["status"],
	) => {
		// Optimistic: reflect the new status immediately, roll back on failure.
		const previous = orders;
		setOrders((current) =>
			current.map((o) => (o.id === id ? { ...o, status } : o)),
		);
		try {
			const res = await fetch(`/api/clinical/lab-orders/${id}`, {
				method: "PUT",
				headers: auth.denteClinicalReadHeaders({
					"Content-Type": "application/json",
				}),
				body: JSON.stringify({ status }),
			});
			if (res.ok) {
				showToast("Статус заказа ЗТЛ обновлён", "success");
				fetchOrders();
			} else {
				setOrders(previous);
				const err = await res.json().catch(() => ({}));
				showToast(err.message || "Ошибка обновления статуса", "error");
			}
		} catch (e) {
			setOrders(previous);
			showToast("Системная ошибка", "error");
		}
	};

	const copyPortalLink = (token: string) => {
		const url = `${window.location.origin}/#/portal/lab-order/${token}`;
		navigator.clipboard.writeText(url);
		showToast("Ссылка для зуботехника скопирована в буфер обмена", "success");
	};

	// Mirrors the <option> set in the create form so every material renders with
	// a correct label instead of falling back to "Металлокерамика".
	const materialLabels: Record<string, string> = {
		zirconia: "Цирконий",
		emax: "E.max",
		pfm: "Металлокерамика",
		composite: "Композит",
		temporary: "Временная пластмасса",
	};

	const statusLabels = {
		draft: "Черновик",
		sent: "Отправлен в лабораторию",
		in_progress: "В работе у техника",
		shipped: "Отправлен курьером",
		received: "Получен клиникой",
		refitting: "Переделка",
		completed: "Установлен пациенту",
	};

	// Statuses the clinic controls directly (the technician owns in_progress /
	// shipped / refitting from the guest portal).
	const clinicStatusFlow: LabOrder["status"][] = [
		"draft",
		"sent",
		"received",
		"completed",
	];

	const statusColors = {
		draft: "text-slate-400 border-slate-700/50 bg-slate-800/40",
		sent: "text-blue-400 border-blue-500/30 bg-blue-500/10",
		in_progress: "text-amber-400 border-amber-500/30 bg-amber-500/10",
		shipped: "text-purple-400 border-purple-500/30 bg-purple-500/10",
		received: "text-indigo-400 border-indigo-500/30 bg-indigo-500/10",
		refitting: "text-rose-400 border-rose-500/30 bg-rose-500/10",
		completed: "text-teal-400 border-teal-500/30 bg-teal-500/10",
	};

	return (
		<div className="space-y-4">
			{/* Create Form */}
			<form
				onSubmit={handleCreateOrder}
				className="bg-slate-800/20 p-4 border border-slate-700/40 rounded-xl space-y-4"
			>
				<h4 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
					<FlaskConical className="w-4 h-4 text-teal-400" />
					Новый наряд ЗТЛ
				</h4>

				<div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
					<div className="space-y-1">
						<label className="text-xs text-slate-400">Зуб (FDI)</label>
						<input
							type="text"
							placeholder="Напр. 16, 24"
							value={toothFdi}
							onChange={(e) => setToothFdi(e.target.value)}
							className="w-full bg-[#1e293b] border border-slate-700 rounded-lg p-2 text-xs text-slate-100 focus:outline-none focus:border-teal-500"
						/>
					</div>

					<div className="space-y-1">
						<label className="text-xs text-slate-400">Материал</label>
						<select
							value={material}
							onChange={(e) => setMaterial(e.target.value)}
							className="w-full bg-[#1e293b] border border-slate-700 rounded-lg p-2 text-xs text-slate-100 focus:outline-none focus:border-teal-500"
						>
							<option value="zirconia">Диоксид циркония</option>
							<option value="emax">E.max (керамика)</option>
							<option value="pfm">Металлокерамика</option>
							<option value="composite">Композит</option>
							<option value="temporary">Временная пластмасса</option>
						</select>
					</div>

					<div className="space-y-1">
						<label className="text-xs text-slate-400">Цвет (Vita)</label>
						<select
							value={colorVita}
							onChange={(e) => setColorVita(e.target.value)}
							className="w-full bg-[#1e293b] border border-slate-700 rounded-lg p-2 text-xs text-slate-100 focus:outline-none focus:border-teal-500"
						>
							{[
								"OM1",
								"OM2",
								"OM3",
								"A1",
								"A2",
								"A3",
								"A3.5",
								"A4",
								"B1",
								"B2",
								"B3",
								"C1",
								"C2",
								"D2",
								"D3",
							].map((v) => (
								<option key={v} value={v}>
									{v}
								</option>
							))}
						</select>
					</div>

					<div className="space-y-1">
						<label className="text-xs text-slate-400">Стоимость (₽)</label>
						<input
							type="number"
							placeholder="0"
							value={priceRub}
							onChange={(e) => setPriceRub(e.target.value)}
							className="w-full bg-[#1e293b] border border-slate-700 rounded-lg p-2 text-xs text-slate-100 focus:outline-none focus:border-teal-500"
						/>
					</div>
				</div>

				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
					<div className="space-y-1">
						<label className="text-xs text-slate-400">Лечащий врач</label>
						<select
							value={doctorId}
							onChange={(e) => setDoctorId(e.target.value)}
							className="w-full bg-[#1e293b] border border-slate-700 rounded-lg p-2 text-xs text-slate-100 focus:outline-none focus:border-teal-500"
						>
							<option value="">Не указан</option>
							{doctors.map((doc: any) => (
								<option key={doc.id} value={doc.id}>
									{doc.fullName}
								</option>
							))}
						</select>
					</div>

					<div className="space-y-1">
						<label className="text-xs text-slate-400">Срок готовности</label>
						<input
							type="datetime-local"
							value={dueDate}
							onChange={(e) => setDueDate(e.target.value)}
							className="w-full bg-[#1e293b] border border-slate-700 rounded-lg p-2 text-xs text-slate-100 focus:outline-none focus:border-teal-500"
						/>
					</div>

					<div className="space-y-1">
						<label className="text-xs text-slate-400">
							Клиническое примечание
						</label>
						<input
							type="text"
							placeholder="Опишите особенности прикуса, уступы..."
							value={clinicalNotes}
							onChange={(e) => setClinicalNotes(e.target.value)}
							className="w-full bg-[#1e293b] border border-slate-700 rounded-lg p-2 text-xs text-slate-100 focus:outline-none focus:border-teal-500"
						/>
					</div>
				</div>

				<button
					type="submit"
					className="w-full py-2 bg-teal-500 hover:bg-teal-600 active:bg-teal-700 text-[#1e293b] font-bold rounded-lg text-xs transition-colors shadow-md shadow-teal-500/10"
				>
					Создать наряд ЗТЛ
				</button>
			</form>

			{/* Orders List */}
			<div className="space-y-2">
				{isLoading && orders.length === 0 ? (
					<div className="text-center py-4 text-xs text-slate-400">
						Загрузка...
					</div>
				) : orders.length === 0 ? (
					<div className="text-center py-6 text-xs text-slate-500 border border-dashed border-slate-700/60 rounded-xl">
						Нет активных заказов ЗТЛ
					</div>
				) : (
					<div className="space-y-2">
						{orders.map((order) => (
							<div
								key={order.id}
								className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
							>
								<div className="space-y-1">
									<div className="flex items-center gap-2 flex-wrap">
										<span className="font-semibold text-slate-200">
											Зуб {order.toothFdi || "весь рот"}
										</span>
										<span className="text-slate-400">·</span>
										<span className="text-slate-300">
											{order.material
												? (materialLabels[order.material] ?? order.material)
												: "не указ."}
										</span>
										<span className="text-slate-400">·</span>
										<span className="text-slate-300">
											Цвет: {order.colorVita || "не указ."}
										</span>
										<span
											className={`px-2 py-0.5 rounded-full border text-[10px] font-bold tracking-wide uppercase ${statusColors[order.status]}`}
										>
											{statusLabels[order.status]}
										</span>
									</div>
									{order.clinicalNotes && (
										<p className="text-slate-400 italic">
											«{order.clinicalNotes}»
										</p>
									)}
									{order.dueDate && (
										<div className="text-[11px] text-slate-400 flex items-center gap-1">
											<Calendar className="w-3.5 h-3.5 text-teal-400/80" />
											Срок: {new Date(order.dueDate).toLocaleDateString()} в{" "}
											{new Date(order.dueDate).toLocaleTimeString([], {
												hour: "2-digit",
												minute: "2-digit",
											})}
										</div>
									)}
								</div>

								<div className="flex items-center gap-2">
									{order.priceRub && (
										<span className="font-semibold text-teal-400 flex items-center gap-0.5 mr-2">
											<DollarSign className="w-3.5 h-3.5" />
											{order.priceRub.toLocaleString()} ₽
										</span>
									)}
									<select
										value={order.status}
										onChange={(e) =>
											handleStatusChange(
												order.id,
												e.target.value as LabOrder["status"],
											)
										}
										className="py-1 px-2 bg-[#1e293b] border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-teal-500"
										title="Изменить статус заказа ЗТЛ"
									>
										{clinicStatusFlow.map((s) => (
											<option key={s} value={s}>
												{statusLabels[s]}
											</option>
										))}
										{/* Keep technician-owned states selectable-as-current so the
											control never silently drops the order's real status. */}
										{!clinicStatusFlow.includes(order.status) && (
											<option value={order.status}>
												{statusLabels[order.status]}
											</option>
										)}
									</select>
									<button
										onClick={() => copyPortalLink(order.secureToken)}
										className="py-1 px-2.5 bg-teal-500/10 hover:bg-teal-500/20 text-teal-400 border border-teal-500/20 rounded-lg font-semibold transition-colors flex items-center gap-1"
									>
										<Link className="w-3.5 h-3.5" />
										Линк
									</button>
									<button
										onClick={() => handleDeleteOrder(order.id)}
										className="p-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-lg transition-colors"
									>
										<Trash2 className="w-3.5 h-3.5" />
									</button>
								</div>
							</div>
						))}
					</div>
				)}
			</div>
		</div>
	);
}
