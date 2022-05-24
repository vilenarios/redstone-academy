// ~~ Write types for your contract ~~
export interface PstState {
  ticker: string;
  name: string;
  owner: string;
  record: GNSRecord;
  balances: {
    [address: string]: number;
  };
}

export interface PstAction {
  input: PstInput;
  caller: string;
}

export interface PstInput {
  function: PstFunction;
  target: string;
  record: GNSRecord;
  qty: number;
}

export interface PstResult {
  target: string;
  ticker: string;
  record: GNSRecord;
  balance: number;
}

export interface GNSRecord {
  subDomain: string;
  transactionId: string;
}

export type PstFunction = "transfer" | "mint" | "setRecord" | "balance";

export type ContractResult = { state: PstState } | { result: PstResult };
