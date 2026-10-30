import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { test } from 'node:test';
import { Resend } from 'resend';
import { passwordResetDeliveryConfig } from '../src/config/password-reset-delivery.js';
import { createPasswordResetDelivery } from '../src/services/password-reset-delivery.js';
import { createPasswordReset } from '../src/services/patient/password-reset.service.js';

const source = { NODE_ENV: 'production', PASSWORD_RESET_DELIVERY: 'resend', RESEND_API_KEY: 're_' + randomBytes(24).toString('hex'), PASSWORD_RESET_FROM: 'reset@verified.test' };

test('official Resend SDK receives branded HTML/text with token only in the trusted reset link', async t => {
  const client = new Resend(source.RESEND_API_KEY);
  const sent: Parameters<typeof client.emails.send>[0][] = [];
  t.mock.method(client.emails, 'send', async (input: Parameters<typeof client.emails.send>[0]) => {
    sent.push(input); return { data: { id: 'mock-message' }, error: null };
  });
  const logs: unknown[][] = [];
  for (const level of ['log', 'warn', 'error'] as const) t.mock.method(console, level, (...args: unknown[]) => { logs.push(args); });
  const delivery = createPasswordResetDelivery(() => client, () => passwordResetDeliveryConfig(source), () => 'https://patients.verified.test');
  const token = randomBytes(32).toString('base64url');
  await delivery({ email: 'patient@example.invalid', token, expiresAt: new Date(Date.now() + 1800000) });
  assert.equal(sent.length, 1);
  const message = sent[0]!;
  assert.equal(message.from, 'SwasthyaSetu <reset@verified.test>');
  assert.deepEqual(message.to, ['patient@example.invalid']);
  assert.equal(message.subject, 'Reset your SwasthyaSetu password');
  const link = new URL(/https:\/\/[^\s]+/.exec(message.text!)![0]);
  assert.equal(link.origin, 'https://patients.verified.test');
  assert.equal(link.pathname, '/password-reset');
  assert.equal(link.search, '');
  assert.equal(new URLSearchParams(link.hash.slice(1)).get('token'), token);
  assert.ok(message.html!.includes(`href="${link.toString()}"`));
  assert.equal(message.text!.split(token).length - 1, 1);
  assert.equal(message.html!.split(token).length - 1, 1);
  assert.equal(JSON.stringify(message).includes(source.RESEND_API_KEY), false);
  assert.deepEqual(logs, []);
});

test('Resend returned errors and exceptions revoke the newly-created token without exposing secrets', async t => {
  const logs: unknown[][] = [];
  for (const level of ['log', 'warn', 'error'] as const) t.mock.method(console, level, (...args: unknown[]) => { logs.push(args); });
  for (const mode of ['error', 'throw'] as const) {
    const client = new Resend(source.RESEND_API_KEY);
    let sentToken = '';
    let revoked = '';
    let sendCount = 0;
    t.mock.method(client.emails, 'send', async (input: Parameters<typeof client.emails.send>[0]) => {
      sendCount++;
      sentToken = new URLSearchParams(new URL(/https:\/\/[^\s]+/.exec(input.text!)![0]).hash.slice(1)).get('token')!;
      const message = `${source.RESEND_API_KEY} ${sentToken} provider-private`;
      if (mode === 'throw') throw new Error(message);
      return { data: null, error: { message, name: 'validation_error' } };
    });
    const delivery = createPasswordResetDelivery(() => client, () => passwordResetDeliveryConfig(source), () => 'https://patients.verified.test');
    const service = createPasswordReset({
      async findResetUser(email) { return email === 'known@example.invalid' ? { id: 'user', email } : null; },
      async createResetToken() { return { id: 'new-record' }; },
      async revokeResetToken(id) { revoked = id; return { count: 1 }; },
      async consumeResetToken() { return false; },
    }, delivery, () => { passwordResetDeliveryConfig(source); });
    assert.equal(await service.request('known@example.invalid'), undefined);
    assert.equal(await service.request('unknown@example.invalid'), undefined);
    assert.equal(revoked, 'new-record');
    assert.equal(sendCount, 1);
    assert.equal(JSON.stringify(logs).includes(sentToken), false);
  }
  assert.deepEqual(logs, Array.from({ length: 2 }, () => [JSON.stringify({ event: 'password_reset_delivery_failed' })]));
  assert.equal(JSON.stringify(logs).includes(source.RESEND_API_KEY), false);
});

test('Resend configuration rejects missing credentials, placeholders and unsafe senders without echoing values', () => {
  for (const overrides of [
    { RESEND_API_KEY: '' }, { RESEND_API_KEY: 're_replace_with_your_api_key' },
    { PASSWORD_RESET_FROM: '' }, { PASSWORD_RESET_FROM: 'bad\r\nheader' },
    { PASSWORD_RESET_FROM: 'onboarding@resend.dev' }, { PASSWORD_RESET_FROM: 'reset@example.com' },
    { PASSWORD_RESET_DELIVERY: 'development-file' }, { PASSWORD_RESET_DELIVERY: 'unknown' },
  ]) assert.throws(() => passwordResetDeliveryConfig({ ...source, ...overrides }));
  assert.equal(passwordResetDeliveryConfig(source).mode, 'resend');
  assert.equal(passwordResetDeliveryConfig({ ...source, NODE_ENV: 'development', PASSWORD_RESET_FROM: 'onboarding@resend.dev' }).mode, 'resend');
  assert.throws(() => passwordResetDeliveryConfig({ ...source, NODE_ENV: 'test', PASSWORD_RESET_FROM: 'onboarding@resend.dev' }));
  assert.throws(() => passwordResetDeliveryConfig({ ...source, NODE_ENV: 'development', PASSWORD_RESET_FROM: 'other@resend.dev' }));
  assert.equal(passwordResetDeliveryConfig({ NODE_ENV: 'development', PASSWORD_RESET_DELIVERY: 'development-file' }).mode, 'development-file');
});
