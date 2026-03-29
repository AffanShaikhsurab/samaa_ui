import { tool } from "ai";
import { z } from "zod";
import { Sandbox } from "e2b";
import { log } from "./log";
import { getE2BPreviewUrl } from "./e2b-provider";

export const FLUTTER_WORKDIR = "/home/user";

type E2BVMSession = Sandbox & {
  __vmId?: string;
};

const FLUTTER_PATH = "/home/user/flutter";

const shellQuote = (value: string): string => `'${value.replace(/'/g, `'\\''`)}'`;

const normalizeRelativePath = (rawPath: string): string | null => {
  const value = rawPath.trim();
  if (!value || value.includes("\0")) return null;
  const normalized = value.replace(/^\.\//, "");
  const segments = normalized.split("/");
  if (segments.some((s) => s === "..")) return null;
  return normalized || ".";
};

const flutterEnvPrefix = `export PATH="${FLUTTER_PATH}/bin:$PATH" && export FLUTTER_ROOT="${FLUTTER_PATH}" && `;

type ExecResult = {
  ok: boolean;
  stdout: string;
  stderr: string;
  exitCode: number | null;
  command: string;
};

const exec = async (sandbox: E2BVMSession, command: string, timeout = 120): Promise<ExecResult> => {
  const result = await sandbox.commands.run(command, { cwd: FLUTTER_WORKDIR, timeoutMs: timeout * 1000 });
  return {
    ok: result.exitCode === 0,
    stdout: result.stdout,
    stderr: result.stderr,
    exitCode: result.exitCode ?? null,
    command,
  };
};

export const createE2BFlutterTools = (sandbox: E2BVMSession) => {
  log.tool("init", "creating E2B Flutter tools", { vmId: sandbox.__vmId });

  const bashTool = tool({
    description: "Run a shell command inside the E2B Flutter sandbox.",
    inputSchema: z.object({
      command: z.string().min(1).describe("Shell command to execute."),
      timeout: z.number().optional().default(120).describe("Timeout in seconds."),
    }),
    execute: async ({ command, timeout }) => {
      const truncated = command.length > 100 ? command.slice(0, 100) + "…" : command;
      log.tool("bash", `executing: ${truncated}`, { timeout });
      const result = await exec(sandbox, command, timeout);
      log.tool("bash", result.ok ? "✓" : `✗ exit=${result.exitCode}`, {
        stdoutLen: result.stdout.length,
        stderrLen: result.stderr.length,
      });
      return result;
    },
  });

  const readFileTool = tool({
    description: "Read the content of a file in the sandbox.",
    inputSchema: z.object({
      file: z.string().min(1).describe("File path (absolute or relative to /home/user)."),
    }),
    execute: async ({ file }) => {
      const safe = normalizeRelativePath(file) ?? file;
      const filePath = safe.startsWith("/") ? safe : `${FLUTTER_WORKDIR}/${safe}`;
      log.tool("readFile", `reading: ${filePath}`);
      try {
        const content = await sandbox.files.read(filePath);
        log.tool("readFile", `✓ ${filePath} (${content.length} chars)`);
        return { content };
      } catch (e) {
        log.toolError("readFile", `✗ ${filePath}`, {
          error: e instanceof Error ? e.message : String(e),
        });
        return { content: null };
      }
    },
  });

  const writeFileTool = tool({
    description: "Write content to a file in the sandbox. Creates parent directories automatically.",
    inputSchema: z.object({
      file: z.string().min(1).describe("Absolute path or path under /home/user."),
      content: z.string().describe("Full file content to write."),
    }),
    execute: async ({ file, content }) => {
      const safe = normalizeRelativePath(file) ?? file;
      const filePath = safe.startsWith("/") ? safe : `${FLUTTER_WORKDIR}/${safe}`;
      const parentDir = filePath.split("/").slice(0, -1).join("/");
      log.tool("writeFile", `writing: ${filePath} (${content.length} chars)`);
      try {
        if (parentDir) {
          const mkdirResult = await exec(sandbox, `mkdir -p ${shellQuote(parentDir)}`);
          if (!mkdirResult.ok) {
            log.toolWarn("writeFile", `mkdir failed for ${parentDir}`, { stderr: mkdirResult.stderr });
          }
        }
        await sandbox.files.write(filePath, content);
        log.tool("writeFile", `✓ ${filePath}`);
        return { ok: true, file: filePath };
      } catch (e) {
        log.toolError("writeFile", `✗ ${filePath}`, {
          error: e instanceof Error ? e.message : String(e),
        });
        return { ok: false, error: e instanceof Error ? e.message : String(e) };
      }
    },
  });

  const listFilesTool = tool({
    description: "List files/directories at a given path in the sandbox.",
    inputSchema: z.object({
      path: z.string().default(".").describe("Path to list."),
      recursive: z.boolean().default(false),
    }),
    execute: async ({ path, recursive }) => {
      const p = path.startsWith("/") ? path : `${FLUTTER_WORKDIR}/${path}`;
      log.tool("listFiles", `listing: ${p}`, { recursive });
      const cmd = recursive ? `find ${shellQuote(p)} -maxdepth 6 -print` : `ls -la ${shellQuote(p)}`;
      const result = await exec(sandbox, cmd);
      log.tool("listFiles", result.ok ? "✓" : "✗", { entries: result.stdout.split("\n").length });
      return result;
    },
  });

  const replaceInFileTool = tool({
    description: "Replace text inside a file without needing bash.",
    inputSchema: z.object({
      file: z.string().min(1),
      search: z.string().describe("Exact text to find."),
      replace: z.string().describe("Replacement text."),
      all: z.boolean().default(true),
    }),
    execute: async ({ file, search, replace, all }) => {
      const safe = normalizeRelativePath(file) ?? file;
      const filePath = safe.startsWith("/") ? safe : `${FLUTTER_WORKDIR}/${safe}`;
      log.tool("replaceInFile", `editing: ${filePath}`, { searchLen: search.length, replaceLen: replace.length, all });
      try {
        const content = await sandbox.files.read(filePath);
        if (!content.includes(search)) {
          log.tool("replaceInFile", `✗ no matches in ${filePath}`);
          return { ok: false, error: "No matches found.", replacements: 0 };
        }
        const next = all ? content.split(search).join(replace) : content.replace(search, replace);
        const count = all ? content.split(search).length - 1 : 1;
        await sandbox.files.write(filePath, next);
        log.tool("replaceInFile", `✓ ${filePath} (${count} replacement(s))`);
        return { ok: true, file: filePath, replacements: count };
      } catch (e) {
        log.toolError("replaceInFile", `✗ ${filePath}`, {
          error: e instanceof Error ? e.message : String(e),
        });
        return { ok: false, error: e instanceof Error ? e.message : String(e) };
      }
    },
  });

  const flutterDoctorTool = tool({
    description: "Check Flutter environment. Use to diagnose setup issues.",
    inputSchema: z.object({}),
    execute: async () => {
      log.tool("flutterDoctor", "running flutter doctor -v…");
      const result = await exec(sandbox, `${flutterEnvPrefix}flutter doctor -v`, 60);
      log.tool("flutterDoctor", result.ok ? "✓" : "✗", { outputLen: result.stdout.length });
      return result;
    },
  });

  const flutterCreateProjectTool = tool({
    description: "Create a new Flutter project. Call this first before writing any files.",
    inputSchema: z.object({
      name: z.string().min(1).describe("Snake_case project name, e.g. my_todo_app."),
      org: z.string().optional().default("com.samaa").describe("Org identifier."),
    }),
    execute: async ({ name, org }) => {
      log.tool("flutterCreate", `creating project: ${name}`, { org: org ?? "com.samaa" });
      const cmd = `${flutterEnvPrefix}flutter create --org ${shellQuote(org ?? "com.samaa")} --platforms web ${shellQuote(name)}`;
      const result = await sandbox.commands.run(cmd, { cwd: FLUTTER_WORKDIR, timeoutMs: 300_000 });
      log.tool("flutterCreate", result.exitCode === 0 ? `✓ ${name}` : `✗ ${name}`, {
        exitCode: result.exitCode,
        stderrLen: result.stderr.length,
      });
      return { ok: result.exitCode === 0, stdout: result.stdout, stderr: result.stderr, exitCode: result.exitCode ?? null };
    },
  });

  const flutterPubGetTool = tool({
    description: "Run `flutter pub get` to install or refresh dependencies after editing pubspec.yaml.",
    inputSchema: z.object({
      projectDir: z.string().describe("Project directory name or absolute path."),
    }),
    execute: async ({ projectDir }) => {
      const dir = projectDir.startsWith("/") ? projectDir : `${FLUTTER_WORKDIR}/${projectDir}`;
      log.tool("flutterPubGet", `installing deps in ${dir}…`);
      const cmd = `${flutterEnvPrefix}flutter pub get`;
      const result = await sandbox.commands.run(cmd, { cwd: dir, timeoutMs: 180_000 });
      log.tool("flutterPubGet", result.exitCode === 0 ? "✓" : "✗", {
        exitCode: result.exitCode,
        stderr: result.stderr.slice(0, 300),
      });
      return { ok: result.exitCode === 0, stdout: result.stdout, stderr: result.stderr, exitCode: result.exitCode ?? null };
    },
  });

  const flutterBuildWebTool = tool({
    description: "Build the Flutter web app for release. Returns build logs.",
    inputSchema: z.object({
      projectDir: z.string().describe("Project directory name or absolute path."),
    }),
    execute: async ({ projectDir }) => {
      const dir = projectDir.startsWith("/") ? projectDir : `${FLUTTER_WORKDIR}/${projectDir}`;
      log.tool("flutterBuildWeb", `building web release in ${dir}…`);
      const t0 = Date.now();
      const cmd = `${flutterEnvPrefix}flutter build web --release`;
      const result = await sandbox.commands.run(cmd, { cwd: dir, timeoutMs: 900_000 });
      const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
      log.tool("flutterBuildWeb", result.exitCode === 0 ? `✓ (${elapsed}s)` : `✗ (${elapsed}s)`, {
        exitCode: result.exitCode,
        stdoutTail: result.stdout.slice(-200),
        stderrHead: result.stderr.slice(0, 500),
      });
      return { ok: result.exitCode === 0, stdout: result.stdout, stderr: result.stderr, exitCode: result.exitCode ?? null };
    },
  });

  const flutterServeWebTool = tool({
    description: "Serve the built Flutter web app and return the public preview URL.",
    inputSchema: z.object({
      projectDir: z.string().describe("Project directory name or absolute path."),
      port: z.number().default(3000).describe("Port to serve on (default 3000)."),
    }),
    execute: async ({ projectDir, port = 3000 }) => {
      const dir = projectDir.startsWith("/") ? projectDir : `${FLUTTER_WORKDIR}/${projectDir}`;
      const buildPath = `${dir}/build/web`;

      log.tool("flutterServeWeb", `serving ${buildPath} on port ${port}…`);

      await sandbox.commands.run(`pkill -f "http.server ${port}" || true`, { timeoutMs: 10_000 });
      const serveResult = await sandbox.commands.run(
        `nohup python3 -m http.server ${port} --bind 0.0.0.0 --directory ${shellQuote(buildPath)} > /tmp/flutter-preview.log 2>&1 &`,
        { timeoutMs: 30_000 }
      );

      log.tool("flutterServeWeb", "running health check…");
      let healthOk = false;
      for (let i = 0; i < 10; i++) {
        const check = await sandbox.commands.run(`curl -fsS http://127.0.0.1:${port}`, { timeoutMs: 10_000 });
        if (check.exitCode === 0) {
          healthOk = true;
          break;
        }
        await new Promise(r => setTimeout(r, 2000));
      }

      if (!healthOk) {
        const logContent = await sandbox.commands.run("cat /tmp/flutter-preview.log", { timeoutMs: 10_000 });
        log.toolError("flutterServeWeb", "health check failed", { error: logContent.stderr || logContent.stdout });
        return { ok: false, error: "Preview server failed to start." };
      }

      const previewInfo = getE2BPreviewUrl(sandbox, port);
      if (previewInfo) {
        log.tool("flutterServeWeb", `✓ preview ready: ${previewInfo.url}`);
        return { ok: true, previewUrl: previewInfo.url };
      } else {
        log.toolError("flutterServeWeb", "failed to get preview URL");
        return { ok: false, error: "Failed to get preview URL from E2B sandbox." };
      }
    },
  });

  log.tool("init", "all 10 E2B Flutter tools ready");

  return {
    bash: bashTool,
    readFile: readFileTool,
    writeFile: writeFileTool,
    listFiles: listFilesTool,
    replaceInFile: replaceInFileTool,
    flutterDoctor: flutterDoctorTool,
    flutterCreate: flutterCreateProjectTool,
    flutterPubGet: flutterPubGetTool,
    flutterBuildWeb: flutterBuildWebTool,
    flutterServeWeb: flutterServeWebTool,
  };
};

export type E2BFlutterTools = ReturnType<typeof createE2BFlutterTools>;