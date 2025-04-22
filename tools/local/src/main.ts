import { execSync } from "node:child_process";
import path from "node:path";
import * as clack from "@clack/prompts";
import { bootstrapApi } from "./cmd/api";
import { bootstrapDashboard } from "./cmd/dashboard";
import { seed } from "./cmd/seed";
import { prepareDatabase } from "./db";
import { startContainers } from "./docker";
import { run, task } from "./util";

const args = process.argv.slice(2);
const passedOptions: Record<string, string | boolean> = {};
args.forEach((arg) => {
  const [key, value] = arg.split("=");
  passedOptions[key.replace("--", "")] = value === undefined ? true : value;
});
const isVerbose = Boolean(passedOptions.verbose);

function logVerbose(message: string) {
  if (isVerbose) { return console.log(message); }
}

async function main() {
  clack.intro("Setting up Unkey locally...");

  let app = passedOptions.service as string;
  const skipEnv = Boolean(passedOptions["skip-env"]);

  if (!app) {
    app = (await clack.select({
      message: "What would you like to develop?",
      maxItems: 1,
      options: [
        { label: "Dashboard", value: "dashboard", hint: "app.unkey.com" },
        { label: "API", value: "api", hint: "api.unkey.dev" },
        { label: "Seed Clickhouse/DB", value: "seed", hint: "app.unkey.com" },
      ],
    })) as string;
  }

  try {
    logVerbose("Starting containers...");
    await startContainers(["planetscale", "clickhouse", "agent", "clickhouse_migrator"]);

    logVerbose("Preparing database...");
    const resources = await prepareDatabase();

    if (!skipEnv) {
      if (app === "dashboard") {
        logVerbose("Bootstrapping dashboard...");
        await bootstrapDashboard(resources);
      } else if (app === "api") {
        logVerbose("Bootstrapping API...");
        await bootstrapApi(resources);
      }
    }

    if (app === "seed") {
      logVerbose("Running seed...");
      const workspaceId = passedOptions.ws as string | undefined;
      await seed({ ws: workspaceId });
    }

    if (app !== "seed") {
      await task("Building ...", async (s) => {
        logVerbose("Building with Turbo...");
        await run(`pnpm turbo run build --filter=./apps/${app}^...`, {
          cwd: path.join(__dirname, "../../../"),
          verbose: isVerbose,
        });
        s.stop("build complete");
      });

      logVerbose("Starting dev server...");
      execSync(`pnpm --dir=apps/${app} dev`, { cwd: path.join(__dirname, "../../.."), stdio: "inherit" });
    }

    clack.outro("Done");
    process.exit(0);
  } catch (err: any) {
    console.error("\n❌ Error during setup:", err.message || err);
    if (isVerbose && err.stack) {
      console.error(err.stack);
    }
    process.exit(1);
  }
}

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
  process.exit(1);
});
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

main();
