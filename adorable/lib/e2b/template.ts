import { Template } from "e2b";

export const FLUTTER_WORKDIR = "/home/user";

export const TEMPLATE_NAME = "flutter-web-base-v1";

export const flutterE2BTemplate = Template()
  .fromDockerfile("./lib/e2b/Dockerfile.flutter")
  .runCmd(
    [
      "export PATH=/home/user/flutter/bin:/home/user/.pub-cache/bin:$PATH",
      "flutter --version",
      "dart --version",
      "quickapp --version",
    ].join(" && "),
  )
  .setWorkdir(FLUTTER_WORKDIR)
  .setEnvs({
    CI: "true",
    FLUTTER_ROOT: "/home/user/flutter",
    PUB_CACHE: "/home/user/.pub-cache",
    PATH: "/home/user/flutter/bin:/home/user/.pub-cache/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin",
  });
