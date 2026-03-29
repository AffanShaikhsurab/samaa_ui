import { Template } from "e2b";

export const FLUTTER_WORKDIR = "/home/user";

export const TEMPLATE_NAME = "flutter-web-base-v1";

export const flutterE2BTemplate = Template()
  .fromDockerfile("./lib/e2b/Dockerfile.flutter")
  .runCmd("git clone https://github.com/flutter/flutter.git -b stable --depth 1 /home/user/flutter")
  .setWorkdir(FLUTTER_WORKDIR)
  .setEnvs({
    CI: "true",
    FLUTTER_ROOT: "/home/user/flutter",
    PUB_CACHE: "/home/user/.pub-cache",
  });
