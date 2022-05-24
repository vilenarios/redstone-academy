import ArLocal from "arlocal";
import Arweave from "arweave";
import { addFunds, mineBlock } from "../utils/_helpers";
import * as fs from "fs";
import path from "path";
import {
  InteractionResult,
  LoggerFactory,
  PstContract,
  PstState,
  SmartWeave,
  SmartWeaveNodeFactory,
} from "redstone-smartweave";
// import { PstState } from "../src/contracts/types/types";
import { JWKInterface } from "arweave/node/lib/wallet";

describe("Testing the Profit Sharing Token", () => {
  let contractSrc: string;
  let wallet: JWKInterface;
  let walletAddress: string;
  let initialState: PstState;
  let smartweave: SmartWeave;
  let arweave: Arweave;
  let pst: PstContract;
  const arlocal = new ArLocal(1820);
  beforeAll(async () => {
    // ~~ Set up ArLocal and instantiate Arweave ~~
    await arlocal.start();

    arweave = Arweave.init({
      host: "localhost",
      port: 1820,
      protocol: "http",
    });

    // ~~ Initialize 'LoggerFactory' ~~
    LoggerFactory.INST.logLevel("fatal");

    // ~~ Set up SmartWeave ~~
    smartweave = SmartWeaveNodeFactory.forTesting(arweave);

    // ~~ Generate wallet and add funds ~~
    wallet = await arweave.wallets.generate();
    walletAddress = await arweave.wallets.jwkToAddress(wallet);
    await addFunds(arweave, wallet);

    // ~~ Read contract source and initial state files ~~
    contractSrc = fs.readFileSync(
      path.join(__dirname, "../dist/contract.js"),
      "utf8"
    );
    const stateFromFile: PstState = JSON.parse(
      fs.readFileSync(
        path.join(__dirname, "../dist/contracts/initial-state.json"),
        "utf8"
      )
    );
    // ~~ Update initial state ~~
    initialState = {
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

    // ~~ Connect to the pst contract ~~
    pst = smartweave.pst(contractTxId);
    pst.connect(wallet);

    // ~~ Mine block ~~
    await mineBlock(arweave);
  });

  afterAll(async () => {
    // ~~ Stop ArLocal ~~
    await arlocal.stop();
  });

  it("should read pst state and balance data", async () => {
    expect(await pst.currentState()).toEqual(initialState);
    console.log(await pst.currentState());
    expect(
      (await pst.currentBalance("iKryOeZQMONi2965nKz528htMMN_sBcjlhc-VncoRjA"))
        .balance
    ).toEqual(1);
  });

  it("should properly mint tokens", async () => {
    await pst.writeInteraction({
      function: "mint",
      qty: 10,
    });
    await mineBlock(arweave);
    expect((await pst.currentState()).balances[walletAddress]).toEqual(10);
  });

  it("should properly transfer tokens", async () => {
    await pst.transfer({
      target: "NdZ3YRwMB2AMwwFYjKn1g88Y9nRybTo0qhS1ORq_E7g",
      qty: 1,
    });
    await mineBlock(arweave);
    expect((await pst.currentState()).balances[walletAddress]).toEqual(
      10 - 1 // we already sent a second token to this wallet
    );
    expect(
      (await pst.currentState()).balances[
        "NdZ3YRwMB2AMwwFYjKn1g88Y9nRybTo0qhS1ORq_E7g"
      ]
    ).toEqual(0 + 1); // wallet started with 0
  });

  it("should properly set records", async () => {
    await pst.writeInteraction({
      function: "setRecord",
      record: {
        subDomain: "@",
        transactionId: "q8fnqsybd98-DRk6F6wdbBSkTouUShmnIA-pW4N-Hzs",
      },
    });
    await mineBlock(arweave);
    console.log(await pst.currentState());
    expect((await pst.currentState()).balances[walletAddress]).toEqual(9);
  });

  it("should properly perform dry write with overwritten caller", async () => {
    const newWallet = await arweave.wallets.generate();
    const overwrittenCaller = await arweave.wallets.jwkToAddress(newWallet);
    await pst.transfer({
      target: overwrittenCaller,
      qty: 5,
    });

    await mineBlock(arweave);

    const result: InteractionResult<PstState, unknown> = await pst.dryWrite(
      {
        function: "transfer",
        target: "NdZ3YRwMB2AMwwFYjKn1g88Y9nRybTo0qhS1ORq_E7g",
        qty: 1,
      },
      overwrittenCaller
    );

    expect(result.state.balances[walletAddress]).toEqual(10 - 1 - 5);
    expect(
      result.state.balances["NdZ3YRwMB2AMwwFYjKn1g88Y9nRybTo0qhS1ORq_E7g"]
    ).toEqual(0 + 1 + 1);
    expect(result.state.balances[overwrittenCaller]).toEqual(5 - 1);
  });
});
