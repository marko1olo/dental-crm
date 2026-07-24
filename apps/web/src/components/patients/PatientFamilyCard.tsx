import { Link as LinkIcon, Plus, Search, UserPlus, Users } from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";
import { denteAdminSecretRequestHeaders } from "../../AppHelpers";
import { showToast } from "../GlobalToast";

export type PatientFamilyCardProps = {
	patientId: string | null;
	patientName: string | null;
	familyData: any | null;
	onFamilyDataChanged: () => void;
};

export const PatientFamilyCard: React.FC<PatientFamilyCardProps> = ({
	patientId,
	patientName,
	familyData,
	onFamilyDataChanged,
}) => {
	const [isCreating, setIsCreating] = useState(false);
	const [isLinking, setIsLinking] = useState(false);

	const [newFamilyName, setNewFamilyName] = useState("");
	const [searchQuery, setSearchQuery] = useState("");
	const [searchResults, setSearchResults] = useState<any[]>([]);

	const [loading, setLoading] = useState(false);
	const [searchLoading, setSearchLoading] = useState(false);

	useEffect(() => {
		if (isLinking && searchQuery.length >= 2) {
			const delayFn = setTimeout(async () => {
				setSearchLoading(true);
				try {
					const res = await fetch(
						`/api/finance/family?search=${encodeURIComponent(searchQuery)}`,
						{
							headers: denteAdminSecretRequestHeaders(),
						},
					);
					if (res.ok) {
						const data = await res.json();
						setSearchResults(data);
					}
				} catch (e) {
					console.error("Family search failed", e);
				} finally {
					setSearchLoading(false);
				}
			}, 300);
			return () => clearTimeout(delayFn);
		} else if (isLinking && searchQuery.length < 2) {
			setSearchResults([]);
		}
	}, [searchQuery, isLinking]);

	if (!patientId) return null;

	const handleCreateFamily = async () => {
		if (!newFamilyName.trim()) {
			showToast("Введите название семьи", "error");
			return;
		}
		setLoading(true);
		try {
			const res = await fetch("/api/finance/family", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					...denteAdminSecretRequestHeaders(),
				},
				body: JSON.stringify({
					name: newFamilyName.trim(),
					headPatientId: patientId,
				}),
			});
			if (!res.ok) throw new Error("Ошибка при создании семьи");

			const family = await res.json();

			const linkRes = await fetch(`/api/patients/${patientId}`, {
				method: "PUT",
				headers: {
					"Content-Type": "application/json",
					...denteAdminSecretRequestHeaders(),
				},
				body: JSON.stringify({
					familyGroupId: family.id,
				}),
			});
			if (!linkRes.ok) throw new Error("Семья создана, но пациент не привязан");

			showToast("Семья успешно создана", "success");
			setNewFamilyName("");
			setIsCreating(false);
			onFamilyDataChanged();
		} catch (e: any) {
			showToast(e.message || "Ошибка", "error");
		} finally {
			setLoading(false);
		}
	};

	const handleLinkFamily = async (familyId: string) => {
		setLoading(true);
		try {
			const linkRes = await fetch(`/api/patients/${patientId}`, {
				method: "PUT",
				headers: {
					"Content-Type": "application/json",
					...denteAdminSecretRequestHeaders(),
				},
				body: JSON.stringify({
					familyGroupId: familyId,
				}),
			});
			if (!linkRes.ok) throw new Error("Ошибка при привязке пациента к семье");

			showToast("Успешно привязан к семье", "success");
			setIsLinking(false);
			setSearchQuery("");
			onFamilyDataChanged();
		} catch (e: any) {
			showToast(e.message || "Ошибка", "error");
		} finally {
			setLoading(false);
		}
	};

	return (
		<div
			data-testid="patient-family-card"
			className="panel mb-5 p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100"
		>
			<h3 className="flex items-center gap-2 mb-4 p-0 border-none">
				<Users size={16} className="text-sky-500" />
				<span className="text-sm font-semibold text-slate-900 dark:text-white">
					{familyData ? familyData.name || "Семья пациента" : "Семейный счет"}
				</span>
			</h3>

			{familyData ? (
				<>
					<div className="flex justify-between items-center bg-slate-50 dark:bg-slate-800/80 p-3 rounded-lg border border-slate-200 dark:border-slate-700 mb-4">
						<span className="text-xs font-medium text-slate-600 dark:text-slate-400">
							Баланс семьи:
						</span>
						<span className="text-base font-bold text-sky-600 dark:text-sky-400">
							{parseFloat(familyData.balance).toLocaleString("ru-RU")} ₽
						</span>
					</div>
					<div className="flex flex-col gap-2">
						<span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
							Участники:
						</span>
						{familyData.members?.map((m: any) => (
							<div
								key={m.id}
								className="p-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg flex justify-between items-center"
							>
								<span className={`text-xs ${m.id === patientId ? "font-semibold text-slate-900 dark:text-white" : "font-medium text-slate-600 dark:text-slate-400"}`}>
									{m.fullName}
								</span>
								{m.id === familyData.headPatientId && (
									<span className="text-[11px] bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300 px-1.5 py-0.5 rounded font-semibold">
										Глава
									</span>
								)}
							</div>
						))}
					</div>
				</>
			) : (
				<div className="mt-3">
					<p className="text-xs text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
						Пациент не состоит в семейной группе. Вы можете создать новую семью
						или привязать его к существующей.
					</p>

					{isCreating ? (
						<div className="flex flex-col gap-3">
							<input
								type="text"
								className="w-full p-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white outline-none text-xs"
								placeholder="Название семьи (напр. Семья Ивановых)"
								value={newFamilyName}
								onChange={(e) => setNewFamilyName(e.target.value)}
								autoFocus
							/>
							<div className="flex gap-2">
								<button
									className="flex-1 bg-sky-600 hover:bg-sky-700 text-white p-2 text-xs rounded-lg font-semibold cursor-pointer border-0"
									onClick={handleCreateFamily}
									disabled={loading}
								>
									{loading ? "Создание..." : "Создать"}
								</button>
								<button
									className="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 p-2 text-xs rounded-lg font-semibold cursor-pointer border border-slate-300 dark:border-slate-700"
									onClick={() => setIsCreating(false)}
									disabled={loading}
								>
									Отмена
								</button>
							</div>
						</div>
					) : isLinking ? (
						<div className="flex flex-col gap-3">
							<div className="relative">
								<Search
									size={14}
									className="absolute left-2.5 top-3 text-slate-400"
								/>
								<input
									type="text"
									className="w-full pl-8 pr-3 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white outline-none text-xs"
									placeholder="Поиск семьи по названию..."
									value={searchQuery}
									onChange={(e) => setSearchQuery(e.target.value)}
									autoFocus
								/>
							</div>

							<div className="max-h-[150px] overflow-y-auto flex flex-col gap-1">
								{searchLoading && (
									<div className="text-xs text-slate-400 text-center py-2">
										Поиск...
									</div>
								)}
								{!searchLoading &&
									searchQuery.length >= 2 &&
									searchResults.length === 0 && (
										<div className="text-xs text-slate-400 text-center py-2">
											Семьи не найдены
										</div>
									)}
								{searchResults.map((f) => (
									<div
										key={f.id}
										className="flex justify-between items-center p-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
										onClick={() => handleLinkFamily(f.id)}
									>
										<div>
											<div className="text-xs font-semibold text-slate-900 dark:text-white">
												{f.name}
											</div>
										</div>
										<button
											className="px-2 py-1 text-xs bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 rounded font-semibold border-0 cursor-pointer"
											disabled={loading}
										>
											Выбрать
										</button>
									</div>
								))}
							</div>

							<div className="flex gap-2 mt-1">
								<button
									className="w-full p-2 text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg font-semibold cursor-pointer border border-slate-300 dark:border-slate-700"
									onClick={() => {
										setIsLinking(false);
										setSearchQuery("");
										setSearchResults([]);
									}}
									disabled={loading}
								>
									Отмена
								</button>
							</div>
						</div>
					) : (
						<div className="flex gap-2">
							<button
								className="flex-1 flex items-center justify-center gap-1.5 p-2 text-xs bg-sky-600 hover:bg-sky-700 text-white rounded-lg font-semibold cursor-pointer border-0"
								onClick={() => {
									setNewFamilyName(
										`Семья ${patientName ? patientName.split(" ")[0] : ""}`.trim(),
									);
									setIsCreating(true);
								}}
							>
								<UserPlus size={14} /> Создать семью
							</button>
							<button
								className="flex-1 flex items-center justify-center gap-1.5 p-2 text-xs bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg font-semibold cursor-pointer border border-slate-300 dark:border-slate-700"
								onClick={() => setIsLinking(true)}
							>
								<LinkIcon size={14} /> Привязать
							</button>
						</div>
					)}
				</div>
			)}
		</div>
	);
};
