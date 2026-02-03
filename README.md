# GenThr33 CLI (GenSuite)

GenThr33 is a showy, interactive CLI for generating digits of pi, listing primes, and running math benchmarks. It mixes a neon‑style UI with a Rust helper for fast computation and reliable timing.

<p align="center">
  <img src="demoImg.png" alt="GenThr33 CLI demo" width="600" />
</p>
## Why this exists

- **Fast math**: pi and prime generation are handled by a Rust helper for performance and consistent results.
- **Interactive UX**: prompts, animated logo, and color schemes make the CLI feel lively.
- **Benchmarking**: quick, time‑boxed suites let you gauge your machine in ~45–60 seconds per test.

## Install

Local install from this repo is pretty easy:


```bash
npm install
```

Build the Rust helper (required):

```bash
npm run build:helper
```

Run the CLI:

```bash
node gensuite.js
```

Or, simply install via npm:

```bash
npm install -g genSuite
gensuite
```

## Commands

These can be passed as arguments or typed inside the interactive prompt.

### Core

- `gensuite pi`  
  Prompts for digits of pi and exports results if you want.

- `gensuite primes`  
  Prompts for how many primes and outputs them in colored increments.

- `gensuite bench` or `gensuite run benchmarks`  
  Opens the benchmark menu to run time‑boxed suites.

- `gensuite home`  
  Returns to the logo screen with a blinking block cursor.

### Help

- `gensuite help`  
- `gensuite /help`  
- `gensuite -h`  

### Natural language shortcuts

- `gensuite "give me some pi"`  
- `gensuite "log prime numbers"`

## Interactive UX

The CLI is open‑ended. It continuously asks:

```
What would you like to run?
```

Type commands like:

- `pi`
- `run pi`
- `prime benchy`
- `run benchmarks`
- `/help`
- `home`
- `exit`

If the input doesn’t match supported commands, you’ll get a randomized “directive” response.

## Output Export

After pi or prime generation, you’re asked if you want to export results:

```
Save results to a .txt file? (y/N)
```

If yes, you’ll be prompted for a filename.

## Benchmarks

Benchmarks are time‑boxed and run in the Rust helper:

- **Matrix Multiply (matmul)**  
  Floating‑point matrix multiplication for a quick compute‑heavy test.

- **BigInt Multiply (bigint)**  
  Repeated big‑integer multiplications to stress arbitrary precision math.

- **Prime Sieve (sieve)**  
  Repeated sieving to assess integer throughput.

You choose a duration (45/60/90 seconds) and which suites to run.

## Performance Data (ETA + Rate)

For pi and primes, GenThr33 runs a short calibration sample to estimate:

- **ETA** (expected time to finish)
- **Rate** (digits/sec or primes/sec)

If your request likely exceeds ~30 seconds, you’ll be prompted to cap, re‑enter, or cancel.

## Configuration

GenThr33 stores settings in `gensuite.config.json`:

- `colorScheme`: `neon`, `sunset`, `ocean`
- `animations`: `true | false`

You can change these from the `/help` menu.

## How It Works

### JavaScript CLI

The Node CLI handles:

- prompts and routing
- color themes
- animated logo and cursor
- saving output files

### Rust Helper (required)

The Rust helper is used for all computation:

- `pi <digits>`: fast BigInt Machin‑style calculation
- `primes <count>`: fast sieve generation
- `bench-* <seconds>`: time‑boxed benchmark suites

If the helper isn’t built, the CLI will exit with an error.

## API / Programmatic Use

The CLI is designed primarily for interactive use, but you can invoke it with arguments:

```bash
gensuite pi
gensuite primes
gensuite bench
```

For raw computational output, you can also call the Rust helper directly:

```bash
./gensuite-helper/target/release/gensuite-helper pi 200
./gensuite-helper/target/release/gensuite-helper primes 30
./gensuite-helper/target/release/gensuite-helper bench-matmul 60
```

## Development

```bash
npm install
npm run build:helper
node gensuite.js
```

## License

MIT


❤️, ChrisAdams.io
