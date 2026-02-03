use std::env;
use std::time::{Duration, Instant};

fn arctan_inv(x: i64, scale: num_bigint::BigInt) -> num_bigint::BigInt {
    use num_bigint::BigInt;
    use num_traits::{One, Zero};

    let x_big = BigInt::from(x);
    let x2 = &x_big * &x_big;
    let mut term = &scale / &x_big;
    let mut sum = term.clone();
    let mut k = BigInt::one();
    let mut sign: i32 = -1;

    loop {
        term = term / &x2;
        let denom = (&k * 2u32) + 1u32;
        let add = &term / denom;
        if add.is_zero() {
            break;
        }
        if sign < 0 {
            sum -= add;
        } else {
            sum += add;
        }
        sign = -sign;
        k += 1u32;
    }
    sum
}

fn pow10(n: u32) -> num_bigint::BigInt {
    use num_bigint::BigInt;
    use num_traits::One;
    let mut v = BigInt::one();
    for _ in 0..n {
        v *= 10u32;
    }
    v
}

fn compute_pi(digits: u32) -> String {
    let extra: u32 = 5;
    let scale = pow10(digits + extra);
    let atan5 = arctan_inv(5, scale.clone());
    let atan239 = arctan_inv(239, scale.clone());
    let pi_scaled = (atan5 * 16u32) - (atan239 * 4u32);

    let rounding = 5u32 * pow10(extra - 1);
    let pi_rounded = (pi_scaled + rounding) / pow10(extra);
    let mut pi_str = pi_rounded.to_string();
    let target_len = (digits + 1) as usize;
    if pi_str.len() < target_len {
        pi_str = format!("{:0>width$}", pi_str, width = target_len);
    }
    let (head, tail) = pi_str.split_at(1);
    format!("{head}.{tail}")
}

fn generate_primes(count: usize) -> Vec<usize> {
    if count == 0 {
        return vec![];
    }
    if count == 1 {
        return vec![2];
    }
    let upper = if count < 6 {
        15
    } else {
        let c = count as f64;
        (c * (c.ln() + c.ln().ln())).ceil() as usize
    };
    let limit = upper.max(15);
    let mut sieve = vec![false; limit + 1];
    let mut primes = Vec::with_capacity(count);
    for i in 2..=limit {
        if !sieve[i] {
            primes.push(i);
            let mut j = i * i;
            while j <= limit {
                sieve[j] = true;
                j += i;
            }
        }
        if primes.len() >= count {
            break;
        }
    }
    primes.truncate(count);
    primes
}

fn bench_matmul(seconds: u64) -> String {
    let n = 128usize;
    let mut a = vec![1.001f64; n * n];
    let mut b = vec![0.999f64; n * n];
    let mut c = vec![0.0f64; n * n];
    let start = Instant::now();
    let mut iters: u64 = 0;
    let duration = Duration::from_secs(seconds);
    let sample_window = Duration::from_secs(1);
    let mut samples: Vec<f64> = Vec::new();

    while start.elapsed() < duration {
        let sample_start = Instant::now();
        let mut sample_iters: u64 = 0;
        while sample_start.elapsed() < sample_window && start.elapsed() < duration {
            for i in 0..n {
                for k in 0..n {
                    let aik = a[i * n + k];
                    for j in 0..n {
                        c[i * n + j] += aik * b[k * n + j];
                    }
                }
            }
            a[0] = c[0] / 3.14159;
            sample_iters += 1;
            iters += 1;
        }
        let sample_elapsed = sample_start.elapsed().as_secs_f64();
        if sample_elapsed > 0.0 {
            let flops = 2.0 * (n as f64).powi(3) * sample_iters as f64;
            samples.push((flops / sample_elapsed) / 1.0e9);
        }
    }

    let elapsed = start.elapsed().as_secs_f64();
    let flops = 2.0 * (n as f64).powi(3) * iters as f64;
    let gflops = (flops / elapsed) / 1.0e9;
    let (min, avg, max) = stats(&samples);
    format!(
        "Iterations: {iters}\nGFLOP/s avg: {:.2}\nGFLOP/s min: {:.2}\nGFLOP/s max: {:.2}\nGFLOP/s overall: {:.2}\nSize: {n}x{n}",
        avg, min, max, gflops
    )
}

fn bench_bigint(seconds: u64) -> String {
    use num_bigint::BigInt;
    use num_traits::One;

    let mut a = BigInt::one();
    let mut b = BigInt::one();
    for _ in 0..4096 {
        a = &a * 10u32 + 7u32;
        b = &b * 10u32 + 3u32;
    }

    let start = Instant::now();
    let duration = Duration::from_secs(seconds);
    let sample_window = Duration::from_secs(1);
    let mut iters: u64 = 0;
    let mut acc = BigInt::one();
    let mut samples: Vec<f64> = Vec::new();

    while start.elapsed() < duration {
        let sample_start = Instant::now();
        let mut sample_iters: u64 = 0;
        while sample_start.elapsed() < sample_window && start.elapsed() < duration {
            acc = &a * &b + &acc;
            iters += 1;
            sample_iters += 1;
        }
        let sample_elapsed = sample_start.elapsed().as_secs_f64();
        if sample_elapsed > 0.0 {
            samples.push(sample_iters as f64 / sample_elapsed);
        }
    }

    let elapsed = start.elapsed().as_secs_f64();
    let per_sec = iters as f64 / elapsed;
    let (min, avg, max) = stats(&samples);
    format!(
        "Iterations: {iters}\nMultiplies/sec avg: {:.2}\nMultiplies/sec min: {:.2}\nMultiplies/sec max: {:.2}\nMultiplies/sec overall: {:.2}\nDigits: {}",
        avg, min, max, per_sec,
        acc.to_string().len()
    )
}

fn sieve_count(limit: usize) -> usize {
    let mut sieve = vec![false; limit + 1];
    let mut count = 0;
    for i in 2..=limit {
        if !sieve[i] {
            count += 1;
            let mut j = i * i;
            while j <= limit {
                sieve[j] = true;
                j += i;
            }
        }
    }
    count
}

fn bench_sieve(seconds: u64) -> String {
    let limit = 2_000_000usize;
    let start = Instant::now();
    let duration = Duration::from_secs(seconds);
    let sample_window = Duration::from_secs(1);
    let mut iters: u64 = 0;
    let mut primes_count: usize = 0;
    let mut samples: Vec<f64> = Vec::new();

    while start.elapsed() < duration {
        let sample_start = Instant::now();
        let mut sample_iters: u64 = 0;
        while sample_start.elapsed() < sample_window && start.elapsed() < duration {
            primes_count = sieve_count(limit);
            iters += 1;
            sample_iters += 1;
        }
        let sample_elapsed = sample_start.elapsed().as_secs_f64();
        if sample_elapsed > 0.0 {
            samples.push(sample_iters as f64 / sample_elapsed);
        }
    }

    let elapsed = start.elapsed().as_secs_f64();
    let per_sec = iters as f64 / elapsed;
    let (min, avg, max) = stats(&samples);
    format!(
        "Iterations: {iters}\nSieves/sec avg: {:.2}\nSieves/sec min: {:.2}\nSieves/sec max: {:.2}\nSieves/sec overall: {:.2}\nLimit: {limit}\nPrimes: {primes_count}",
        avg, min, max, per_sec
    )
}

fn stats(samples: &[f64]) -> (f64, f64, f64) {
    if samples.is_empty() {
        return (0.0, 0.0, 0.0);
    }
    let mut min = samples[0];
    let mut max = samples[0];
    let mut sum = 0.0;
    for &v in samples {
        if v < min {
            min = v;
        }
        if v > max {
            max = v;
        }
        sum += v;
    }
    let avg = sum / samples.len() as f64;
    (min, avg, max)
}

fn main() {
    let mut args = env::args().skip(1);
    let cmd = args.next().unwrap_or_default();
    match cmd.as_str() {
        "pi" => {
            let digits: u32 = args.next().unwrap_or("50".to_string()).parse().unwrap_or(50);
            println!("{}", compute_pi(digits));
        }
        "primes" => {
            let count: usize = args.next().unwrap_or("15".to_string()).parse().unwrap_or(15);
            let primes = generate_primes(count);
            let line = primes
                .into_iter()
                .map(|p| p.to_string())
                .collect::<Vec<_>>()
                .join(", ");
            println!("{line}");
        }
        "bench-matmul" => {
            let seconds: u64 = args.next().unwrap_or("60".to_string()).parse().unwrap_or(60);
            println!("{}", bench_matmul(seconds));
        }
        "bench-bigint" => {
            let seconds: u64 = args.next().unwrap_or("60".to_string()).parse().unwrap_or(60);
            println!("{}", bench_bigint(seconds));
        }
        "bench-sieve" => {
            let seconds: u64 = args.next().unwrap_or("60".to_string()).parse().unwrap_or(60);
            println!("{}", bench_sieve(seconds));
        }
        _ => {
            eprintln!(
                "usage: gensuite-helper [pi <digits>|primes <count>|bench-matmul <sec>|bench-bigint <sec>|bench-sieve <sec>]"
            );
        }
    }
}
