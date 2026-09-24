import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const mode = process.argv[2];
if (mode !== "dev" && mode !== "start") {
  throw new Error("Expected dev or start");
}

const nextBin = join(root, "node_modules", "next", "dist", "bin", "next");
const pythonCandidates = process.platform === "win32"
  ? [join(root, ".venv", "Scripts", "python.exe"), "python"]
  : [join(root, ".venv", "bin", "python"), "python3"];
const python = process.env.NUMBEO_PYTHON || pythonCandidates.find(existsSync) || pythonCandidates.at(-1);
const workerScript = join(root, "legacy", "world-rent", "Parsing.py");

let site;
let worker;
let workerRestart;
let stopping = false;

function startWorker() {
  if (stopping) return;
  worker = spawn(python, [workerScript, "--worker"], {
    cwd: root,
    env: process.env,
    stdio: "inherit",
  });
  worker.on("error", (error) => {
    console.error(`Numbeo worker could not start: ${error.message}`);
  });
  worker.on("exit", (code) => {
    worker = undefined;
    if (!stopping) {
      console.error(`Numbeo worker exited (${code}); retrying in 60 seconds`);
      workerRestart = setTimeout(startWorker, 60_000);
    }
  });
}

function stop(signal = "SIGTERM") {
  if (stopping) return;
  stopping = true;
  if (workerRestart) clearTimeout(workerRestart);
  worker?.kill(signal);
  site?.kill(signal);
}

site = spawn(process.execPath, [nextBin, mode, ...process.argv.slice(3)], {
  cwd: root,
  env: process.env,
  stdio: "inherit",
});
site.on("error", (error) => {
  console.error(`Next.js could not start: ${error.message}`);
  stop();
  process.exitCode = 1;
});
site.on("exit", (code) => {
  stop();
  process.exitCode = code ?? 1;
});
process.on("SIGINT", () => stop("SIGINT"));
process.on("SIGTERM", () => stop("SIGTERM"));
startWorker();
