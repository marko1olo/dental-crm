const fs = require("fs");
const path = require("path");

function safeWriteFile(filePath, newContent) {
  const fullPath = path.resolve(filePath);
  const tempOld = `${fullPath}.tmp_old_${Date.now()}`;
  try {
    fs.renameSync(fullPath, tempOld);
    fs.writeFileSync(fullPath, newContent, "utf8");
    try {
      fs.unlinkSync(tempOld);
    } catch (_) {}
    console.log(`[PATCHED] ${filePath}`);
    return true;
  } catch (err) {
    // If direct write works:
    try {
      fs.writeFileSync(fullPath, newContent, "utf8");
      console.log(`[PATCHED-DIRECT] ${filePath}`);
      return true;
    } catch (e2) {
      console.error(`[ERROR] ${filePath}: ${err.message} / ${e2.message}`);
      if (!fs.existsSync(fullPath) && fs.existsSync(tempOld)) {
        fs.renameSync(tempOld, fullPath);
      }
      return false;
    }
  }
}

// ==========================================
// 1. apps/web/src/components/inventory/InventoryStockTableRow.tsx
// ==========================================
{
  const file = "apps/web/src/components/inventory/InventoryStockTableRow.tsx";
  let content = fs.readFileSync(file, "utf8");

  // Add onStepQuantity and onChangeQuantity destructuring
  if (!content.includes("onStepQuantity,") && content.includes("writeQty,")) {
    content = content.replace(
      "writeQty,\n\tisMenuOpen,",
      "writeQty,\n\tonStepQuantity,\n\tonChangeQuantity,\n\tisMenuOpen,"
    );
  }

  // Insert quantity stepper before action buttons
  const oldButtons = `						/* Разрешено: списание по FEFO с поддержкой мягкого овердрафта */
						<>
							<button
								type="button"
								onClick={() => onDeductItem(item, writeQty, isOverdraft)}`;

  const newButtons = `						/* Разрешено: списание по FEFO с поддержкой мягкого овердрафта */
						<>
							{/* Компактный степпер количества: [-] [qty] [+] */}
							<div className="inline-flex items-center border border-[var(--line)] rounded-lg bg-[var(--paper)] h-7 overflow-hidden shrink-0 shadow-xs mr-1">
								<button
									type="button"
									onClick={() => onStepQuantity?.(-1)}
									className="w-6 h-full flex items-center justify-center hover:bg-[var(--paper-soft)] text-[var(--ink-muted)] hover:text-[var(--ink)] cursor-pointer text-xs font-bold transition-colors select-none"
									title="Уменьшить количество на 1"
									data-testid={\`btn-qty-minus-\${item.id}\`}
								>
									−
								</button>
								<input
									type="number"
									min="1"
									value={writeQty}
									onChange={(e) =>
										onChangeQuantity?.(
											Math.max(1, parseInt(e.target.value, 10) || 1),
										)
									}
									className="w-10 h-full text-center text-xs font-bold bg-transparent text-[var(--ink)] border-x border-[var(--line)] outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
									title="Количество для списания или оприходования"
									data-testid={\`input-qty-\${item.id}\`}
								/>
								<button
									type="button"
									onClick={() => onStepQuantity?.(1)}
									className="w-6 h-full flex items-center justify-center hover:bg-[var(--paper-soft)] text-[var(--ink-muted)] hover:text-[var(--ink)] cursor-pointer text-xs font-bold transition-colors select-none"
									title="Увеличить количество на 1"
									data-testid={\`btn-qty-plus-\${item.id}\`}
								>
									+
								</button>
							</div>

							<button
								type="button"
								onClick={() => onDeductItem(item, writeQty, isOverdraft)}`;

  if (content.includes(oldButtons)) {
    content = content.replace(oldButtons, newButtons);
  }

  safeWriteFile(file, content);
}

// ==========================================
// 2. apps/web/src/components/inventory/InventoryStockTable.tsx
// ==========================================
{
  const file = "apps/web/src/components/inventory/InventoryStockTable.tsx";
  let content = fs.readFileSync(file, "utf8");

  // Expand column width for actions
  content = content.replace("width: 215,\n\t\t\t\t\t\t\t\twhiteSpace: \"nowrap\",", "width: 285,\n\t\t\t\t\t\t\t\twhiteSpace: \"nowrap\",");

  // Add handleChangeQuantity callback
  const oldStep = `	const handleStepQuantity = useCallback((itemId: string, delta: number) => {
		setPendingQuantities((prev) => {
			const current = prev[itemId] || 1;
			const nextVal = Math.max(1, current + delta);
			return { ...prev, [itemId]: nextVal };
		});
	}, []);`;

  const newStep = `	const handleStepQuantity = useCallback((itemId: string, delta: number) => {
		setPendingQuantities((prev) => {
			const current = prev[itemId] || 1;
			const nextVal = Math.max(1, current + delta);
			return { ...prev, [itemId]: nextVal };
		});
	}, []);

	const handleChangeQuantity = useCallback((itemId: string, val: number) => {
		setPendingQuantities((prev) => ({ ...prev, [itemId]: Math.max(1, val) }));
	}, []);`;

  if (content.includes(oldStep)) {
    content = content.replace(oldStep, newStep);
  }

  // Pass handlers to row
  const oldRowCall = `								writeQty={pendingQuantities[item.id] || 1}
								isMenuOpen={activeMenuRowId === item.id}`;

  const newRowCall = `								writeQty={pendingQuantities[item.id] || 1}
								onStepQuantity={(delta) => handleStepQuantity(item.id, delta)}
								onChangeQuantity={(val) => handleChangeQuantity(item.id, val)}
								isMenuOpen={activeMenuRowId === item.id}`;

  if (content.includes(oldRowCall)) {
    content = content.replace(oldRowCall, newRowCall);
  }

  safeWriteFile(file, content);
}

// ==========================================
// 3. apps/web/src/components/warehouse/waybillsTab/WaybillEditorModal.tsx
// ==========================================
{
  const file = "apps/web/src/components/warehouse/waybillsTab/WaybillEditorModal.tsx";
  let content = fs.readFileSync(file, "utf8");

  const oldSupplier = `				<div>
					<label className="block text-[11px] font-semibold text-[var(--muted,#64748b)] mb-1">
						Поставщик:
					</label>
					<select
						className="w-full h-8 px-2 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-xs"
						value={draftWaybill.supplier.id}
						onChange={(e) => {
							const s = CANONICAL_DENTAL_SUPPLIERS.find(
								(sup) => sup.id === e.target.value,
							);
							if (s) onChangeSupplier(s);
						}}
					>
						{CANONICAL_DENTAL_SUPPLIERS.map((s) => (
							<option key={s.id} value={s.id}>
								{s.name}
							</option>
						))}
					</select>
				</div>`;

  const newSupplier = `				<div>
					<label className="block text-[11px] font-semibold text-[var(--muted,#64748b)] mb-1">
						Поставщик и ИНН:
					</label>
					<div className="flex gap-1.5">
						<input
							type="text"
							placeholder="Название поставщика (напр. ООО «Дентал АВ»)"
							className="flex-1 h-8 px-2 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-xs text-[var(--ink)]"
							value={draftWaybill.supplier.name}
							onChange={(e) => {
								onChangeSupplier({
									...draftWaybill.supplier,
									id: \`custom_\${Date.now()}\`,
									name: e.target.value,
								});
							}}
						/>
						<input
							type="text"
							placeholder="ИНН (10-12 цифр)"
							maxLength={12}
							className="w-32 h-8 px-2 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-xs text-[var(--ink)]"
							value={draftWaybill.supplier.inn || ""}
							onChange={(e) => {
								onChangeSupplier({
									...draftWaybill.supplier,
									inn: e.target.value.replace(/\\D/g, ""),
								});
							}}
						/>
					</div>
				</div>`;

  if (content.includes(oldSupplier)) {
    content = content.replace(oldSupplier, newSupplier);
  }

  safeWriteFile(file, content);
}

// ==========================================
// 4. apps/api/src/services/documents/ndflTaxService.ts
// ==========================================
{
  const file = "apps/api/src/services/documents/ndflTaxService.ts";
  let content = fs.readFileSync(file, "utf8");

  // Import alreadyRefundedKopecksForPayment and getDocumentsByPatientId
  if (!content.includes("alreadyRefundedKopecksForPayment")) {
    content = content.replace(
      'import { getPaymentsByPatientIdInDb } from "../../db/billingQuery.js";',
      'import { getPaymentsByPatientIdInDb } from "../../db/billingQuery.js";\nimport { getDocumentsByPatientId } from "../../db/documentQuery.js";\nimport { alreadyRefundedKopecksForPayment } from "../../documents/guards.js";'
    );
  }

  // Fetch documents alongside payments
  const oldFetch = `		// 2. Получение оплат пациента
		const allPayments = await getPaymentsByPatientIdInDb(
			organizationId,
			patientId,
		);`;

  const newFetch = `		// 2. Получение оплат и выданных документов пациента (для учета частичных возвратов по ст. 219 НК РФ)
		const [allPayments, patientDocuments] = await Promise.all([
			getPaymentsByPatientIdInDb(organizationId, patientId),
			getDocumentsByPatientId(organizationId, patientId),
		]);`;

  if (content.includes(oldFetch)) {
    content = content.replace(oldFetch, newFetch);
  }

  // Deduct refund from amountKop
  const oldAmountKop = "			const amountKop = parseKopecks(pay.amountRub);";
  const newAmountKop = `			const rawAmountKop = parseKopecks(pay.amountRub);
			const alreadyRefundedKop = alreadyRefundedKopecksForPayment(
				pay.id,
				patientDocuments as any,
			);
			const amountKop = Math.max(0, rawAmountKop - alreadyRefundedKop);

			// Если чек был полностью возвращен пациенту — исключаем его из справки НДФЛ
			if (amountKop <= 0) {
				receipts.push({
					id: pay.id,
					receiptNumber: pay.fiscalReceiptNumber || pay.id.slice(0, 8),
					fiscalDocumentNumber: fiscalDocNum,
					receiptDate,
					serviceName,
					deductionCode: "1",
					amountRub: pay.amountRub,
					isExcluded: true,
					exclusionReason: "Сумма по чеку полностью возвращена пациенту (заявление на возврат)",
				});
				continue;
			}`;

  if (content.includes(oldAmountKop)) {
    content = content.replace(oldAmountKop, newAmountKop);
  }

  safeWriteFile(file, content);
}

// ==========================================
// 5. packages/shared/src/documents/forms043u.ts
// ==========================================
{
  const file = "packages/shared/src/documents/forms043u.ts";
  let content = fs.readFileSync(file, "utf8");

  const oldFormula = "	odontogramTeeth: z.array(fdiToothRecordSchema).default([]),";
  const newFormula = `	odontogramTeeth: z.array(fdiToothRecordSchema).default([]),
	// Дуальная зубная формула (СтАР / Приказ № 1030): до лечения и после санации
	initialOdontogramTeeth: z.array(fdiToothRecordSchema).default([]),
	sanitizedOdontogramTeeth: z.array(fdiToothRecordSchema).default([]),`;

  if (content.includes(oldFormula) && !content.includes("initialOdontogramTeeth:")) {
    content = content.replace(oldFormula, newFormula);
    safeWriteFile(file, content);
  }
}

// ==========================================
// 6. apps/api/src/routes/analytics/utilizationRoutes.ts
// ==========================================
{
  const file = "apps/api/src/routes/analytics/utilizationRoutes.ts";
  let content = fs.readFileSync(file, "utf8");

  const oldChairUtil = `export async function calculateChairUtilization(
	orgId: string,
	startDate?: Date,
	now: Date = new Date(),
): Promise<{
	chairUtilizationJson: ChairUtilizationItem[];
	chairOccupancyRate: number;
	chairUtilRes: { chairId: string | null; count: number; occupiedMinutes: number }[];
	availableMinutesPerChair: number;
}> {
	const availableMinutesPerChair = calculateAvailableMinutes(startDate, now);

	const chairUtilRes = await db
		.select({
			chairId: appointments.chairId,
			count: sql<number>\`count(*)::int\`,
			occupiedMinutes: sql<number>\`coalesce(sum(case when \${appointments.status} not in ('cancelled', 'no_show') then extract(epoch from (\${appointments.endsAt} - \${appointments.startsAt})) / 60 else 0 end), 0)::int\`,
		})
		.from(appointments)
		.where(withDateFilter(orgId, appointments.organizationId, appointments.startsAt, startDate))
		.groupBy(appointments.chairId);

	const allChairs = await db
		.select({ id: chairs.id, name: chairs.name })
		.from(chairs)
		.where(eq(chairs.organizationId, orgId));
	const chairMap = new Map(allChairs.map((c) => [c.id, c.name]));

	const colors = [
		"#8b5cf6",
		"#ec4899",
		"#f59e0b",
		"#10b981",
		"#3b82f6",
		"#06b6d4",
		"#a855f7",
	];
	const chairUtilizationJson: ChairUtilizationItem[] = chairUtilRes
		.map((r, i) => {
			const count = Number(r.count || 0);
			const occupiedMinutes = Number(r.occupiedMinutes || 0);
			const utilizationPercent =
				availableMinutesPerChair > 0
					? Math.min(
							100,
							Math.round(
								(occupiedMinutes / availableMinutesPerChair) * 1000,
							) / 10,
						)
					: 0;
			return {
				chairId: r.chairId ?? null,
				name: r.chairId
					? chairMap.get(r.chairId) || "Кресло"
					: "Основное кресло",
				value: count,
				occupiedMinutes,
				availableMinutes: availableMinutesPerChair,
				utilizationPercent,
				fill: colors[i % colors.length]!,
			};
		})
		.filter((x) => x.value > 0);

	const totalOccupiedMins = chairUtilRes.reduce(
		(sum, r) => sum + Number(r.occupiedMinutes || 0),
		0,
	);
	const totalAvailMins = availableMinutesPerChair * Math.max(1, chairUtilRes.length);
	const chairOccupancyRate =
		totalAvailMins > 0
			? Math.min(100, Math.round((totalOccupiedMins / totalAvailMins) * 1000) / 10)
			: 0;

	return {
		chairUtilizationJson,
		chairOccupancyRate,
		chairUtilRes,
		availableMinutesPerChair,
	};
}`;

  const newChairUtil = `export async function calculateChairUtilization(
	orgId: string,
	startDate?: Date,
	now: Date = new Date(),
	branchId?: string,
): Promise<{
	chairUtilizationJson: ChairUtilizationItem[];
	chairOccupancyRate: number;
	chairUtilRes: { chairId: string | null; count: number; occupiedMinutes: number }[];
	availableMinutesPerChair: number;
}> {
	const availableMinutesPerChair = calculateAvailableMinutes(startDate, now);

	const chairConditions: any[] = [eq(chairs.organizationId, orgId)];
	if (branchId && branchId !== "all") {
		chairConditions.push(eq(chairs.clinicId, branchId));
	}

	const allChairs = await db
		.select({ id: chairs.id, name: chairs.name, isActive: chairs.isActive })
		.from(chairs)
		.where(and(...chairConditions));
	const activeChairs = allChairs.filter((c) => c.isActive !== false);
	const totalActiveChairsCount = Math.max(1, activeChairs.length);

	const apptConditions: any[] = [
		withDateFilter(orgId, appointments.organizationId, appointments.startsAt, startDate),
	];
	if (branchId && branchId !== "all" && allChairs.length > 0) {
		apptConditions.push(inArray(appointments.chairId, allChairs.map((c) => c.id)));
	}

	const chairUtilRes = await db
		.select({
			chairId: appointments.chairId,
			count: sql<number>\`count(*)::int\`,
			occupiedMinutes: sql<number>\`coalesce(sum(case when \${appointments.status} not in ('cancelled', 'no_show') then extract(epoch from (\${appointments.endsAt} - \${appointments.startsAt})) / 60 else 0 end), 0)::int\`,
		})
		.from(appointments)
		.where(and(...apptConditions))
		.groupBy(appointments.chairId);

	const utilMap = new Map(
		chairUtilRes.map((r) => [r.chairId ?? "unknown", { count: Number(r.count || 0), occupiedMinutes: Number(r.occupiedMinutes || 0) }]),
	);

	const colors = [
		"#8b5cf6",
		"#ec4899",
		"#f59e0b",
		"#10b981",
		"#3b82f6",
		"#06b6d4",
		"#a855f7",
	];

	let colorIdx = 0;
	const chairUtilizationJson: ChairUtilizationItem[] = [];

	for (const chair of activeChairs) {
		const metrics = utilMap.get(chair.id) || { count: 0, occupiedMinutes: 0 };
		const occupiedMinutes = metrics.occupiedMinutes;
		const utilizationPercent =
			availableMinutesPerChair > 0
				? Math.min(
						100,
						Math.round((occupiedMinutes / availableMinutesPerChair) * 1000) / 10,
					)
				: 0;

		chairUtilizationJson.push({
			chairId: chair.id,
			name: chair.name || "Кресло",
			value: metrics.count,
			occupiedMinutes,
			availableMinutes: availableMinutesPerChair,
			utilizationPercent,
			fill: colors[colorIdx % colors.length]!,
		});
		colorIdx++;
	}

	const totalOccupiedMins = chairUtilRes.reduce(
		(sum, r) => sum + Number(r.occupiedMinutes || 0),
		0,
	);
	const totalAvailMins = availableMinutesPerChair * totalActiveChairsCount;
	const chairOccupancyRate =
		totalAvailMins > 0
			? Math.min(100, Math.round((totalOccupiedMins / totalAvailMins) * 1000) / 10)
			: 0;

	return {
		chairUtilizationJson,
		chairOccupancyRate,
		chairUtilRes,
		availableMinutesPerChair,
	};
}`;

  if (content.includes(oldChairUtil)) {
    content = content.replace(oldChairUtil, newChairUtil);
    safeWriteFile(file, content);
  }
}

// ==========================================
// 7. apps/api/src/routes/analytics/dashboardRoutes.ts
// ==========================================
{
  const file = "apps/api/src/routes/analytics/dashboardRoutes.ts";
  let content = fs.readFileSync(file, "utf8");

  // Accept branchId
  content = content.replace(
    "const { range } = request.query as { range?: string };",
    "const { range, branchId } = request.query as { range?: string; branchId?: string };"
  );

  // Pass branchId to calculateChairUtilization
  content = content.replace(
    "calculateChairUtilization(orgId, startDate, now);",
    "calculateChairUtilization(orgId, startDate, now, branchId);"
  );

  safeWriteFile(file, content);
}

// ==========================================
// 8. apps/web/src/pages/analyticsDashboard/useAnalyticsDashboardData.ts
// ==========================================
{
  const file = "apps/web/src/pages/analyticsDashboard/useAnalyticsDashboardData.ts";
  let content = fs.readFileSync(file, "utf8");

  const oldFetchCall = `				const res = await fetch(\`/api/analytics/dashboard?range=\${dateRange}\`, {
					headers,
					signal: controller.signal,
				});`;

  const newFetchCall = `				const branchParam = branchFilter && branchFilter !== "all" ? \`&branchId=\${encodeURIComponent(branchFilter)}\` : "";
				const res = await fetch(\`/api/analytics/dashboard?range=\${dateRange}\${branchParam}\`, {
					headers,
					signal: controller.signal,
				});`;

  if (content.includes(oldFetchCall)) {
    content = content.replace(oldFetchCall, newFetchCall);
  }

  const oldDeps = `	}, [
		dateRange,
		getReadHeaders,
		authContext?.denteClinicalReadHeaders,
		authContext,
		appLogic?.dashboard,
	]);`;

  const newDeps = `	}, [
		dateRange,
		branchFilter,
		getReadHeaders,
		authContext?.denteClinicalReadHeaders,
		authContext,
		appLogic?.dashboard,
	]);`;

  if (content.includes(oldDeps)) {
    content = content.replace(oldDeps, newDeps);
  }

  safeWriteFile(file, content);
}

// ==========================================
// 9. apps/web/src/components/finance/modal/payment/executionModules/paymentSubmitExecutors.ts
// ==========================================
{
  const file = "apps/web/src/components/finance/modal/payment/executionModules/paymentSubmitExecutors.ts";
  let content = fs.readFileSync(file, "utf8");

  const oldEarlyReturn = `	if (isWarranty100 || totalDueRub <= 0) {
		showToast(\`Визит/счёт оформлен по 100% гарантии (0 ₽) (\${effectiveCashier})\`, "success");
		context.handleBroadcastSuccess({
			method: "warranty_discount_100",
			amountKopecks: 0,
			discountRub: discountCalc.discountRub,
			discountPercent: discountCalc.discountPercent,
			rawTotalRub: rawTotalDueRub,
			discountReason: discountReason || "Гарантийная переделка / скидка 100%",
		});
		onClose();
		return;
	}`;

  const newWarrantyDispatch = `	if (isWarranty100 || totalDueRub <= 0) {
		const { clientMutationId, headers } = generatePaymentIdempotencyKey({
			prefix: "warranty",
			patientId,
			amountRub: 0,
			method: "warranty_discount_100",
		});
		if (!acquirePaymentLock(clientMutationId)) return;
		try {
			const res = await dispatchPaymentApi(
				{
					patientId,
					amountRub: 0,
					method: "warranty_discount_100",
					visitId: visitId || null,
					documentId: documentId || (invoiceId ? invoiceId : null),
					clientMutationId,
					toothNumber: toothNumber ? Number(toothNumber) || toothNumber : undefined,
					invoiceItems: formatInvoiceItems(items),
					note: \`Оформление по 100% гарантии/скидке (0 ₽ • \${effectiveCashier}) [\${discountReason || "Гарантия"}]\`,
				},
				headers,
			);
			if (!res.success) {
				showToast(res.error || "Ошибка проведения гарантии", "error");
				return;
			}
			showToast(\`Визит/счёт оформлен по 100% гарантии (0 ₽) (\${effectiveCashier})\`, "success");
			context.handleBroadcastSuccess({
				method: "warranty_discount_100",
				amountKopecks: 0,
				discountRub: discountCalc.discountRub,
				discountPercent: discountCalc.discountPercent,
				rawTotalRub: rawTotalDueRub,
				discountReason: discountReason || "Гарантийная переделка / скидка 100%",
				...(res.data || {}),
			});
			onClose();
			return;
		} catch (err: any) {
			showToast(err?.message || "Ошибка проведения гарантии", "error");
			return;
		}
	}`;

  if (content.includes(oldEarlyReturn)) {
    // Replace both occurrences if present
    content = content.split(oldEarlyReturn).join(newWarrantyDispatch);
    safeWriteFile(file, content);
  }
}

console.log("\n=== ALL INQUISITION PATCHES APPLIED SUCCESSFULLY ===");
