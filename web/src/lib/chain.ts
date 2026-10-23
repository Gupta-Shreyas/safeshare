import { ethers } from "ethers";
import abi from "@/contracts/SafeShare.abi.json";
import deployed from "@/contracts/address.json";

export const provider = new ethers.JsonRpcProvider(process.env.RPC_URL ?? "http://127.0.0.1:8545");

const MNEMONIC =
  process.env.HARDHAT_MNEMONIC ?? "test test test test test test test test test test test junk";

// Shared by every request in this server process.
const g = globalThis as unknown as {
  __ssq?: Map<string, Promise<unknown>>;
  __sswallets?: Map<number, ethers.Wallet>;
};
const queues = (g.__ssq ??= new Map());
const wallets = (g.__sswallets ??= new Map());

// One blockchain account sends one transaction at a time, so nonces never collide.
// Different users (different accounts) still transact in parallel.
class SerialWallet extends ethers.Wallet {
  async sendTransaction(tx: ethers.TransactionRequest): Promise<ethers.TransactionResponse> {
    const prev = queues.get(this.address) ?? Promise.resolve();
    const run = prev.then(() => super.sendTransaction(tx));
    queues.set(this.address, run.catch(() => undefined));
    return run;
  }
}

// Each app user is mapped to one of the local test accounts (index 0 = admin).
export function walletFor(index: number): ethers.Wallet {
  let w = wallets.get(index);
  if (!w) {
    const hd = ethers.HDNodeWallet.fromPhrase(MNEMONIC, "", `m/44'/60'/0'/0/${index}`);
    w = new SerialWallet(hd.privateKey, provider);
    wallets.set(index, w);
  }
  return w;
}

export const CONTRACT_ADDRESS = deployed.address;

export function readContract() {
  return new ethers.Contract(CONTRACT_ADDRESS, abi, provider);
}

export function contractFor(index: number) {
  return new ethers.Contract(CONTRACT_ADDRESS, abi, walletFor(index));
}