import { config } from "dotenv";
import { Template, defaultBuildLogger } from "e2b";
import { flutterE2BTemplate, TEMPLATE_NAME } from "./template";

config({ path: ".env.local" });

async function buildTemplate() {
  const cpuCount = 8;
  const memoryMB = 8192;
  console.log(`Building E2B Flutter template: ${TEMPLATE_NAME}...`);
  console.log(`Machine specs: ${cpuCount} CPUs, ${memoryMB} MB RAM`);
  console.log("Using Build System 2.0 - build runs on E2B infrastructure");
  console.log("");

  try {
    const buildInfo = await Template.build(
      flutterE2BTemplate,
      TEMPLATE_NAME,
      {
        onBuildLogs: defaultBuildLogger({ minLevel: "info" }),
        cpuCount,
        memoryMB,
      }
    );

    console.log("");
    console.log("✅ Template build completed!");
    console.log("Template name:", TEMPLATE_NAME);
    console.log("Machine specs:", `${cpuCount} CPUs, ${memoryMB} MB RAM`);
    console.log("Build info:", JSON.stringify(buildInfo, null, 2));

    return buildInfo;
  } catch (error) {
    console.error("❌ Template build failed:", error);
    throw error;
  }
}

buildTemplate()
  .then(() => {
    console.log("");
    console.log("You can now use this template with:");
    console.log(`  Sandbox.create('${TEMPLATE_NAME}')`);
  })
  .catch((error) => {
    console.error("");
    console.error("Build failed.");
    process.exit(1);
  });
