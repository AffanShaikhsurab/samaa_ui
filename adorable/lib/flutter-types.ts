export type FlutterBuildTarget = "web" | "android";

export interface FlutterProjectFile {
  path: string;
  content: string;
}

export interface FlutterBuildOptions {
  projectName: string;
  codeFiles: FlutterProjectFile[];
  buildTarget: FlutterBuildTarget;
}

export interface FlutterBuildResult {
  success: boolean;
  previewUrl: string | null;
  error: string | null;
  buildLogs: string;
}

export type FlutterBuildStatus =
  | "idle"
  | "creating-sandbox"
  | "installing-deps"
  | "building"
  | "deploying"
  | "done"
  | "error";
