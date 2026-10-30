import { readFile, writeFile, rename, unlink, stat, mkdir, readdir, copyFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { NOTES_PATH, makeState, buildOutput } from './store-common.mjs';

export function createLocalStore({ root, backupDir }) {
  const notesFile = path.join(root, NOTES_PATH);
  const stagingDir = path.join(backupDir, '..', 'staging');

  async function state() {
    const raw = await readFile(notesFile, 'utf8');
    const info = await stat(notesFile);
    return makeState(raw, { updatedAt: info.mtime.toISOString() });
  }

  async function uploadMedia(media) {
    await mkdir(stagingDir, { recursive: true });
    const temporaryPath = path.join(stagingDir, media.id);
    await writeFile(temporaryPath, media.buffer, { flag: 'wx' });
    return { id: media.id, path: media.path, kind: media.kind, temporaryPath };
  }

  async function save(payload, media) {
    const raw = await readFile(notesFile, 'utf8');
    const output = buildOutput(raw, payload);
    for (const item of media) {
      const destination = path.join(root, item.path);
      await mkdir(path.dirname(destination), { recursive: true });
      await copyFile(item.temporaryPath, destination, constants.COPYFILE_EXCL);
    }

    await mkdir(backupDir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    await writeFile(path.join(backupDir, `${stamp}-${randomUUID().slice(0, 8)}.md`), raw, 'utf8');
    const backups = (await readdir(backupDir)).filter((file) => file.endsWith('.md')).sort();
    while (backups.length > 10) await unlink(path.join(backupDir, backups.shift()));

    const info = await stat(notesFile);
    const temporary = `${notesFile}.${process.pid}.${randomUUID()}.tmp`;
    try {
      await writeFile(temporary, output, { encoding: 'utf8', mode: info.mode, flag: 'wx' });
      await rename(temporary, notesFile);
    } finally {
      await unlink(temporary).catch(() => {});
    }
    await Promise.all(media.map((item) => unlink(item.temporaryPath).catch(() => {})));
    return { ...await state(), publication: { mode: 'local' } };
  }

  return { state, save, uploadMedia };
}
