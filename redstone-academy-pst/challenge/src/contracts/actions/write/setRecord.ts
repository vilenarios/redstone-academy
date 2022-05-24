import { PstAction, PstState, ContractResult } from "../../types/types";

declare const ContractError;

export const setRecord = async (
  state: PstState,
  { caller, input: { record } }: PstAction
): Promise<ContractResult> => {
  //const subDomain = record.subDomain;
  const transactionId = record.transactionId;

  // Check if caller owns the token
  if (caller !== state.owner) {
    throw new ContractError("Caller does not own the token");
  }

  // check record subdomain validity
  // TO DO

  // check record arweave transaction id validity
  if (typeof transactionId !== "string" || transactionId.length !== 43) {
    throw new ContractError("Invalid Arweave Transaction ID");
  }
  state.record.subDomain = record.subDomain;
  state.record.transactionId = record.transactionId;

  return { state };
};
