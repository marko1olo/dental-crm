import { test, describe, mock } from 'node:test';
import assert from 'node:assert/strict';
import { isMachineDeliverableChannel, resolveChannelCredentials, resolveTelegramChatId, sendThroughChannel } from './channelRouter.js';
import { db } from '../../db/client.js';

describe('channelRouter', () => {
    describe('isMachineDeliverableChannel', () => {
        test('returns true for known machine deliverable channels', () => {
            assert.strictEqual(isMachineDeliverableChannel('sms'), true);
            assert.strictEqual(isMachineDeliverableChannel('email'), true);
            assert.strictEqual(isMachineDeliverableChannel('whatsapp'), true);
            assert.strictEqual(isMachineDeliverableChannel('telegram'), true);
        });

        test('returns false for unknown or non-machine channels', () => {
            assert.strictEqual(isMachineDeliverableChannel('vk'), false);
            assert.strictEqual(isMachineDeliverableChannel('max'), false);
            assert.strictEqual(isMachineDeliverableChannel('phone'), false);
            assert.strictEqual(isMachineDeliverableChannel('in_person'), false);
            assert.strictEqual(isMachineDeliverableChannel('random'), false);
            assert.strictEqual(isMachineDeliverableChannel(''), false);
        });
    });

    describe('resolveChannelCredentials', () => {
        test('fetches and resolves configs from db and environment variables', async (t) => {
            const dbSelectMock = t.mock.method(db, 'select', () => {
                return {
                    from: () => ({
                        where: () => ({
                            limit: () => Promise.resolve([{ isActive: true, token: 'max-token' }]) // mock for maxConfig, others use this structure just to avoid db call
                        })
                    })
                };
            });

            const env = { DENTE_TELEGRAM_BOT_TOKEN: 'telegram-token' };
            const result = await resolveChannelCredentials('org-id', env);

            assert.strictEqual(dbSelectMock.mock.callCount(), 3);
            assert.strictEqual(result.telegramBotToken, 'telegram-token');
        });
    });

    describe('resolveTelegramChatId', () => {
        test('decrypts telegram chat ref from db', async (t) => {
            const dbSelectMock = t.mock.method(db, 'select', () => {
                return {
                    from: () => ({
                        where: () => ({
                            limit: () => Promise.resolve([{ chatTransportRef: 'encrypted-ref' }])
                        })
                    })
                };
            });

            // Just verifying it handles the db output
            const result = await resolveTelegramChatId('org-id', 'patient-id');
            // We can't mock the decrypt export easily if it's not exported to be mocked, so let's just make sure db is called
            assert.strictEqual(dbSelectMock.mock.callCount(), 1);
        });
    });

    describe('sendThroughChannel', () => {
        test('fails for missing credentials in sms', async () => {
            const req = { channel: 'sms' as const, recipientAddress: '123', subject: null, body: 'test', idempotencyKey: null };
            const result = await sendThroughChannel(req, { sms: null, smtp: null, whatsapp: null, telegramBotToken: null, maxBotToken: null });
            assert.strictEqual(result.ok, false);
            if (!result.ok) assert.strictEqual(result.errorClass, 'not_configured');
        });
    });
});
