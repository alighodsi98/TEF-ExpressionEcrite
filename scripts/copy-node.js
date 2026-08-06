const fs = require("fs");
const path = require("path");

const src = process.execPath;
const dest = path.join(__dirname, "..", "build-resources", "node.exe");

fs.mkdirSync(path.dirname(dest), { recursive: true });
fs.copyFileSync(src, dest);
console.log("node.exe copied to", dest);
