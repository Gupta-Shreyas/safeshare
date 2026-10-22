import { ethers, artifacts } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const [admin] = await ethers.getSigners();
  const app = await ethers.deployContract("SafeShare", [admin.address]);
  await app.waitForDeployment();
  const address = await app.getAddress();
  console.log("SafeShare deployed to:", address);
  console.log("Admin account:", admin.address);

  const outDir = path.join(__dirname, "../../web/src/contracts");
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, "address.json"), JSON.stringify({ address }, null, 2));
  const art = await artifacts.readArtifact("SafeShare");
  fs.writeFileSync(path.join(outDir, "SafeShare.abi.json"), JSON.stringify(art.abi, null, 2));
}
main().catch((e) => { console.error(e); process.exit(1); });