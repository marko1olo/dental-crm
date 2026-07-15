import {
	AlignLeft,
	Beaker,
	CheckCircle2,
	Clock,
	Image as ImageIcon,
	PackageCheck,
	RefreshCcw,
	User,
} from "lucide-react";
import { useEffect, useState } from "react";

interface LabOrderData {
	id: string;
	patientFullName: string | null;
	toothFdi: string | null;
	material: string | null;
	colorVita: string | null;
	status: string;
	clinicalNotes: string | null;
	attachedImageUrl: string | null;
	createdAt: string;
}

export function GuestLabPortal() {
	const [token, setToken] = useState<string>("");
	const [order, setOrder] = useState<LabOrderData | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [isUpdating, setIsUpdating] = useState(false);

	useEffect(() => {
		// Extract token from hash "#/portal/lab-order/TOKEN"
		const hash = window.location.hash;
		const parts = hash.split("/lab-order/");
		if (parts.length > 1 && parts[1]) {
			const extractedToken = parts[1] as string;
			setToken(extractedToken);

			fetch(`/api/portal/lab-order/${extractedToken}`)
				.then((res) => {
					if (!res.ok) throw new Error("Заказ не найден или доступ запрещен");
					return res.json();
				})
				.then((data) => {
					setOrder(data);
				})
				.catch((e) => {
					setError(e.message);
				})
				.finally(() => {
					setIsLoading(false);
				});
		} else {
			setError("Токен не предоставлен");
			setIsLoading(false);
		}
	}, []);

	const updateStatus = async (newStatus: string) => {
		if (!token || !order) return;
		try {
			setIsUpdating(true);
			const res = await fetch(`/api/portal/lab-order/${token}/status`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ status: newStatus }),
			});

			if (!res.ok) throw new Error("Ошибка при обновлении статуса");

			const data = await res.json();
			if (data.success) {
				setOrder({ ...order, status: data.status });
			}
		} catch (e: any) {
			alert(e.message);
		} finally {
			setIsUpdating(false);
		}
	};

	if (isLoading) {
		return (
			<div className="min-h-screen bg-zinc-100/30 dark:bg-slate-950 flex items-center justify-center p-4">
				<div className="animate-spin text-primary">
					<RefreshCcw className="w-8 h-8" />
				</div>
			</div>
		);
	}

	if (error || !order) {
		return (
			<div className="min-h-screen bg-zinc-100/30 dark:bg-zinc-950 flex items-center justify-center p-4">
				<div className="bg-zinc-50/40 dark:bg-zinc-950/40 backdrop-blur-md p-8 rounded-2xl shadow-xl max-w-md w-full text-center border border-red-100 dark:border-red-900/30">
					<div className="w-16 h-16 bg-red-100 dark:bg-red-500/10 text-red-500 dark:text-red-400 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/20">
						<Beaker className="w-8 h-8" />
					</div>
					<h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
						Ошибка доступа
					</h2>
					<p className="text-slate-500 dark:text-slate-400">{error}</p>
				</div>
			</div>
		);
	}

	const getStatusIcon = (status: string) => {
		switch (status) {
			case "in_progress":
				return <Clock className="w-5 h-5 text-yellow-500" />;
			case "refitting":
				return <RefreshCcw className="w-5 h-5 text-orange-500" />;
			case "delivered":
				return <PackageCheck className="w-5 h-5 text-green-500" />;
			case "completed":
				return <CheckCircle2 className="w-5 h-5 text-emerald-600" />;
			default:
				return <Clock className="w-5 h-5 text-slate-400" />;
		}
	};

	const getStatusBadgeClass = (status: string) => {
		switch (status) {
			case "in_progress":
				return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800";
			case "refitting":
				return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300 border-orange-200 dark:border-orange-800";
			case "delivered":
				return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border-green-200 dark:border-green-800";
			case "completed":
				return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800";
			default:
				return "bg-zinc-100/50 text-slate-800 dark:bg-zinc-800/40 dark:text-zinc-300 border-zinc-200/50 dark:border-zinc-700/50";
		}
	};

	const statusLabel =
		{
			draft: "Черновик",
			sent: "Отправлен",
			in_progress: "В работе",
			shipped: "Отгружен",
			delivered: "Доставлен в клинику",
			refitting: "На переделке",
			completed: "Завершен",
		}[order.status] || order.status;

	return (
		<div className="min-h-screen bg-zinc-100/30 dark:bg-zinc-950 py-12 px-4 sm:px-6 lg:px-8">
			<div className="max-w-3xl mx-auto space-y-8">
				{/* Header */}
				<div className="text-center space-y-2">
					<div className="w-16 h-16 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
						<Beaker className="w-8 h-8" />
					</div>
					<h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
						Портал Зуботехнической Лаборатории
					</h1>
					<p className="text-slate-500 dark:text-slate-400">
						Безопасный доступ к деталям заказа
					</p>
				</div>

				<div className="bg-zinc-50/40 dark:bg-zinc-950/40 backdrop-blur-md shadow-xl rounded-2xl overflow-hidden border border-zinc-200/50 dark:border-zinc-800/50">
					{/* Order Header / Status */}
					<div className="p-6 sm:p-8 border-b border-zinc-200/50 dark:border-zinc-800/50 bg-zinc-50/20 dark:bg-zinc-900/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
						<div>
							<p className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
								Заказ № {(order.id ?? "").substring(0, 8).toUpperCase()}
							</p>
							<h2 className="text-2xl font-semibold text-slate-900 dark:text-white flex items-center gap-2">
								<User className="w-6 h-6 text-slate-400" />
								{order.patientFullName || "Пациент не указан"}
							</h2>
						</div>

						<div
							className={`px-4 py-2 rounded-full border flex items-center gap-2 font-medium ${getStatusBadgeClass(order.status)}`}
						>
							{getStatusIcon(order.status)}
							{statusLabel}
						</div>
					</div>

					{/* Details Grid */}
					<div className="p-6 sm:p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
						<div className="space-y-6">
							<div>
								<h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-2 flex items-center gap-2">
									<CheckCircle2 className="w-4 h-4" /> Технические параметры
								</h3>
								<div className="bg-zinc-100/30 dark:bg-slate-800/50 rounded-xl p-4 space-y-3">
									<div className="flex justify-between items-center">
										<span className="text-slate-600 dark:text-slate-400">
											Зуб (FDI)
										</span>
										<span className="font-semibold text-slate-900 dark:text-white text-lg px-2 py-1 bg-zinc-50/40 dark:bg-zinc-800/50 rounded-md shadow-sm border border-zinc-200/50 dark:border-zinc-700/50">
											{order.toothFdi || "—"}
										</span>
									</div>
									<div className="flex justify-between items-center">
										<span className="text-slate-600 dark:text-slate-400">
											Материал
										</span>
										<span className="font-medium text-slate-900 dark:text-white">
											{order.material || "—"}
										</span>
									</div>
									<div className="flex justify-between items-center">
										<span className="text-slate-600 dark:text-slate-400">
											Цвет (Vita)
										</span>
										<span className="font-medium text-slate-900 dark:text-white">
											{order.colorVita || "—"}
										</span>
									</div>
								</div>
							</div>

							<div>
								<h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-2 flex items-center gap-2">
									<AlignLeft className="w-4 h-4" /> Клинические заметки
								</h3>
								<div className="bg-yellow-50/50 dark:bg-yellow-900/10 rounded-xl p-4 text-slate-700 dark:text-slate-300 border border-yellow-100 dark:border-yellow-900/30 min-h-[100px]">
									{order.clinicalNotes ? (
										<p className="whitespace-pre-wrap text-sm leading-relaxed">
											{order.clinicalNotes}
										</p>
									) : (
										<p className="text-slate-400 italic text-sm">
											Врач не оставил дополнительных комментариев.
										</p>
									)}
								</div>
							</div>
						</div>

						<div className="space-y-6">
							<div>
								<h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-2 flex items-center gap-2">
									<ImageIcon className="w-4 h-4" /> Приложенные снимки
								</h3>
								{order.attachedImageUrl ? (
									<div className="rounded-xl overflow-hidden border border-zinc-200/50 dark:border-zinc-700/50 shadow-sm bg-zinc-100/50 dark:bg-zinc-900/40">
										<img
											src={order.attachedImageUrl}
											alt="Клинический снимок"
											className="w-full h-auto object-cover max-h-[250px]"
										/>
									</div>
								) : (
									<div className="rounded-xl border border-dashed border-zinc-300/50 dark:border-zinc-700/50 h-[250px] flex flex-col items-center justify-center text-slate-400 bg-zinc-100/30 dark:bg-zinc-900/20 backdrop-blur-sm">
										<ImageIcon className="w-10 h-10 mb-2 opacity-50" />
										<span className="text-sm font-medium">
											Нет приложенных снимков
										</span>
									</div>
								)}
							</div>
						</div>
					</div>

					{/* Actions */}
					<div className="p-6 sm:p-8 border-t border-zinc-200/50 dark:border-zinc-800/50 bg-zinc-100/30 dark:bg-zinc-900/20">
						<h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-4">
							Управление статусом заказа
						</h3>

						<div className="flex flex-wrap gap-3">
							<button
								onClick={() => updateStatus("in_progress")}
								disabled={isUpdating || order.status === "in_progress"}
								className={`flex-1 sm:flex-none px-6 py-3 rounded-xl font-medium transition-all shadow-sm ${
									order.status === "in_progress"
										? "bg-yellow-500 text-white ring-2 ring-yellow-500 ring-offset-2 ring-offset-slate-50 dark:ring-offset-slate-900"
										: "bg-zinc-50/40 dark:bg-zinc-800/50 text-slate-700 dark:text-slate-200 border border-zinc-200/50 dark:border-zinc-700/50 hover:bg-zinc-100/30 dark:hover:bg-zinc-700/50 hover:border-yellow-300 disabled:opacity-50"
								}`}
							>
								<div className="flex items-center justify-center gap-2">
									<Clock className="w-5 h-5" />
									Взять в работу
								</div>
							</button>

							<button
								onClick={() => updateStatus("delivered")}
								disabled={isUpdating || order.status === "delivered"}
								className={`flex-1 sm:flex-none px-6 py-3 rounded-xl font-medium transition-all shadow-sm ${
									order.status === "delivered"
										? "bg-green-500 text-white ring-2 ring-green-500 ring-offset-2 ring-offset-slate-50 dark:ring-offset-slate-900"
										: "bg-zinc-50/40 dark:bg-zinc-800/50 text-slate-700 dark:text-slate-200 border border-zinc-200/50 dark:border-zinc-700/50 hover:bg-zinc-100/30 dark:hover:bg-zinc-700/50 hover:border-green-300 disabled:opacity-50"
								}`}
							>
								<div className="flex items-center justify-center gap-2">
									<PackageCheck className="w-5 h-5" />
									Работа готова
								</div>
							</button>

							<button
								onClick={() => updateStatus("refitting")}
								disabled={isUpdating || order.status === "refitting"}
								className={`flex-1 sm:flex-none px-6 py-3 rounded-xl font-medium transition-all shadow-sm ${
									order.status === "refitting"
										? "bg-orange-500 text-white ring-2 ring-orange-500 ring-offset-2 ring-offset-slate-50 dark:ring-offset-slate-900"
										: "bg-zinc-50/40 dark:bg-zinc-800/50 text-slate-700 dark:text-slate-200 border border-zinc-200/50 dark:border-zinc-700/50 hover:bg-zinc-100/30 dark:hover:bg-zinc-700/50 hover:border-orange-300 disabled:opacity-50"
								}`}
							>
								<div className="flex items-center justify-center gap-2">
									<RefreshCcw className="w-5 h-5" />
									На переделке
								</div>
							</button>
						</div>
						<p className="mt-4 text-xs text-slate-400 dark:text-slate-500 text-center sm:text-left">
							* Изменение статуса автоматически уведомит врача в расписании
							клиники.
						</p>
					</div>
				</div>
			</div>
		</div>
	);
}
