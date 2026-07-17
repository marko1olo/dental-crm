import assert from 'node:assert';
import { describe, test, mock, beforeEach, afterEach } from 'node:test';
import { runVisitFlow } from '../ai/visitFlowOrchestrator.js';
import * as visitDraft from '../ai/visitDraft.js';

describe('runVisitFlow Orchestrator', () => {
	let buildVisitDraftMock: any;
	
	beforeEach(() => {
		buildVisitDraftMock = mock.method(visitDraft, 'buildVisitDraftFromTranscript', async () => ({
			transcript: 'Тест',
			specialty: 'therapist',
			complaint: 'Боль',
			diagnosis: 'Кариес',
			completedServices: [],
			treatmentPlan: '',
			recommendations: '',
			warnings: [],
		}));
	});

	afterEach(() => {
		buildVisitDraftMock.mock.restore();
	});

	test('executes all steps correctly when enabled', async () => {
		const result = await runVisitFlow({
			patientId: '123',
			transcript: 'Тест',
			specialty: 'therapist',
			source: 'voice',
			orchestratorConfig: { enablePlan: true, enableRecommendations: true, enableDocuments: true },
		});
		
		assert.strictEqual(result.overallStatus, 'success');
		assert.strictEqual(result.draft.status, 'success');
		assert.strictEqual(result.plan.status, 'success');
		assert.strictEqual(result.recommendations.status, 'skipped'); // No services/plan texts = skipped
		assert.strictEqual(result.documents.status, 'success');
	});

	test('skips disabled steps based on orchestratorConfig', async () => {
		const result = await runVisitFlow({
			patientId: '123',
			transcript: 'Тест',
			specialty: 'therapist',
			source: 'voice',
			orchestratorConfig: { enablePlan: false, enableRecommendations: false, enableDocuments: false },
		});
		
		assert.strictEqual(result.plan.status, 'skipped');
		assert.strictEqual(result.recommendations.status, 'skipped');
		assert.strictEqual(result.documents.status, 'skipped');
		assert.strictEqual(result.overallStatus, 'success');
	});
});
