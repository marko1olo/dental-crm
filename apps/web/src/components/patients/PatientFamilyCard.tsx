import { Link as LinkIcon, Plus, Search, UserPlus, Users } from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";
import { denteAdminSecretRequestHeaders, money } from "../../AppHelpers";
import { panelStateText, type PanelSubject } from "../../lib/panelStateText";
import { showToast } from "../GlobalToast";
import { PanelLoadFailure } from "../PanelLoadFailure";

export type PatientFamilyCardProps = {
	patientId: string | null;
	patientName: string | null;
	familyData: any | null;
	/**
	 * Отказ ЧТЕНИЯ семьи, а не её отсутствие. null — читали успешно (в том числе
	 * получили честный 404 «пациент не в семье»); объект — ответ не прочитан, и
	 * состав семьи с балансом неизвестен. Разделять обязательно: без этого признака
	 * карточка на любой сбой писала «Пациент не состоит в семейной группе» и
	 * предлагала создать вторую семью тому, у кого она уже есть.
	 */
	loadFailure?: { status: number | null } | null;
	/** Перечитать семью после отказа. */
	onRetryLoad?: () => void;
	onFamilyDataChanged: () => void;
};

/**
 * Тексты состояний семейного счёта. Отказ чтения здесь стоит денег: и «нет
 * семьи», и «семья не прочитана» выглядят как пустая карточка, но во втором
 * случае у пациента может быть общий кошелёк с родственниками.
 */
const FAMILY_SUBJECT: PanelSubject = {
	notLoadedTitle: "Семейный счет не прочитан",
	accusative: "семейный счет пациента",
	emptyTitle: "Пациент не состоит в семейной группе",
	emptyHint:
		"Семья нужна, когда за лечение платят из общего кошелька: родители за детей, супруги друг за друга.",
	failureConsequence:
		"Не создавайте семью по этому экрану: возможно, пациент уже в ней состоит, и появится второй общий счет. Сначала обновите.",
};

export const PatientFamilyCard: React.FC<PatientFamilyCardProps> = ({
	patientId,
	patientName,
	familyData,
	loadFailure = null,
	onRetryLoad,
	onFamilyDataChanged,
}) => {
	const [isCreating, setIsCreating] = useState(false);
	const [isLinking, setIsLinking] = useState(false);

	const [newFamilyName, setNewFamilyName] = useState("");
	const [searchQuery, setSearchQuery] = useState("");
	const [searchResults, setSearchResults] = useState<any[]>([]);

	const [loading, setLoading] = useState(false);
	const [searchLoading, setSearchLoading] = useState(false);
	/*
	 * БЫЛО: отказ поиска нигде не хранился. Ветка `if (res.ok)` без `else` и
	 * `catch` с одним console.error оставляли searchResults пустым, а разметка
	 * печатала «Семьи не найдены» — то есть упавший запрос выдавался за
	 * достоверный ответ «такой семьи нет». Администратор по этому экрану создавал
	 * ВТОРУЮ семью с тем же названием, и общий счёт родственников расходился на
	 * два.
	 */
	const [searchFailed, setSearchFailed] = useState(false);

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
						// Не массив — тоже не ответ: .map по такому значению уронил бы
						// карточку целиком.
						setSearchResults(Array.isArray(data) ? data : []);
						setSearchFailed(!Array.isArray(data));
					} else {
						setSearchResults([]);
						setSearchFailed(true);
					}
				} catch (e) {
					console.error("Family search failed", e);
					setSearchResults([]);
					setSearchFailed(true);
				} finally {
					setSearchLoading(false);
				}
			}, 300);
			return () => clearTimeout(delayFn);
		} else if (isLinking && searchQuery.length < 2) {
			setSearchResults([]);
			setSearchFailed(false);
		}
	}, [searchQuery, isLinking]);

	/*
	 * БЫЛО: ни одно поле этой карточки не сбрасывалось при переключении пациента.
	 * Виджет получает patientId пропсом и не размонтируется (PatientOverviewTab
	 * рендерит его без key), поэтому оставались открытыми и заряженными и форма
	 * создания семьи, и поиск с найденными семьями.
	 *
	 * Цена ошибки здесь выше, чем в заметке: семья — это ОБЩИЙ ДЕНЕЖНЫЙ СЧЁТ.
	 * Администратор набирал «Семья Ивановых» на карточке Иванова, отвлекался,
	 * открывал карточку Петровой и нажимал «Создать» — создавалась семья с
	 * названием «Семья Ивановых», где ГЛАВОЙ становилась Петрова
	 * (headPatientId: patientId берётся текущий), и она же к ней привязывалась.
	 * Тот же путь у «Привязать»: список найденных семей от прошлого пациента
	 * оставался на экране, и клик по строке привязывал к чужой семье уже другого
	 * человека — деньги и скидки двух посторонних людей сходились на один счёт.
	 *
	 * Сброс в фазе рендера, а не в useEffect: эффект срабатывает после отрисовки,
	 * и чужое название семьи успело бы мигнуть на новой карточке.
	 */
	const [formPatientId, setFormPatientId] = useState(patientId);
	if (formPatientId !== patientId) {
		setFormPatientId(patientId);
		setIsCreating(false);
		setIsLinking(false);
		setNewFamilyName("");
		setSearchQuery("");
		setSearchResults([]);
		setSearchFailed(false);
	}

	if (!patientId) return null;

	/*
	 * К какой семье пациент привязан ПО МНЕНИЮ СЕРВЕРА. Нужна, потому что ответ
	 * 200 на привязку здесь ничего не подтверждает.
	 *
	 * Привязка идёт запросом PUT /api/patients/:id с полем familyGroupId, а в
	 * updatePatientSchema (packages/shared/src/index.ts) этого поля нет — там
	 * только fullName, birthDate, phone, email, notes. Zod вырезает незнакомые
	 * ключи, маршрут отвечает 200 «принял», и пациент остаётся ни в какой семье.
	 * Ни один маршрут в apps/api/src/routes вообще не записывает
	 * patients.familyGroupId, а именно по этому полю GET
	 * /api/finance/family/patient/:patientId решает, состоит пациент в семье или
	 * нет. Поэтому единственная честная проверка — перечитать семью пациента и
	 * сравнить с той, куда его только что «привязали». 404 означает «ни в какой».
	 */
	const familyIdOfPatient = async (
		checkedPatientId: string,
	): Promise<string | null> => {
		try {
			const res = await fetch(
				`/api/finance/family/patient/${checkedPatientId}`,
				{ headers: denteAdminSecretRequestHeaders() },
			);
			if (!res.ok) return null;
			const data = await res.json().catch(() => null);
			return data && typeof data.id === "string" ? data.id : null;
		} catch {
			return null;
		}
	};

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

			/*
			 * БЫЛО: здесь сразу шло зелёное «Семья успешно создана». Ответ 200 на
			 * привязку это не подтверждает (см. familyIdOfPatient выше), и на самом
			 * деле пациент в семью не попадал: карточка после перечитывания снова
			 * писала «Пациент не состоит в семейной группе». Администратор нажимал
			 * «Создать» второй и третий раз — и каждый раз в базе появлялась ещё одна
			 * пустая семья, ни к кому не привязанная.
			 */
			const attachedFamilyId = await familyIdOfPatient(patientId);
			if (!attachedFamilyId || attachedFamilyId !== family.id) {
				showToast(
					"Семья создана, но пациент к ней не привязан: привязка не сохранилась. Не нажимайте «Создать» повторно — появится ещё одна пустая семья. Сообщите администратору, сама собой привязка не появится.",
					"error",
				);
				setIsCreating(false);
				onFamilyDataChanged();
				return;
			}

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

			/*
			 * БЫЛО: «Успешно привязан к семье» по одному коду 200. Привязка не
			 * сохраняется вовсе (см. familyIdOfPatient выше), то есть это сообщение
			 * было неправдой всегда: администратор считал, что теперь платит общий
			 * семейный счёт, а пациент оставался сам по себе.
			 */
			const attachedFamilyId = await familyIdOfPatient(patientId);
			if (attachedFamilyId !== familyId) {
				showToast(
					"Пациент к семье не привязан: привязка не сохранилась. Оплату по семейному счёту за него провести не получится — сообщите администратору.",
					"error",
				);
				setIsLinking(false);
				setSearchQuery("");
				onFamilyDataChanged();
				return;
			}

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

	/*
	 * БЫЛО: `{parseFloat(familyData.balance).toLocaleString("ru-RU")} ₽`. Три
	 * дефекта в одной строке денег:
	 *   1. Нет поля balance (или оно null) — parseFloat даёт NaN, и на экране
	 *      семейного счёта стояло «NaN ₽».
	 *   2. Голый toLocaleString печатает не больше трёх знаков дроби и без
	 *      обязательных двух: 1500,5 выводилось «1 500,5 ₽», а полтинник в такой
	 *      записи читается как пять копеек.
	 *   3. Правило одно на всю программу: деньги идут через money() из
	 *      AppHelpers, иначе форматов столько же, сколько экранов.
	 * Ноль вместо непрочитанного баланса тоже не годится: «0 ₽» на семейном счёте
	 * — это утверждение, что денег нет, и по нему возьмут оплату наличными вместо
	 * списания с общего счёта. Поэтому неизвестное значение так и называется.
	 */
	const familyBalanceRaw = familyData?.balance;
	const familyBalanceNumber =
		typeof familyBalanceRaw === "string"
			? Number(familyBalanceRaw)
			: familyBalanceRaw;
	const familyBalanceKnown =
		familyBalanceRaw !== null &&
		familyBalanceRaw !== undefined &&
		familyBalanceRaw !== "" &&
		Number.isFinite(Number(familyBalanceNumber));

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
						{familyBalanceKnown ? (
							<span className="text-base font-bold text-sky-600 dark:text-sky-400">
								{money(Number(familyBalanceNumber))}
							</span>
						) : (
							<span
								className="text-xs font-semibold text-amber-700 dark:text-amber-400 text-right"
								title="Сервер не прислал сумму по этой семье"
							>
								Баланс не прочитан. Откройте раздел «Деньги», чтобы увидеть
								сумму.
							</span>
						)}
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
			) : loadFailure ? (
				/*
				 * Отказ чтения ВМЕСТО пустоты и без кнопок «Создать семью» и
				 * «Привязать»: пока неизвестно, есть ли у пациента семья, любое из
				 * этих действий может завести ему второй общий счёт.
				 */
				<div className="mt-3">
					<PanelLoadFailure
						subject={FAMILY_SUBJECT}
						status={loadFailure.status}
						onRetry={onRetryLoad ?? onFamilyDataChanged}
					/>
				</div>
			) : (
				<div className="mt-3">
					<p className="text-xs text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
						{panelStateText(FAMILY_SUBJECT, { phase: "empty" }).title}.{" "}
						{panelStateText(FAMILY_SUBJECT, { phase: "empty" }).hint} Создайте
						новую семью или привяжите пациента к существующей.
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
								{/* Отказ поиска и честное «не найдено» — разные утверждения, и
								    раньше оба печатались одной строкой «Семьи не найдены». */}
								{!searchLoading && searchFailed && (
									<div className="text-xs text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-lg p-2.5 leading-relaxed">
										Поиск семей не выполнен: не получилось связаться с сервером.
										Не считайте, что такой семьи нет — повторите поиск через
										минуту, иначе появится вторая семья с тем же названием.
									</div>
								)}
								{!searchLoading &&
									!searchFailed &&
									searchQuery.length >= 2 &&
									searchResults.length === 0 && (
										<div className="text-xs text-slate-400 text-center py-2">
											Семьи с таким названием не найдены. Проверьте написание
											или создайте новую семью.
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
