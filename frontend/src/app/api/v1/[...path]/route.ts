import { NextRequest, NextResponse } from "next/server";
import http from "http";

const BACKEND_HOST = "127.0.0.1";
const BACKEND_PORT = 8000;

function copyHeaders(headers: Headers): Record<string, string> {
  const out: Record<string, string> = {};
  headers.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (
      lower !== "host" &&
      lower !== "connection" &&
      lower !== "transfer-encoding"
    ) {
      out[key] = value;
    }
  });
  return out;
}

function sendToBackend(
  method: string,
  path: string,
  headers: Record<string, string>,
  body: Buffer
): Promise<{
  status: number;
  headers: Record<string, string>;
  body: ReadableStream<Uint8Array> | null;
}> {
  return new Promise((resolve, reject) => {
    const options: http.RequestOptions = {
      hostname: BACKEND_HOST,
      port: BACKEND_PORT,
      path,
      method,
      headers,
    };

    const proxyReq = http.request(options, (proxyRes) => {
      const resHeaders: Record<string, string> = {};
      for (const [key, value] of Object.entries(proxyRes.headers)) {
        if (value !== undefined && key.toLowerCase() !== "transfer-encoding") {
          resHeaders[key] = Array.isArray(value) ? value.join(", ") : value;
        }
      }

      // 流式转发响应体（支持 SSE 实时推送，避免整体缓冲）
      const stream = new ReadableStream<Uint8Array>({
        start(controller) {
          proxyRes.on("data", (chunk) => {
            try {
              controller.enqueue(new Uint8Array(chunk));
            } catch {
              // ignore post-cancel enqueue
            }
          });
          proxyRes.on("end", () => controller.close());
          proxyRes.on("error", (err) => controller.error(err));
        },
        cancel() {
          proxyRes.destroy();
        },
      });

      resolve({
        status: proxyRes.statusCode || 500,
        headers: resHeaders,
        body: stream,
      });
    });

    proxyReq.on("error", (err) => reject(err));
    if (body.length > 0) {
      proxyReq.write(body);
    }
    proxyReq.end();
  });
}

const REDIRECT_CODES = [301, 302, 303, 307, 308];

async function proxyRequest(
  req: NextRequest,
  path: string
): Promise<NextResponse> {
  const headers = copyHeaders(req.headers);
  const body = Buffer.from(await req.arrayBuffer());

  let method = req.method;
  let currentPath = path;
  let currentHeaders = headers;
  let currentBody = body;

  // Follow backend redirects (e.g. FastAPI redirect_slashes) on the server
  // side to avoid an endless 307/308 loop between Next.js and the backend.
  for (let i = 0; i < 5; i++) {
    const hasQuery = currentPath.includes("?");
    const targetPath = hasQuery
      ? `/api/v1/${currentPath}`
      : `/api/v1/${currentPath}${req.nextUrl.search}`;
    const res = await sendToBackend(method, targetPath, currentHeaders, currentBody);

    if (REDIRECT_CODES.includes(res.status) && res.headers.location) {
      const loc = res.headers.location;
      const match = loc.match(/\/api\/v1\/([^?]*)(\?.*)?$/);
      if (match) {
        currentPath = match[1];
        const redirectSearch = match[2] || "";
        if (redirectSearch) {
          currentPath += redirectSearch;
        }
        if (
          res.status === 303 ||
          (method !== "GET" && method !== "HEAD" && res.status !== 307 && res.status !== 308)
        ) {
          method = "GET";
          currentBody = Buffer.alloc(0);
        }
        continue;
      }
    }

    const isNoBody = res.status === 204 || res.status === 205 || res.status === 304;
    return new NextResponse(
      isNoBody ? null : (res.body as unknown as ReadableStream<Uint8Array> | null),
      {
        status: res.status,
        headers: res.headers,
      }
    );
  }

  return NextResponse.json({ detail: "Too many redirects" }, { status: 502 });
}

export async function GET(
  req: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const path = (await params).path.join("/");
  return proxyRequest(req, path);
}

export async function POST(
  req: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const path = (await params).path.join("/");
  return proxyRequest(req, path);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const path = (await params).path.join("/");
  return proxyRequest(req, path);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const path = (await params).path.join("/");
  return proxyRequest(req, path);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const path = (await params).path.join("/");
  return proxyRequest(req, path);
}