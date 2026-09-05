const fs = require('node:fs');
const path = require('node:path');
const repository = require('../../src/modules/uploads/repository');

const read = (relativePath) =>
  fs.readFileSync(path.resolve(__dirname, '../..', relativePath), 'utf8');

describe('avatar upload persistence contract', () => {
  it('exports metadata operations used by upload routes', () => {
    expect(repository.saveImageMetadata).toEqual(expect.any(Function));
    expect(repository.findImageByFileName).toEqual(expect.any(Function));
    expect(repository.deleteImageMetadata).toEqual(expect.any(Function));
  });

  it('guards avatar metadata persistence', () => {
    const source = read('src/modules/uploads/routes.js');
    const avatarRoute = source.indexOf("'/avatar'");
    const tryStart = source.indexOf('      try {', avatarRoute);
    const metadataCall = source.indexOf(
      'await repo.saveImageMetadata(',
      tryStart
    );
    const catchStart = source.indexOf('      } catch (err) {', tryStart);
    expect(avatarRoute).toBeGreaterThan(-1);
    expect(tryStart).toBeGreaterThan(avatarRoute);
    expect(metadataCall).toBeGreaterThan(tryStart);
    expect(catchStart).toBeGreaterThan(metadataCall);
    expect(source.match(/await repo\.saveImageMetadata\(/g)).toHaveLength(1);
  });
});
