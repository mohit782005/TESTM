import http from "http";

const args = new Set(process.argv.slice(2));
const failOnBoot = args.has("--fail") || process.env.FAIL_MODE === "true";
const noisy = args.has("--noisy") || process.env.NOISY_MODE === "true";
const port = Number(process.env.PORT || 3000);
const host = "0.0.0.0";
const startedAt = Date.now();

function formatMs() {
  return `${Date.now() - startedAt}ms`;
}

function buildPayload() {
  return {
    workspace: process.env.NEXUS_REMOTE || "manual-telemetry-check/testm",
    service: "testm-web",
    buildId: `web-${Date.now()}`,
  };
}

function logStartupTelemetry() {
  const payload = buildPayload();
  console.log("[telemetry] boot=testm-web");
  console.log(`[telemetry] payload=${JSON.stringify(payload)}`);
  console.log(`[telemetry] phase=boot elapsed=${formatMs()}`);
  console.log(`[telemetry] port=${port}`);
  if (noisy) {
    console.log("[telemetry] extra=stdout-line-1");
    console.error("[telemetry] extra=stderr-line-1");
  }
}

function emitCrashLogs(reason) {
  console.error("src/broken.ts:12 Build exploded in TESTM");
  console.error(`Error: Synthetic web-service failure: ${reason}`);
  console.error("    at verifyBuild (src/broken.ts:12:5)");
}

const server = http.createServer((req, res) => {
  console.log(`[telemetry] request method=${req.method} path=${req.url} elapsed=${formatMs()}`);

  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true, service: "testm-web" }));
    return;
  }

  if (req.url === "/crash") {
    emitCrashLogs("manual route crash");
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: false, crashed: true }));
    setTimeout(() => process.exit(2), 100);
    return;
  }

  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("TESTM web service is running\n");
});

server.listen(port, host, () => {
  logStartupTelemetry();
  console.log(`[telemetry] status=listening host=${host} port=${port}`);
  console.log("TESTM web service started successfully");

  if (failOnBoot) {
    setTimeout(() => {
      emitCrashLogs("boot failure");
      process.exit(2);
    }, 1500);
  }
});

process.on("SIGTERM", () => {
  console.log("[telemetry] shutdown=SIGTERM");
  server.close(() => process.exit(0));
});

process.on("SIGINT", () => {
  console.log("[telemetry] shutdown=SIGINT");
  server.close(() => process.exit(0));
});
