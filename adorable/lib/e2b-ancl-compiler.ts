/**
 * E2B ANCL Compiler
 *
 * Compiles ANCL source code → Flutter code entirely inside an E2B sandbox.
 *
 * Strategy:
 *   1. Spin up the existing `flutter-web-base-v1` E2B template (Flutter pre-installed)
 *   2. Activate the `quickapp` CLI via `dart pub global activate quickapp`
 *   3. Write the ANCL source to `/home/user/app.ancl`
 *   4. Run `quickapp build app.ancl -o output/`
 *   5. Read back `output/lib/main.dart`
 *   6. Kill the sandbox and return the Flutter code
 *
 * The sandbox is ephemeral — created and destroyed per compilation.
 * The E2B_API_KEY env var must be set.
 */

import { Sandbox } from "e2b";
import { log } from "./log";

/** Name of the E2B Flutter template that has Flutter + Dart pre-installed. */
const FLUTTER_E2B_TEMPLATE = "flutter-web-base-v1";

/** Path where Flutter binary lives inside the template. */
const FLUTTER_BIN = "/home/user/flutter/bin";

/** Shell prefix that ensures Flutter + Dart + pub-cache globals are on PATH. */
const ENV_PREFIX =
  `export PATH="${FLUTTER_BIN}:$PATH" && ` +
  `export FLUTTER_ROOT="/home/user/flutter" && ` +
  `export PUB_CACHE="/root/.pub-cache" && ` +
  `export PATH="$PATH:/root/.pub-cache/bin" && `;

const WORK_DIR = "/home/user";
const ANCL_FILE = `${WORK_DIR}/app.ancl`;
const OUTPUT_DIR = `${WORK_DIR}/output`;
const MAIN_DART = `${OUTPUT_DIR}/lib/main.dart`;

/** Timeout for activating the quickapp CLI (first run downloads the package). */
const ACTIVATE_TIMEOUT_MS = 3 * 60_000;

/** Timeout for the quickapp build step. */
const BUILD_TIMEOUT_MS = 2 * 60_000;

/** Total sandbox lifetime — generous to handle cold starts. */
const SANDBOX_TIMEOUT_MS = 8 * 60_000;

export interface AnclCompileResult {
  success: boolean;
  flutterCode: string;
  error?: string;
  /** Raw stdout/stderr from the build step for diagnostics. */
  buildLogs?: string;
}

/**
 * Run ANCL → Flutter compilation inside a fresh E2B sandbox.
 *
 * @param anclCode  Full ANCL source string to compile.
 * @param onLog     Optional callback for streaming log lines to the caller.
 */
export async function compileAnclInE2B(
  anclCode: string,
  onLog?: (line: string) => void,
): Promise<AnclCompileResult> {
  const emit = (line: string) => {
    log.sandbox(`[ancl-compiler] ${line}`);
    onLog?.(line);
  };

  emit("Creating E2B sandbox…");
  const sandbox = await Sandbox.create(FLUTTER_E2B_TEMPLATE, {
    timeoutMs: SANDBOX_TIMEOUT_MS,
  });

  emit(`Sandbox ready: ${sandbox.sandboxId}`);

  try {
    // ------------------------------------------------------------------
    // Step 1: Activate quickapp CLI
    // ------------------------------------------------------------------
    emit("Installing quickapp CLI (dart pub global activate quickapp)…");
    const activateResult = await sandbox.commands.run(
      `${ENV_PREFIX}dart pub global activate quickapp`,
      { cwd: WORK_DIR, timeoutMs: ACTIVATE_TIMEOUT_MS },
    );

    if (activateResult.exitCode !== 0) {
      const err = activateResult.stderr || activateResult.stdout || "dart pub global activate failed";
      emit(`quickapp activation failed: ${err.slice(0, 400)}`);
      return { success: false, flutterCode: "", error: `quickapp activation failed: ${err}` };
    }
    emit("quickapp CLI activated ✓");

    // ------------------------------------------------------------------
    // Step 2: Write the ANCL source file
    // ------------------------------------------------------------------
    await sandbox.files.write(ANCL_FILE, anclCode);
    emit(`Wrote ${anclCode.length} chars to ${ANCL_FILE}`);

    // ------------------------------------------------------------------
    // Step 3: Run quickapp build
    // ------------------------------------------------------------------
    emit(`Running: quickapp build app.ancl -o ${OUTPUT_DIR}`);
    const buildResult = await sandbox.commands.run(
      `${ENV_PREFIX}quickapp build ${ANCL_FILE} -o ${OUTPUT_DIR}`,
      { cwd: WORK_DIR, timeoutMs: BUILD_TIMEOUT_MS },
    );

    const buildLogs = [buildResult.stdout, buildResult.stderr].filter(Boolean).join("\n");

    if (buildResult.exitCode !== 0) {
      emit(`quickapp build failed (exit ${buildResult.exitCode}): ${buildLogs.slice(0, 400)}`);
      return {
        success: false,
        flutterCode: "",
        error: `quickapp build failed: ${buildLogs}`,
        buildLogs,
      };
    }
    emit("quickapp build ✓");

    // ------------------------------------------------------------------
    // Step 4: Read back the generated main.dart
    // ------------------------------------------------------------------
    let flutterCode: string;
    try {
      flutterCode = await sandbox.files.read(MAIN_DART);
    } catch (readErr) {
      const msg = readErr instanceof Error ? readErr.message : String(readErr);
      emit(`Failed to read ${MAIN_DART}: ${msg}`);
      return {
        success: false,
        flutterCode: "",
        error: `Could not read compiled output at ${MAIN_DART}: ${msg}`,
        buildLogs,
      };
    }

    if (!flutterCode?.trim()) {
      return {
        success: false,
        flutterCode: "",
        error: "quickapp build produced an empty main.dart",
        buildLogs,
      };
    }

    emit(`Flutter code ready: ${flutterCode.length} chars`);
    return { success: true, flutterCode, buildLogs };
  } finally {
    emit("Killing sandbox…");
    try {
      await sandbox.kill();
      emit("Sandbox killed ✓");
    } catch {
      emit("Sandbox kill error (ignored)");
    }
  }
}
