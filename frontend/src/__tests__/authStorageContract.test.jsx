import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const axiosSource = fs.readFileSync(
  path.resolve(process.cwd(), 'src/lib/axios.js'),
  'utf8'
);
const authSource = fs.readFileSync(
  path.resolve(process.cwd(), 'src/store/auth.js'),
  'utf8'
);

describe('safe refresh storage contract', () => {
  it('keeps access tokens memory-only and preserves cached user at startup', () => {
    expect(authSource).toContain("safeRemove('accessToken')");
    expect(authSource).toContain("safeSet('user', JSON.stringify(user))");
    const registration = axiosSource.slice(
      axiosSource.indexOf('export function registerAuthStore'),
      axiosSource.indexOf('function getMemoryAccessToken')
    );
    expect(registration).not.toContain('removeLegacyAuthStorage()');
  });

  it('keeps cache after success but clears authentication after failure', () => {
    const successEnd = axiosSource.indexOf('catch (refreshErr)');
    const successStart = axiosSource.lastIndexOf('if (newToken)', successEnd);
    const successBlock = axiosSource.slice(successStart, successEnd);
    expect(successBlock).not.toContain('removeLegacyAuthStorage()');
    expect(axiosSource.slice(successEnd)).toContain(
      'removeLegacyAuthStorage()'
    );
    expect(axiosSource).toContain('_authStore.getState().logout()');
  });
});
