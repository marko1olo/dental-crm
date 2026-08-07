import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Crown, Loader2 } from "lucide-react";
import { useState } from "react";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import { showToast } from "../GlobalToast";
import { actionFailureToast } from "../../lib/panelStateText";

type LoyaltyTier = "standard" | "silver" | "gold" | "platinum";

const LOYALTY_CONFIG: Record<
	LoyaltyTier,
	{ label: string; discountPct: number; color: string }
> = {
	standard: { label: "Базовый", discountPct: 0, color: "#64748b" },
	silver: { label: "Серебро", discountPct: 5, color: "#94a3b8" },
	gold: { label: "Золото", discountPct: 10, color: "#f59e0b" },
	platinum: { label: "Платинум", discountPct: 15, color: "#6366f1" },
};

export function PatientLoyaltyHeader({ patientId }: { patientId: string }) {
	const { dashboard, auth, loadDashboard } = useAppLogicContext();
	const [isOpen, setIsOpen] = useState(false);
	const [saving, setSaving] = useState(false);

	const patient = dashboard?.patients?.find((p: any) => p.id === patientId);
	if (!patient) return null;

	const adminProfile = patient.administrativeProfile || {};
	const currentTier: LoyaltyTier =
		adminProfile.loyaltyTier === "silver" ||
		adminProfile.loyaltyTier === "gold" ||
		adminProfile.loyaltyTier === "platinum" ||
		adminProfile.loyaltyTier === "standard"
			? adminProfile.loyaltyTier
			: "standard";
	const currentLoyalty = LOYALTY_CONFIG[currentTier];

	const handleSetTier = async (tier: LoyaltyTier) => {
		setIsOpen(false);
		if (tier === currentTier) return;

		setSaving(true);
		try {
			const res = await fetch(
				`/api/patients/${patientId}/administrative-profile`,
				{
					method: "PUT",
					headers: auth.denteClinicalMutationHeaders({
						"Content-Type": "application/json",
					}),
					body: JSON.stringify({
						...adminProfile,
						loyaltyTier: tier,
					}),
				},
			);

			if (!res.ok) throw new Error("Failed to save loyalty tier");

			/*
			 * БЫЛО: ответ сервера не читался вовсе — сразу зелёное «Статус
			 * лояльности обновлен».
			 *
			 * БЫЛО: UI слал loyaltyTier: "none", а Zod enum — standard|silver|gold|platinum.
			 * safeParse отклонял тело → 400, либо (раньше) ключ вырезался.
			 * СТАЛО: базовый уровень = "standard", ответ сверяем с сохранённым tier.
			 *
			 * Что видел администратор: выбрал «Золото», получил подтверждение, а
			 * значок после перечитывания карточки снова показывает «Базовый». Жал
			 * второй и третий раз с тем же результатом. Хуже другое: он успевал
			 * сказать пациенту про скидку 10%, которой в программе нет.
			 *
			 * Проверяем по тому, что ответил сервер: маршрут возвращает сохранённого
			 * пациента (patientSchema.parse(patient)), значит сохранённое значение
			 * видно прямо здесь. Если статуса в ответе нет — говорим об этом прямо.
			 * Когда поле появится в схеме, успешная ветка заработает сама.
			 */
			const saved = await res.json().catch((err: any) => {
				console.error(err);
				showToast(
					actionFailureToast("Ошибка чтения ответа", (err as { status?: number })?.status ?? null),
					"error"
				);
				return null;
			});
			const savedTier = saved?.administrativeProfile?.loyaltyTier ?? null;
			if (savedTier !== tier) {
				showToast(
					`Статус «${LOYALTY_CONFIG[tier].label}» не сохранён: программа пока не хранит это поле, и в карточке останется «${currentLoyalty.label}». Скидку назначьте вручную при оплате, а договорённость запишите в заметку к пациенту.`,
					"error",
				);
				await loadDashboard();
				return;
			}

			showToast("Статус лояльности обновлен", "success");
			await loadDashboard();
		} catch (_err) {
			showToast("Ошибка при сохранении", "error");
		} finally {
			setSaving(false);
		}
	};

	return (
		<div style={{ position: "relative" }} data-testid="patient-loyalty-header">
			<button
				type="button"
				onClick={() => setIsOpen(!isOpen)}
				disabled={saving}
				aria-expanded={isOpen}
				aria-haspopup="menu"
				aria-label={`Статус лояльности: ${currentLoyalty.label}`}
				/*
					БЫЛО: `focus:ring-2 focus:ring-teal-600 focus:outline-none`. Палитра
					Tailwind в проекте не переопределена (tailwind.config.* в дереве нет,
					`@theme` в листах стилей тоже), поэтому `teal-600` — стоковая холодная
					бирюза во всех трёх темах, тогда как ночная тема тёплая. Рамка фокуса
					при этом здесь уже была своя и на токене: правило
					`button:focus-visible { outline: 2px solid var(--teal) !important }` в
					dente-redesign.css накрывает эту кнопку. То есть стоковый ring рисовал
					поверх правильной рамки вторую, холодную. Убран, рамка осталась.
				*/
				style={{
					display: "flex",
					alignItems: "center",
					gap: "6px",
					background: `color-mix(in srgb, ${currentLoyalty.color} 10%, transparent)`,
					padding: "4px 8px",
					borderRadius: "6px",
					border: `1px solid color-mix(in srgb, ${currentLoyalty.color} 30%, transparent)`,
					cursor: saving ? "wait" : "pointer",
					transition: "background 0.2s",
				}}
				onMouseEnter={(e) => {
					if (!saving)
						e.currentTarget.style.background = `color-mix(in srgb, ${currentLoyalty.color} 15%, transparent)`;
				}}
				onMouseLeave={(e) => {
					if (!saving)
						e.currentTarget.style.background = `color-mix(in srgb, ${currentLoyalty.color} 10%, transparent)`;
				}}
				title="Изменить статус лояльности"
			>
				{saving ? (
					<Loader2
						size={14}
						color={currentLoyalty.color}
						className="animate-spin"
					/>
				) : (
					<Crown size={14} color={currentLoyalty.color} />
				)}

				<span
					style={{
						fontSize: "12px",
						fontWeight: 600,
						color: currentLoyalty.color,
					}}
				>
					{currentLoyalty.label}
				</span>

				{/*
					Значок скидки — это пометка для сотрудников, а не расчёт: ни один
					модуль программы loyaltyTier не читает (проверено поиском по apps и
					packages), в счёт и в оплату эта скидка не подставляется. Раньше
					«-10%» стояло без оговорок и читалось как «скидка уже действует».
				*/}
				{currentLoyalty.discountPct > 0 && (
					<span
						title="Программа эту скидку не считает: назначьте её вручную при оплате"
						style={{
							fontSize: "11px",
							fontWeight: 700,
							background: currentLoyalty.color,
							color: "#fff",
							padding: "2px 4px",
							borderRadius: "4px",
							marginLeft: "4px",
						}}
					>
						-{currentLoyalty.discountPct}%
					</span>
				)}
				<ChevronDown
					size={12}
					color={currentLoyalty.color}
					style={{ marginLeft: "2px", opacity: 0.7 }}
				/>
			</button>

			<AnimatePresence>
				{isOpen && (
					<>
						<button
							type="button"
							style={{
								position: "fixed",
								inset: 0,
								zIndex: 99,
								background: "none",
								border: "none",
								padding: 0,
							}}
							onClick={() => setIsOpen(false)}
							onKeyDown={(e) => {
								if (e.key === "Enter" || e.key === " ") {
									setIsOpen(false);
								}
							}}
						/>
						<motion.div
							initial={{ opacity: 0, y: 5, scale: 0.95 }}
							animate={{ opacity: 1, y: 0, scale: 1 }}
							exit={{ opacity: 0, y: 5, scale: 0.95 }}
							transition={{ duration: 0.15 }}
							className="absolute top-full left-0 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xl p-1 z-50 min-w-[160px] flex flex-col gap-0.5"
						>
							{(
								Object.entries(LOYALTY_CONFIG) as [
									LoyaltyTier,
									(typeof LOYALTY_CONFIG)[LoyaltyTier],
								][]
							).map(([tierKey, config]) => (
								<button
									key={tierKey}
									type="button"
									onClick={() => handleSetTier(tierKey)}
									className={`flex items-center gap-2 px-3 py-2 rounded-md text-xs border-0 cursor-pointer text-left transition-colors ${
										currentTier === tierKey
											? "bg-slate-100 dark:bg-slate-800 font-semibold text-slate-900 dark:text-white"
											: "bg-transparent hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300 font-medium"
									}`}
								>
									<Crown size={14} color={config.color} />
									<span className="flex-1">{config.label}</span>
									{config.discountPct > 0 && (
										<span
											style={{ color: config.color }}
											className="text-[11px] font-bold"
										>
											-{config.discountPct}%
										</span>
									)}
								</button>
							))}
							{/* Прямая оговорка там, где выбирают статус: без неё цифры «-5%,
							    -10%, -15%» выглядят как готовый расчёт, а считать скидку
							    придётся человеку при оплате. */}
							<p className="m-0 mt-1 px-3 py-2 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400 border-t border-slate-200 dark:border-slate-800">
								Это пометка для сотрудников. Скидка сама в счёт не подставляется
								— назначьте её вручную при оплате.
							</p>
						</motion.div>
					</>
				)}
			</AnimatePresence>
		</div>
	);
}
