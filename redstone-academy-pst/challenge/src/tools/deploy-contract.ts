import Arweave from "arweave";
import {
  LoggerFactory,
  PstState,
  SmartWeaveNodeFactory,
} from "redstone-smartweave";
import * as fs from "fs";
import path from "path";
import { addFunds } from "../../utils/_helpers";

(async () => {
  // ~~ Initialize Arweave ~~
  const arweave = Arweave.init({
    host: "arweave.net",
    port: 443,
    protocol: "https",
  });

  // ~~ Initialize `LoggerFactory` ~~
  LoggerFactory.INST.logLevel("error");

  // ~~ Initialize SmartWeave ~~
  const smartweave = SmartWeaveNodeFactory.memCached(arweave);

  // ~~ Generate Wallet and add funds ~~
  const wallet = await arweave.wallets.generate();
  const walletAddress = await arweave.wallets.jwkToAddress(wallet);
  await addFunds(arweave, wallet);

  // ~~ Read contract source and initial state files ~~
  const contractSrc = fs.readFileSync(
    path.join(__dirname, "../../dist/contract.js"),
    "utf8"
  );
  const stateFromFile: PstState = JSON.parse(
    fs.readFileSync(
      path.join(__dirname, "../../dist/contracts/initial-state.json"),
      "utf8"
    )
  );
  const initialState: PstState = {
    ...stateFromFile,
    ...{
      owner: walletAddress,
    },
  };

  // ~~ Deploy contract ~~
  const contractTxId = await smartweave.createContract.deploy({
    wallet,
    initState: JSON.stringify(initialState),
    src: contractSrc,
  });

  // ~~ Log contract id to the console ~~
  console.log(contractTxId);
})();
