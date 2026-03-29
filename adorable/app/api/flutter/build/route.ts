import { NextRequest, NextResponse } from "next/server";
import {
  createFlutterSandbox,
  initFlutterProject,
  buildFlutterWeb,
  getFlutterFilesFromSandbox,
  cleanupFlutterSandbox,
  FLUTTER_WORKDIR,
} from "@/lib/flutter-builder";
import { getE2BPreviewUrl } from "@/lib/e2b-provider";
import type { FlutterBuildOptions, FlutterProjectFile } from "@/lib/flutter-types";
import { log } from "@/lib/log";

interface FlutterBuildRequest {
  projectName: string;
  codeFiles: FlutterProjectFile[];
}

interface FlutterBuildResponse {
  success: boolean;
  previewUrl?: string;
  error?: string;
  sandboxId?: string;
}

export async function POST(
  req: NextRequest
): Promise<NextResponse<FlutterBuildResponse>> {
  const reqT0 = Date.now();
  log.build("═══════════════════════════════════════════════════════════");
  log.build("incoming POST /api/flutter/build");

  let body: FlutterBuildRequest;
  try {
    body = (await req.json()) as FlutterBuildRequest;
  } catch {
    log.buildError("invalid JSON body");
    return NextResponse.json({ success: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const { projectName, codeFiles } = body;
  log.build("parsed request", {
    projectName,
    codeFilesCount: codeFiles?.length ?? 0,
    codeFiles: codeFiles?.map((f) => ({
      path: f.path,
      contentLen: f.content?.length ?? 0,
    })),
  });

  if (!projectName || !Array.isArray(codeFiles) || codeFiles.length === 0) {
    log.buildError("missing projectName or codeFiles");
    return NextResponse.json(
      { success: false, error: "projectName and codeFiles are required." },
      { status: 400 }
    );
  }

  let sandbox: Awaited<ReturnType<typeof createFlutterSandbox>> | undefined;
  try {
    const options: FlutterBuildOptions = { projectName, codeFiles, buildTarget: "web" };

    // ── Step 1: Create sandbox ──────────────────────────────────
    log.build("STEP 1/5: creating sandbox…");
    const sandboxT0 = Date.now();
    sandbox = await createFlutterSandbox();
    const sandboxId = sandbox.__vmId;
    log.build(`STEP 1/5: sandbox ✓ (${((Date.now() - sandboxT0) / 1000).toFixed(1)}s)`, {
      sandboxId,
    });

    // ── Step 2: Init project ────────────────────────────────────
    log.build("STEP 2/5: initializing Flutter project…");
    const initT0 = Date.now();
    const initResult = await initFlutterProject(sandbox, options);
    log.build(`STEP 2/5: init ${initResult.ok ? "✓" : "✗"} (${((Date.now() - initT0) / 1000).toFixed(1)}s)`);

    if (!initResult.ok) {
      log.buildError("project init failed", { error: initResult.error });
      await cleanupFlutterSandbox(sandbox);
      return NextResponse.json(
        { success: false, error: initResult.error || "Failed to initialize Flutter project." },
        { status: 500 }
      );
    }

    // ── Step 3: Build ───────────────────────────────────────────
    log.build("STEP 3/5: building Flutter web…");
    const buildT0 = Date.now();
    const buildResult = await buildFlutterWeb(sandbox, projectName);
    log.build(`STEP 3/5: build ${buildResult.success ? "✓" : "✗"} (${((Date.now() - buildT0) / 1000).toFixed(1)}s)`);

    if (!buildResult.success) {
      log.buildError("build failed", { error: buildResult.error });
      await cleanupFlutterSandbox(sandbox);
      return NextResponse.json(
        { success: false, error: buildResult.error || "Flutter build failed." },
        { status: 500 }
      );
    }

    // ── Step 4: Start preview server AFTER build ─────────────────
    log.build("STEP 4/5: starting preview server…");

    const buildDir = `${FLUTTER_WORKDIR}/${projectName}/build/web`;

    const serverStartCmd = `cd ${buildDir} && python3 -m http.server 3000 &`;
    log.build(`STEP 4/5: running: ${serverStartCmd}`);

    try {
      sandbox.commands.run(serverStartCmd, { background: true, timeoutMs: 10000 });
      log.build("STEP 4/5: server start command issued");
    } catch (e) {
      log.buildWarn("STEP 4/5: server start error", { error: e instanceof Error ? e.message : String(e) });
    }

    await new Promise((r) => setTimeout(r, 5000));
    log.build("STEP 4/5: waiting for server to start…");

    try {
      const psResult = await sandbox.commands.run("ps aux | grep python", { timeoutMs: 5000 });
      log.build("STEP 4/5: running processes:", { pythonProcesses: psResult.stdout });
    } catch (e) {
      log.buildWarn("STEP 4/5: could not check processes", { error: e instanceof Error ? e.message : String(e) });
    }

    // ── Step 5: List output files ───────────────────────────────
    log.build("STEP 5/5: listing build output…");
    const files = await getFlutterFilesFromSandbox(sandbox, projectName);
    log.build(`STEP 5/5: output files: ${files.join(", ")}`);

    // ── Step 6: Get preview URL ──────────────────────────────────
    log.build("STEP 6/6: getting preview URL…");
    const previewInfo = getE2BPreviewUrl(sandbox, 3000);
    if (!previewInfo) {
      log.buildError("STEP 6/6: failed to get preview URL");
      await cleanupFlutterSandbox(sandbox);
      return NextResponse.json(
        { success: false, error: "Failed to get preview URL from E2B sandbox." },
        { status: 500 }
      );
    }

    log.build(`DONE ✅ ${previewInfo.url} (${((Date.now() - reqT0) / 1000).toFixed(1)}s total)`);
    return NextResponse.json({
      success: true,
      previewUrl: previewInfo.url,
      sandboxId,
    });
  } catch (error) {
    log.buildError("unexpected error", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack?.slice(0, 500) : undefined,
    });
    if (sandbox) {
      await cleanupFlutterSandbox(sandbox).catch(() => {});
    }
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred.",
      },
      { status: 500 }
    );
  }
}
