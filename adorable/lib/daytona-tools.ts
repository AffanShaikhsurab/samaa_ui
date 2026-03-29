import { tool } from "ai";
import { z } from "zod";
import {
  type Sandbox,
  DaytonaError,
  DaytonaRateLimitError,
  DaytonaTimeoutError,
} from "@daytonaio/sdk";
import {
  executeCommandInDaytona,
  runCodeInDaytona,
  uploadFilesToDaytona,
  downloadFileFromDaytona,
  DAYTONA_DEFAULT_LANGUAGE,
} from "./daytona-provider";
import type { DaytonaToolResult } from "./daytona-types";

const normalizeRelativePath = (rawPath: string): string | null => {
  const value = rawPath.trim();
  if (!value || value.includes("\0") || value.startsWith("/")) return null;

  const normalized = value.replace(/^\.\//, "");
  const segments = normalized.split("/");
  if (segments.some((segment) => segment === "..")) return null;

  return normalized || ".";
};

const shellQuote = (value: string): string => {
  return `'${value.replace(/'/g, `'\\''`)}'`;
};

type CreateDaytonaToolsOptions = {
  sourceRepoId?: string;
  metadataRepoId?: string;
};

export const createDaytonaTools = (
  sandbox: Sandbox,
  options?: CreateDaytonaToolsOptions
) => {
  const runExecCommand = async (command: string): Promise<DaytonaToolResult> => {
    return executeCommandInDaytona(sandbox, command);
  };

  const bashTool = tool({
    description:
      "Run a bash/shell command inside the Daytona sandbox and return its output.",
    inputSchema: z.object({
      command: z.string().min(1).describe("The shell command to execute."),
      timeout: z
        .number()
        .optional()
        .describe("Optional timeout in seconds for the command."),
    }),
    execute: async ({ command, timeout }) => {
      return executeCommandInDaytona(sandbox, command, undefined, undefined, timeout);
    },
  });

  const readFileTool = tool({
    description:
      "Read the content of a file in the Daytona sandbox. Input is the file path relative to the sandbox working directory.",
    inputSchema: z
      .object({
        file: z.string().min(1).describe("The path of the file to read."),
      })
      .passthrough(),
    execute: async ({ file }) => {
      if (!file) return { content: null };
      const safeFile = normalizeRelativePath(file);
      if (!safeFile) {
        return { ok: false, error: "Invalid file path." };
      }
      try {
        const result = await downloadFileFromDaytona(sandbox, safeFile);
        if (result === null) {
          return { content: null };
        }
        const content =
          result instanceof Buffer
            ? result.toString("utf-8")
            : String(result);
        return { content };
      } catch (error) {
        return {
          ok: false,
          error:
            error instanceof Error ? error.message : "Failed to read file.",
        };
      }
    },
  });

  const writeFileTool = tool({
    description:
      "Write content to a file in the Daytona sandbox. Input is the file path relative to the sandbox working directory and the content to write.",
    inputSchema: z
      .object({
        file: z.string().min(1).describe("The path of the file to write."),
        content: z.string().describe("The content to write to the file."),
      })
      .passthrough(),
    execute: async ({ file, content }) => {
      const safeFile = file ? normalizeRelativePath(file) : null;
      if (!safeFile) return { ok: false, error: "File path is required." };
      try {
        await uploadFilesToDaytona(sandbox, [
          { source: Buffer.from(content), destination: safeFile },
        ]);
        return { ok: true };
      } catch (error) {
        return {
          ok: false,
          error:
            error instanceof Error ? error.message : "Failed to write file.",
        };
      }
    },
  });

  const listFilesTool = tool({
    description:
      "List files or directories from a given path in the Daytona sandbox.",
    inputSchema: z
      .object({
        path: z.string().default(".").describe("Path to list."),
        recursive: z
          .boolean()
          .default(false)
          .describe("Whether to list recursively."),
        maxDepth: z
          .number()
          .int()
          .min(1)
          .max(8)
          .default(3)
          .describe("Maximum recursion depth when recursive is true."),
      })
      .passthrough(),
    execute: async ({ path, recursive, maxDepth }) => {
      const safePath = normalizeRelativePath(path ?? ".");
      if (!safePath) return { ok: false, error: "Invalid path." };

      const command = recursive
        ? `find ${shellQuote(safePath)} -maxdepth ${maxDepth} -print | sed 's#^\\./##'`
        : `ls -la ${shellQuote(safePath)}`;

      return executeCommandInDaytona(sandbox, command);
    },
  });

  const searchFilesTool = tool({
    description:
      "Search for text within files in the Daytona sandbox. Prefer this over bash for code/text lookup.",
    inputSchema: z
      .object({
        query: z.string().min(1).describe("Text to search for."),
        path: z.string().default(".").describe("Path to search under."),
        maxResults: z
          .number()
          .int()
          .min(1)
          .max(500)
          .default(100)
          .describe("Maximum number of matching lines to return."),
      })
      .passthrough(),
    execute: async ({ query, path, maxResults }) => {
      const safePath = normalizeRelativePath(path ?? ".");
      if (!safePath) return { ok: false, error: "Invalid path." };

      const command = `grep -RIn --exclude-dir=node_modules --exclude-dir=.next -- ${shellQuote(query)} ${shellQuote(safePath)} | head -n ${maxResults}`;
      return executeCommandInDaytona(sandbox, command);
    },
  });

  const replaceInFileTool = tool({
    description:
      "Replace text in a file without using bash. Supports replacing first or all occurrences.",
    inputSchema: z
      .object({
        file: z.string().min(1).describe("Path of the file to edit."),
        search: z.string().describe("Text to find."),
        replace: z.string().describe("Replacement text."),
        all: z
          .boolean()
          .default(true)
          .describe("Replace all matches when true, otherwise first match."),
      })
      .passthrough(),
    execute: async ({ file, search, replace, all }) => {
      const safeFile = normalizeRelativePath(file);
      if (!safeFile) return { ok: false, error: "Invalid file path." };

      try {
        const result = await downloadFileFromDaytona(sandbox, safeFile);
        if (result === null) {
          return { ok: false, error: "File not found." };
        }

        const content =
          result instanceof Buffer
            ? result.toString("utf-8")
            : String(result);

        if (!search) return { ok: false, error: "Search text is required." };
        if (!content.includes(search)) {
          return {
            ok: false,
            file: safeFile,
            replacements: 0,
            error: "No matches found.",
          };
        }

        const nextContent = all
          ? content.split(search).join(replace)
          : content.replace(search, replace);
        const replacements = all
          ? content.split(search).length - 1
          : content === nextContent
            ? 0
            : 1;

        await uploadFilesToDaytona(sandbox, [
          { source: Buffer.from(nextContent), destination: safeFile },
        ]);
        return { ok: true, file: safeFile, replacements };
      } catch (error) {
        return {
          ok: false,
          error:
            error instanceof Error ? error.message : "Failed to replace text.",
        };
      }
    },
  });

  const appendToFileTool = tool({
    description:
      "Append text content to an existing file (or create it) in the Daytona sandbox.",
    inputSchema: z
      .object({
        file: z.string().min(1).describe("Path of the file to append to."),
        content: z.string().describe("Content to append to the file."),
      })
      .passthrough(),
    execute: async ({ file, content }) => {
      const safeFile = file ? normalizeRelativePath(file) : null;
      if (!safeFile) return { ok: false, error: "Invalid file path." };
      try {
        const existing = await downloadFileFromDaytona(sandbox, safeFile);
        const existingContent =
          existing instanceof Buffer
            ? existing.toString("utf-8")
            : existing
              ? String(existing)
              : "";
        await uploadFilesToDaytona(sandbox, [
          {
            source: Buffer.from(existingContent + content),
            destination: safeFile,
          },
        ]);
        return { ok: true };
      } catch {
        await uploadFilesToDaytona(sandbox, [
          { source: Buffer.from(content), destination: safeFile },
        ]);
        return { ok: true };
      }
    },
  });

  const getSandboxInfoTool = tool({
    description:
      "Get information about the current Daytona sandbox including its ID and state.",
    inputSchema: z.object({}).passthrough(),
    execute: async () => {
      try {
        return {
          id: sandbox.id,
          state: (sandbox as unknown as { state?: string }).state ?? "unknown",
        };
      } catch (error) {
        return {
          ok: false,
          error:
            error instanceof Error ? error.message : "Failed to get sandbox info.",
        };
      }
    },
  });

  const runCodeTool = tool({
    description:
      "Execute code in the Daytona sandbox using the built-in code runner. Supports multiple languages.",
    inputSchema: z
      .object({
        code: z.string().min(1).describe("The code to execute."),
        language: z
          .string()
          .optional()
          .default(DAYTONA_DEFAULT_LANGUAGE)
          .describe(
            "Programming language of the code (e.g., 'python', 'javascript', 'typescript')."
          ),
        timeout: z
          .number()
          .optional()
          .describe("Optional timeout in seconds for the code execution."),
      })
      .passthrough(),
    execute: async ({ code, language, timeout }) => {
      return runCodeInDaytona(sandbox, code, language, timeout);
    },
  });

  const deleteSandboxTool = tool({
    description:
      "Delete the Daytona sandbox. Use with caution as this permanently removes the sandbox.",
    inputSchema: z.object({}).passthrough(),
    execute: async () => {
      try {
        await sandbox.delete(30);
        return { ok: true, message: "Sandbox deleted successfully." };
      } catch (error) {
        return {
          ok: false,
          error:
            error instanceof Error ? error.message : "Failed to delete sandbox.",
        };
      }
    },
  });

  return {
    bash: bashTool,
    readFile: readFileTool,
    writeFile: writeFileTool,
    listFiles: listFilesTool,
    searchFiles: searchFilesTool,
    replaceInFile: replaceInFileTool,
    appendToFile: appendToFileTool,
    getSandboxInfo: getSandboxInfoTool,
    runCode: runCodeTool,
    deleteSandbox: deleteSandboxTool,
  };
};

export type DaytonaTools = ReturnType<typeof createDaytonaTools>;