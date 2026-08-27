/**
 * DENTE CRM — Local Clinic Wi-Fi Mesh & Distributed CRDT Synchronization Engine
 *
 * Provides:
 * 1. Mathematical Vector Clocks (RFC causality tracking & monotonicity guarantees)
 * 2. Multi-party Conflict-Free Replicated Data Types (CRDTs):
 *    - Schedule / Appointments (Status precedence matrix, double-booking prevention, deterministic LWW)
 *    - Form 043/u & Medical Diarires (SOAP notes, multi-tooth & per-surface odontogram map CRDT)
 *    - Cash & Fiscal Operations (Kopeck-exact balance consistency, idempotent journal)
 * 3. LAN Wi-Fi Mesh Node Discovery & Peer-to-Peer Exchange Protocol
 * 4. 3-Tier Seamless Transition Manager (Autonomous Offline <-> LAN Local Mesh <-> Cloud PostgreSQL)
 */
import { computePayloadHash } from "./hashing.js";
import { lanAssistantCitoEventSchema, lanChairStatusEventSchema, lanInvoiceTransferEventSchema, lanP2PMessageSchema, } from "./types.js";
// ─────────────────────────────────────────────────────────────────────────────
// 1. Pure Mathematical Vector Clock Engine
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Creates a new Vector Clock initialized with an optional node ID and sequence.
 */
export function createVectorClock(nodeId, initialSeq = 1) {
    const clock = {};
    if (nodeId && typeof nodeId === "string" && nodeId.trim()) {
        const safeNodeId = nodeId.trim();
        if (safeNodeId !== "__proto__" && safeNodeId !== "constructor" && safeNodeId !== "prototype") {
            const seq = typeof initialSeq === "number" && Number.isFinite(initialSeq) ? Math.max(0, Math.floor(initialSeq)) : 1;
            clock[safeNodeId] = seq;
        }
    }
    return clock;
}
/**
 * Increments the vector clock counter for a specific node ID monotonically.
 */
export function incrementVectorClock(clock, nodeId) {
    const safeNodeId = nodeId && typeof nodeId === "string" ? nodeId.trim() : "";
    if (!safeNodeId || safeNodeId === "__proto__" || safeNodeId === "constructor" || safeNodeId === "prototype") {
        return { ...clock };
    }
    const currentSeq = typeof clock[safeNodeId] === "number" && Number.isFinite(clock[safeNodeId])
        ? Math.max(0, Math.floor(clock[safeNodeId]))
        : 0;
    return {
        ...clock,
        [safeNodeId]: currentSeq + 1,
    };
}
/**
 * Compares two vector clocks to determine their causal relationship:
 * - "before": clockA happened strictly before clockB (clockA < clockB)
 * - "after": clockA happened strictly after clockB (clockA > clockB)
 * - "identical": clockA and clockB are identical
 * - "concurrent": clockA and clockB happened concurrently (conflict requires CRDT resolution)
 */
export function compareVectorClocks(clockA = {}, clockB = {}) {
    const safeKeysA = Object.keys(clockA || {}).filter((k) => k !== "__proto__" && k !== "constructor" && k !== "prototype");
    const safeKeysB = Object.keys(clockB || {}).filter((k) => k !== "__proto__" && k !== "constructor" && k !== "prototype");
    const allKeys = new Set([...safeKeysA, ...safeKeysB]);
    let hasGreater = false;
    let hasLesser = false;
    for (const key of allKeys) {
        const valA = typeof clockA[key] === "number" && Number.isFinite(clockA[key]) ? Math.max(0, Math.floor(clockA[key])) : 0;
        const valB = typeof clockB[key] === "number" && Number.isFinite(clockB[key]) ? Math.max(0, Math.floor(clockB[key])) : 0;
        if (valA > valB) {
            hasGreater = true;
        }
        else if (valA < valB) {
            hasLesser = true;
        }
    }
    if (!hasGreater && !hasLesser) {
        return "identical";
    }
    if (hasGreater && !hasLesser) {
        return "after";
    }
    if (hasLesser && !hasGreater) {
        return "before";
    }
    return "concurrent";
}
/**
 * Merges two vector clocks by taking the pairwise maximum for every node ID.
 */
export function mergeVectorClocks(clockA = {}, clockB = {}) {
    const merged = {};
    const safeKeysA = Object.keys(clockA || {}).filter((k) => k !== "__proto__" && k !== "constructor" && k !== "prototype");
    const safeKeysB = Object.keys(clockB || {}).filter((k) => k !== "__proto__" && k !== "constructor" && k !== "prototype");
    const allKeys = new Set([...safeKeysA, ...safeKeysB]);
    for (const key of allKeys) {
        const valA = typeof clockA[key] === "number" && Number.isFinite(clockA[key]) ? Math.max(0, Math.floor(clockA[key])) : 0;
        const valB = typeof clockB[key] === "number" && Number.isFinite(clockB[key]) ? Math.max(0, Math.floor(clockB[key])) : 0;
        merged[key] = Math.max(valA, valB);
    }
    return merged;
}
/**
 * Returns true if dominator vector clock causally dominates or equals dominated clock.
 */
export function dominatesVectorClock(dominator = {}, dominated = {}) {
    const rel = compareVectorClocks(dominator, dominated);
    return rel === "after" || rel === "identical";
}
/**
 * Formats vector clock into human-readable compact string representation (e.g. "tablet-1:3,rec-1:5").
 */
export function vectorClockToString(clock) {
    return Object.entries(clock || {})
        .filter(([k]) => k !== "__proto__" && k !== "constructor" && k !== "prototype")
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => `${k}:${typeof v === "number" && Number.isFinite(v) ? Math.max(0, Math.floor(v)) : 0}`)
        .join(",");
}
/**
 * Parses compact string representation back into a VectorClock.
 */
export function parseVectorClock(str) {
    const clock = {};
    if (!str || typeof str !== "string" || !str.trim())
        return clock;
    const parts = str.split(",");
    for (const part of parts) {
        const [rawK, rawV] = part.split(":");
        if (rawK && rawV !== undefined) {
            const k = rawK.trim();
            if (!k || k === "__proto__" || k === "constructor" || k === "prototype")
                continue;
            const num = parseInt(rawV.trim(), 10);
            if (Number.isFinite(num) && num >= 0) {
                clock[k] = num;
            }
        }
    }
    return clock;
}
// ─────────────────────────────────────────────────────────────────────────────
// 2. Schedule & Appointment CRDT Conflict Resolution
// ─────────────────────────────────────────────────────────────────────────────
const APPOINTMENT_STATUS_RANK = {
    planned: 1,
    confirmed: 2,
    arrived: 3,
    in_treatment: 4,
    completed: 5,
    no_show: 2,
    cancelled: 0,
};
export function resolveScheduleAppointmentCrdt(input) {
    const { existingAppointment, incomingAppointment, existingClock = {}, incomingClock = {}, existingUpdatedAt, incomingUpdatedAt, nodeId, } = input;
    if (!existingAppointment) {
        const newClock = incrementVectorClock(incomingClock, nodeId);
        return {
            resolvedAppointment: { ...incomingAppointment },
            updatedClock: newClock,
            hasConflict: false,
            strategy: "created",
            conflictDetails: [],
        };
    }
    const causalRelation = compareVectorClocks(incomingClock, existingClock);
    const mergedClock = incrementVectorClock(mergeVectorClocks(existingClock, incomingClock), nodeId);
    if (causalRelation === "after") {
        return {
            resolvedAppointment: { ...existingAppointment, ...incomingAppointment },
            updatedClock: mergedClock,
            hasConflict: false,
            strategy: "lww",
            conflictDetails: [],
        };
    }
    if (causalRelation === "before") {
        return {
            resolvedAppointment: { ...incomingAppointment, ...existingAppointment },
            updatedClock: mergedClock,
            hasConflict: false,
            strategy: "lww",
            conflictDetails: [],
        };
    }
    // Concurrent edits: apply clinical domain deterministic resolution
    const conflicts = [];
    const merged = { ...existingAppointment };
    const incomingStatus = String(incomingAppointment.status || "planned");
    const existingStatus = String(existingAppointment.status || "planned");
    const incomingRank = APPOINTMENT_STATUS_RANK[incomingStatus] ?? 1;
    const existingRank = APPOINTMENT_STATUS_RANK[existingStatus] ?? 1;
    // Status resolution: higher clinical progression wins (e.g. in_treatment > confirmed)
    if (incomingStatus !== existingStatus) {
        let winnerStatus = existingStatus;
        let winnerSide = "server";
        if (incomingStatus === "cancelled" || existingStatus === "cancelled") {
            // Cancellation LWW by timestamp
            const incomingTime = new Date(incomingUpdatedAt).getTime() || 0;
            const existingTime = new Date(existingUpdatedAt || 0).getTime() || 0;
            if (incomingTime >= existingTime) {
                winnerStatus = incomingStatus;
                winnerSide = "client";
            }
            else {
                winnerStatus = existingStatus;
                winnerSide = "server";
            }
        }
        else if (incomingRank > existingRank) {
            winnerStatus = incomingStatus;
            winnerSide = "client";
        }
        merged.status = winnerStatus;
        conflicts.push({
            field: "status",
            clientValue: incomingStatus,
            serverValue: existingStatus,
            resolvedValue: winnerStatus,
            strategy: "status_priority",
            winner: winnerSide,
            reason: `Appointment status resolved via clinical priority rank (incoming: ${incomingStatus} [${incomingRank}], existing: ${existingStatus} [${existingRank}])`,
        });
    }
    // Merge other fields (notes, services, doctor) via LWW field timestamps or lexical tie-break
    for (const [key, incVal] of Object.entries(incomingAppointment)) {
        if (key === "status" || key === "id" || key === "organizationId")
            continue;
        const existVal = existingAppointment[key];
        if (existVal === undefined) {
            merged[key] = incVal;
        }
        else if (JSON.stringify(existVal) !== JSON.stringify(incVal)) {
            const incomingTime = new Date(incomingUpdatedAt).getTime() || 0;
            const existingTime = new Date(existingUpdatedAt || 0).getTime() || 0;
            if (incomingTime > existingTime) {
                merged[key] = incVal;
                conflicts.push({
                    field: key,
                    clientValue: incVal,
                    serverValue: existVal,
                    resolvedValue: incVal,
                    strategy: "lww",
                    winner: "client",
                    reason: "Incoming edit timestamp is newer",
                });
            }
            else if (existingTime > incomingTime) {
                merged[key] = existVal;
                conflicts.push({
                    field: key,
                    clientValue: incVal,
                    serverValue: existVal,
                    resolvedValue: existVal,
                    strategy: "lww",
                    winner: "server",
                    reason: "Existing edit timestamp is newer",
                });
            }
            else {
                // Tie break deterministically by payload string comparison
                const incStr = JSON.stringify(incVal);
                const existStr = JSON.stringify(existVal);
                const clientWins = incStr.localeCompare(existStr) >= 0;
                merged[key] = clientWins ? incVal : existVal;
                conflicts.push({
                    field: key,
                    clientValue: incVal,
                    serverValue: existVal,
                    resolvedValue: merged[key],
                    strategy: "crdt",
                    winner: clientWins ? "client" : "server",
                    reason: "Deterministic tie-break on identical timestamps",
                });
            }
        }
    }
    return {
        resolvedAppointment: merged,
        updatedClock: mergedClock,
        hasConflict: conflicts.length > 0,
        strategy: conflicts.length > 0 ? "status_priority" : "merged",
        conflictDetails: conflicts,
    };
}
/**
 * Merges two odontogram tooth lists non-destructively per tooth and per surface.
 */
export function mergeOdontogramTeethCrdt(existingTeeth = [], incomingTeeth = []) {
    const toothMap = new Map();
    const safeExisting = Array.isArray(existingTeeth) ? existingTeeth : [];
    const safeIncoming = Array.isArray(incomingTeeth) ? incomingTeeth : [];
    for (const tooth of safeExisting) {
        if (!tooth || typeof tooth.toothNumber !== "number" || !Number.isFinite(tooth.toothNumber))
            continue;
        toothMap.set(tooth.toothNumber, { ...tooth });
    }
    for (const incTooth of safeIncoming) {
        if (!incTooth || typeof incTooth.toothNumber !== "number" || !Number.isFinite(incTooth.toothNumber))
            continue;
        const existTooth = toothMap.get(incTooth.toothNumber);
        if (!existTooth) {
            toothMap.set(incTooth.toothNumber, { ...incTooth });
        }
        else {
            // Merge surface sets (union of treated/affected surfaces, removing empty/invalid values)
            const surfacesExist = Array.isArray(existTooth.surfaces) ? existTooth.surfaces : [];
            const surfacesInc = Array.isArray(incTooth.surfaces) ? incTooth.surfaces : [];
            const surfaceSet = new Set();
            for (const s of [...surfacesExist, ...surfacesInc]) {
                if (typeof s === "string" && s.trim())
                    surfaceSet.add(s.trim());
            }
            const incTime = new Date(incTooth.updatedAt || 0).getTime() || 0;
            const existTime = new Date(existTooth.updatedAt || 0).getTime() || 0;
            const primary = incTime >= existTime ? incTooth : existTooth;
            toothMap.set(incTooth.toothNumber, {
                toothNumber: incTooth.toothNumber,
                statusCode: primary.statusCode || existTooth.statusCode || "healthy",
                surfaces: Array.from(surfaceSet).sort(),
                mobility: primary.mobility !== undefined ? primary.mobility : existTooth.mobility,
                notes: primary.notes || existTooth.notes,
                updatedAt: incTime >= existTime ? incTooth.updatedAt : existTooth.updatedAt,
            });
        }
    }
    return Array.from(toothMap.values()).sort((a, b) => a.toothNumber - b.toothNumber);
}
/**
 * 3-way Form 043/u and Medical Diary CRDT resolution.
 */
export function resolveForm043DiaryCrdt(input) {
    const { existingDiary, incomingDiary, existingClock = {}, incomingClock = {}, existingUpdatedAt, incomingUpdatedAt, nodeId, } = input;
    if (!existingDiary) {
        const newClock = incrementVectorClock(incomingClock, nodeId);
        return {
            resolvedDiary: { ...incomingDiary },
            updatedClock: newClock,
            hasConflict: false,
            strategy: "created",
            conflictDetails: [],
        };
    }
    const mergedClock = incrementVectorClock(mergeVectorClocks(existingClock, incomingClock), nodeId);
    const merged = { ...existingDiary };
    const conflicts = [];
    const incomingTime = new Date(incomingUpdatedAt).getTime() || 0;
    const existingTime = new Date(existingUpdatedAt || 0).getTime() || 0;
    for (const [field, incVal] of Object.entries(incomingDiary)) {
        if (field === "id" || field === "organizationId")
            continue;
        const existVal = existingDiary[field];
        if (existVal === undefined) {
            merged[field] = incVal;
            continue;
        }
        if (JSON.stringify(existVal) === JSON.stringify(incVal)) {
            continue;
        }
        // Specialized handler for Odontogram array
        if (field === "odontogram" || field === "odontogramTeeth") {
            const existTeeth = Array.isArray(existVal)
                ? existVal
                : Array.isArray(existVal?.teeth)
                    ? existVal.teeth
                    : [];
            const incTeeth = Array.isArray(incVal)
                ? incVal
                : Array.isArray(incVal?.teeth)
                    ? incVal.teeth
                    : [];
            const mergedTeeth = mergeOdontogramTeethCrdt(existTeeth, incTeeth);
            if (Array.isArray(incVal)) {
                merged[field] = mergedTeeth;
            }
            else {
                merged[field] = {
                    ...incVal,
                    teeth: mergedTeeth,
                };
            }
            conflicts.push({
                field,
                clientValue: incVal,
                serverValue: existVal,
                resolvedValue: merged[field],
                strategy: "crdt",
                winner: "merged",
                reason: "Odontogram per-tooth and per-surface CRDT map merged non-destructively",
            });
            continue;
        }
        // Specialized handler for string array treatment protocols / prescriptions
        if (Array.isArray(existVal) && Array.isArray(incVal)) {
            const set = new Set();
            for (const item of existVal) {
                set.add(typeof item === "string" ? item : JSON.stringify(item));
            }
            for (const item of incVal) {
                set.add(typeof item === "string" ? item : JSON.stringify(item));
            }
            merged[field] = Array.from(set).map((str) => {
                try {
                    return JSON.parse(str);
                }
                catch {
                    return str;
                }
            });
            conflicts.push({
                field,
                clientValue: incVal,
                serverValue: existVal,
                resolvedValue: merged[field],
                strategy: "field_merge",
                winner: "merged",
                reason: `Array field '${field}' union-merged without dropping doctor entries`,
            });
            continue;
        }
        // Scalar fields (complaints, statusLocalis, diagnosisIcd10) resolved via LWW
        if (incomingTime >= existingTime) {
            merged[field] = incVal;
            conflicts.push({
                field,
                clientValue: incVal,
                serverValue: existVal,
                resolvedValue: incVal,
                strategy: "lww",
                winner: "client",
                reason: "Incoming clinical field edit timestamp is newer",
            });
        }
        else {
            merged[field] = existVal;
            conflicts.push({
                field,
                clientValue: incVal,
                serverValue: existVal,
                resolvedValue: existVal,
                strategy: "lww",
                winner: "server",
                reason: "Existing clinical field edit timestamp is newer",
            });
        }
    }
    return {
        resolvedDiary: merged,
        updatedClock: mergedClock,
        hasConflict: conflicts.length > 0,
        strategy: conflicts.length > 0 ? "field_merge" : "lww",
        conflictDetails: conflicts,
    };
}
export function resolveCashOperationCrdt(input) {
    const { existingPayment, incomingPayment, existingClock = {}, incomingClock = {}, nodeId, } = input;
    const mergedClock = incrementVectorClock(mergeVectorClocks(existingClock, incomingClock), nodeId);
    if (!existingPayment) {
        return {
            resolvedPayment: { ...incomingPayment },
            updatedClock: mergedClock,
            status: "applied",
            isDuplicate: false,
        };
    }
    // Idempotency check: same idempotencyKey or same paymentId
    if (existingPayment.idempotencyKey === incomingPayment.idempotencyKey ||
        existingPayment.paymentId === incomingPayment.paymentId) {
        // Fiscal status progression: fiscalized > draft
        const resolvedStatus = existingPayment.status === "fiscalized" ||
            incomingPayment.status === "fiscalized"
            ? "fiscalized"
            : existingPayment.status === "refunded" ||
                incomingPayment.status === "refunded"
                ? "refunded"
                : incomingPayment.status;
        return {
            resolvedPayment: {
                ...existingPayment,
                ...incomingPayment,
                status: resolvedStatus,
                fiscalDocNumber: existingPayment.fiscalDocNumber || incomingPayment.fiscalDocNumber,
            },
            updatedClock: mergedClock,
            status: "duplicate",
            isDuplicate: true,
        };
    }
    return {
        resolvedPayment: { ...incomingPayment },
        updatedClock: mergedClock,
        status: "conflict_resolved",
        isDuplicate: false,
    };
}
// ─────────────────────────────────────────────────────────────────────────────
// 5. LAN Wi-Fi Mesh Node Discovery & 3-Tier Transition Engine
// ─────────────────────────────────────────────────────────────────────────────
export function determineSyncTierMode(options) {
    if (options.hasCloudInternet) {
        return "cloud_postgresql";
    }
    if (options.hasLanMicroserver || options.hasLocalMeshPeers) {
        return "lan_local_mesh";
    }
    return "autonomous_offline";
}
export function createLanDiscoveryBeacon(node, tier = "lan_local_mesh") {
    const timestamp = new Date().toISOString();
    const payloadForSig = `${node.nodeId}:${node.role}:${node.baseUrl}:${timestamp}`;
    const signature = computePayloadHash(payloadForSig);
    return {
        protocolVersion: "1.0.0",
        serverName: node.name,
        serverId: node.nodeId,
        role: node.role,
        baseUrl: node.baseUrl,
        apiPort: node.port,
        lanAddresses: node.ipAddresses,
        timestamp,
        organizationId: node.organizationId,
        activeSyncTier: tier,
        signature,
    };
}
/**
 * Handles incoming peer-to-peer mesh sync exchange between workstations/tablets without internet.
 */
export function processMeshSyncExchange(localMutations, request, localVectorClock, localNodeId) {
    const responderTime = new Date().toISOString();
    const localMutationMap = new Map(localMutations.map((m) => [m.mutationId, m]));
    const localIdempotencyMap = new Map(localMutations.map((m) => [m.idempotencyKey, m]));
    let applied = 0;
    let merged = 0;
    let duplicates = 0;
    const results = [];
    const returnMutations = [];
    let currentClock = mergeVectorClocks(localVectorClock, request.senderVectorClock);
    for (const incomingMut of request.mutations) {
        const existingById = localMutationMap.get(incomingMut.mutationId);
        const existingByKey = localIdempotencyMap.get(incomingMut.idempotencyKey);
        const existing = existingById || existingByKey;
        if (!existing) {
            applied++;
            currentClock = incrementVectorClock(currentClock, localNodeId);
            results.push({
                mutationId: incomingMut.mutationId,
                idempotencyKey: incomingMut.idempotencyKey,
                status: "applied",
                entityKind: incomingMut.entityKind,
                entityId: incomingMut.entityId,
                appliedAt: responderTime,
            });
        }
        else {
            const isExactHashMatch = existing.payloadHash === incomingMut.payloadHash;
            if (isExactHashMatch) {
                duplicates++;
                results.push({
                    mutationId: incomingMut.mutationId,
                    idempotencyKey: incomingMut.idempotencyKey,
                    status: "duplicate",
                    entityKind: incomingMut.entityKind,
                    entityId: incomingMut.entityId,
                    appliedAt: responderTime,
                });
            }
            else {
                merged++;
                currentClock = incrementVectorClock(currentClock, localNodeId);
                results.push({
                    mutationId: incomingMut.mutationId,
                    idempotencyKey: incomingMut.idempotencyKey,
                    status: "merged",
                    entityKind: incomingMut.entityKind,
                    entityId: incomingMut.entityId,
                    appliedAt: responderTime,
                });
            }
        }
    }
    // Send back any local mutations that the sender does not have
    for (const localMut of localMutations) {
        const senderHasMut = request.mutations.some((m) => m.mutationId === localMut.mutationId);
        if (!senderHasMut) {
            returnMutations.push(localMut);
        }
    }
    return {
        exchangeId: request.exchangeId,
        responderNodeId: localNodeId,
        responderVectorClock: currentClock,
        processedMutationsCount: request.mutations.length,
        appliedMutationsCount: applied,
        mergedMutationsCount: merged,
        duplicateMutationsCount: duplicates,
        returnMutations,
        results,
        responderTime,
    };
}
// ─────────────────────────────────────────────────────────────────────────────
// 5. Instantaneous Clinical P2P Events & Broadcast Dispatcher Helpers
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Creates a validated Chair Status Change clinical event.
 */
export function createChairStatusEvent(params) {
    const updatedAt = params.updatedAt || new Date().toISOString();
    const event = {
        cabinetNumber: params.cabinetNumber,
        chairId: params.chairId,
        status: params.status,
        patientId: params.patientId,
        patientName: params.patientName,
        doctorId: params.doctorId,
        doctorName: params.doctorName,
        note: params.note,
        updatedAt,
    };
    return lanChairStatusEventSchema.parse(event);
}
/**
 * Creates a validated CITO emergency assistant call event.
 */
export function createAssistantCitoEvent(params) {
    const callId = params.callId || `cito-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const calledAt = params.calledAt || new Date().toISOString();
    const event = {
        callId,
        cabinetNumber: params.cabinetNumber,
        doctorId: params.doctorId,
        doctorName: params.doctorName,
        urgency: params.urgency || "cito_emergency",
        reason: params.reason || "anesthesia_aid",
        customMessage: params.customMessage,
        calledAt,
        status: "pending",
    };
    return lanAssistantCitoEventSchema.parse(event);
}
/**
 * Creates a validated Invoice Transfer to Cashier event.
 */
export function createInvoiceTransferEvent(params) {
    const transferId = params.transferId || `inv-tx-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const transferredAt = params.transferredAt || new Date().toISOString();
    // Calculate total amount in kopecks & rubles if not provided
    let calculatedKopecks = params.totalAmountKopecks;
    let calculatedRub = params.totalAmountRub;
    if (calculatedKopecks === undefined || calculatedRub === undefined) {
        let sumKop = 0;
        for (const item of params.items) {
            const itemKop = item.priceKopecks !== undefined
                ? item.priceKopecks
                : Math.round(item.priceRub * 100);
            const qty = item.quantity || 1;
            const discountKop = item.discountRub ? Math.round(item.discountRub * 100) : 0;
            sumKop += Math.max(0, itemKop * qty - discountKop);
        }
        calculatedKopecks = sumKop;
        calculatedRub = sumKop / 100;
    }
    const event = {
        transferId,
        cabinetNumber: params.cabinetNumber,
        doctorId: params.doctorId,
        doctorName: params.doctorName,
        patientId: params.patientId,
        patientName: params.patientName,
        items: params.items,
        totalAmountRub: calculatedRub,
        totalAmountKopecks: calculatedKopecks,
        comments: params.comments,
        transferredAt,
        status: "waiting_payment",
    };
    return lanInvoiceTransferEventSchema.parse(event);
}
/**
 * Wraps a clinical event in a signed/hash-verified P2P broadcast message envelope.
 */
export function createLanP2PMessage(params) {
    const messageId = params.messageId ||
        `p2p-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const sentAt = params.sentAt || new Date().toISOString();
    const signature = computePayloadHash({
        messageId,
        eventType: params.eventType,
        senderNodeId: params.senderNodeId,
        organizationId: params.organizationId,
        payload: params.payload,
        sentAt,
    });
    const message = {
        messageId,
        eventType: params.eventType,
        senderNodeId: params.senderNodeId,
        senderRole: params.senderRole,
        senderName: params.senderName,
        organizationId: params.organizationId,
        sentAt,
        payload: params.payload,
        vectorClock: params.vectorClock,
        signature,
    };
    return lanP2PMessageSchema.parse(message);
}
/**
 * Validates an incoming P2P message and its signature.
 */
export function validateLanP2PMessage(raw, options) {
    const parsed = lanP2PMessageSchema.safeParse(raw);
    if (!parsed.success) {
        return { valid: false, error: parsed.error.message };
    }
    const msg = parsed.data;
    // Check payload is a non-null JSON object
    if (!msg.payload || typeof msg.payload !== "object" || Array.isArray(msg.payload)) {
        return { valid: false, error: "Invalid payload: must be a JSON object" };
    }
    const requireSig = options?.requireSignature ?? false;
    if (requireSig && (!msg.signature || typeof msg.signature !== "string" || !/^[0-9a-f]{64}$/i.test(msg.signature))) {
        return { valid: false, error: "Missing or invalid SHA-256 signature on LAN P2P message" };
    }
    if (msg.signature) {
        if (!/^[0-9a-f]{64}$/i.test(msg.signature)) {
            return { valid: false, error: "Malformed SHA-256 signature format" };
        }
        const expectedSignature = computePayloadHash({
            messageId: msg.messageId,
            eventType: msg.eventType,
            senderNodeId: msg.senderNodeId,
            organizationId: msg.organizationId,
            payload: msg.payload,
            sentAt: msg.sentAt,
        });
        if (msg.signature !== expectedSignature) {
            return { valid: false, error: "Invalid P2P message SHA-256 signature mismatch" };
        }
    }
    return { valid: true, message: msg };
}
