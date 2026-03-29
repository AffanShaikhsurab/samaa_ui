import { Template, defaultBuildLogger } from "e2b";
import { flutterE2BTemplate } from "./e2b-flutter-template";

async function buildFlutterTemplate() {
  console.log("Building Flutter E2B template...");

  const buildInfo = await Template.build(
    flutterE2BTemplate,
    "flutter-web-v1",
    {
      cpuCount: 2,
      memoryMB: 4096,
      onBuildLogs: defaultBuildLogger({ minLevel: "info" }),
    }
  );

  console.log("Template build info:", buildInfo);
  return buildInfo;
}

buildFlutterTemplate().catch(console.error);
