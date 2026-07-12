import { NextRequest, NextResponse } from "next/server";
import http from "http";

const BACKEND_HOST = "127.0.0.1";
const BACKEND_PORT = 8000;

function proxyRequest(
  req: NextRequest,
  path: string
): Promise<NextResponse> {
  return new Promise((resolve) => {
    const targetPath = `/api/v1/${path}${req.nextUrl.search}`;

    // 构建 headers
    const headers: Record<string, string> = {};
    req.headers.forEach((value, key) => {
      const lower = key.toLowerCase();
      if (lower !== "host" && lower !== "connection") {
        headers[key] = value;
      }
    });

    const options: http.RequestOptions = {
      hostname: BACKEND_HOST,
      port: BACKEND_PORT,
      path: targetPath,
      method: req.method,
      headers,
    };

    const proxyReq = http.request(options, (proxyRes) => {
      const resHeaders: Record<string, string> = {};
      if (proxyRes.headers) {
        for (const [key, value] of Object.entries(proxyRes.headers)) {
          if (value !== undefined && key.toLowerCase() !== "transfer-encoding") {
            resHeaders[key] = Array.isArray(value) ? value.join(", ") : value;
          }
        }
      }

      const chunks: Buffer[] = [];
      proxyRes.on("data", (chunk) => chunks.push(chunk));
      proxyRes.on("end", () => {
        const body = Buffer.concat(chunks);
        resolve(
          new NextResponse(body, {
            status: proxyRes.statusCode || 500,
            headers: resHeaders,
          })
        );
      });
    });

    proxyReq.on("error", (err) => {
      resolve(
        NextResponse.json(
          { detail: `Backend proxy error: ${err.message}` },
          { status: 502 }
        )
      );
    });

    // 转发 body
    req.arrayBuffer().then((buf) => {
      if (buf.byteLength > 0) {
        proxyReq.write(Buffer.from(buf));
      }
      proxyReq.end();
    });
  });
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
