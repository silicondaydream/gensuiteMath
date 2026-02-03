#!/usr/bin/env node
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import inquirer from "inquirer";
import chalk from "chalk";
import figlet from "figlet";
import gradient from "gradient-string";
import ora from "ora";
import Table from "cli-table3";
import { spawnSync } from "child_process";
import os from "os";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CWD = process.cwd();
const CONFIG_PATH = path.join(CWD, "gensuite.config.json");
const PACKAGE_JSON_PATH = path.join(__dirname, "package.json");
const HELPER_DIR = path.join(__dirname, "gensuite-helper");
const HELPER_RELEASE = path.join(HELPER_DIR, "target", "release", "gensuite-helper");
const HELPER_DEBUG = path.join(HELPER_DIR, "target", "debug", "gensuite-helper");

const COLOR_SCHEMES = {
  neon: {
    label: "Neon",
    gradient: ["#00e5ff", "#00c853"],
    primary: chalk.hex("#00e5ff"),
    secondary: chalk.hex("#00c853"),
    accent: chalk.hex("#b2ff59"),
    primeA: chalk.hex("#00e5ff"),
    primeB: chalk.hex("#00c853"),
  },
  sunset: {
    label: "Sunset",
    gradient: ["#ff8f00", "#ff1744"],
    primary: chalk.hex("#ff8f00"),
    secondary: chalk.hex("#ff1744"),
    accent: chalk.hex("#ffd180"),
    primeA: chalk.hex("#ff8f00"),
    primeB: chalk.hex("#ff1744"),
  },
  ocean: {
    label: "Ocean",
    gradient: ["#00b0ff", "#00e676"],
    primary: chalk.hex("#00b0ff"),
    secondary: chalk.hex("#00e676"),
    accent: chalk.hex("#80d8ff"),
    primeA: chalk.hex("#00b0ff"),
    primeB: chalk.hex("#00e676"),
  },
};

const DEFAULT_CONFIG = {
  colorScheme: "neon",
  animations: true,
};

const FALLBACK_RESPONSES = [
  "Directive check: request falls outside the prime directive.",
  "Asimov protocol flagged that action. Try a supported command.",
  "I only handle pi and primes. Re-route your request.",
  "Command not recognized. Consult /help for the active directives.",
  "Outside mission parameters. Provide a pi or primes command.",
  "Directive mismatch. Standing by for valid instructions.",
];

function loadConfig() {
  try {
    const raw = fs.readFileSync(CONFIG_PATH, "utf8");
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_CONFIG, ...parsed };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

function saveConfig(config) {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
}

function getScheme(config) {
  return COLOR_SCHEMES[config.colorScheme] || COLOR_SCHEMES.neon;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function blinkBlock(config, cycles = 6) {
  if (!config.animations) return;
  const scheme = getScheme(config);
  let show = true;
  for (let i = 0; i < cycles; i += 1) {
    process.stdout.write(`\r${scheme.accent(show ? "█" : " ")}`);
    show = !show;
    await sleep(220);
  }
  process.stdout.write("\r \n");
}

function getVersion() {
  try {
    const raw = fs.readFileSync(PACKAGE_JSON_PATH, "utf8");
    const parsed = JSON.parse(raw);
    return typeof parsed.version === "string" ? parsed.version : "0.0.0";
  } catch {
    return "0.0.0";
  }
}

function showLogo(config) {
  const scheme = getScheme(config);
  const title = figlet.textSync("GenThr33", { font: "Slant" });
  console.log(gradient(scheme.gradient).multiline(title));
  console.log(scheme.accent(`v${getVersion()}\n`));
}

async function showLogoAnimated(config) {
  const scheme = getScheme(config);
  const title = figlet.textSync("GenThr33", { font: "Slant" });
  const lines = gradient(scheme.gradient).multiline(title).split("\n");
  process.stdout.write("\x1Bc");
  if (!config.animations) {
    console.log(lines.join("\n"));
    console.log(scheme.accent(`v${getVersion()}\n`));
    return;
  }
  for (const line of lines) {
    console.log(line);
    await sleep(35);
  }
  console.log(scheme.accent(`v${getVersion()}\n`));
}

async function showHome(config) {
  await showLogoAnimated(config);
  await blinkBlock(config);
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

function timestampString() {
  const d = new Date();
  return (
    `${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}-` +
    `${pad2(d.getHours())}${pad2(d.getMinutes())}${pad2(d.getSeconds())}`
  );
}

function resolveCommand(args) {
  if (args.length === 0) return "interactive";
  const joined = args.join(" ").toLowerCase();
  if (joined === "-h" || joined === "help" || joined.includes("/help")) return "help";
  if (joined.includes("exit") || joined.includes("quit")) return "exit";
  if (joined.includes("home")) return "home";
  if (joined.includes("pi benchy")) return "pi";
  if (joined.includes("prime benchy")) return "primes";
  if (joined.includes("run primes")) return "primes";
  if (joined.includes("run pi")) return "pi";
  if (joined.includes("run benchmarks")) return "bench";
  if (joined.includes("benchmarks")) return "bench";
  if (joined.includes("benchmark")) return "bench";
  if (joined.includes("benchark")) return "bench";
  if (joined.includes("bench")) return "bench";
  if (joined.includes("prime")) return "primes";
  if (joined.includes("pi")) return "pi";
  return "unknown";
}

function makeSpinner(config, text) {
  if (!config.animations) return null;
  return ora({ text, spinner: "dots" }).start();
}

function nowMs() {
  return Number(process.hrtime.bigint() / 1000000n);
}

function formatSeconds(ms) {
  const total = Math.max(ms, 0) / 1000;
  if (total < 1) return `${total.toFixed(2)}s`;
  if (total < 10) return `${total.toFixed(2)}s`;
  if (total < 60) return `${total.toFixed(1)}s`;
  const minutes = Math.floor(total / 60);
  const seconds = Math.round(total % 60);
  return `${minutes}m ${seconds}s`;
}

function resolveSaveDir() {
  const home = os.homedir();
  const desktop = path.join(home, "Desktop");
  const downloads = path.join(home, "Downloads");
  if (fs.existsSync(desktop)) return desktop;
  if (fs.existsSync(downloads)) return downloads;
  return CWD;
}

function showSystemInfo(scheme) {
  const cpus = os.cpus();
  const cpuModel = cpus[0]?.model || "Unknown CPU";
  const cores = cpus.length || 0;
  const memGB = (os.totalmem() / (1024 ** 3)).toFixed(1);
  console.log(scheme.primary("\nSystem info"));
  console.log(
    scheme.secondary(
      `OS: ${os.platform()} ${os.release()} | Arch: ${os.arch()}`
    )
  );
  console.log(
    scheme.secondary(`CPU: ${cpuModel} | Cores: ${cores} | RAM: ${memGB} GB`)
  );
  console.log(
    scheme.secondary(`Node: ${process.version} | Helper: ${helperPath()}`)
  );
}

function runHelperTimed(command, arg) {
  const bin = requireHelperBinary();
  const start = nowMs();
  const result = spawnSync(bin, [command, String(arg)], {
    encoding: "utf8",
  });
  const elapsedMs = nowMs() - start;
  if (result.error || result.status !== 0) {
    console.error(chalk.red("Helper error:"), result.stderr || result.error);
    process.exit(1);
  }
  return { output: result.stdout.trim(), elapsedMs };
}

async function enforceTimeCap({
  label,
  requested,
  ratePerSec,
  maxSeconds,
  scheme,
}) {
  if (!Number.isFinite(ratePerSec) || ratePerSec <= 0) return requested;
  const maxCount = Math.max(1, Math.floor(ratePerSec * maxSeconds));
  if (requested <= maxCount) return requested;

  console.log(
    scheme.secondary(
      `Requested ${requested} ${label} exceeds ~${maxSeconds}s limit. Estimated max: ${maxCount}.`
    )
  );

  const { choice } = await inquirer.prompt([
    {
      type: "list",
      name: "choice",
      message: "Adjust request?",
      choices: [
        { name: `Use ${maxCount} ${label}`, value: "cap" },
        { name: "Enter a new amount", value: "retry" },
        { name: "Cancel", value: "cancel" },
      ],
      default: 0,
    },
  ]);

  if (choice === "cap") return maxCount;
  if (choice === "retry") return null;
  return 0;
}

function helperPath() {
  if (fs.existsSync(HELPER_RELEASE)) return HELPER_RELEASE;
  if (fs.existsSync(HELPER_DEBUG)) return HELPER_DEBUG;
  return null;
}

function requireHelperBinary() {
  const bin = helperPath();
  if (!bin) {
    console.error(
      chalk.red(
        "Rust helper is required. Build it with: npm run build:helper"
      )
    );
    process.exit(1);
  }
  return bin;
}

function formatPrimeGroups(primes, increment) {
  const groups = [];
  for (let i = 0; i < primes.length; i += increment) {
    groups.push(primes.slice(i, i + increment));
  }
  return groups;
}

async function maybeSaveToFile(rawOutput) {
  const { save } = await inquirer.prompt([
    {
      type: "list",
      name: "save",
      message: "Save results to drive?",
      choices: [
        { name: "Yes", value: "yes" },
        { name: "No (default)", value: "no" },
        { name: "Help", value: "help" },
      ],
      default: 1,
    },
  ]);
  if (save === "help") {
    console.log(
      chalk.gray(
        "Saves a .txt file to your Desktop (or Downloads if Desktop is missing)."
      )
    );
    return maybeSaveToFile(rawOutput);
  }
  if (save !== "yes") return;
  const { filename } = await inquirer.prompt([
    {
      type: "input",
      name: "filename",
      message: "File name:",
      default: `gensuite-output-${timestampString()}.txt`,
      validate: (val) => (val.trim() ? true : "Please enter a file name."),
    },
  ]);
  const targetDir = resolveSaveDir();
  const trimmed = filename.trim();
  const finalName = trimmed.toLowerCase().endsWith(".txt")
    ? trimmed
    : `${trimmed}.txt`;
  const targetPath = path.join(targetDir, finalName);
  fs.writeFileSync(targetPath, rawOutput, "utf8");
  console.log(chalk.gray(`Saved to ${targetPath}`));
  await showHome(loadConfig());
}

async function runPi(config) {
  const scheme = getScheme(config);
  const { proceed } = await inquirer.prompt([
    {
      type: "list",
      name: "proceed",
      message: "Pi menu:",
      choices: [
        { name: "Start", value: "start" },
        { name: "Back", value: "back" },
      ],
      default: 0,
    },
  ]);
  if (proceed === "back") return;

  let answers = await inquirer.prompt([
    {
      type: "number",
      name: "count",
      message: "How many digits of pi?",
      default: 20000,
      validate: (val) =>
        Number.isInteger(val) && val > 0 && val <= 2000000
          ? true
          : "Enter a whole number between 1 and 2000000.",
    },
  ]);

  const count = answers.count;
  const calibrateCount = Math.min(30, count);
  const estimateSample = runHelperTimed("pi", calibrateCount);
  const rate = calibrateCount / (estimateSample.elapsedMs / 1000);
  const estimatedMs = (count / rate) * 1000;
  console.log(
    scheme.secondary(
      `Estimate: ${formatSeconds(estimatedMs)} (~${rate.toFixed(
        1
      )} digits/sec)`
    )
  );

  const spinner =
    config.animations && count > 80
      ? makeSpinner(config, "Calculating pi digits...")
      : null;

  const result = runHelperTimed("pi", count);
  if (spinner) spinner.succeed("Pi digits ready.");
  const digits = result.output;
  const actualRate = count / (result.elapsedMs / 1000);

  const output = digits;

  console.log(scheme.primary("\nPi digits"));
  console.log(scheme.secondary(output));
  console.log(
    scheme.accent(
      `Completed in ${formatSeconds(result.elapsedMs)} (${actualRate.toFixed(
        1
      )} digits/sec)`
    )
  );
  await maybeSaveToFile(`Pi digits (${count})\n${output}\n`);
}

async function runPrimes(config) {
  const scheme = getScheme(config);
  const { proceed } = await inquirer.prompt([
    {
      type: "list",
      name: "proceed",
      message: "Primes menu:",
      choices: [
        { name: "Start", value: "start" },
        { name: "Back", value: "back" },
      ],
      default: 0,
    },
  ]);
  if (proceed === "back") return;

  let answers = await inquirer.prompt([
    {
      type: "number",
      name: "count",
      message: "How many prime numbers?",
      default: 100,
      validate: (val) =>
        Number.isInteger(val) && val > 0 && val <= 1000
          ? true
          : "Enter a whole number between 1 and 1000.",
    },
    {
      type: "number",
      name: "increment",
      message: "Group primes by increment:",
      default: 5,
      validate: (val) =>
        Number.isInteger(val) && val > 0 ? true : "Enter a whole number above 0.",
    },
  ]);

  let count = answers.count;
  while (true) {
    const calibrateCount = Math.min(10, count);
    const estimateSample = runHelperTimed("primes", calibrateCount);
    const rate = calibrateCount / (estimateSample.elapsedMs / 1000);
    const adjusted = await enforceTimeCap({
      label: "primes",
      requested: count,
      ratePerSec: rate,
      maxSeconds: 30,
      scheme,
    });

    if (adjusted === null) {
      answers = await inquirer.prompt([
        {
          type: "number",
          name: "count",
          message: "How many prime numbers?",
          default: count,
          validate: (val) =>
            Number.isInteger(val) && val > 0 && val <= 5000
              ? true
              : "Enter a whole number between 1 and 5000.",
        },
        {
          type: "number",
          name: "increment",
          message: "Group primes by increment:",
          default: answers.increment,
          validate: (val) =>
            Number.isInteger(val) && val > 0
              ? true
              : "Enter a whole number above 0.",
        },
      ]);
      count = answers.count;
      continue;
    }
    if (adjusted === 0) return;
    count = adjusted;
    const estimatedMs = (count / rate) * 1000;
    console.log(
      scheme.secondary(
        `Estimate: ${formatSeconds(estimatedMs)} (~${rate.toFixed(
          1
        )} primes/sec)`
      )
    );
    break;
  }

  const spinner =
    config.animations && count > 15
      ? makeSpinner(config, "Generating prime numbers...")
      : null;

  const result = runHelperTimed("primes", count);
  if (spinner) spinner.succeed("Prime numbers ready.");

  const primes = result.output
    .split(",")
    .map((val) => Number(val.trim()))
    .filter((val) => Number.isFinite(val));
  const actualRate = count / (result.elapsedMs / 1000);

  const groups = formatPrimeGroups(primes, answers.increment);
  const lines = groups.map((g, idx) => {
    const color = idx % 2 === 0 ? scheme.primeA : scheme.primeB;
    return color(g.join(", "));
  });

  console.log(scheme.primary("\nPrime numbers"));
  console.log(lines.join("\n"));
  console.log(
    scheme.accent(
      `Completed in ${formatSeconds(result.elapsedMs)} (${actualRate.toFixed(
        1
      )} primes/sec)`
    )
  );
  await maybeSaveToFile(
    `Prime numbers (${count})\n${groups
      .map((g) => g.join(", "))
      .join("\n")}\n`
  );
}

async function runBench(config) {
  const scheme = getScheme(config);
  const { proceed } = await inquirer.prompt([
    {
      type: "list",
      name: "proceed",
      message: "Benchmarks menu:",
      choices: [
        { name: "Start", value: "start" },
        { name: "Back", value: "back" },
      ],
      default: 0,
    },
  ]);
  if (proceed === "back") return;

  showSystemInfo(scheme);

  const answers = await inquirer.prompt([
    {
      type: "list",
      name: "duration",
      message: "Benchmark duration per test:",
      choices: [
        { name: "45 seconds", value: 45 },
        { name: "60 seconds", value: 60 },
        { name: "90 seconds", value: 90 },
      ],
      default: 1,
    },
    {
      type: "checkbox",
      name: "tests",
      message: "Select benchmark suites:",
      choices: [
        { name: "Matrix Multiply (matmul)", value: "bench-matmul", checked: true },
        { name: "BigInt Multiply (bigint)", value: "bench-bigint", checked: true },
        { name: "Prime Sieve (sieve)", value: "bench-sieve", checked: true },
      ],
      validate: (val) =>
        val.length > 0 ? true : "Pick at least one benchmark.",
    },
  ]);

  for (const test of answers.tests) {
    const spinner = makeSpinner(
      config,
      `Running ${test.replace("bench-", "")} for ${answers.duration}s...`
    );
    const result = runHelperTimed(test, answers.duration);
    if (spinner) spinner.succeed("Benchmark complete.");
    console.log(scheme.primary(`\n${test.replace("bench-", "").toUpperCase()}`));
    console.log(scheme.secondary(result.output));
    console.log(
      scheme.accent(`Elapsed: ${formatSeconds(result.elapsedMs)}`)
    );
  }
}

function showCommandTable(scheme) {
  const rows = [
    ["pi", "Pi digits (time-limited ~30s)"],
    ["primes", "Prime numbers (time-limited ~30s)"],
    ["help | -h | /help", "Help and settings"],
    ["bench | run benchmarks", "Benchmark suites (45-60s each)"],
    ["home", "Return to logo/home"],
    ["pi benchy", "Alias for pi digits"],
    ["prime benchy", "Alias for prime numbers"],
    ["run pi", "Alias for pi digits"],
    ["run primes", "Alias for prime numbers"],
  ];

  const cmdWidth = rows.reduce((max, row) => Math.max(max, row[0].length), 0);
  const header = `${scheme.primary("Command".padEnd(cmdWidth))}  ${scheme.primary(
    "Description"
  )}`;

  console.log(header);
  for (const [cmd, desc] of rows) {
    console.log(`${scheme.accent(cmd.padEnd(cmdWidth))}  ${desc}`);
  }
}

async function helpMenu(config) {
  const scheme = getScheme(config);
  console.log(scheme.accent("\n/help menu"));
  showCommandTable(scheme);
  console.log(
    scheme.secondary(
      "\nSettings let you change color schemes and toggle animations for longer runs."
    )
  );

  const { action } = await inquirer.prompt([
    {
      type: "list",
      name: "action",
      message: "Settings:",
      choices: [
        { name: "Change color scheme", value: "colors" },
        {
          name: config.animations ? "Turn animations off" : "Turn animations on",
          value: "toggle",
        },
        { name: "Back to main menu", value: "back" },
      ],
    },
  ]);

  if (action === "colors") {
    const { schemeName } = await inquirer.prompt([
      {
        type: "list",
        name: "schemeName",
        message: "Pick a color scheme:",
        choices: Object.entries(COLOR_SCHEMES).map(([key, value]) => ({
          name: value.label,
          value: key,
        })),
      },
    ]);
    const next = { ...config, colorScheme: schemeName };
    saveConfig(next);
    await showLogoAnimated(next);
    console.log(getScheme(next).primary("Color scheme updated."));
  }

  if (action === "toggle") {
    const next = { ...config, animations: !config.animations };
    saveConfig(next);
    console.log(
      getScheme(next).primary(
        `Animations ${next.animations ? "enabled" : "disabled"}.`
      )
    );
  }
}

async function interactive(config) {
  const scheme = getScheme(config);
  console.log(
    scheme.secondary(
      "Arithmetic benchmarking suite ~ type help for cmds"
    )
  );
  // Open-ended command loop.
  while (true) {
    const { input } = await inquirer.prompt([
      {
        type: "input",
        name: "input",
        message: "What would you like to run?",
      },
    ]);

    const trimmed = String(input || "").trim();
    if (!trimmed) {
      console.log(scheme.secondary("No input received. Standing by."));
      continue;
    }

    const command = resolveCommand([trimmed]);
    if (command === "help") {
      await helpMenu(config);
      continue;
    }
    if (command === "pi") {
      await runPi(config);
      continue;
    }
    if (command === "primes") {
      await runPrimes(config);
      continue;
    }
    if (command === "bench") {
      await runBench(config);
      continue;
    }
    if (command === "home") {
      await showHome(config);
      continue;
    }
    if (command === "exit") {
      console.log(scheme.secondary("Later!"));
      return;
    }

    const response =
      FALLBACK_RESPONSES[
        Math.floor(Math.random() * FALLBACK_RESPONSES.length)
      ];
    console.log(scheme.secondary(response));
  }
}

async function main() {
  const config = loadConfig();
  requireHelperBinary();
  await showHome(config);
  const command = resolveCommand(process.argv.slice(2));
  if (command === "help") return helpMenu(config);
  if (command === "pi") return runPi(config);
  if (command === "primes") return runPrimes(config);
  if (command === "bench") return runBench(config);
  if (command === "home") return showHome(config);
  if (command === "exit") {
    console.log(getScheme(config).secondary("Later!"));
    return;
  }
  return interactive(config);
}

main().catch((err) => {
  console.error(chalk.red("Something went wrong:"), err);
  process.exit(1);
});
