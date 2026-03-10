/**
 * MCP Server Endpoint — /api/mcp
 *
 * Implements a simplified JSON-RPC over HTTP transport for the Voltic MCP server.
 * SSEServerTransport is not used here because Next.js App Router does not support
 * the persistent SSE connection model required by that transport. Instead we use a
 * stateless request/response pattern:
 *
 *   GET  /api/mcp — returns server metadata and the full tool list (requires Bearer token)
 *   POST /api/mcp — handles a single JSON-RPC 2.0 tool call (requires Bearer token)
 *
 * Authentication: Bearer token in the Authorization header.
 *   Authorization: Bearer vlt_sk_<hex>
 *
 * The token is resolved to a workspace via the mcp_api_keys table.
 */

import { NextRequest, NextResponse } from "next/server";
import { resolveWorkspaceFromApiKey } from "@/lib/mcp/auth";
import { apiLimiter } from "@/lib/utils/rate-limit";
import { trackServer } from "@/lib/analytics/posthog-server";
import { TOOL_LIST, handleMcpMethod } from "./tools";

// ─── Auth Helper ──────────────────────────────────────────────────────────────

async function authenticate(req: NextRequest): Promise<
  | { workspaceId: string; scopes: string[] }
  | NextResponse
> {
  const authHeader = req.headers.get("authorization") ?? "";
  const apiKey = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7).trim()
    : "";

  if (!apiKey) {
    return NextResponse.json(
      { error: "Unauthorized", message: "Missing Authorization: Bearer <key> header" },
      { status: 401 }
    );
  }

  const workspace = await resolveWorkspaceFromApiKey(apiKey);
  if (!workspace) {
    return NextResponse.json(
      { error: "Unauthorized", message: "Invalid or expired API key" },
      { status: 401 }
    );
  }

  return workspace;
}

// ─── GET — Server Info ────────────────────────────────────────────────────────

export async function GET(req: NextRequest): Promise<NextResponse> {
  const authResult = await authenticate(req);
  if (authResult instanceof NextResponse) return authResult;

  return NextResponse.json({
    jsonrpc: "2.0",
    result: {
      name: "voltic",
      version: "1.0.0",
      description:
        "Voltic MCP Server — access ad intelligence, creative generation, and media management",
      tools: TOOL_LIST,
    },
  });
}

// ─── POST — JSON-RPC Tool Call ────────────────────────────────────────────────

export async function POST(req: NextRequest): Promise<NextResponse> {
  // 1. Auth
  const authResult = await authenticate(req);
  if (authResult instanceof NextResponse) return authResult;
  const { workspaceId } = authResult;

  // 2. Rate limiting — 60 calls per minute per workspace
  const rl = await apiLimiter.check(workspaceId, 60);
  if (!rl.success) {
    return NextResponse.json(
      {
        jsonrpc: "2.0",
        id: null,
        error: { code: -32429, message: "Rate limit exceeded. Try again in a moment." },
      },
      { status: 429 }
    );
  }

  // 3. Parse body
  let body: { jsonrpc?: string; method?: unknown; params?: unknown; id?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      {
        jsonrpc: "2.0",
        id: null,
        error: { code: -32700, message: "Parse error: request body is not valid JSON" },
      },
      { status: 400 }
    );
  }

  const { method, params, id } = body;

  // 4. Validate JSON-RPC structure
  if (typeof method !== "string" || !method) {
    return NextResponse.json(
      {
        jsonrpc: "2.0",
        id: id ?? null,
        error: { code: -32600, message: "Invalid Request: 'method' must be a non-empty string" },
      },
      { status: 400 }
    );
  }

  // 5. Dispatch to tool handler
  const start = Date.now();
  const toolParams = (params && typeof params === "object" && !Array.isArray(params))
    ? (params as Record<string, unknown>)
    : {};

  try {
    const result = await handleMcpMethod(method, toolParams, workspaceId);

    trackServer("mcp_tool_invoked", workspaceId, {
      tool_name: method,
      duration_ms: Date.now() - start,
      status: "success",
    });

    return NextResponse.json({
      jsonrpc: "2.0",
      id: id ?? null,
      result,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal tool error";

    trackServer("mcp_tool_invoked", workspaceId, {
      tool_name: method,
      duration_ms: Date.now() - start,
      status: "error",
    });

    // Method not found
    if (message.startsWith("Unknown method:")) {
      return NextResponse.json(
        {
          jsonrpc: "2.0",
          id: id ?? null,
          error: { code: -32601, message: `Method not found: ${method}` },
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        jsonrpc: "2.0",
        id: id ?? null,
        error: { code: -32000, message },
      },
      { status: 500 }
    );
  }
}
