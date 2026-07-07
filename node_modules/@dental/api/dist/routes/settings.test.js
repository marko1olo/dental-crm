import { test, describe, mock, afterEach, beforeEach } from 'node:test';
import assert from 'node:assert';
import { clinicProfileMutationRejection } from './settings.js';
describe('clinicProfileMutationRejection', () => {
    let mockReply;
    let sendMock;
    let codeMock;
    beforeEach(() => {
        sendMock = mock.fn();
        codeMock = mock.fn((code) => ({ send: sendMock }));
        mockReply = {
            code: codeMock
        };
    });
    afterEach(() => {
        mock.restoreAll();
    });
    test('returns 409 and clinic_time_zone_invalid when error message includes часовой пояс', () => {
        const error = new Error('Неправильный часовой пояс.');
        clinicProfileMutationRejection(mockReply, error);
        assert.strictEqual(codeMock.mock.calls[0]?.arguments[0], 409);
        assert.deepStrictEqual(sendMock.mock.calls[0]?.arguments[0], {
            error: "ClinicProfileMutationRejected",
            reason: "clinic_time_zone_invalid",
            message: "Профиль клиники не сохранен: выберите реальный часовой пояс клиники."
        });
    });
    test('returns 409 and active_schedule_conflict when error message includes активная запись', () => {
        const error = new Error('Есть активная запись.');
        clinicProfileMutationRejection(mockReply, error);
        assert.strictEqual(codeMock.mock.calls[0]?.arguments[0], 409);
        assert.deepStrictEqual(sendMock.mock.calls[0]?.arguments[0], {
            error: "ClinicProfileMutationRejected",
            reason: "active_schedule_conflict",
            message: "Профиль клиники не сохранен: активные записи должны оставаться в рабочем окне клиники."
        });
    });
    test('returns 409 and active_schedule_conflict when error message includes активные записи', () => {
        const error = new Error('Есть активные записи.');
        clinicProfileMutationRejection(mockReply, error);
        assert.strictEqual(codeMock.mock.calls[0]?.arguments[0], 409);
        assert.deepStrictEqual(sendMock.mock.calls[0]?.arguments[0], {
            error: "ClinicProfileMutationRejected",
            reason: "active_schedule_conflict",
            message: "Профиль клиники не сохранен: активные записи должны оставаться в рабочем окне клиники."
        });
    });
    test('returns 409 and clinic_profile_rejected for other errors', () => {
        const error = new Error('Неизвестная ошибка.');
        clinicProfileMutationRejection(mockReply, error);
        assert.strictEqual(codeMock.mock.calls[0]?.arguments[0], 409);
        assert.deepStrictEqual(sendMock.mock.calls[0]?.arguments[0], {
            error: "ClinicProfileMutationRejected",
            reason: "clinic_profile_rejected",
            message: "Профиль клиники не сохранен: проверьте профиль, расписание и активные записи клиники."
        });
    });
    test('handles non-Error objects gracefully', () => {
        const error = 'Just a string error';
        clinicProfileMutationRejection(mockReply, error);
        assert.strictEqual(codeMock.mock.calls[0]?.arguments[0], 409);
        assert.deepStrictEqual(sendMock.mock.calls[0]?.arguments[0], {
            error: "ClinicProfileMutationRejected",
            reason: "clinic_profile_rejected",
            message: "Профиль клиники не сохранен: проверьте профиль, расписание и активные записи клиники."
        });
    });
});
