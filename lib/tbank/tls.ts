import { existsSync, readFileSync } from "node:fs";
import https from "node:https";
import { join } from "node:path";
import tls from "node:tls";

const BUNDLE_RELATIVE = join("certs", "russian-trusted-ca-bundle.pem");
const REQUEST_TIMEOUT_MS = 20_000;

let cachedBundle: string | null | undefined;
let cachedAgent: https.Agent | undefined;

function candidateBundlePaths(): string[] {
  const paths = [
    process.env.NODE_EXTRA_CA_CERTS?.trim(),
    join(process.cwd(), BUNDLE_RELATIVE),
    join("/var/task", BUNDLE_RELATIVE),
    join("/var/task", "certs", "russian-trusted-ca-bundle.pem"),
  ];
  return [...new Set(paths.filter((path): path is string => Boolean(path)))];
}

export function loadRussianTrustedCaBundle(): string | null {
  if (cachedBundle !== undefined) return cachedBundle;

  for (const path of candidateBundlePaths()) {
    try {
      if (!existsSync(path)) continue;
      const pem = readFileSync(path, "utf8");
      if (pem.includes("BEGIN CERTIFICATE")) {
        cachedBundle = pem;
        return pem;
      }
    } catch {
      // Try the next candidate path.
    }
  }

  cachedBundle = null;
  return null;
}

function getTbankHttpsAgent(): https.Agent {
  if (cachedAgent) return cachedAgent;

  const extra = loadRussianTrustedCaBundle();
  console.info("[tbank-tls]", {
    caBundleLoaded: Boolean(extra),
    rejectUnauthorized: true,
  });
  cachedAgent = new https.Agent({
    keepAlive: true,
    rejectUnauthorized: true,
    ca: extra ? [...tls.rootCertificates, extra] : undefined,
  });
  return cachedAgent;
}

/**
 * Server-side POST to T-Bank.
 * Trusts Node's default CAs plus Минцифры Root/Sub CA when the public
 * bundle is present. Never disables TLS verification.
 */
export function tbankFetch(
  url: string,
  init: { method?: string; headers?: Record<string, string>; body: string }
): Promise<Response> {
  const agent = getTbankHttpsAgent();
  const method = init.method ?? "POST";
  const headers = init.headers ?? {};

  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const request = https.request(
      {
        protocol: parsed.protocol,
        hostname: parsed.hostname,
        port: parsed.port || 443,
        path: `${parsed.pathname}${parsed.search}`,
        method,
        headers: {
          ...headers,
          "Content-Length": String(Buffer.byteLength(init.body)),
        },
        agent,
        rejectUnauthorized: true,
      },
      (incoming) => {
        const chunks: Buffer[] = [];
        incoming.on("data", (chunk: Buffer) => chunks.push(chunk));
        incoming.on("end", () => {
          const text = Buffer.concat(chunks).toString("utf8");
          const responseHeaders = new Headers();
          const contentType = incoming.headers["content-type"];
          if (typeof contentType === "string") {
            responseHeaders.set("Content-Type", contentType);
          }
          resolve(
            new Response(text, {
              status: incoming.statusCode ?? 500,
              headers: responseHeaders,
            })
          );
        });
      }
    );

    request.setTimeout(REQUEST_TIMEOUT_MS, () => {
      request.destroy(new Error("T-Bank request timeout"));
    });
    request.on("error", reject);
    request.write(init.body);
    request.end();
  });
}
