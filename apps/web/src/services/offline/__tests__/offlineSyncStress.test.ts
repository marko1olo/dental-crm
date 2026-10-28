/**
 * DENTE CRM — Industrial Stress & Chaos Test Suite for Offline-First & Multi-Level Sync Engine
 *
 * All 32 stress tests decomposed into modular suites in ./offlineSyncStress/ (all <= 120 lines).
 */

import "./offlineSyncStress/stress01Throughput.test";
import "./offlineSyncStress/stress02DrainStorm.test";
import "./offlineSyncStress/stress03ChaosNetwork.test";
import "./offlineSyncStress/stress04MultiClientCrdt.test";
import "./offlineSyncStress/stress05LargeDraftAndPlural.test";
import "./offlineSyncStress/stress07OutageMutations.test";
import "./offlineSyncStress/stress08CrdtTieBreaker.test";
import "./offlineSyncStress/stress09VisitPersistence.test";
import "./offlineSyncStress/stress11WifiMeshReplication.test";
import "./offlineSyncStress/stress12ClockSkew.test";
import "./offlineSyncStress/stress13ExtremeSkewAndPlural.test";
import "./offlineSyncStress/stress15TwoChairsCrdt.test";
import "./offlineSyncStress/stress16SchemaMigration.test";
import "./offlineSyncStress/stress17ChairsStorm.test";
import "./offlineSyncStress/stress18CrashRecovery.test";
import "./offlineSyncStress/stress19LifecycleDrain.test";
import "./offlineSyncStress/stress20DedupHash.test";
import "./offlineSyncStress/stress21QuotaFallback.test";
import "./offlineSyncStress/stress22BatteryHeartbeat.test";
import "./offlineSyncStress/stress23DebouncedAutosave.test";
import "./offlineSyncStress/stress24NetworkRttQuality.test";
import "./offlineSyncStress/stress25TxRetryAndSchema.test";
import "./offlineSyncStress/stress27StorageEstimate.test";
import "./offlineSyncStress/stress28SlowDrainReassurance.test";
import "./offlineSyncStress/stress29FifoMeshDrops.test";
import "./offlineSyncStress/stress30PeerReplication.test";
import "./offlineSyncStress/stress31ThreeTierTransition.test";
import "./offlineSyncStress/stress32SplitBrainHealing.test";
