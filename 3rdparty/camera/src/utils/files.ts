import * as del from "del";
import * as fs from "fs";
import * as path from "path";
import { promisify } from "util";
import { JsonSerializable } from "../common/json";

export const readFileAsync = async (filePath: string): Promise<string> => {
  return new Promise(resolve => {
    fs.readFile(filePath, "utf8", (err, contents) => {
      resolve(contents);
    });
  });
};

const _writeFileAsync = promisify(fs.writeFile);
export const writeFileAsync = async (
  filePath: string,
  contents: string | Buffer,
): Promise<boolean> => {
  const c = typeof contents === "string" ? contents.trim() + "\n" : contents;
  await _writeFileAsync(filePath, c);
  return true;
};

export const readJsonAsync = async (filePath: string) => {
  const contents = await readFileAsync(filePath);
  return JSON.parse(contents);
};

export const writeJsonAsync = async (
  filePath: string,
  contents: JsonSerializable,
) => {
  await writeFileAsync(filePath, JSON.stringify(contents, null, 2));
};

export const listDirectory = promisify(fs.readdir);

export const stat = promisify(fs.stat);

export const deleteFile = promisify(fs.unlink);
export const deleteDir = async (p: string) => {
  await del(p);
};

export const getChronologicalFileList = async (
  dirPath: string,
): Promise<string[]> => {
  const files = await listDirectory(dirPath);

  const stats = [];

  // tslint:disable-next-line:prefer-for-of
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const s = await stat(`${dirPath}/${file}`);
    if (s.isFile()) {
      stats.push({
        name: file,
        ...s,
      });
    }
  }

  // sort in chronological order
  stats.sort((a, b) => {
    return a.mtimeMs > b.mtimeMs ? 1 : b.mtimeMs > a.mtimeMs ? -1 : 0;
  });

  return stats.map(s => s.name);
};

export const recursivelyListDir = async (dirPath: string) => {
  if (!fs.existsSync(dirPath)) {
    return [];
  }

  async function* walk(dir) {
    for await (const d of await fs.promises.opendir(dir)) {
      const entry = path.join(dir, d.name);
      if (d.isDirectory()) yield* walk(entry);
      else if (d.isFile()) yield entry;
    }
  }

  const r = [];
  for await (const p of walk(dirPath)) r.push(p);
  return r;
};
