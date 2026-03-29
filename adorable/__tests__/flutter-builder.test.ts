/**
 * Unit tests for flutter-builder.ts
 * Mocks the freestyle-provider module so no real VM calls are made.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/freestyle-provider", () => ({
  createFreestyleClient: vi.fn().mockReturnValue({
    vms: { create: vi.fn() },
  }),
  executeCommandInFreestyle: vi.fn(),
  uploadFilesToFreestyle: vi.fn(),
  downloadFileFromFreestyle: vi.fn(),
  deleteFreestyleVm: vi.fn(),
}));

import * as provider from "@/lib/freestyle-provider";
import {
  initFlutterProject,
  buildFlutterWeb,
  serveFlutterWeb,
  getFlutterFilesFromSandbox,
} from "@/lib/flutter-builder";

const mockExec = provider.executeCommandInFreestyle as ReturnType<typeof vi.fn>;
const mockUpload = provider.uploadFilesToFreestyle as ReturnType<typeof vi.fn>;

const mockSandbox = {
  id: "sandbox-123",
  getInfo: vi.fn().mockResolvedValue({ domains: ["preview.example.com"] }),
  fs: {
    readDir: vi.fn(),
  },
} as unknown as Parameters<typeof initFlutterProject>[0];

beforeEach(() => {
  vi.clearAllMocks();
  mockExec.mockResolvedValue({ ok: true, stdout: "Done", stderr: "", exitCode: 0 });
  mockUpload.mockResolvedValue(undefined);
});

describe("initFlutterProject", () => {
  it("creates project, uploads files, and runs pub get in sequence", async () => {
    const result = await initFlutterProject(mockSandbox, {
      projectName: "todo_app",
      codeFiles: [{ path: "lib/main.dart", content: "void main() {}" }],
      buildTarget: "web",
    });

    expect(result.ok).toBe(true);
    expect(mockExec).toHaveBeenCalledTimes(2);
    expect(mockUpload).toHaveBeenCalledOnce();

    const createCall = mockExec.mock.calls[0][1] as string;
    expect(createCall).toContain("flutter create");
    expect(createCall).toContain("todo_app");

    const pubGetCall = mockExec.mock.calls[1][1] as string;
    expect(pubGetCall).toContain("pub get");
  });

  it("returns ok:false when flutter create fails", async () => {
    mockExec.mockResolvedValueOnce({ ok: false, stdout: "", stderr: "Error", exitCode: 1 });
    const result = await initFlutterProject(mockSandbox, {
      projectName: "bad_app",
      codeFiles: [],
      buildTarget: "web",
    });
    expect(result.ok).toBe(false);
    expect(result.error).toBeTruthy();
  });
});

describe("buildFlutterWeb", () => {
  it("returns success with logs when build passes", async () => {
    mockExec.mockResolvedValue({ ok: true, stdout: "✓ Built build/web", stderr: "", exitCode: 0 });
    const result = await buildFlutterWeb(mockSandbox, "todo_app");
    expect(result.success).toBe(true);
    expect(result.buildLogs).toContain("Built build/web");
  });

  it("returns failure with error message when build fails", async () => {
    mockExec.mockResolvedValue({ ok: false, stdout: "", stderr: "Compilation error", exitCode: 1 });
    const result = await buildFlutterWeb(mockSandbox, "todo_app");
    expect(result.success).toBe(false);
    expect(result.error).toContain("Compilation error");
  });
});

describe("serveFlutterWeb", () => {
  it("kills old server, starts new one, and returns preview URL", async () => {
    const result = await serveFlutterWeb(mockSandbox, "todo_app", 3000);
    expect(result.success).toBe(true);
    expect(result.previewUrl).toContain("preview.example.com");
    expect(mockExec.mock.calls.length).toBeGreaterThanOrEqual(2);
  });
});

describe("getFlutterFilesFromSandbox", () => {
  it("parses directory output into a file list", async () => {
    (mockSandbox.fs.readDir as ReturnType<typeof vi.fn>).mockResolvedValue([
      { name: "index.html", kind: "file" },
      { name: "main.dart.js", kind: "file" },
      { name: "flutter.js", kind: "file" },
    ]);
    const files = await getFlutterFilesFromSandbox(mockSandbox, "todo_app");
    expect(files).toEqual(["index.html", "main.dart.js", "flutter.js"]);
  });

  it("returns empty array when readDir fails", async () => {
    (mockSandbox.fs.readDir as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("Not found"));
    const files = await getFlutterFilesFromSandbox(mockSandbox, "todo_app");
    expect(files).toEqual([]);
  });
});
