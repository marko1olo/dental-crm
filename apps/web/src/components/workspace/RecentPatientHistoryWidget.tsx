import React, { useEffect, useState } from "react";
import { Clock, UserCheck, ChevronRight } from "lucide-react";
import { useAppLogicContext } from "../../contexts/AppLogicContext";

interface RecentPatientItem {
	id: string;
	organizationId: string;
	userId: string;
	patientId: string;
	patientName: string;
	phone: string;
	lastViewedAt: string;
}

export const RecentPatientHistoryWidget: React.FC<{ compactDropdown?: boolean }> = ({ compactDropdown = false }) => {
	let auth: any = null;
	let selectPatient: any = () => {};
	try {
		const ctx = useAppLogicContext();
		auth = ctx?.auth;
		selectPatient = ctx?.selectPatient ?? (() => {});
	} catch {
		// Optional fallback when rendered outside AppLogicProvider
	}
	const [patients, setPatients] = useState<RecentPatientItem[]>([]);
	const [loading, setLoading] = useState<boolean>(true);
	const [isOpen, setIsOpen] = useState<boolean>(false);

	const fetchRecent = () => {
		fetch("/api/hr/recent-patients", {
			headers: auth ? auth.denteClinicalReadHeaders() : { "x-organization-id": "00000000-0000-0000-0000-000000000001" },
		})
			.then((res) => res.json())
			.then((data) => {
				setPatients(Array.isArray(data) ? data : []);
				setLoading(false);
			})
			.catch((err) => {
				console.error("[RecentPatientHistoryWidget fetch error]:", err);
				setLoading(false);
			});
	};

	useEffect(() => {
		fetchRecent();
	}, []);

	const handleOpenPatient = (patId: string) => {
		if (selectPatient) {
			selectPatient(patId);
		}
		window.location.hash = "#patients";
		setIsOpen(false);
	};

	if (compactDropdown) {
		return (
			<details
				className="workspace-role-switcher recent-patients-header-dropdown"
				data-testid="recent-patient-history-header-widget"
				open={isOpen}
				onToggle={(e) => setIsOpen((e.target as HTMLDetailsElement).open)}
				style={{ position: "relative" }}
			>
				<summary title="История 10 последних просмотренных карточек" className="cursor-pointer flex items-center gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-200">
					<Clock size={16} aria-hidden="true" className="text-sky-500" />
					<span>Недавние</span>
					<strong className="text-xs bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300 px-1.5 py-0.5 rounded-full font-bold">
						{patients.length}
					</strong>
				</summary>
				<div
					className="role-switcher-options absolute top-full right-0 w-80 max-h-96 overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl p-2 z-50 text-slate-900 dark:text-slate-100"
				>
					<div className="px-3 py-2 border-b border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-500 dark:text-slate-400 flex justify-between items-center">
						<span>ОТКРЫТЫЕ РАНЕЕ КАРТОЧКИ</span>
						<span className="text-[10px] text-slate-400">ТОП 10</span>
					</div>

					{loading ? (
						<div className="p-4 text-center text-xs text-slate-500 dark:text-slate-400">Загрузка...</div>
					) : patients.length === 0 ? (
						<div className="p-4 text-center text-xs text-slate-500 dark:text-slate-400">История просмотров пуста</div>
					) : (
						patients.map((pat) => (
							<button
								key={pat.id}
								type="button"
								onClick={() => handleOpenPatient(pat.patientId || pat.id)}
								className="flex items-center justify-between w-full px-3 py-2 rounded-lg border-none bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 text-left transition-colors cursor-pointer"
							>
								<div>
									<div className="text-xs font-semibold text-slate-900 dark:text-slate-100">{pat.patientName}</div>
									<div className="text-[11px] text-slate-500 dark:text-slate-400">{pat.phone}</div>
								</div>
								<div className="flex items-center gap-1.5">
									<span className="text-[10px] text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
										{new Date(pat.lastViewedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
									</span>
									<ChevronRight size={14} className="text-slate-400" />
								</div>
							</button>
						))
					)}
				</div>
			</details>
		);
	}

	return (
		<div
			data-testid="recent-patient-history-widget"
			className="p-4 rounded-xl border my-4 shadow-sm bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100"
		>
			<div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-200 dark:border-slate-800">
				<div className="flex items-center space-x-2">
					<Clock className="w-5 h-5 text-sky-500" />
					<h3 className="font-semibold text-sky-600 dark:text-sky-400">
						Быстрый переход: Недавно просмотренные карточки пациентов
					</h3>
				</div>
				<span className="text-xs px-2 py-0.5 rounded border bg-sky-100 text-sky-800 border-sky-300 dark:bg-sky-950 dark:text-sky-300 dark:border-sky-800 font-medium">
					CRM Quick Nav
				</span>
			</div>

			{loading ? (
				<div className="text-sm py-4 text-slate-500 dark:text-slate-400">Загрузка...</div>
			) : patients.length === 0 ? (
				<div className="text-sm py-3 text-center text-slate-500 dark:text-slate-400">Нет недавних карточек</div>
			) : (
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
					{patients.map((pat) => (
						<div
							key={pat.id}
							className="p-3 rounded-lg border flex items-center justify-between bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700"
						>
							<div>
								<div className="text-sm font-bold text-slate-900 dark:text-white">{pat.patientName}</div>
								<div className="text-xs text-slate-500 dark:text-slate-400">{pat.phone}</div>
							</div>
							<button
								type="button"
								onClick={() => handleOpenPatient(pat.patientId || pat.id)}
								className="text-xs bg-sky-600 hover:bg-sky-700 text-white font-semibold px-3 py-1.5 rounded-md border-none cursor-pointer transition-colors"
							>
								Открыть
							</button>
						</div>
					))}
				</div>
			)}
		</div>
	);
};

