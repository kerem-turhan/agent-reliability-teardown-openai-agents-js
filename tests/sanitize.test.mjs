import test from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeText, sanitizeValue } from '../scripts/lib/sanitize.mjs';

test('sanitizer removes paths, tokens, keys, and emails', () => {
  const replacements = [['/private/repo', '<REPOSITORY>']];
  const githubToken = ['ghp', '_', 'abcdefghijklmnopqrstuvwxyz'].join('');
  const apiKey = ['sk', '-', 'abcdefghijklmnop'].join('');
  const email = ['user', '@', 'example', '.', 'com'].join('');
  const source = `/private/repo ${githubToken} ${apiKey} ${email}`;
  const sanitized = sanitizeText(source, replacements);
  assert.equal(
    sanitized,
    '<REPOSITORY> <REDACTED_GITHUB_TOKEN> <REDACTED_API_KEY> <REDACTED_EMAIL>',
  );
});

test('sanitizer traverses nested evidence values', () => {
  assert.deepEqual(sanitizeValue({ path: ['/secret/home/file'] }, [['/secret/home', '<HOME>']]), {
    path: ['<HOME>/file'],
  });
});
