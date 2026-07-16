import {
	Baby,
	BrainCircuit,
	BriefcaseMedical,
	Building2,
	Check,
	ChevronLeft,
	ChevronRight,
	DownloadCloud,
	FileText,
	HeartHandshake,
	Layers,
	ListTodo,
	Loader2,
	Play,
	Scissors,
	Settings2,
	Sparkles,
	Stethoscope,
	UploadCloud,
	User,
	Wrench,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import {
	applyWorkspacePreset,
	saveWorkspaceFlags,
} from "../../hooks/useWorkspaceProfile";

// --- Types ---
type ThemeColor = "teal" | "blue" | "purple" | "rose";

interface StaffEntry {
	id: string;
	fullName: string;
	role: string;
	phone?: string;
	specialization: string;
	percentage: number;
	canSignMedicalRecords: boolean;
	canManageMoney: boolean;
	canManageImports: boolean;
}

const THEME_COLORS: Record<ThemeColor, string> = {
	teal: "hsl(175, 80%, 40%)",
	blue: "hsl(210, 80%, 50%)",
	purple: "hsl(262, 80%, 65%)",
	rose: "hsl(340, 80%, 60%)",
};

const SPECIALIZATIONS = [
	{
		id: "therapy",
		label: "Терапия",
		icon: <Stethoscope size={24} />,
		desc: "Лечение кариеса, пульпита",
	},
	{
		id: "orthopedics",
		label: "Ортопедия",
		icon: <Wrench size={24} />,
		desc: "Протезирование, коронки",
	},
	{
		id: "surgery",
		label: "Хирургия",
		icon: <Scissors size={24} />,
		desc: "Удаление, имплантация",
	},
	{
		id: "orthodontics",
		label: "Ортодонтия",
		icon: <BrainCircuit size={24} />,
		desc: "Брекеты, элайнеры",
	},
	{
		id: "pediatrics",
		label: "Педиатрия",
		icon: <Baby size={24} />,
		desc: "Детский прием",
	},
];

function GlassCard({ children, selected, onClick, accentColor, isDark }: any) {
	return (
		<div
			onClick={onClick}
			style={{
				padding: "20px",
				borderRadius: "16px",
				cursor: "pointer",
				background: selected
					? `var(--card-selected-bg, rgba(255,255,255,0.1))`
					: isDark
						? "rgba(255,255,255,0.03)"
						: "rgba(0,0,0,0.02)",
				border: `2px solid ${selected ? accentColor : isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`,
				transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
				transform: selected ? "translateY(-4px)" : "translateY(0)",
				boxShadow: selected ? `0 8px 24px -8px ${accentColor}` : "none",
				display: "flex",
				flexDirection: "column",
				gap: "12px",
				height: "100%",
			}}
		>
			{children}
		</div>
	);
}

function SliderControl({
	label,
	value,
	min,
	max,
	onChange,
	isDark,
	accentColor,
}: any) {
	return (
		<div style={{ marginBottom: 24 }}>
			<div
				style={{
					display: "flex",
					justifyContent: "space-between",
					marginBottom: 12,
				}}
			>
				<span style={{ fontWeight: 600, fontSize: 15 }}>{label}</span>
				<span style={{ fontWeight: 700, fontSize: 16, color: accentColor }}>
					{value}
				</span>
			</div>
			<input
				type="range"
				min={min}
				max={max}
				value={value}
				onChange={(e) => onChange(parseInt(e.target.value))}
				style={{ width: "100%", accentColor, cursor: "pointer" }}
			/>
			<div
				style={{
					display: "flex",
					justifyContent: "space-between",
					marginTop: 8,
					fontSize: 12,
					color: isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)",
				}}
			>
				<span>{min}</span>
				<span>{max}</span>
			</div>
		</div>
	);
}

export function OnboardingSetupWizard({
	onComplete,
	isDark: initialIsDark = true,
}: {
	onComplete: () => void;
	isDark?: boolean;
}) {
	const { auth } = useAppLogicContext();
	const [activeDark, setActiveDark] = useState(initialIsDark);
	useEffect(() => {
		const checkDark = () => {
			setActiveDark(
				document.documentElement.classList.contains("dark") ||
					document.documentElement.getAttribute("data-theme") === "dark",
			);
		};
		checkDark();
		const observer = new MutationObserver(checkDark);
		observer.observe(document.documentElement, {
			attributes: true,
			attributeFilter: ["class", "data-theme"],
		});
		return () => observer.disconnect();
	}, [initialIsDark]);
	const isDark = activeDark;

	// --- Wizard State ---
	const LS_KEY = "dente-onboarding-draft-v1";
	const [savedData, setSavedData] = useState<any>(() => {
		try {
			const draft = localStorage.getItem(LS_KEY);
			if (draft) return JSON.parse(draft);
		} catch (e) {}
		return null;
	});

	const [step, setStep] = useState(savedData?.step || 1);
	const [launching, setLaunching] = useState(false);
	const [fadeOut, setFadeOut] = useState(false);

	// Step 1: Specializations
	const [specs, setSpecs] = useState<string[]>(savedData?.specs || ["therapy"]);
	const toggleSpec = (id: string) =>
		setSpecs((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

	// Step 2: Infrastructure
	const [chairs, setChairs] = useState(savedData?.chairs || 3);
	const [workHours, setWorkHours] = useState<[number, number]>(
		savedData?.workHours || [9, 20],
	); // [start, end]

	// Step 3: Modules
	const [modules, setModules] = useState(
		savedData?.modules || {
			lab: true,
			dms: false,
			installments: true,
			egisz: false,
		},
	);
	const toggleModule = (k: keyof typeof modules) =>
		setModules((p: any) => ({ ...p, [k]: !p[k] }));

	// Step 4: Branding
	const [theme, setTheme] = useState<ThemeColor>(savedData?.theme || "teal");
	const accentColor = THEME_COLORS[theme];

	// Step 5: Staff
	const [staff, setStaff] = useState<StaffEntry[]>(
		savedData?.staff || [
			{
				id: "1",
				fullName: "Иванов И.И.",
				role: "Врач",
				phone: "+7 (999) 000-00-00",
				specialization: "Терапия",
				percentage: 25,
				canSignMedicalRecords: true,
				canManageMoney: false,
				canManageImports: false,
			},
		],
	);

	// Step 6: Legal
	const [legal, setLegal] = useState(
		savedData?.legal || { inn: "", ogrn: "", address: "" },
	);
	const [logoUploaded, setLogoUploaded] = useState(
		savedData?.logoUploaded || false,
	);

	// Step 7: Migration
	const [migrationStatus, setMigrationStatus] = useState<
		"idle" | "analyzing" | "done"
	>(savedData?.migrationStatus || "idle");

	// Save to LocalStorage on change
	useEffect(() => {
		localStorage.setItem(
			LS_KEY,
			JSON.stringify({
				step,
				specs,
				chairs,
				workHours,
				modules,
				theme,
				staff,
				legal,
				logoUploaded,
				migrationStatus,
			}),
		);
	}, [
		step,
		specs,
		chairs,
		workHours,
		modules,
		theme,
		staff,
		legal,
		logoUploaded,
		migrationStatus,
	]);

	const handleLaunch = async () => {
		localStorage.removeItem(LS_KEY);
		setLaunching(true);
		try {
			const payload = {
				specs,
				chairs,
				workHours,
				modules,
				theme,
				staff,
				legal,
			};
			await fetch("/api/workspace/onboarding/complete", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(payload),
			});
		} catch (e) {
			console.error(e);
		}
		setFadeOut(true);
		setTimeout(() => onComplete(), 500);
	};

	const bg = isDark
		? `radial-gradient(ellipse at 50% 0%, hsl(240 30% 15%), hsl(230 25% 8%) 80%)`
		: `radial-gradient(ellipse at 50% 0%, hsl(210 60% 95%), hsl(220 40% 88%) 80%)`;
	const textColor = isDark ? "#e8eaf0" : "#1a1d2e";

	return (
		<div
			style={{
				position: "absolute",
				top: 0,
				left: 0,
				right: 0,
				minHeight: "100vh",
				zIndex: 9999,
				background: bg,
				display: "flex",
				flexDirection: "column",
				alignItems: "center",
				padding: "40px 16px 80px",
				opacity: fadeOut ? 0 : 1,
				transition: "opacity .45s ease, background 0.3s",
				color: textColor,
				overflowX: "hidden",
			}}
		>
			<div
				style={{
					textAlign: "center",
					marginBottom: 32,
					maxWidth: 800,
					width: "100%",
				}}
			>
				<div
					style={{
						display: "inline-flex",
						alignItems: "center",
						gap: 10,
						padding: "6px 18px",
						borderRadius: 20,
						background: `${accentColor}22`,
						border: `1px solid ${accentColor}44`,
						marginBottom: 24,
						fontSize: 13,
						color: accentColor,
						transition: "all 0.3s",
					}}
				>
					<Sparkles size={14} /> DENTE Setup Wizard
				</div>
				<h1
					style={{
						margin: "0 0 24px",
						fontSize: "clamp(24px,4vw,34px)",
						fontWeight: 800,
						letterSpacing: "-0.5px",
					}}
				>
					{step === 1 && "Шаг 1. Кто мы?"}
					{step === 2 && "Шаг 2. Инфраструктура"}
					{step === 3 && "Шаг 3. Инструменты"}
					{step === 4 && "Шаг 4. Брендинг"}
					{step === 5 && "Шаг 5. Команда"}
					{step === 6 && "Шаг 6. Реквизиты"}
					{step === 7 && "Шаг 7. База Данных"}
				</h1>
				<div
					style={{
						display: "flex",
						gap: 6,
						justifyContent: "center",
						marginBottom: 32,
					}}
				>
					{[1, 2, 3, 4, 5, 6, 7].map((s) => (
						<div
							key={s}
							style={{
								width: s === step ? 32 : 12,
								height: 6,
								borderRadius: 3,
								background:
									s <= step
										? accentColor
										: isDark
											? "rgba(255,255,255,0.1)"
											: "rgba(0,0,0,0.1)",
								transition: "all 0.3s",
							}}
						/>
					))}
				</div>
			</div>

			<div
				style={{
					width: "100%",
					maxWidth: 1000,
					display: "flex",
					gap: 32,
					flexDirection: "row",
					flexWrap: "wrap",
					justifyContent: "center",
				}}
			>
				{/* Main Content Area */}
				<div
					style={{
						flex: "1 1 600px",
						maxWidth: 700,
						minWidth: 320,
						width: "100%",
					}}
				>
					{step === 1 && (
						<div
							style={{
								display: "flex",
								flexDirection: "column",
								gap: 24,
								padding: "0 10px",
							}}
						>
							<div
								style={{
									textAlign: "center",
									marginBottom: 8,
									background: isDark
										? "rgba(255,255,255,0.03)"
										: "rgba(0,0,0,0.02)",
									padding: 20,
									borderRadius: 16,
								}}
							>
								<p
									style={{
										margin: 0,
										fontSize: 18,
										color: accentColor,
										fontWeight: 700,
									}}
								>
									ВЫБЕРИТЕ СПЕЦИАЛИЗАЦИИ КЛИНИКИ (МУЛЬТИВЫБОР)
								</p>
								<p
									style={{
										margin: "8px 0 0 0",
										fontSize: 15,
										color: textColor,
									}}
								>
									Вы можете выбрать <b>сразу несколько направлений</b>{" "}
									одновременно.
								</p>
								<p style={{ margin: "4px 0 0 0", fontSize: 13, color: "#aaa" }}>
									Интерфейс CRM автоматически адаптируется под выбранные модули.
								</p>
							</div>

							<div
								style={{
									display: "flex",
									flexWrap: "wrap",
									justifyContent: "space-between",
									alignItems: "center",
									padding: "12px 16px",
									background: isDark
										? "rgba(255,255,255,0.05)"
										: "rgba(0,0,0,0.04)",
									borderRadius: 12,
									gap: 12,
								}}
							>
								<span style={{ fontWeight: 600, fontSize: 15 }}>
									Выбрано направлений:{" "}
									<span
										style={{
											color: specs.length > 0 ? accentColor : "red",
											fontSize: 18,
											padding: "0 4px",
										}}
									>
										{specs.length}
									</span>{" "}
									из {SPECIALIZATIONS.length}
								</span>
								<div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
									<button
										onClick={() => setSpecs(SPECIALIZATIONS.map((s) => s.id))}
										style={{
											padding: "8px 16px",
											borderRadius: 8,
											background: `${accentColor}22`,
											border: `1px solid ${accentColor}`,
											color: accentColor,
											cursor: "pointer",
											fontSize: 14,
											fontWeight: 600,
										}}
									>
										Выбрать все специализации
									</button>
									<button
										onClick={() => setSpecs([])}
										style={{
											padding: "8px 16px",
											borderRadius: 8,
											background: "transparent",
											border: `1px solid ${isDark ? "#444" : "#ccc"}`,
											color: isDark ? "#aaa" : "#555",
											cursor: "pointer",
											fontSize: 14,
										}}
									>
										Сбросить выбор
									</button>
								</div>
							</div>

							<div
								style={{
									display: "grid",
									gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
									gap: 16,
								}}
							>
								{SPECIALIZATIONS.map((s) => {
									const isSelected = specs.includes(s.id);
									return (
										<GlassCard
											key={s.id}
											selected={isSelected}
											onClick={() => toggleSpec(s.id)}
											accentColor={accentColor}
											isDark={isDark}
											style={{ position: "relative", padding: "24px 20px" }}
										>
											<div
												style={{
													position: "absolute",
													top: 16,
													right: 16,
													width: 32,
													height: 32,
													borderRadius: 10,
													border: `2px solid ${isSelected ? accentColor : isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.2)"}`,
													background: isSelected
														? accentColor
														: isDark
															? "rgba(0,0,0,0.2)"
															: "rgba(255,255,255,0.05)",
													display: "flex",
													alignItems: "center",
													justifyContent: "center",
													transition: "all 0.2s",
													boxShadow: isSelected
														? `0 0 12px ${accentColor}88`
														: "none",
												}}
											>
												{isSelected && (
													<Check size={20} color="#fff" strokeWidth={3} />
												)}
											</div>
											<div
												style={{
													color: isSelected
														? accentColor
														: isDark
															? "#aaa"
															: "#555",
													marginBottom: 16,
													transform: isSelected ? "scale(1.15)" : "scale(1)",
													transition: "transform 0.2s",
													transformOrigin: "left center",
												}}
											>
												{s.icon}
											</div>
											<div>
												<div
													style={{
														fontWeight: 700,
														fontSize: 18,
														color: isSelected
															? textColor
															: isDark
																? "#aaa"
																: "#555",
													}}
												>
													{s.label}
												</div>
												<div
													style={{
														fontSize: 14,
														color: isSelected
															? isDark
																? "#ccc"
																: "#444"
															: "#888",
														marginTop: 6,
														lineHeight: 1.4,
													}}
												>
													{s.desc}
												</div>
											</div>
										</GlassCard>
									);
								})}
							</div>
						</div>
					)}

					{step === 2 && (
						<div
							style={{
								background: isDark
									? "rgba(255,255,255,0.03)"
									: "rgba(0,0,0,0.02)",
								padding: "32px 20px",
								borderRadius: 24,
								border: `1px solid ${isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"}`,
							}}
						>
							<SliderControl
								label="Количество кресел (от 1 до 10)"
								min={1}
								max={10}
								value={chairs}
								onChange={setChairs}
								isDark={isDark}
								accentColor={accentColor}
							/>
							<div
								style={{
									marginTop: 40,
									paddingTop: 32,
									borderTop: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`,
								}}
							>
								<h4 style={{ marginBottom: 24, fontSize: 18 }}>
									График работы клиники
								</h4>
								<SliderControl
									label="Открытие"
									min={6}
									max={12}
									value={workHours[0]}
									onChange={(v: number) => setWorkHours([v, workHours[1]])}
									isDark={isDark}
									accentColor={accentColor}
								/>
								<SliderControl
									label="Закрытие"
									min={15}
									max={23}
									value={workHours[1]}
									onChange={(v: number) => setWorkHours([workHours[0], v])}
									isDark={isDark}
									accentColor={accentColor}
								/>
							</div>
						</div>
					)}

					{step === 3 && (
						<div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
							{[
								{ k: "lab", label: "Лаборатория", icon: <Wrench size={20} /> },
								{
									k: "dms",
									label: "ДМС Страхование",
									icon: <BriefcaseMedical size={20} />,
								},
								{
									k: "installments",
									label: "Рассрочки",
									icon: <Layers size={20} />,
								},
								{
									k: "egisz",
									label: "Интеграция с ЕГИСЗ",
									icon: <Settings2 size={20} />,
								},
							].map((m) => (
								<div
									key={m.k}
									onClick={() => toggleModule(m.k as any)}
									style={{
										display: "flex",
										alignItems: "center",
										justifyContent: "space-between",
										padding: 20,
										borderRadius: 16,
										background: isDark
											? "rgba(255,255,255,0.03)"
											: "rgba(0,0,0,0.03)",
										cursor: "pointer",
										border: `2px solid ${modules[m.k as keyof typeof modules] ? accentColor : "transparent"}`,
									}}
								>
									<div
										style={{ display: "flex", alignItems: "center", gap: 16 }}
									>
										<div
											style={{
												color: modules[m.k as keyof typeof modules]
													? accentColor
													: "gray",
											}}
										>
											{m.icon}
										</div>
										<span style={{ fontWeight: 600 }}>{m.label}</span>
									</div>
									<div
										style={{
											width: 24,
											height: 24,
											borderRadius: "50%",
											background: modules[m.k as keyof typeof modules]
												? accentColor
												: "transparent",
											border: `2px solid ${modules[m.k as keyof typeof modules] ? accentColor : "gray"}`,
											display: "flex",
											alignItems: "center",
											justifyContent: "center",
										}}
									>
										{modules[m.k as keyof typeof modules] && (
											<Check size={14} color="#fff" />
										)}
									</div>
								</div>
							))}
						</div>
					)}

					{step === 4 && (
						<div
							style={{
								background: isDark
									? "rgba(255,255,255,0.03)"
									: "rgba(0,0,0,0.02)",
								padding: 32,
								borderRadius: 24,
							}}
						>
							<h3 style={{ marginBottom: 24 }}>Выберите акцентный цвет</h3>
							<div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
								{(Object.entries(THEME_COLORS) as [ThemeColor, string][]).map(
									([k, color]) => (
										<div
											key={k}
											onClick={() => setTheme(k as ThemeColor)}
											style={{
												width: 64,
												height: 64,
												borderRadius: 32,
												background: color,
												cursor: "pointer",
												border:
													theme === k
														? `4px solid white`
														: `4px solid transparent`,
												outline: theme === k ? `2px solid ${color}` : "none",
											}}
										/>
									),
								)}
							</div>
						</div>
					)}

					{step === 5 && (
						<div
							style={{
								display: "flex",
								flexDirection: "column",
								gap: 20,
								width: "100%",
							}}
						>
							<div style={{ textAlign: "center", marginBottom: 8 }}>
								<p
									style={{
										margin: 0,
										fontSize: 18,
										color: accentColor,
										fontWeight: 700,
									}}
								>
									ФОРМИРОВАНИЕ ШТАТНОГО РАСПИСАНИЯ
								</p>
								<p style={{ margin: "8px 0 0 0", fontSize: 14, color: "#aaa" }}>
									Настройте права доступа и роли. На мобильных устройствах
									карточки автоматически сворачиваются.
								</p>
							</div>

							{staff.map((st, i) => {
								const availableSpecs = SPECIALIZATIONS.filter((s) =>
									specs.includes(s.id),
								);
								return (
									<div
										key={st.id}
										style={{
											display: "flex",
											flexDirection: "column",
											gap: 16,
											padding: "20px 16px",
											borderRadius: 16,
											background: isDark
												? "rgba(255,255,255,0.03)"
												: "rgba(0,0,0,0.02)",
											border: `1px solid ${isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"}`,
										}}
									>
										<div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
											<div
												style={{
													flex: "1 1 calc(50% - 6px)",
													minWidth: "200px",
												}}
											>
												<label
													style={{
														display: "block",
														fontSize: 12,
														color: "#888",
														marginBottom: 4,
													}}
												>
													ФИО сотрудника
												</label>
												<input
													value={st.fullName}
													onChange={(e) =>
														setStaff((prev) =>
															prev.map((item, idx) =>
																idx === i
																	? { ...item, fullName: e.target.value }
																	: item,
															),
														)
													}
													style={{
														width: "100%",
														padding: "12px 14px",
														borderRadius: 8,
														border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`,
														background: "transparent",
														color: textColor,
														fontSize: 15,
													}}
													placeholder="Иванов И.И."
												/>
											</div>
											<div
												style={{
													flex: "1 1 calc(50% - 6px)",
													minWidth: "200px",
												}}
											>
												<label
													style={{
														display: "block",
														fontSize: 12,
														color: "#888",
														marginBottom: 4,
													}}
												>
													Телефон
												</label>
												<input
													value={st.phone || ""}
													onChange={(e) =>
														setStaff((prev) =>
															prev.map((item, idx) =>
																idx === i
																	? {
																			...item,
																			phone: e.target.value.replace(
																				/[^\d+()\-\s]/g,
																				"",
																			),
																		}
																	: item,
															),
														)
													}
													style={{
														width: "100%",
														padding: "12px 14px",
														borderRadius: 8,
														border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`,
														background: "transparent",
														color: textColor,
														fontSize: 15,
													}}
													placeholder="+7 (999) 000-00-00"
												/>
											</div>

											<div
												style={{
													flex: "1 1 calc(50% - 6px)",
													minWidth: "140px",
												}}
											>
												<label
													style={{
														display: "block",
														fontSize: 12,
														color: "#888",
														marginBottom: 4,
													}}
												>
													Роль
												</label>
												<select
													value={st.role || "Врач"}
													onChange={(e) =>
														setStaff((prev) =>
															prev.map((item, idx) =>
																idx === i
																	? { ...item, role: e.target.value }
																	: item,
															),
														)
													}
													style={{
														width: "100%",
														padding: "12px 14px",
														borderRadius: 8,
														border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`,
														background: isDark ? "#1a1d2e" : "#fff",
														color: textColor,
														fontSize: 15,
													}}
												>
													<option value="Врач">Врач</option>
													<option value="Ассистент">Ассистент</option>
													<option value="Администратор">Администратор</option>
													<option value="Куратор">Куратор</option>
												</select>
											</div>

											{st.role === "Врач" && availableSpecs.length > 0 && (
												<div
													style={{
														flex: "1 1 calc(50% - 6px)",
														minWidth: "140px",
													}}
												>
													<label
														style={{
															display: "block",
															fontSize: 12,
															color: "#888",
															marginBottom: 4,
														}}
													>
														Специализация
													</label>
													<select
														value={
															st.specialization ||
															availableSpecs[0]?.label ||
															""
														}
														onChange={(e) =>
															setStaff((prev) =>
																prev.map((item, idx) =>
																	idx === i
																		? {
																				...item,
																				specialization: e.target.value,
																			}
																		: item,
																),
															)
														}
														style={{
															width: "100%",
															padding: "12px 14px",
															borderRadius: 8,
															border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`,
															background: isDark ? "#1a1d2e" : "#fff",
															color: textColor,
															fontSize: 15,
														}}
													>
														{availableSpecs.map((spec) => (
															<option key={spec.id} value={spec.label}>
																{spec.label}
															</option>
														))}
													</select>
												</div>
											)}

											{(st.role === "Врач" || st.role === "Куратор") && (
												<div style={{ flex: "1 1 100%" }}>
													<label
														style={{
															display: "block",
															fontSize: 12,
															color: "#888",
															marginBottom: 4,
														}}
													>
														Комиссионная ставка (%)
													</label>
													<div
														style={{
															display: "flex",
															alignItems: "center",
															gap: 8,
															padding: "0 12px",
															borderRadius: 8,
															border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`,
															background: "transparent",
														}}
													>
														<input
															value={st.percentage}
															type="number"
															min={0}
															max={100}
															onChange={(e) =>
																setStaff((prev) =>
																	prev.map((item, idx) =>
																		idx === i
																			? {
																					...item,
																					percentage: Math.max(
																						0,
																						Math.min(
																							100,
																							Number(e.target.value),
																						),
																					),
																				}
																			: item,
																	),
																)
															}
															style={{
																width: "100%",
																padding: "12px 4px",
																border: "none",
																background: "transparent",
																color: textColor,
																outline: "none",
																fontSize: 15,
															}}
															placeholder="Например: 25"
														/>
														<span
															style={{
																fontSize: 15,
																fontWeight: 600,
																color: accentColor,
															}}
														>
															%
														</span>
													</div>
												</div>
											)}

											{st.role === "Ассистент" && (
												<div style={{ flex: "1 1 100%" }}>
													<label
														style={{
															display: "block",
															fontSize: 12,
															color: "#888",
															marginBottom: 4,
														}}
													>
														Привязка к врачу
													</label>
													<select
														onChange={(e) => {
															const val = e.target.value;
															setStaff((prev) =>
																prev.map((item, idx) =>
																	idx === i
																		? { ...item, linkedDoctorId: val }
																		: item,
																),
															);
														}}
														style={{
															width: "100%",
															padding: "12px 14px",
															borderRadius: 8,
															border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`,
															background: isDark ? "#1a1d2e" : "#fff",
															color: textColor,
															fontSize: 15,
														}}
													>
														<option value="">Без жесткой привязки...</option>
														{staff
															.filter((s) => s.role === "Врач" && s.fullName)
															.map((doc) => (
																<option key={doc.id} value={doc.id}>
																	{doc.fullName}
																</option>
															))}
													</select>
												</div>
											)}
										</div>

										{/* Working days schedule visualizer */}
										<div>
											<label
												style={{
													display: "block",
													fontSize: 12,
													color: "#888",
													marginBottom: 8,
												}}
											>
												Рабочие дни (график по умолчанию)
											</label>
											<div
												style={{ display: "flex", gap: 8, flexWrap: "wrap" }}
											>
												{["ПН", "ВТ", "СР", "ЧТ", "ПТ", "СБ", "ВС"].map(
													(day) => (
														<div
															key={day}
															style={{
																width: 36,
																height: 36,
																borderRadius: 10,
																display: "flex",
																alignItems: "center",
																justifyContent: "center",
																fontSize: 13,
																fontWeight: 600,
																cursor: "pointer",
																background: ["СБ", "ВС"].includes(day)
																	? "transparent"
																	: `${accentColor}33`,
																color: ["СБ", "ВС"].includes(day)
																	? "#888"
																	: accentColor,
																border: `1px solid ${["СБ", "ВС"].includes(day) ? (isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)") : accentColor}`,
															}}
														>
															{day}
														</div>
													),
												)}
											</div>
										</div>

										{/* Permissions Config */}
										<div
											style={{
												display: "flex",
												gap: 16,
												flexWrap: "wrap",
												marginTop: 8,
												padding: 16,
												background: isDark
													? "rgba(0,0,0,0.2)"
													: "rgba(255,255,255,0.5)",
												borderRadius: 12,
											}}
										>
											<label
												style={{
													display: "flex",
													alignItems: "center",
													gap: 10,
													fontSize: 14,
													cursor: "pointer",
													flex: "1 1 120px",
												}}
											>
												<input
													type="checkbox"
													checked={st.canSignMedicalRecords}
													onChange={(e) =>
														setStaff((prev) =>
															prev.map((item, idx) =>
																idx === i
																	? {
																			...item,
																			canSignMedicalRecords: e.target.checked,
																		}
																	: item,
															),
														)
													}
													style={{ width: 18, height: 18, accentColor }}
												/>
												Подпись ЭМК
											</label>
											<label
												style={{
													display: "flex",
													alignItems: "center",
													gap: 10,
													fontSize: 14,
													cursor: "pointer",
													flex: "1 1 120px",
												}}
											>
												<input
													type="checkbox"
													checked={st.canManageMoney}
													onChange={(e) =>
														setStaff((prev) =>
															prev.map((item, idx) =>
																idx === i
																	? {
																			...item,
																			canManageMoney: e.target.checked,
																		}
																	: item,
															),
														)
													}
													style={{ width: 18, height: 18, accentColor }}
												/>
												Доступ к кассе
											</label>
											<label
												style={{
													display: "flex",
													alignItems: "center",
													gap: 10,
													fontSize: 14,
													cursor: "pointer",
													flex: "1 1 120px",
												}}
											>
												<input
													type="checkbox"
													checked={st.canManageImports}
													onChange={(e) =>
														setStaff((prev) =>
															prev.map((item, idx) =>
																idx === i
																	? {
																			...item,
																			canManageImports: e.target.checked,
																		}
																	: item,
															),
														)
													}
													style={{ width: 18, height: 18, accentColor }}
												/>
												Загрузка КТ/Импорт
											</label>
										</div>
									</div>
								);
							})}
							<button
								onClick={() =>
									setStaff([
										...staff,
										{
											id: Date.now().toString(),
											fullName: "",
											role: "Врач",
											specialization:
												SPECIALIZATIONS.filter((s) => specs.includes(s.id))[0]
													?.label || "",
											percentage: 0,
											canSignMedicalRecords: true,
											canManageMoney: false,
											canManageImports: false,
										},
									])
								}
								style={{
									padding: "16px",
									background: "transparent",
									color: accentColor,
									borderRadius: 16,
									border: `2px dashed ${accentColor}66`,
									cursor: "pointer",
									fontWeight: 600,
									fontSize: 15,
									transition: "all 0.2s",
								}}
							>
								+ Добавить сотрудника
							</button>
						</div>
					)}

					{step === 6 && (
						<div
							style={{
								display: "flex",
								flexDirection: "column",
								gap: 24,
								width: "100%",
							}}
						>
							<div style={{ textAlign: "center", marginBottom: 8 }}>
								<p
									style={{
										margin: 0,
										fontSize: 18,
										color: accentColor,
										fontWeight: 700,
									}}
								>
									ЮРИДИЧЕСКИЕ РЕКВИЗИТЫ
								</p>
								<p style={{ margin: "8px 0 0 0", fontSize: 14, color: "#aaa" }}>
									Введите данные для автоматической генерации договоров и
									загрузите логотип.
								</p>
							</div>

							<div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
								<div style={{ flex: "1 1 calc(50% - 8px)", minWidth: "200px" }}>
									<label
										style={{
											display: "block",
											fontSize: 12,
											color: "#888",
											marginBottom: 4,
										}}
									>
										ИНН (10 или 12 цифр)
									</label>
									<input
										value={legal.inn}
										onChange={(e) =>
											setLegal({
												...legal,
												inn: e.target.value.replace(/\D/g, "").slice(0, 12),
											})
										}
										placeholder="0000000000"
										style={{
											width: "100%",
											padding: "14px 16px",
											borderRadius: 12,
											border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`,
											background: "transparent",
											color: textColor,
											fontSize: 15,
										}}
									/>
								</div>
								<div style={{ flex: "1 1 calc(50% - 8px)", minWidth: "200px" }}>
									<label
										style={{
											display: "block",
											fontSize: 12,
											color: "#888",
											marginBottom: 4,
										}}
									>
										ОГРН (13 или 15 цифр)
									</label>
									<input
										value={legal.ogrn || ""}
										onChange={(e) =>
											setLegal({
												...legal,
												ogrn: e.target.value.replace(/\D/g, "").slice(0, 15),
											})
										}
										placeholder="0000000000000"
										style={{
											width: "100%",
											padding: "14px 16px",
											borderRadius: 12,
											border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`,
											background: "transparent",
											color: textColor,
											fontSize: 15,
										}}
									/>
								</div>
								<div style={{ flex: "1 1 100%" }}>
									<label
										style={{
											display: "block",
											fontSize: 12,
											color: "#888",
											marginBottom: 4,
										}}
									>
										Юридический адрес
									</label>
									<input
										value={legal.address || ""}
										onChange={(e) =>
											setLegal({ ...legal, address: e.target.value })
										}
										placeholder="г. Москва, ул. Ленина, д. 1"
										style={{
											width: "100%",
											padding: "14px 16px",
											borderRadius: 12,
											border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`,
											background: "transparent",
											color: textColor,
											fontSize: 15,
										}}
									/>
								</div>
							</div>

							<div
								style={{ display: "flex", gap: 16, flexDirection: "column" }}
							>
								<div
									style={{
										height: 160,
										border: `2px dashed ${accentColor}`,
										borderRadius: 16,
										display: "flex",
										flexDirection: "column",
										alignItems: "center",
										justifyContent: "center",
										cursor: "pointer",
										background: `${accentColor}11`,
										transition: "all 0.2s",
									}}
									onClick={() => setLogoUploaded(true)}
								>
									{logoUploaded ? (
										<Check size={48} color={accentColor} />
									) : (
										<UploadCloud size={48} color={accentColor} />
									)}
									<span
										style={{
											marginTop: 12,
											fontWeight: 600,
											textAlign: "center",
											padding: "0 16px",
										}}
									>
										{logoUploaded
											? "Ассеты загружены"
											: "Загрузить логотип и скан печати (Drag & Drop)"}
									</span>
								</div>
								{logoUploaded && (
									<div
										style={{
											padding: 16,
											borderRadius: 12,
											background: "#fff",
											color: "#000",
											border: "1px solid #e2e8f0",
											display: "flex",
											gap: 16,
											alignItems: "center",
											flexWrap: "wrap",
										}}
									>
										<div
											style={{
												width: 48,
												height: 48,
												background: "#f1f5f9",
												borderRadius: 8,
												display: "flex",
												alignItems: "center",
												justifyContent: "center",
												fontWeight: "bold",
												color: accentColor,
											}}
										>
											LOGO
										</div>
										<div style={{ flex: "1 1 200px" }}>
											<div
												style={{
													fontSize: 12,
													color: "#64748b",
													textTransform: "uppercase",
												}}
											>
												Превью бланка
											</div>
											<div style={{ fontWeight: 600, fontSize: 14 }}>
												ООО "Стоматология"
											</div>
											<div style={{ fontSize: 12, color: "#64748b" }}>
												ИНН {legal.inn || "0000000000"} •{" "}
												{legal.address || "Адрес не указан"}
											</div>
										</div>
										<div
											style={{
												width: 40,
												height: 40,
												borderRadius: "50%",
												border: "2px dashed #3b82f6",
												opacity: 0.5,
												display: "flex",
												alignItems: "center",
												justifyContent: "center",
											}}
										>
											<span style={{ fontSize: 8 }}>ПЕЧАТЬ</span>
										</div>
									</div>
								)}
							</div>
						</div>
					)}

					{step === 7 && (
						<div style={{ textAlign: "center", width: "100%" }}>
							<div style={{ textAlign: "center", marginBottom: 24 }}>
								<p
									style={{
										margin: 0,
										fontSize: 18,
										color: accentColor,
										fontWeight: 700,
									}}
								>
									БЕСШОВНАЯ МИГРАЦИЯ БАЗЫ
								</p>
								<p style={{ margin: "8px 0 0 0", fontSize: 14, color: "#aaa" }}>
									Перенесите пациентов, приемы и прайс-листы из вашей старой
									системы в 1 клик.
								</p>
							</div>

							<div
								onClick={async () => {
									if (migrationStatus === "idle") {
										setMigrationStatus("analyzing");
										try {
											const res = await fetch("/api/system/analyze-legacy-db", {
												method: "POST",
												headers: auth.denteClinicalMutationHeaders({
													"Content-Type": "application/json",
												}),
												body: JSON.stringify({}),
											});
											if (!res.ok) throw new Error("Migration analysis failed");
											await res.json();
											setMigrationStatus("done");
										} catch (err) {
											console.error(err);
											setMigrationStatus("idle");
										}
									}
								}}
								style={{
									height: 200,
									border: `3px dashed ${migrationStatus === "done" ? "#10b981" : accentColor}`,
									borderRadius: 24,
									display: "flex",
									flexDirection: "column",
									alignItems: "center",
									justifyContent: "center",
									cursor: "pointer",
									background:
										migrationStatus === "done"
											? "rgba(16, 185, 129, 0.05)"
											: isDark
												? "rgba(255,255,255,0.02)"
												: "rgba(0,0,0,0.02)",
									transition: "all 0.3s",
									position: "relative",
									overflow: "hidden",
								}}
							>
								{migrationStatus === "idle" && (
									<>
										<DownloadCloud size={64} color={accentColor} />
										<span
											style={{
												marginTop: 16,
												fontSize: 18,
												fontWeight: 600,
												padding: "0 16px",
											}}
										>
											Бросьте бэкап Ident / Infodent сюда
										</span>
										<span style={{ fontSize: 14, color: "#888", marginTop: 8 }}>
											CSV, SQL, Firebird
										</span>
									</>
								)}

								{migrationStatus === "analyzing" && (
									<>
										<div
											style={{
												position: "absolute",
												bottom: 0,
												left: 0,
												height: "100%",
												width: "60%",
												background: `${accentColor}22`,
												transition: "width 3s linear",
											}}
										/>
										<Loader2
											className="lucide-spin"
											size={64}
											color={accentColor}
											style={{ zIndex: 1 }}
										/>
										<span
											style={{
												marginTop: 16,
												fontSize: 16,
												fontWeight: 600,
												zIndex: 1,
												padding: "0 16px",
											}}
										>
											Анализ схемы БД... Извлечение пациентов...
										</span>
									</>
								)}

								{migrationStatus === "done" && (
									<>
										<Check size={64} color="#10b981" />
										<span
											style={{
												marginTop: 16,
												fontSize: 18,
												fontWeight: 600,
												color: "#10b981",
												padding: "0 16px",
											}}
										>
											Распознана база Ident. Найдено 4,521 пациентов.
										</span>
									</>
								)}
							</div>

							{migrationStatus === "done" && (
								<div
									style={{
										marginTop: 24,
										padding: 16,
										borderRadius: 16,
										background: isDark
											? "rgba(255,255,255,0.03)"
											: "rgba(0,0,0,0.02)",
										border: `1px solid ${isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"}`,
										textAlign: "left",
									}}
								>
									<div
										style={{
											fontWeight: 600,
											marginBottom: 12,
											display: "flex",
											alignItems: "center",
											gap: 8,
										}}
									>
										<BrainCircuit size={18} color={accentColor} /> AI Маппинг
										полей (Preview)
									</div>
									<div
										style={{
											display: "grid",
											gridTemplateColumns: "1fr auto 1fr",
											gap: 12,
											fontSize: 13,
											alignItems: "center",
										}}
									>
										<div
											style={{
												padding: "8px 4px",
												background: "rgba(0,0,0,0.2)",
												borderRadius: 6,
												color: "#aaa",
												textAlign: "center",
											}}
										>
											IDENT: patient_name
										</div>
										<ChevronRight size={16} color="#888" />
										<div
											style={{
												padding: "8px 4px",
												background: `${accentColor}22`,
												borderRadius: 6,
												color: accentColor,
												textAlign: "center",
											}}
										>
											DENTE: fullName
										</div>

										<div
											style={{
												padding: "8px 4px",
												background: "rgba(0,0,0,0.2)",
												borderRadius: 6,
												color: "#aaa",
												textAlign: "center",
											}}
										>
											IDENT: debt_balance
										</div>
										<ChevronRight size={16} color="#888" />
										<div
											style={{
												padding: "8px 4px",
												background: `${accentColor}22`,
												borderRadius: 6,
												color: accentColor,
												textAlign: "center",
											}}
										>
											DENTE: financialBalance
										</div>
									</div>
								</div>
							)}
						</div>
					)}

					{/* Navigation */}
					<div
						style={{
							display: "flex",
							justifyContent: "space-between",
							marginTop: 40,
							borderTop: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`,
							paddingTop: 24,
						}}
					>
						<button
							onClick={() => setStep(Math.max(1, step - 1))}
							disabled={step === 1 || launching}
							style={{
								padding: "12px 24px",
								borderRadius: 12,
								background: "transparent",
								border: `1px solid ${isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.2)"}`,
								color: textColor,
								cursor: step === 1 ? "not-allowed" : "pointer",
								opacity: step === 1 ? 0.5 : 1,
							}}
						>
							Назад
						</button>
						<button
							onClick={() => (step < 7 ? setStep(step + 1) : handleLaunch())}
							disabled={launching || (step === 1 && specs.length === 0)}
							style={{
								display: "flex",
								alignItems: "center",
								gap: 8,
								padding: "12px 32px",
								borderRadius: 12,
								background:
									step === 1 && specs.length === 0 ? "gray" : accentColor,
								color: "#fff",
								border: "none",
								cursor:
									step === 1 && specs.length === 0 ? "not-allowed" : "pointer",
								fontWeight: 600,
								fontSize: 16,
								boxShadow:
									step === 1 && specs.length === 0
										? "none"
										: `0 4px 12px ${accentColor}66`,
							}}
						>
							{launching ? (
								<Loader2 size={20} className="lucide-spin" />
							) : step < 7 ? (
								"Далее"
							) : (
								"Запустить DENTE"
							)}
							{!launching && step < 7 && <ChevronRight size={20} />}
							{!launching && step === 7 && <Play size={20} />}
						</button>
					</div>
				</div>

				{/* Sticky Summary */}
				<div
					style={{
						flex: "0 1 300px",
						background: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)",
						padding: 24,
						borderRadius: 24,
						backdropFilter: "blur(20px)",
						height: "fit-content",
						position: "sticky",
						top: 20,
					}}
				>
					<h3
						style={{
							marginBottom: 16,
							display: "flex",
							alignItems: "center",
							gap: 8,
						}}
					>
						<ListTodo size={20} color={accentColor} /> Итог настройки
					</h3>
					<div
						style={{
							display: "flex",
							flexDirection: "column",
							gap: 12,
							fontSize: 14,
						}}
					>
						<div style={{ display: "flex", justifyContent: "space-between" }}>
							<span>Направления:</span>{" "}
							<span style={{ fontWeight: 600 }}>{specs.length} выбр.</span>
						</div>
						<div style={{ display: "flex", justifyContent: "space-between" }}>
							<span>Кресел:</span>{" "}
							<span style={{ fontWeight: 600 }}>{chairs} шт.</span>
						</div>
						<div style={{ display: "flex", justifyContent: "space-between" }}>
							<span>Часы работы:</span>{" "}
							<span style={{ fontWeight: 600 }}>
								{workHours[0]}:00 - {workHours[1]}:00
							</span>
						</div>
						<div style={{ display: "flex", justifyContent: "space-between" }}>
							<span>Врачей:</span>{" "}
							<span style={{ fontWeight: 600 }}>{staff.length} чел.</span>
						</div>
						{legal.inn && (
							<div style={{ display: "flex", justifyContent: "space-between" }}>
								<span>ИНН:</span>{" "}
								<span style={{ fontWeight: 600 }}>{legal.inn}</span>
							</div>
						)}
						{migrationStatus === "done" && (
							<div style={{ display: "flex", justifyContent: "space-between" }}>
								<span>База:</span>{" "}
								<span style={{ fontWeight: 600, color: "#10b981" }}>
									4521 пац.
								</span>
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
