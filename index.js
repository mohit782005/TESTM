const args = new Set(process.argv.slice(2));
const shouldFail = args.has("--fail");
const noisy = args.has("--noisy");

function formatMs(startedAt) {
  return `${Date.now() - startedAt}ms`;
}

function logPhase(name, startedAt) {
  console.log(`[telemetry] phase=${name} elapsed=${formatMs(startedAt)}`);
}

function buildWorkspacePayload() {
  return {
    workspace: "manual-telemetry-check",
    service: "testm",
    buildId: `build-${Date.now()}`,
  };
}

function computeChecksum(values) {
  return values.reduce((sum, value, index) => sum + value * (index + 1), 0);
}

function verifyBuild(payload, checksum) {
  if (!payload.workspace || !payload.service) {
    throw new Error("Missing telemetry payload fields");
  }
  return checksum > 0;
}

async function emitLogs() {
  const startedAt = Date.now();
  const payload = buildWorkspacePayload();

  console.log("[telemetry] boot=testm");
  console.log(`[telemetry] payload=${JSON.stringify(payload)}`);

  logPhase("install", startedAt);
  await delay(250);

  logPhase("compile", startedAt);
  const checksum = computeChecksum([3, 7, 11, 13]);
  console.log(`[telemetry] checksum=${checksum}`);
  await delay(250);

  logPhase("verify", startedAt);
  const ok = verifyBuild(payload, checksum);
  console.log(`[telemetry] verify=${ok}`);
  await delay(250);

  if (noisy) {
    console.log("[telemetry] extra=stdout-line-1");
    console.log("[telemetry] extra=stdout-line-2");
    console.error("[telemetry] extra=stderr-line-1");
  }

  if (shouldFail) {
    console.error("src/broken.ts:12 Build exploded in TESTM");
    console.error("Error: Synthetic build failure for telemetry verification");
    console.error("    at verifyBuild (src/broken.ts:12:5)");
    process.exit(2);
  }

  console.log("[telemetry] status=success");
  console.log("TESTM finished successfully");
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

emitLogs().catch((error) => {
  console.error(`[telemetry] unhandled=${error.message}`);
  process.exit(1);
});
