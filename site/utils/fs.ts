import fs from 'node:fs/promises';
import path from 'node:path';
import fse from 'fs-extra';

export async function resetDir(dir: string): Promise<void> {
  await fse.remove(dir);
  await fse.ensureDir(dir);
}

export async function writeFileEnsured(filePath: string, content: string): Promise<void> {
  await fse.ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, content);
}

export async function pathExists(filePath: string): Promise<boolean> {
  return fse.pathExists(filePath);
}
