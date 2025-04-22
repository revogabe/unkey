import { exec } from "node:child_process";
import { spinner } from "@clack/prompts";

export async function task<T>(
  name: string,
  fn: (s: ReturnType<typeof spinner>) => Promise<T>,
): Promise<T> {
  const s = spinner();
  s.start(name);

  try {
    const res = await fn(s);
    return res;
  } catch (err) {
    s.stop((err as Error).message);
    process.exit(1);
    // just to make ts happy
    return undefined as T;
  }
}


export async function run(
  cmd: string,
  opts?: { cwd?: string; verbose?: boolean }
) {
  const cwd = opts?.cwd;
  const verbose = Boolean(opts?.verbose);

  if (verbose) { return console.log(`\n> ${cmd}`) }

  await new Promise<void>((resolve, reject) => {
    const p = exec(cmd, { cwd });

    if (p.stdout) {
      p.stdout.on("data", (chunk) => {
        if (verbose) { process.stdout.write(chunk); }
      });
    }
    if (p.stderr) {
      p.stderr.on("data", (chunk) => {
        if (verbose) { process.stderr.write(chunk); }
      });
    }

    p.on("exit", (code) => {
      if (code === 0) {
        resolve();
      } else {
        if (!verbose) {
          console.error(`Command failed with exit code ${code}`);
        }
        reject(new Error(`"${cmd}" exited with code ${code}`));
      }
    });
  });
}
