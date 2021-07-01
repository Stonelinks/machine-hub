import * as fs from "fs";
import { promisify } from "util";
import { JsonSerializable } from "../common/json";

export const readFileAsync = async (path: string): Promise<string> => {
  return new Promise(resolve => {
    fs.readFile(path, "utf8", (err, contents) => {
      resolve(contents);
    });
  });
};

const _writeFileAsync = promisify(fs.writeFile);
export const writeFileAsync = async (
  path: string,
  contents: string | Buffer,
): Promise<boolean> => {
  const c = typeof contents === "string" ? contents.trim() + "\n" : contents;
  await _writeFileAsync(path, c);
  return true;
};

export const readJsonAsync = async (path: string) => {
  const contents = await readFileAsync(path);
  return JSON.parse(contents);
};

export const writeJsonAsync = async (
  path: string,
  contents: JsonSerializable,
) => {
  await writeFileAsync(path, JSON.stringify(contents, null, 2));
};

export const listDirectory = promisify(fs.readdir);

export const stat = promisify(fs.stat);

export const deleteFile = promisify(fs.unlink);

export const getChronologicalFileList = async (
  path: string,
): Promise<string[]> => {
  const files = await listDirectory(`${path}`);

  const stats = [];

  // tslint:disable-next-line:prefer-for-of
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const s = await stat(`${path}/${file}`);
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
