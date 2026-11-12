import { defineConfig, Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { spawn, exec } from "child_process";
import type { IncomingMessage, ServerResponse } from "http";

let isHardhatBooting = false;

async function isRpcAlive(): Promise<boolean> {
  try {
    const res = await fetch("http://127.0.0.1:8545", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", method: "eth_chainId", params: [], id: 1 }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function isContractDeployed(): Promise<boolean> {
  try {
    const res = await fetch("http://127.0.0.1:8545", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "eth_getCode",
        params: ["0x5FbDB2315678afecb367f032d93F642f64180aa3", "latest"],
        id: 2,
      }),
    });
    if (!res.ok) return false;
    const data = (await res.json()) as { result?: string };
    return Boolean(data?.result && data.result !== "0x" && data.result !== "0x0");
  } catch {
    return false;
  }
}

async function ensureHardhatRunning() {
  if (isHardhatBooting) return;
  if (await isRpcAlive()) {
    if (!(await isContractDeployed())) {
      isHardhatBooting = true;
      exec(
        "npx hardhat run scripts/deploy_full_ecosystem.js --network localhost && node scripts/reset_user_wallet.js",
        () => {
          isHardhatBooting = false;
        }
      );
    }
    return;
  }

  isHardhatBooting = true;
  try {
    const child = spawn("npx", ["hardhat", "node", "--hostname", "127.0.0.1", "--port", "8545"], {
      detached: true,
      stdio: "ignore",
    });
    child.unref();

    // Wait up to 15 seconds for Hardhat RPC to listen
    for (let i = 0; i < 30; i++) {
      await new Promise((r) => setTimeout(r, 500));
      if (await isRpcAlive()) break;
    }

    if (await isRpcAlive()) {
      if (!(await isContractDeployed())) {
        await new Promise<void>((resolve) => {
          exec(
            "npx hardhat run scripts/deploy_full_ecosystem.js --network localhost && node scripts/reset_user_wallet.js",
            () => resolve()
          );
        });
      }
    }
  } catch {
    // Ignore background spawn warnings
  } finally {
    isHardhatBooting = false;
  }
}

function hardhatRpcPlugin(): Plugin {
  const handleRpcMiddleware = (req: IncomingMessage, res: ServerResponse) => {
    if (req.method === "OPTIONS") {
      res.writeHead(204, {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      });
      res.end();
      return;
    }

    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", async () => {
      const bodyStr = Buffer.concat(chunks).toString("utf8");
      try {
        const rpcRes = await fetch("http://127.0.0.1:8545", {
          method: req.method || "POST",
          headers: { "Content-Type": "application/json" },
          body: bodyStr || undefined,
        });
        const responseText = await rpcRes.text();
        res.writeHead(rpcRes.status, {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        });
        res.end(responseText);
      } catch {
        // Trigger background boot and return a clean JSON-RPC response without noisy Vite proxy errors
        ensureHardhatRunning();
        let reqId: number | string | null = 1;
        try {
          const parsed = JSON.parse(bodyStr);
          reqId = parsed?.id ?? 1;
        } catch {}
        res.writeHead(200, {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        });
        res.end(
          JSON.stringify({
            jsonrpc: "2.0",
            id: reqId,
            error: { code: -32000, message: "Local Hardhat EVM node is warming up" },
          })
        );
      }
    });
  };

  return {
    name: "cricketverse-hardhat-rpc",
    configureServer(server) {
      ensureHardhatRunning();
      server.middlewares.use("/rpc", handleRpcMiddleware);
    },
    configurePreviewServer(server) {
      ensureHardhatRunning();
      server.middlewares.use("/rpc", handleRpcMiddleware);
    },
  };
}

export default defineConfig({
  plugins: [react(), hardhatRpcPlugin()],
  server: {
    host: "0.0.0.0",
    port: 3000,
    proxy: {
      "/espn-api": {
        target: "https://site.web.api.espn.com",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/espn-api/, ""),
      },
    },
  },
  preview: {
    host: "0.0.0.0",
    port: 3000,
    proxy: {
      "/espn-api": {
        target: "https://site.web.api.espn.com",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/espn-api/, ""),
      },
    },
  },
});
