import { Template } from "e2b";

export const FLUTTER_WORKDIR = "/workspace";

export const flutterE2BTemplate = Template()
  .fromUbuntuImage("22.04")
  .setUser("root")
  .setWorkdir("/workspace")
  .setEnvs({
    CI: "true",
    FLUTTER_ROOT: "/opt/flutter",
    PUB_CACHE: "/root/.pub-cache",
  })
  .runCmd([
    "apt-get update -y",
    "apt-get install -y curl git unzip xz-utils zip libglu1-mesa clang cmake ninja-build pkg-config libgtk-3-dev libstdc++-12-dev",
    "mkdir -p /opt /workspace /root/.pub-cache",
    "cd /opt && git clone https://github.com/flutter/flutter.git -b stable --depth 1",
    "/opt/flutter/bin/flutter doctor -v",
    "/opt/flutter/bin/flutter config --enable-web",
    "/opt/flutter/bin/flutter precache",
  ])
  .setUser("user")
  .setWorkdir("/home/user");
