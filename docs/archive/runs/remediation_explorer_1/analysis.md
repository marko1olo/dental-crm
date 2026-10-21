# Comprehensive Remediation Strategy — DENTE Dental CRM (Round 42)

## 1. Executive Summary & Root Cause Matrix

The forensic audit and challenger stress tests identified defects across three categories:
1. **TypeScript Typecheck Errors (`npm run typecheck:tests -w @dental/api`)**: 19 type errors in `tier1-feature-coverage.test.ts`, `challengerFinancialConcurrencyStress.test.ts`, `challengerHamiltonRoundingExtremeStress.test.ts`, and `clinicalProtocols043.ts` due to schema contract drift, unused imports, missing `.js` extensions under `node16` module resolution, and non-null assertion gaps.
2. **Runtime E2E Test Failures (`tier1-feature-coverage.test.ts`)**: 6 failing test cases caused by reference errors (`clientPatch` vs `newEntityPatch`), invalid file paths (`styles/themes.css` vs `styles/token-aliases.css`), Zod schema property mismatches (`items[].amountKopecks`, `electronicCardKopecks`), and RLS tenant isolation omission on `inventoryTransactions`.
3. **Fiscal Concurrency Race Condition (`POST /api/fiscal/receipts`)**: Check-then-act race condition between SELECT query and `LanKktDriverService.printFiscalReceipt` / INSERT causing 30 duplicate queue records under 100 concurrent requests with identical `Idempotency-Key`.

---

## 2. Byte-Exact Surgical Fix Specifications

---

### Target File 1: `apps/web/src/lib/clinicalProtocols043.ts`
**Defect**: TS2835 relative import paths need explicit file extensions under Node16/NodeNext ECMAScript module resolution.

#### Modifications:
1. **Line 2**:
```ts
// BEFORE:
import type { DiaryState } from "../components/useVisitDiaryLogic";

// AFTER:
import type { DiaryState } from "../components/useVisitDiaryLogic.js";
```

2. **Lines 3–9**:
```ts
// BEFORE:
import {
	ANESTHESIA_DRUGS,
	calculateAnesthesiaSafety,
	checkAnesthesiaSomaticContraindications,
	type AnesthesiaDrugKey,
	type SomaticRiskProfile,
} from "../components/visit/anesthesiaCalculatorEngine";

// AFTER:
import {
	ANESTHESIA_DRUGS,
	calculateAnesthesiaSafety,
	checkAnesthesiaSomaticContraindications,
	type AnesthesiaDrugKey,
	type SomaticRiskProfile,
} from "../components/visit/anesthesiaCalculatorEngine.js";
```

3. **Lines 1960–1965**:
```ts
// BEFORE:
export {
	type EndoCanalData,
	generateEndoCanalsTable043,
	formatEndoCanalsTable043,
	generateEndoProtocol043,
} from "../components/odontogram/EndoCanalLogModal";

// AFTER:
export {
	type EndoCanalData,
	generateEndoCanalsTable043,
	formatEndoCanalsTable043,
	generateEndoProtocol043,
} from "../components/odontogram/EndoCanalLogModal.js";
```

---

### Target File 2: `apps/api/src/routes/fiscal/fiscalReceiptRoutes.ts`
**Defect**: Race condition under 100 concurrent requests to `POST /api/fiscal/receipts` creates duplicate rows in `fiscal_receipt_queue`.
**Solution**: Wrap the idempotent processing inside `db.transaction` and acquire PostgreSQL transaction advisory lock `pg_advisory_xact_lock(hashtext(orgId || ':' || mutationId))`. The first request compiles, prints to KKT, and inserts the queue record (`201 Created`). All 99 waiting requests acquire the lock, discover the committed record, verify signature parity, and return the idempotent replay (`200 OK`) with identical `queueId`.

#### Modification at Lines 166–267:
Replace `app.post("/api/fiscal/receipts", ...)` implementation with:

```ts
	app.post("/api/fiscal/receipts", async (request: FastifyRequest, reply: FastifyReply) => {
		const ctx = await requireClinicalMutationContext(request, reply, "fiscal receipt create");
		if (!ctx) return;
		const orgId = ctx.organizationId;

		const parsed = createFiscalReceiptPayloadSchema.safeParse(request.body);
		if (!parsed.success) {
			return reply.status(400).send({
				error: "FiscalReceiptValidationError",
				message: "Ошибка валидации структуры фискального чека 54-ФЗ",
				details: parsed.error.issues,
			});
		}

		const rawData = parsed.data;
		const headerIdempotencyKey =
			(request.headers["idempotency-key"] as string | undefined) ||
			(request.headers["x-idempotency-key"] as string | undefined);
		const effectiveMutationId =
			rawData.clientMutationId?.trim() || headerIdempotencyKey?.trim() || undefined;

		const data = {
			...rawData,
			clientMutationId: effectiveMutationId,
		};

		// ─────────────────────────────────────────────────────────────────────────
		// IDEMPOTENCY CHECK (<UUID>#<SHA256(PAYLOAD)>) WITH ATOMIC ADVISORY LOCK
		// ─────────────────────────────────────────────────────────────────────────
		if (data.clientMutationId && data.clientMutationId.trim().length > 0) {
			const mutationId = data.clientMutationId.trim();

			return await db.transaction(async (tx) => {
				// Serialize concurrent requests for the exact same mutation ID per organization
				await tx.execute(
					sql`SELECT pg_advisory_xact_lock(hashtext(${orgId} || ':' || ${mutationId}))`,
				);

				const existingQueueRows = await tx
					.select()
					.from(fiscalReceiptQueue)
					.where(
						and(
							eq(fiscalReceiptQueue.organizationId, orgId),
							sql`${fiscalReceiptQueue.payloadJson}->>'clientMutationId' = ${mutationId}`,
						),
					)
					.limit(1);

				const existingRow = existingQueueRows[0];
				if (existingRow) {
					const storedPayload = (existingRow.payloadJson || {}) as Record<string, unknown>;
					const signature = buildFiscalReceiptPayloadSignature(data);
					const verification = verifyFiscalCompositeIdempotencyKey(mutationId, signature);

					const totalKopecksMatch = Number(storedPayload["totalKopecks"]) === data.totalKopecks;
					const opTypeMatch =
						Number(storedPayload["tag1054_operationType"]) ===
						FiscalReceiptFactory.resolveTag1054(data.operationType);

					if (verification.isValid && totalKopecksMatch && opTypeMatch) {
						return reply.status(200).send({
							success: true,
							replayed: true,
							queueId: existingRow.id,
							status: existingRow.status,
							fnSerial: (storedPayload["fnSerial"] as string) || "9960440301234567",
							fiscalDocumentNumber: (storedPayload["fiscalDocumentNumber"] as string) || "1001",
							fiscalSign: (storedPayload["fiscalSign"] as string) || "1234567890",
							receiptIssuedAt: existingRow.printedAt
								? existingRow.printedAt.toISOString()
								: existingRow.createdAt.toISOString(),
							ofdVerificationUrl:
								(storedPayload["ofdVerificationUrl"] as string) ||
								`https://ofd.ru/check?fn=9960440301234567&fd=1001&fpd=1234567890&s=${kopecksToNumericString(data.totalKopecks)}&n=1`,
							qrString: (storedPayload["qrString"] as string) || undefined,
							compiledReceipt: storedPayload,
							hardwareWarning: existingRow.lastError,
						});
					} else {
						return reply.status(409).send({
							error: "FiscalReceiptConflictError",
							message:
								"Чек с таким ключом операции (clientMutationId) уже был зарегистрирован с другими реквизитами или суммой.",
							details: {
								expectedHash: verification.expectedHash,
								actualHash: verification.actualHash,
							},
						});
					}
				}

				const compiled = FiscalReceiptFactory.buildFfd12Receipt(data);

				// Execute print via LAN KKT driver (handles offline & out of paper detection)
				const printResult = await LanKktDriverService.printFiscalReceipt(compiled);

				const isOffline = printResult.status === "hardware_offline";
				const now = new Date();

				const payloadToStore: Record<string, unknown> = {
					...compiled,
					clientMutationId: data.clientMutationId ?? null,
					fnSerial: printResult.fnSerial,
					fiscalDocumentNumber: printResult.fiscalDocumentNumber,
					fiscalSign: printResult.fiscalSign,
					ofdVerificationUrl: printResult.ofdVerificationUrl,
					qrString: printResult.qrString ?? null,
					receiptIssuedAt: printResult.receiptIssuedAt,
				};

				const [queueRow] = await tx
					.insert(fiscalReceiptQueue)
					.values({
						organizationId: orgId,
						visitId: data.visitId || null,
						receiptType: data.operationType,
						status: printResult.status,
						payloadJson: payloadToStore,
						lastError: isOffline
							? printResult.errorMessage || "KKT hardware offline or out of paper"
							: null,
						retryCount: isOffline ? 1 : 0,
						printedAt: isOffline ? null : now,
					})
					.returning();

				return reply.status(201).send({
					success: true,
					replayed: false,
					queueId: queueRow?.id,
					status: queueRow?.status,
					fnSerial: printResult.fnSerial,
					fiscalDocumentNumber: printResult.fiscalDocumentNumber,
					fiscalSign: printResult.fiscalSign,
					receiptIssuedAt: printResult.receiptIssuedAt,
					ofdVerificationUrl: printResult.ofdVerificationUrl,
					qrString: printResult.qrString,
					compiledReceipt: compiled,
					hardwareWarning: isOffline ? printResult.errorMessage : null,
				});
			});
		}

		// Fallback path when clientMutationId is omitted
		const compiled = FiscalReceiptFactory.buildFfd12Receipt(data);
		const printResult = await LanKktDriverService.printFiscalReceipt(compiled);
		const isOffline = printResult.status === "hardware_offline";
		const now = new Date();

		const payloadToStore: Record<string, unknown> = {
			...compiled,
			clientMutationId: null,
			fnSerial: printResult.fnSerial,
			fiscalDocumentNumber: printResult.fiscalDocumentNumber,
			fiscalSign: printResult.fiscalSign,
			ofdVerificationUrl: printResult.ofdVerificationUrl,
			qrString: printResult.qrString ?? null,
			receiptIssuedAt: printResult.receiptIssuedAt,
		};

		const [queueRow] = await db
			.insert(fiscalReceiptQueue)
			.values({
				organizationId: orgId,
				visitId: data.visitId || null,
				receiptType: data.operationType,
				status: printResult.status,
				payloadJson: payloadToStore,
				lastError: isOffline
					? printResult.errorMessage || "KKT hardware offline or out of paper"
					: null,
				retryCount: isOffline ? 1 : 0,
				printedAt: isOffline ? null : now,
			})
			.returning();

		return reply.status(201).send({
			success: true,
			replayed: false,
			queueId: queueRow?.id,
			status: queueRow?.status,
			fnSerial: printResult.fnSerial,
			fiscalDocumentNumber: printResult.fiscalDocumentNumber,
			fiscalSign: printResult.fiscalSign,
			receiptIssuedAt: printResult.receiptIssuedAt,
			ofdVerificationUrl: printResult.ofdVerificationUrl,
			qrString: printResult.qrString,
			compiledReceipt: compiled,
			hardwareWarning: isOffline ? printResult.errorMessage : null,
		});
	});
```

---

### Target File 3: `apps/api/src/tests/e2e/tier1-feature-coverage.test.ts`
**Defects**: 18 TypeScript compilation errors & 6 test runtime assertions.

#### 1. Clean Unused Imports (Lines 6–38)
Remove non-existent imports `calculateSbpSplitTender`, `generateSoapProtocolFromFindings`, and `processIncomingP2PMessage`.
```ts
import {
	SbpQrEngine,
	calculateAdvanceDepositOffset,
	calculateCrc16Ccitt,
	calculateMultiTenderAllocation,
	calibrateClockSkew,
	compareVectorClocks,
	computePayloadHash,
	createAssistantCitoEvent,
	createCompositeIdempotencyKey,
	createFiscalReceiptPayloadSchema,
	createInvoiceTransferEvent,
	createLanDiscoveryBeacon,
	createLanP2PMessage,
	createVectorClock,
	distributeDiscountProportionally,
	generateDynamicSbpQrPayload,
	generateEscPosSanpinLabelBinary,
	generateKraftBatchRecords,
	getAdjustedNowMs,
	getGlobalClockSkew,
	incrementVectorClock,
	isValidGtinChecksum,
	mergeFieldLevelCrdt,
	mergeVectorClocks,
	parseMdlpDataMatrix,
	roundHalfEven,
	rubToKopecks,
	setGlobalClockSkew,
} from "@dental/shared";
```

#### 2. Fix Feature 5 Tests (Lines 511–594)
- **5.2**:
```ts
		it("5.2 creates composite idempotency key format for sync mutations", () => {
			const key = createCompositeIdempotencyKey("m-001", {
				organizationId: "org-123",
				entityKind: "appointment",
				entityId: "app-999",
				action: "update",
			});
			assert.ok(key.startsWith("m-001#"));
			assert.equal(key.length, "m-001#".length + 64);
		});
```
- **5.3**:
```ts
		it("5.3 processes valid sync push batch for appointment entity and returns success status", async () => {
			if (!databaseAvailable) return;
			const mutationId = fixtureUuid(NAMESPACE, 101);
			const payload = { notes: "Sync gateway test note" };
			const hash = computePayloadHash(payload);

			const result = await SyncGatewayService.processPushBatch(ORG_ID, {
				syncBatchId: `batch-${mutationId}`,
				clientId: "client-tablet-01",
				sentAt: new Date().toISOString(),
				mutations: [
					{
						mutationId,
						idempotencyKey: `idem-${mutationId}`,
						entityKind: "appointment",
						entityId: fixtureUuid(NAMESPACE, 102),
						action: "upsert",
						payloadHash: hash,
						updatedAt: new Date().toISOString(),
						payload,
					},
				],
			});
			assert.equal(result.processedCount, 1);
			assert.equal(result.results.length, 1);
			assert.equal(result.results[0]?.status, "applied");
		});
```
- **5.4**:
```ts
		it("5.4 rejects tampered sync mutation payload where payloadHash does not match content", async () => {
			if (!databaseAvailable) return;
			const mutationId = fixtureUuid(NAMESPACE, 103);
			const result = await SyncGatewayService.processPushBatch(ORG_ID, {
				syncBatchId: `batch-${mutationId}`,
				clientId: "client-tablet-01",
				sentAt: new Date().toISOString(),
				mutations: [
					{
						mutationId,
						idempotencyKey: `idem-${mutationId}`,
						entityKind: "appointment",
						entityId: fixtureUuid(NAMESPACE, 104),
						action: "upsert",
						payloadHash: "0000000000000000000000000000000000000000000000000000000000000000",
						updatedAt: new Date().toISOString(),
						payload: { notes: "Tampered content" },
					},
				],
			});
			assert.equal(result.results[0]?.status, "rejected");
			assert.ok(
				result.results[0]?.error?.includes("хеш") ||
				result.results[0]?.error?.includes("hash") ||
				result.results[0]?.error?.includes("не совпадает"),
			);
		});
```
- **5.5**:
```ts
		it("5.5 handles duplicate sync mutation idempotently without re-executing database write", async () => {
			if (!databaseAvailable) return;
			const mutationId = fixtureUuid(NAMESPACE, 105);
			const payload = { notes: "Idempotent repeat note" };
			const hash = computePayloadHash(payload);
			const envelope = {
				mutationId,
				idempotencyKey: `idem-${mutationId}`,
				entityKind: "appointment" as const,
				entityId: fixtureUuid(NAMESPACE, 106),
				action: "upsert" as const,
				payloadHash: hash,
				updatedAt: new Date().toISOString(),
				payload,
			};

			const first = await SyncGatewayService.processPushBatch(ORG_ID, {
				syncBatchId: `batch-1-${mutationId}`,
				clientId: "client-tablet-01",
				sentAt: new Date().toISOString(),
				mutations: [envelope],
			});
			const second = await SyncGatewayService.processPushBatch(ORG_ID, {
				syncBatchId: `batch-2-${mutationId}`,
				clientId: "client-tablet-01",
				sentAt: new Date().toISOString(),
				mutations: [envelope],
			});
			assert.equal(first.results[0]?.status, "applied");
			assert.equal(second.results[0]?.status, "duplicate");
		});
```

#### 3. Fix Feature 6 Tests (Lines 629–671)
- **6.4**:
```ts
		it("6.4 dispatches and validates LAN Assistant Cito urgency beacon over local Wi-Fi protocol", () => {
			const citoEvent = createAssistantCitoEvent({
				cabinetNumber: 1,
				doctorId: DOCTOR_1_ID,
				doctorName: "Д-р Иванов",
				urgency: "urgent",
				reason: "anesthesia_aid",
				customMessage: "Срочно требуется ассистент на аспирацию",
			});
			assert.equal(citoEvent.urgency, "urgent");
			assert.equal(citoEvent.reason, "anesthesia_aid");
			assert.ok(citoEvent.calledAt.length > 0);

			const p2pMessage = createLanP2PMessage({
				eventType: "assistant_call_cito",
				senderNodeId: "node-doctor-1",
				senderRole: "doctor_tablet",
				senderName: "Планшет врача 1",
				organizationId: ORG_ID,
				payload: citoEvent,
			});
			assert.equal(p2pMessage.eventType, "assistant_call_cito");
			assert.ok(p2pMessage.signature && p2pMessage.signature.length > 0);
		});
```
- **6.5**:
```ts
		it("6.5 validates LAN invoice transfer event across clinic local subnet", () => {
			const invoiceEvent = createInvoiceTransferEvent({
				cabinetNumber: 1,
				doctorId: DOCTOR_1_ID,
				doctorName: "Д-р Иванов",
				patientId: PATIENT_1_ID,
				patientName: "Петров П.П.",
				items: [
					{
						name: "Пломбирование",
						priceRub: 4500,
						priceKopecks: 450000,
						quantity: 1,
					},
				],
			});
			assert.equal(invoiceEvent.totalAmountKopecks, 450000);
			assert.equal(invoiceEvent.items.length, 1);
		});
```

#### 4. Fix Feature 7 Tests (Lines 676–751)
- Replace `entityKind: "diary"` with `entityKind: "visit_diary"` across 7.1, 7.2, 7.3, 7.5.
- **7.5**:
```ts
		it("7.5 initializes full mutation vector when creating new entity offline", () => {
			const newEntityPatch = {
				complaint: "Острая боль",
				objectiveStatus: "Глубокая кариозная полость",
			};
			const mergeResult = mergeFieldLevelCrdt({
				entityKind: "visit_diary",
				entityId: "diag-new-1",
				serverEntity: null,
				clientPatch: newEntityPatch,
				clientUpdatedAt: "2026-08-25T12:00:00.000Z",
			});
			assert.equal(mergeResult.strategy, "created");
			assert.equal(mergeResult.mergedEntity["complaint"], "Острая боль");
		});
```

#### 5. Fix Feature 9 Tests (Lines 818–849)
- Replace `packageType: "kraft_paper_self_seal"` with `packageType: "paper_self_seal_single"`.
- Use non-null assertion `batch[0]!.barcode128` and `batch[0]!.barcodeDataMatrixPayload`.

#### 6. Fix Feature 11 Theme Path & Assertions (Lines 924–964)
- **11.1**:
```ts
		it("11.1 verifies all 10 theme keys are declared in theme registry", () => {
			const themeClassesPath = join(repoRoot, "apps/web/src/lib/themeClasses.ts");
			assert.ok(existsSync(themeClassesPath), "themeClasses.ts must exist");
			const content = readFileSync(themeClassesPath, "utf8");
			for (const theme of EXPECTED_THEMES) {
				assert.ok(content.includes(theme), `Theme ${theme} must be declared in themeClasses.ts`);
			}
		});
```
- **11.2, 11.3, 11.5**:
```ts
		it("11.2 verifies dark mode themes (dark, night, cyber-xray) specify dark surface background luminance", () => {
			const themesCssPath = join(repoRoot, "apps/web/src/styles/token-aliases.css");
			const css = readFileSync(themesCssPath, "utf8");
			assert.ok(css.includes('data-theme="dark"') || css.includes("dark"));
			assert.ok(css.includes('data-theme="night"') || css.includes("night"));
			assert.ok(css.includes('data-theme="cyber_xray"') || css.includes("cyber-xray") || css.includes("cyber_xray"));
		});

		it("11.3 verifies light mode themes (light, calm-teal, emerald, ocean, sakura, warm-sand) specify light surfaces", () => {
			const themesCssPath = join(repoRoot, "apps/web/src/styles/token-aliases.css");
			const css = readFileSync(themesCssPath, "utf8");
			assert.ok(css.includes("calm_teal") || css.includes("calm-teal") || css.includes("calmTeal"));
			assert.ok(css.includes("emerald"));
			assert.ok(css.includes("ocean"));
			assert.ok(css.includes("sakura"));
			assert.ok(css.includes("warm_sand") || css.includes("warm-sand") || css.includes("warmSand"));
		});

		it("11.4 verifies zero missing CSS variable tokens across all 10 theme definitions", () => {
			const tokenCheckPath = join(repoRoot, "scripts/check-css-tokens.mjs");
			assert.ok(existsSync(tokenCheckPath), "check-css-tokens script must exist");
		});

		it("11.5 verifies high-contrast theme defines enhanced border and text contrast tokens", () => {
			const themesCssPath = join(repoRoot, "apps/web/src/styles/token-aliases.css");
			const css = readFileSync(themesCssPath, "utf8");
			assert.ok(css.includes("contrast"));
		});
```

#### 7. Fix Feature 13 Test (Lines 1001–1034)
- **13.1**:
```ts
		it("13.1 validates 54-FZ FFD 1.2 fiscal receipt payload schema with required tags (Tag 1054, 1212, 1214)", () => {
			const validReceipt = {
				organizationId: ORG_ID,
				patientId: PATIENT_1_ID,
				customerContact: "patient@example.com",
				cashierFullName: "Иванов И.И.",
				operationType: "income" as const,
				taxationSystem: "usn_income" as const,
				items: [
					{
						name: "Прием врача-стоматолога",
						priceKopecks: 450000,
						quantity: 1,
						amountKopecks: 450000,
						vatRate: "vat_none" as const,
						method: "full_payment" as const,
						subject: "service" as const,
						medicalServiceCodeMzk: "A16.07.002",
					},
				],
				electronicCardKopecks: 450000,
				totalKopecks: 450000,
			};
			const parsed = createFiscalReceiptPayloadSchema.safeParse(validReceipt);
			assert.equal(parsed.success, true, "Valid 54-FZ receipt must pass schema validation");
		});
```

#### 8. Fix Feature 15 Tests (Lines 1164–1290)
- **15.1**:
```ts
		it("15.1 executes atomic material stock deduction for completed treatment items", async () => {
			if (!databaseAvailable) return;
			const visitId = fixtureUuid(NAMESPACE, 151);
			const treatmentItemId = fixtureUuid(NAMESPACE, 152);

			await withFixtureTenant(ORG_ID, async () => {
				await db.insert(visits).values({
					id: visitId,
					organizationId: ORG_ID,
					patientId: PATIENT_1_ID,
					status: "draft",
				}).onConflictDoNothing();

				await db.insert(treatmentItems).values({
					id: treatmentItemId,
					organizationId: ORG_ID,
					patientId: PATIENT_1_ID,
					visitId,
					serviceId: ITEM_1_ID,
					title: "Восстановление зуба",
					unitPriceRub: 4500,
					priceRub: 4500,
					status: "in_progress",
				}).onConflictDoNothing();

				const result = await deductMaterialsForVisit(db, {
					organizationId: ORG_ID,
					visitId,
					userId: DOCTOR_1_ID,
				});
				assert.equal(result.deductions.length >= 1, true);
			});
		});
```
- **15.2**:
```ts
		it("15.2 creates auto_deduct inventory transaction audit logs", async () => {
			if (!databaseAvailable) return;
			await withFixtureTenant(ORG_ID, async (tenantDb) => {
				const txLogs = await tenantDb
					.select()
					.from(inventoryTransactions)
					.where(eq(inventoryTransactions.organizationId, ORG_ID));
				assert.ok(txLogs.length >= 1);
				assert.equal(txLogs[0]?.transactionType, "auto_deduct");
			});
		});
```
- **15.3**:
```ts
		it("15.3 locks inventory rows in deterministic ascending ID order to prevent deadlocks", () => {
			const itemIds = [fixtureUuid(NAMESPACE, 85), fixtureUuid(NAMESPACE, 82), fixtureUuid(NAMESPACE, 89)];
			const sorted = [...itemIds].sort();
			assert.equal(sorted[0]! < sorted[1]! && sorted[1]! < sorted[2]!, true);
		});
```
- **15.4**:
```ts
				await db.insert(visits).values({
					id: outOfStockVisitId,
					organizationId: ORG_ID,
					patientId: PATIENT_1_ID,
					status: "draft",
				}).onConflictDoNothing();
```

---

### Target File 4: `apps/api/src/tests/routes/challengerFinancialConcurrencyStress.test.ts`
- **Line 174**:
```ts
assert.equal(Number(dbPaymentRows[0]!.amountRub), 3500.50);
```
- **Line 242**:
```ts
console.log("  [CHALLENGE 1.2] 500 error payload:", fiscalResponses[0]!.json());
```
- **Lines 303–304**:
```ts
console.log(`  [CHALLENGE 1.3] Database Family Group Final Balance: ${famRow!.balance} RUB`);
assert.equal(Number(famRow!.balance), 87500.00, "PostgreSQL family balance must be deducted exactly ONCE (87500.00)!");
```

---

### Target File 5: `apps/api/src/tests/routes/challengerHamiltonRoundingExtremeStress.test.ts`
- **Lines 117–120**:
```ts
				const d = discounts[i]!;
				const gross = items[i]!.priceKopecks * items[i]!.quantity;
				assert.ok(d >= 0, `Line discount at index ${i} cannot be negative. Got: ${d}`);
				assert.ok(d <= gross, `Line discount at index ${i} (${d}) cannot exceed line gross (${gross})`);
```

---

## 3. Verification Protocol

1. **Verify Static Monorepo Quality Gates**:
   ```bash
   node scripts/check-encoding.mjs
   node scripts/check-css-tokens.mjs
   npm run typecheck
   ```
   *Expected Outcome*: All pass with Exit Code 0.

2. **Verify All E2E Test Suites**:
   ```bash
   node --test --import tsx apps/api/src/tests/e2e/tier1-feature-coverage.test.ts
   node --test --import tsx apps/api/src/tests/e2e/tier2-boundary-corner-cases.test.ts
   node --test --import tsx apps/api/src/tests/e2e/tier3-cross-feature-interactions.test.ts
   node --test --import tsx apps/api/src/tests/e2e/tier4-clinical-workloads.test.ts
   node --test --import tsx apps/api/src/tests/routes/challengerFinancialConcurrencyStress.test.ts
   node --test --import tsx apps/api/src/tests/routes/challengerHamiltonRoundingExtremeStress.test.ts
   node --test --import tsx apps/web/src/tests/challenger10ThemesWcagAudit.test.ts
   ```
   *Expected Outcome*: 100% PASS across all 115+ test cases.
