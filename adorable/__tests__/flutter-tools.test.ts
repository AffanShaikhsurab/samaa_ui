/**
 * Unit tests for flutter-tools.ts
 * Uses a mock Freestyle VM to verify tool behavior without a real sandbox.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/freestyle-provider", () => ({
  executeCommandInFreestyle: vi.fn(),
  uploadFilesToFreestyle: vi.fn(),
  downloadFileFromFreestyle: vi.fn(),
}));

import * as provider from "@/lib/freestyle-provider";
import { createFlutterTools } from "@/lib/flutter-tools";

const mockSandbox = {
  id: "test-sandbox-id",
  getInfo: vi.fn().mockResolvedValue({ domains: ["test.example.com"] }),
  fs: {
    mkdir: vi.fn(),
    writeFile: vi.fn(),
    readFile: vi.fn(),
    readDir: vi.fn(),
  },
} as unknown as Parameters<typeof createFlutterTools>[0];

const mockExec = provider.executeCommandInFreestyle as ReturnType<typeof vi.fn>;
const mockUpload = provider.uploadFilesToFreestyle as ReturnType<typeof vi.fn>;
const mockDownload = provider.downloadFileFromFreestyle as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  mockExec.mockResolvedValue({ ok: true, stdout: "success", stderr: "", exitCode: 0 });
  mockUpload.mockResolvedValue(undefined);
  mockDownload.mockResolvedValue(Buffer.from("file content"));
});

describe("createFlutterTools", () => {
  const tools = createFlutterTools(mockSandbox);

  describe("bash", () => {
    it("calls executeCommandInFreestyle with the command", async () => {
      await tools.bash.execute!({ command: "echo hello", timeout: 30 }, {} as never);
      expect(mockExec).toHaveBeenCalledWith(
        mockSandbox,
        "echo hello",
        "/workspace",
        30000
      );
    });
  });

  describe("writeFile", () => {
    it("creates parent dir and uploads file content", async () => {
      await tools.writeFile.execute!({ file: "myapp/lib/main.dart", content: "void main() {}" }, {} as never);
      expect(mockUpload).toHaveBeenCalledWith(
        mockSandbox,
        expect.arrayContaining([
          expect.objectContaining({ destination: "/workspace/myapp/lib/main.dart" }),
        ])
      );
    });
  });

  describe("readFile", () => {
    it("returns file content as string", async () => {
      const result = await tools.readFile.execute!({ file: "myapp/pubspec.yaml" }, {} as never);
      expect(result).toMatchObject({ content: "file content" });
    });

    it("returns null content when file not found", async () => {
      mockDownload.mockResolvedValue(null);
      const result = await tools.readFile.execute!({ file: "missing.dart" }, {} as never);
      expect(result).toMatchObject({ content: null });
    });
  });

  describe("flutterCreate", () => {
    it("calls flutter create with org and platforms", async () => {
      await tools.flutterCreate.execute!({ name: "todo_app", org: "com.test" }, {} as never);
      const callArg = mockExec.mock.calls[0][1] as string;
      expect(callArg).toContain("flutter create");
      expect(callArg).toContain("com.test");
      expect(callArg).toContain("todo_app");
    });
  });

  describe("flutterPubGet", () => {
    it("runs flutter pub get in the project dir", async () => {
      await tools.flutterPubGet.execute!({ projectDir: "todo_app" }, {} as never);
      const cmd = mockExec.mock.calls[0][1] as string;
      const cwd = mockExec.mock.calls[0][2] as string;
      expect(cmd).toContain("flutter pub get");
      expect(cwd).toContain("todo_app");
    });
  });

  describe("flutterBuildWeb", () => {
    it("runs flutter build web --release", async () => {
      await tools.flutterBuildWeb.execute!({ projectDir: "todo_app" }, {} as never);
      const cmd = mockExec.mock.calls[0][1] as string;
      expect(cmd).toContain("flutter build web --release");
    });
  });

  describe("flutterServeWeb", () => {
    it("starts serve and returns preview URL from vm domains", async () => {
      const result = await tools.flutterServeWeb.execute!(
        { projectDir: "todo_app", port: 3000 },
        {} as never
      );
      expect(mockSandbox.getInfo).toHaveBeenCalled();
      expect(result).toMatchObject({ ok: true });
      expect((result as { previewUrl?: string }).previewUrl).toContain("test.example.com");
    });
  });

  describe("replaceInFile", () => {
    it("replaces text and re-uploads the file", async () => {
      mockDownload.mockResolvedValue(Buffer.from("hello world hello"));
      const result = await tools.replaceInFile.execute!(
        { file: "test.dart", search: "hello", replace: "hi", all: true },
        {} as never
      );
      expect(result).toMatchObject({ ok: true, replacements: 2 });
      expect(mockUpload).toHaveBeenCalledWith(
        mockSandbox,
        expect.arrayContaining([
          expect.objectContaining({ source: Buffer.from("hi world hi") }),
        ])
      );
    });

    it("returns error when search text not found", async () => {
      mockDownload.mockResolvedValue(Buffer.from("no matches here"));
      const result = await tools.replaceInFile.execute!(
        { file: "test.dart", search: "xyz", replace: "abc", all: true },
        {} as never
      );
      expect((result as { ok: boolean }).ok).toBe(false);
    });
  });
});
