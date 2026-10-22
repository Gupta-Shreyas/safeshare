import { ethers } from "ethers";
import abi from "@/contracts/SafeShare.abi.json";
import deployed from "@/contracts/address.json";

export const provider = new ethers.JsonRpcProvider(process.env.RPC_URL ?? "http://127.0.0.1:8545");

const MNEMONIC =
  process.env.HARDHAT_MNEMONIC ?? "test test test test test test test test test test test junk";

// Each app user is mapped to one of the local test accounts (index 0 = admin).
export function walletFor(index: number) {
  return ethers.HDNodeWallet.fromPhrase(MNEMONIC, "", `m/44'/60'/0'/0/${index}`).connect(provider);
}

export const CONTRACT_ADDRESS = deployed.address;

export function readContract() {
  return new ethers.Contract(CONTRACT_ADDRESS, abi, provider);
}

export function contractFor(index: number) {
  return new ethers.Contract(CONTRACT_ADDRESS, abi, walletFor(index));
}