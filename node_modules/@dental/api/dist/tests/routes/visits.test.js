import { test, describe, afterEach, beforeEach, mock } from 'node:test';
import assert from 'node:assert';
import Fastify from 'fastify';
import { registerVisitRoutes } from '../../routes/visits.js';
describe('visits routes integration', () => {
    let app;
    const originalEnv = process.env;
    beforeEach(async () => {
        app = Fastify();
        await registerVisitRoutes(app);
        process.env = { ...originalEnv };
    });
    afterEach(() => {
        app.close();
        process.env = originalEnv;
        mock.restoreAll();
    });
    const visitId = '123e4567-e89b-12d3-a456-426614174000';
    const validPayload = {
        patientId: '123e4567-e89b-12d3-a456-426614174001',
        selectedSpecialty: 'therapist',
        text: 'hello',
        draft: {
            complaint: 'test',
            anamnesis: null,
            objectiveStatus: null,
            examination: null,
            diagnosis: null,
            treatment: null,
            treatmentPlan: null,
            recommendations: null,
            warnings: []
        }
    };
    test('PUT /api/visits/:visitId/draft/autosave handles "Визит не найден"', async () => {
        process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_MUTATIONS = '1';
        process.env.DENTAL_MOCK_UPSERT_VISIT_DRAFT_AUTOSAVE_ERROR = "Визит не найден";
        const response = await app.inject({
            method: 'PUT',
            url: `/api/visits/${visitId}/draft/autosave`,
            payload: validPayload
        });
        assert.strictEqual(response.statusCode, 404);
        const body = JSON.parse(response.body);
        assert.strictEqual(body.error, 'VisitNotFound');
        assert.strictEqual(body.reason, 'visit_not_found');
        assert.strictEqual(body.message, 'Прием не найден. Обновите рабочий экран и выберите актуальный прием.');
    });
    test('PUT /api/visits/:visitId/draft/autosave handles "Прием уже закрыт или аннулирован"', async () => {
        process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_MUTATIONS = '1';
        process.env.DENTAL_MOCK_UPSERT_VISIT_DRAFT_AUTOSAVE_ERROR = "Прием уже закрыт или аннулирован";
        const response = await app.inject({
            method: 'PUT',
            url: `/api/visits/${visitId}/draft/autosave`,
            payload: validPayload
        });
        assert.strictEqual(response.statusCode, 409);
        const body = JSON.parse(response.body);
        assert.strictEqual(body.error, 'VisitDraftMutationRejected');
        assert.strictEqual(body.reason, 'visit_closed');
        assert.strictEqual(body.message, 'Черновик приема не сохранен: этот прием уже недоступен для изменений.');
    });
    test('POST /api/visits/:visitId/draft/accept handles "Прием уже закрыт или аннулирован"', async () => {
        process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_MUTATIONS = '1';
        process.env.DENTAL_MOCK_ACCEPT_VISIT_DRAFT_ERROR = "Прием уже закрыт или аннулирован";
        const response = await app.inject({
            method: 'POST',
            url: `/api/visits/${visitId}/draft/accept`,
            payload: { ...validPayload, savedByUserId: '123e4567-e89b-12d3-a456-426614174002' }
        });
        assert.strictEqual(response.statusCode, 409);
        const body = JSON.parse(response.body);
        assert.strictEqual(body.error, 'VisitDraftMutationRejected');
        assert.strictEqual(body.reason, 'visit_closed');
        assert.strictEqual(body.message, 'Черновик приема не принят: этот прием уже недоступен для изменений.');
    });
    test('PUT /api/visits/:visitId/draft/autosave handles generic errors', async () => {
        process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_MUTATIONS = '1';
        process.env.DENTAL_MOCK_UPSERT_VISIT_DRAFT_AUTOSAVE_ERROR = "Some unknown error";
        const response = await app.inject({
            method: 'PUT',
            url: `/api/visits/${visitId}/draft/autosave`,
            payload: validPayload
        });
        assert.strictEqual(response.statusCode, 409);
        const body = JSON.parse(response.body);
        assert.strictEqual(body.error, 'VisitDraftMutationRejected');
        assert.strictEqual(body.reason, 'visit_draft_rejected');
        assert.strictEqual(body.message, 'Черновик приема не изменен: обновите прием и повторите действие.');
    });
});
