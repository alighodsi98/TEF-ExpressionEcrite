const { app, BrowserWindow, dialog } = require("electron");
const { spawn } = require("child_process");
const path = require("path");
const net = require("net");

let mainWindow = null;
let serverProcess = null;

const PORT = 18923;
const HOST = "127.0.0.1";

function findServerJs() {
  // In packaged app: resources/.next/standalone/server.js
  // In dev: .next/standalone/server.js
  const packaged = path.join(process.resourcesPath, ".next", "standalone", "server.js");
  const dev = path.join(__dirname, "..", ".next", "standalone", "server.js");
  const fs = require("fs");
  if (fs.existsSync(packaged)) return packaged;
  if (fs.existsSync(dev)) return dev;
  throw new Error("server.js not found");
}

function findNodeExe() {
  // In packaged electron-builder app, node is bundled
  const fs = require("fs");

  // Check if node is bundled in resources
  const bundled = path.join(process.resourcesPath, "node", "node.exe");
  if (fs.existsSync(bundled)) return bundled;

  // Fallback to system node
  return "node";
}

function waitForServer(host, port, timeout = 30000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const tryConnect = () => {
      const socket = new net.Socket();
      socket.setTimeout(1000);
      socket.once("connect", () => {
        socket.destroy();
        resolve();
      });
      socket.once("timeout", () => {
        socket.destroy();
        if (Date.now() - start > timeout) {
          reject(new Error("Server start timeout"));
        } else {
          setTimeout(tryConnect, 500);
        }
      });
      socket.once("error", () => {
        socket.destroy();
        if (Date.now() - start > timeout) {
          reject(new Error("Server start timeout"));
        } else {
          setTimeout(tryConnect, 500);
        }
      });
      socket.connect(port, host);
    };
    tryConnect();
  });
}

function startServer() {
  const serverJs = findServerJs();
  const nodeExe = findNodeExe();
  const standaloneDir = path.dirname(serverJs);

  // Copy .next/static into standalone/.next/ if not present
  const fs = require("fs");
  const staticSrc = path.join(standaloneDir, "..", "static");
  const staticDest = path.join(standaloneDir, ".next", "static");
  if (fs.existsSync(staticSrc) && !fs.existsSync(staticDest)) {
    fs.cpSync(staticSrc, staticDest, { recursive: true });
  }

  // Copy prisma db to a writable location next to server.js
  const dbSrc = path.join(__dirname, "..", "prisma", "db", "custom.db");
  const dbDest = path.join(standaloneDir, "prisma", "db", "custom.db");
  if (fs.existsSync(dbSrc) && !fs.existsSync(dbDest)) {
    fs.mkdirSync(path.dirname(dbDest), { recursive: true });
    fs.copyFileSync(dbSrc, dbDest);
  }

  serverProcess = spawn(nodeExe, [serverJs], {
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

  serverProcess.stderr?.on("data", (data) => {
    console.error(`[server] ${data}`);
  });

  serverProcess.on("error", (err) => {
    console.error("Server failed to start:", err);
    dialog.showErrorBox("Erreur", `Le serveur n'a pas pu démarrer: ${err.message}`);
    app.quit();
  });

  serverProcess.on("exit", (code) => {
    if (code !== null && code !== 0) {
      console.error(`Server exited with code ${code}`);
    }
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    show: false,
    title: "TEF Canada — Expression Écrite",
    backgroundColor: "#000000",
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  mainWindow.setMenuBarVisibility(true);
  mainWindow.maximize();

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });

  mainWindow.loadURL(`http://${HOST}:${PORT}`);

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  startServer();
  try {
    await waitForServer(HOST, PORT);
    createWindow();
  } catch (err) {
    dialog.showErrorBox("Erreur", `Le serveur n'a pas répondu: ${err.message}`);
    app.quit();
  }
});

app.on("window-all-closed", () => {
  if (serverProcess) {
    serverProcess.kill();
  }
  app.quit();
});

app.on("before-quit", () => {
  if (serverProcess) {
    serverProcess.kill();
  }
});
