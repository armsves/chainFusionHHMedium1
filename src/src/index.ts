import { IcrcLedgerCanister } from "@dfinity/ledger-icrc";
import { Secp256k1KeyIdentity } from "@dfinity/identity-secp256k1";
import { HttpAgent } from "@dfinity/agent";
import { Principal } from "@dfinity/principal";
import { writeFile, readFile } from "fs/promises";
import { existsSync } from "fs";

const LEDGER_CANISTER_ID = "kelas-yaaaa-aaaaj-azv2q-cai";
const LOCAL_HOST = "https://ic0.app";
// const LOCAL_HOST = "http://127.0.0.1:4943";
const PEM_FILE_PATH = "./wallet_identity.pem";

async function saveIdentityToPem(
  identity: Secp256k1KeyIdentity
): Promise<void> {
  const privateKey = Buffer.from(identity.getKeyPair().secretKey).toString(
    "hex"
  );
  const pemContent = `-----BEGIN EC PRIVATE KEY-----\n${privateKey}\n-----END EC PRIVATE KEY-----`;
  await writeFile(PEM_FILE_PATH, pemContent);
}

async function loadOrCreateIdentity(): Promise<Secp256k1KeyIdentity> {
  try {
    if (existsSync(PEM_FILE_PATH)) {
      const pemContent = await readFile(PEM_FILE_PATH, "utf-8");
      const privateKey = pemContent
        .replace("-----BEGIN EC PRIVATE KEY-----", "")
        .replace("-----END EC PRIVATE KEY-----", "")
        .trim();

      const secretKey = Buffer.from(privateKey, "hex");
      return Secp256k1KeyIdentity.fromSecretKey(secretKey);
    }
  } catch (error) {
    console.log("Creating new identity...");
  }

  const newIdentity = Secp256k1KeyIdentity.generate();
  await saveIdentityToPem(newIdentity);
  return newIdentity;
}

async function main() {
  try {
    // Initialize identity
    const identity = await loadOrCreateIdentity();
    console.log("Principal ID:", identity.getPrincipal().toString());

    // Create agent
    const agent = await HttpAgent.create({
      identity: identity,
      host: LOCAL_HOST,
    });
    await agent.fetchRootKey();

    // Create ledger interface
    const ledger = IcrcLedgerCanister.create({
      agent,
      canisterId: Principal.from(LEDGER_CANISTER_ID),
    });

    // Check balance
    const balance = await ledger.balance({
      owner: identity.getPrincipal(),
    });
    console.log("Current Balance:", balance.toString());

    // Example transfer
    const recipientPrincipal =
      "bfaxj-k4saz-ynsqm-ffmwa-v3his-2zmp2-f75ts-xpf3q-7dumn-5zemr-5qe"; // Replace with actual recipient
    const amountToTransfer = BigInt(100_000_000); // 1 token (with 8 decimals)

    console.log(
      `\nAttempting to transfer ${amountToTransfer} tokens to ${recipientPrincipal}`
    );

    const transferResult = await ledger.transfer({
      to: { owner: Principal.fromText(recipientPrincipal), subaccount: [] },
      amount: amountToTransfer,
      fee: BigInt(10),
    });

    console.log("Transfer Result:", transferResult);

    // Check new balance
    const newBalance = await ledger.balance({
      owner: identity.getPrincipal(),
    });
    console.log("New Balance:", newBalance.toString());
  } catch (error) {
    console.error("Error:", error);
  }
}

main();
