import { AIRPORTS, CARRIERS, DISRUPTION_CAUSES } from "../public/js/airports.js";
import { StatuteEngine, haversineKm } from "../public/js/statutes.js";

const PUBLIC_CORS_PATHS = new Set([
  "/agent-manifest.json",
  "/flightrights_desk.network.json",
  "/links.json",
  "/agent-mcp.json",
  "/.well-known/nsdeploy.json",
  "/.well-known/nsdeploy-agent.json",
  "/.well-known/agent-card.json",
  "/mcp",
  "/health",
]);

const ALLOWED_MODELS = new Set([
  "alibaba/qwen3.8-flash",
  "qwen3.8-flash",
  "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
  "@cf/openai/gpt-oss-120b",
]);

const rateBuckets = new Map();

function checkRateLimit(ip, limit = 80, windowMs = 3600_000) {
  const now = Date.now();
  const bucket = rateBuckets.get(ip) || { count: 0, resetAt: now + windowMs };
  if (now > bucket.resetAt) {
    bucket.count = 0;
    bucket.resetAt = now + windowMs;
  }
  bucket.count += 1;
  rateBuckets.set(ip, bucket);
  return bucket.count <= limit;
}

function corsHeaders(req, methods = "GET, POST, OPTIONS") {
  const origin = req.headers.get("Origin") || "*";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": methods,
    "Access-Control-Allow-Headers": "Content-Type, Accept",
    "Vary": "Origin",
  };
}

function sseFromChoice(model, choice, usage) {
  const id = `chatcmpl-${crypto.randomUUID().slice(0, 12)}`;
  const created = Math.floor(Date.now() / 1000);
  const chunks = [];
  const msg = choice?.message || {};
  if (Array.isArray(msg.tool_calls) && msg.tool_calls.length > 0) {
    const toolDeltas = msg.tool_calls.map((tc, idx) => ({
      index: idx,
      id: tc.id || `call_${idx}_${Date.now()}`,
      type: "function",
      function: {
        name: tc.function?.name || "",
        arguments: typeof tc.function?.arguments === "string"
          ? tc.function.arguments
          : JSON.stringify(tc.function?.arguments || {}),
      },
    }));
    chunks.push({
      id,
      object: "chat.completion.chunk",
      created,
      model,
      choices: [{ index: 0, delta: { role: "assistant", tool_calls: toolDeltas }, finish_reason: null }],
    });
    chunks.push({
      id,
      object: "chat.completion.chunk",
      created,
      model,
      choices: [{ index: 0, delta: {}, finish_reason: "tool_calls" }],
      usage: usage || undefined,
    });
  } else {
    const text = typeof msg.content === "string" ? msg.content : String(msg.content || "");
    chunks.push({
      id,
      object: "chat.completion.chunk",
      created,
      model,
      choices: [{ index: 0, delta: { role: "assistant", content: text }, finish_reason: null }],
    });
    chunks.push({
      id,
      object: "chat.completion.chunk",
      created,
      model,
      choices: [{ index: 0, delta: {}, finish_reason: choice?.finish_reason || "stop" }],
      usage: usage || undefined,
    });
  }
  return chunks.map((c) => `data: ${JSON.stringify(c)}\n\n`).join("") + "data: [DONE]\n\n";
}

function sanitizeMessages(messages) {
  return (messages || []).map((m) => {
    const out = { role: m.role };
    if (m.content !== undefined && m.content !== null) {
      out.content = typeof m.content === "string" ? m.content : JSON.stringify(m.content);
    } else if (m.role === "assistant" && m.tool_calls) {
      out.content = "";
    }
    if (m.name) out.name = m.name;
    if (m.tool_call_id) out.tool_call_id = m.tool_call_id;
    if (Array.isArray(m.tool_calls)) {
      out.tool_calls = m.tool_calls.map((tc) => ({
        id: tc.id,
        type: "function",
        function: {
          name: tc.function?.name || "",
          arguments: typeof tc.function?.arguments === "string"
            ? tc.function.arguments
            : JSON.stringify(tc.function?.arguments || {}),
        },
      }));
    }
    return out;
  });
}

async function handleChatCompletions(req, env) {
  const headers = corsHeaders(req, "POST, OPTIONS");
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers });

  const ip = req.headers.get("CF-Connecting-IP") || "anon";
  if (!checkRateLimit(ip, 80, 3600_000)) {
    return new Response(
      "Today's free hourly AI allowance on FlightRights Desk is used up for your IP. To keep going, add your own Otari or OpenRouter key in AI model settings.",
      { status: 429, headers: { ...headers, "Content-Type": "text/plain; charset=utf-8" } }
    );
  }

  const rawText = await req.text();
  if (rawText.length > 100_000) {
    return new Response("Request payload too large for free publisher-funded route.", {
      status: 413,
      headers: { ...headers, "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  let body;
  try {
    body = JSON.parse(rawText);
  } catch {
    return new Response("Invalid JSON body.", {
      status: 400,
      headers: { ...headers, "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const requestedModel = String(body.model || "alibaba/qwen3.8-flash");
  if (!ALLOWED_MODELS.has(requestedModel)) {
    return new Response(`Model "${requestedModel}" is not enabled on this publisher-funded router. Use alibaba/qwen3.8-flash or add your own key in AI model settings.`, {
      status: 400,
      headers: { ...headers, "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const aiInput = {
    messages: sanitizeMessages(body.messages),
    max_tokens: Math.min(Number(body.max_tokens) || 1400, 1800),
    temperature: 0.15,
  };
  if (Array.isArray(body.tools) && body.tools.length > 0) {
    aiInput.tools = body.tools;
  }

  let aiRes;
  let lastErr = null;
  const modelsToTry = [
    "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
    "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
    "@cf/openai/gpt-oss-120b",
  ];
  for (const cfModel of modelsToTry) {
    try {
      aiRes = await env.AI.run(cfModel, aiInput);
      if (aiRes) break;
    } catch (err) {
      lastErr = err;
    }
  }
  if (!aiRes) {
    return new Response(
      `The free publisher-funded AI router is temporarily busy (${String(lastErr || "upstream error").slice(0, 120)}). Retry or add your own key in AI model settings.`,
      { status: 502, headers: { ...headers, "Content-Type": "text/plain; charset=utf-8" } }
    );
  }

  let choice = aiRes?.choices?.[0];
  if (!choice) {
    const topCalls = Array.isArray(aiRes?.tool_calls) && aiRes.tool_calls.length > 0
      ? aiRes.tool_calls.map((tc, i) => ({
          id: tc.id || `call_${i}_${Date.now()}`,
          type: "function",
          function: {
            name: tc.name || tc.function?.name || "",
            arguments: typeof (tc.arguments ?? tc.function?.arguments) === "string"
              ? (tc.arguments ?? tc.function?.arguments)
              : JSON.stringify(tc.arguments ?? tc.function?.arguments ?? {}),
          },
        }))
      : null;
    choice = {
      message: {
        role: "assistant",
        content: topCalls ? null : (aiRes?.response || "No response generated."),
        ...(topCalls ? { tool_calls: topCalls } : {}),
      },
      finish_reason: topCalls ? "tool_calls" : "stop",
    };
  }

  if (body.stream === false) {
    return new Response(
      JSON.stringify({
        id: `chatcmpl-${crypto.randomUUID().slice(0, 12)}`,
        object: "chat.completion",
        created: Math.floor(Date.now() / 1000),
        model: requestedModel,
        choices: [choice],
        usage: aiRes?.usage || null,
      }),
      { headers: { ...headers, "Content-Type": "application/json; charset=utf-8" } }
    );
  }

  const sse = sseFromChoice(requestedModel, choice, aiRes?.usage);
  return new Response(sse, {
    headers: {
      ...headers,
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache",
    },
  });
}

function handleMcp(req) {
  const headers = { ...corsHeaders(req, "GET, POST, OPTIONS"), "Content-Type": "application/json; charset=utf-8" };
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers });
  if (req.method === "GET") {
    return new Response(JSON.stringify({
      name: "flightrights-desk-mcp",
      version: "1.0.0",
      protocol: "2025-11-25",
      tools: ["calculate_route_entitlement", "lookup_great_circle_distance", "get_statute_guide"],
    }), { headers });
  }
  return req.json().then((rpc) => {
    const id = rpc?.id ?? null;
    if (rpc?.method === "initialize") {
      return new Response(JSON.stringify({
        jsonrpc: "2.0",
        id,
        result: {
          protocolVersion: "2025-11-25",
          serverInfo: { name: "flightrights-desk-mcp", version: "1.0.0" },
          capabilities: { tools: {} },
        },
      }), { headers });
    }
    if (rpc?.method === "tools/list") {
      return new Response(JSON.stringify({
        jsonrpc: "2.0",
        id,
        result: {
          tools: [
            {
              name: "calculate_route_entitlement",
              description: "Calculate deterministic EU261, UK261, Turkish SHY-PASSENGER, and US DOT flight compensation for an IATA corridor and carrier.",
              inputSchema: {
                type: "object",
                required: ["origin", "destination", "carrier", "disruptionType", "delayHours"],
                properties: {
                  origin: { type: "string" },
                  destination: { type: "string" },
                  carrier: { type: "string" },
                  disruptionType: { type: "string" },
                  delayHours: { type: "number" },
                  cause: { type: "string" },
                  noticeDays: { type: "integer" },
                  passengers: { type: "integer" },
                },
              },
            },
            {
              name: "lookup_great_circle_distance",
              description: "Calculate exact Haversine great-circle distance in km and miles between two IATA airports.",
              inputSchema: {
                type: "object",
                required: ["origin", "destination"],
                properties: { origin: { type: "string" }, destination: { type: "string" } },
              },
            },
            {
              name: "get_statute_guide",
              description: "Return statutory passenger rights bands and CJEU extraordinary-circumstances precedent rubric.",
              inputSchema: { type: "object", properties: {} },
            },
          ],
        },
      }), { headers });
    }
    if (rpc?.method === "tools/call") {
      const name = rpc?.params?.name;
      const args = rpc?.params?.arguments || {};
      let data;
      if (name === "calculate_route_entitlement") {
        data = StatuteEngine.evaluate(args);
      } else if (name === "lookup_great_circle_distance") {
        const a = AIRPORTS[String(args.origin || "").toUpperCase()];
        const b = AIRPORTS[String(args.destination || "").toUpperCase()];
        data = a && b
          ? { ok: true, origin: a, destination: b, distanceKm: haversineKm(a, b), distanceMiles: Math.round(haversineKm(a, b) * 0.621371) }
          : { ok: false, reason: "Unknown origin or destination IATA code." };
      } else if (name === "get_statute_guide") {
        data = { ok: true, airportCount: Object.keys(AIRPORTS).length, carrierCount: Object.keys(CARRIERS).length, causes: Object.values(DISRUPTION_CAUSES) };
      } else {
        return new Response(JSON.stringify({
          jsonrpc: "2.0",
          id,
          error: { code: -32601, message: `Unknown tool: ${name}` },
        }), { headers });
      }
      return new Response(JSON.stringify({
        jsonrpc: "2.0",
        id,
        result: { content: [{ type: "text", text: JSON.stringify(data) }] },
      }), { headers });
    }
    return new Response(JSON.stringify({
      jsonrpc: "2.0",
      id,
      error: { code: -32601, message: `Unsupported method: ${rpc?.method}` },
    }), { headers });
  }).catch(() => new Response(JSON.stringify({
    jsonrpc: "2.0",
    id: null,
    error: { code: -32700, message: "Parse error" },
  }), { status: 400, headers }));
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const pathname = url.pathname;

    if (pathname === "/health") {
      return new Response(JSON.stringify({ ok: true, service: "flightrights-desk", network: "flightrights_desk" }), {
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    if (pathname === "/v1/models") {
      const headers = { ...corsHeaders(req, "GET, OPTIONS"), "Content-Type": "application/json; charset=utf-8" };
      if (req.method === "OPTIONS") return new Response(null, { status: 204, headers });
      return new Response(JSON.stringify({
        object: "list",
        data: [{ id: "alibaba/qwen3.8-flash", object: "model", owned_by: "flightrights-desk-publisher-funded" }],
      }), { headers });
    }

    if (pathname === "/v1/chat/completions") {
      return handleChatCompletions(req, env);
    }

    if (pathname === "/mcp") {
      return handleMcp(req);
    }

    if (pathname === "/.well-known/agent-card.json") {
      return new Response(JSON.stringify({
        name: "FlightRights Desk",
        description: "Deterministic EU261, UK261, Turkish SHY-PASSENGER, US DOT, and Montreal Convention air passenger rights workbench with browser multi-agent runtime and cross-origin Disruption Ledger verification.",
        url: "https://flightrights-desk.bedir-ai.workers.dev/",
        version: "1.0.0",
        capabilities: { streaming: true, openAgenticWebProfile: "0.3", crossOriginPeerInterop: true },
        agentManifest: "https://flightrights-desk.bedir-ai.workers.dev/agent-manifest.json",
        networkUrl: "https://flightrights-desk.bedir-ai.workers.dev/flightrights_desk",
        mcpEndpoint: "https://flightrights-desk.bedir-ai.workers.dev/mcp",
        linkedPeers: ["https://disruption-ledger.bedir-ai.workers.dev/disruption_verifier"],
      }, null, 2), {
        headers: { "Content-Type": "application/json; charset=utf-8", "Access-Control-Allow-Origin": "*" },
      });
    }

    const assetUrl = new URL(req.url);
    if (pathname === "/") assetUrl.pathname = "/index.html";
    const assetResp = await env.ASSETS.fetch(new Request(assetUrl.toString(), req));
    const resp = new Response(assetResp.body, assetResp);

    if (PUBLIC_CORS_PATHS.has(pathname)) {
      resp.headers.set("Access-Control-Allow-Origin", "*");
    }
    if (pathname === "/runtime/sandbox-worker.js") {
      resp.headers.set("Content-Security-Policy", "default-src 'none'; script-src blob:; connect-src 'none'; worker-src 'none'");
    } else if (pathname === "/" || pathname === "/index.html") {
      resp.headers.set(
        "Content-Security-Policy",
        "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' https://disruption-ledger.bedir-ai.workers.dev https://api.otari.ai https://eu.api.otari.ai https://openrouter.ai https://api.openai.com https://api.anthropic.com https://generativelanguage.googleapis.com; frame-src 'self' https://disruption-ledger.bedir-ai.workers.dev; worker-src 'self'; require-trusted-types-for 'script'; trusted-types agentify-website"
      );
    }
    if (pathname.startsWith("/bridge/")) {
      resp.headers.delete("X-Frame-Options");
    }
    return resp;
  },
};
