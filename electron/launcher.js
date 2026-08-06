const { spawn } = require("child_process");
const net = require("net");
const { exec } = require("child_process");
const path = require("path");
const fs = require("fs");

const PORT = 18923;
const HOST = "127.0.0.1";

function findServerJs() {
  const base = path.dirname(process.execPath);
  const candidates = [
    path.join(base, ".next", "standalone", "server.js"),
    path.join(base, "server.js"),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  throw new Error("server.js introuvable");
}

function findNodeExe() {
  const base = path.dirname(process.execPath);
  const candidates = [
    path.join(base, "node", "node.exe"),
    path.join(base, "node.exe"),
    "node",
  ];
  for (const p of candidates) {
    if (p !== "node" && fs.existsSync(p)) return p;
  }
  return "node";
}

function waitForServer(timeout = 30000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const tryConnect = () => {
      const socket = new net.Socket();
      socket.setTimeout(1000);
      socket.once("connect", () => { socket.destroy(); resolve(); });
      socket.once("timeout", () => {
        socket.destroy();
        Date.now() - start > timeout ? reject(new Error("timeout")) : setTimeout(tryConnect, 500);
      });
      socket.once("error", () => {
        socket.destroy();
        Date.now() - start > timeout ? reject(new Error("timeout")) : setTimeout(tryConnect, 500);
      });
      socket.connect(PORT, HOST);
    };
    tryConnect();
  });
}

async function main() {
  const serverJs = findServerJs();
  const nodeExe = findNodeExe();
  const standaloneDir = path.dirname(serverJs);

  // Ensure .next/static exists in standalone
  const staticSrc = path.join(standaloneDir, "..", "static");
  const staticDest = path.join(standaloneDir, ".next", "static");
  if (fs.existsSync(staticSrc) && !fs.existsSync(staticDest)) {
    fs.cpSync(staticSrc, staticDest, { recursive: true });
  }

  // Copy prisma schema if needed
  const schemaSrc = path.join(__dirname, "..", "prisma", "schema.prisma");
  const schemaDest = path.join(standaloneDir, "prisma", "schema.prisma");
  if (fs.existsSync(schemaSrc) && !fs.existsSync(schemaDest)) {
    fs.mkdirSync(path.dirname(schemaDest), { recursive: true });
    fs.copyFileSync(schemaSrc, schemaDest);
  }

  // Copy .prisma client
  const prismaClientSrc = path.join(__dirname, "..", "node_modules", ".prisma", "client");
  const prismaClientDest = path.join(standaloneDir, "node_modules", ".prisma", "client");
  if (fs.existsSync(prismaClientSrc) && !fs.existsSync(prismaClientDest)) {
    fs.mkdirSync(path.dirname(prismaClientDest), { recursive: true });
    fs.cpSync(prismaClientSrc, prismaClientDest, { recursive: true });
  }

  console.log("Démarrage du serveur...");

  const server = spawn(nodeExe, [serverJs], {
    cwd: standaloneDir,
    env: {
      ...process.env,
      PORT: String(PORT),
      HOST,
      NODE_ENV: "production",
      DATABASE_URL: `file:${path.join(standaloneDir, "prisma", "db", "custom.db")}`,
    },
    stdio: "pipe",
  });

  server.stdout?.on("data", (d) => process.stdout.write(d));
  server.stderr?.on("data", (d) => process.stderr.write(d));

  server.on("error", (err) => {
    console.error("Erreur serveur:", err.message);
    process.exit(1);
  });

  try {
    await waitForServer(60000);
    console.log("Serveur prêt. Ouverture du navigateur...");

    // Open in default browser maximized (Edge app mode if available, else default)
    const url = `http://${HOST}:${PORT}`;
    const edgePath = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
    const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

    if (fs.existsSync(edgePath)) {
      spawn(edgePath, ["--start-maximized", "--app=" + url], { detached: true, stdio: "ignore" }).unref();
    } else if (fs.existsSync(chromePath)) {
      spawn(chromePath, ["--start-maximized", "--app=" + url], { detached: true, stdio: "ignore" }).unref();
    } else {
      exec(`start "" "${url}"`);
    }

    // Keep alive until killed
    server.on("exit", () => process.exit());
    process.on("SIGINT", () => { server.kill(); process.exit(); });
    process.on("SIGTERM", () => { server.kill(); process.exit(); });

  } catch (err) {
    console.error("Le serveur n'a pas démarré à temps:", err.message);
    server.kill();
    process.exit(1);
  }
}

main();
