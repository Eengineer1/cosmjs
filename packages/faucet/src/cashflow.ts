import { Account, Amount, TokenTicker } from "@iov/bcp";
import { Decimal, Uint53 } from "@iov/encoding";

/** Send `factor` times credit amount on refilling */
const defaultRefillFactor = 20;

/** refill when balance gets below `factor` times credit amount */
const defaultRefillThresholdFactor = 8;

// Load this from connection?
let globalFractionalDigits: number | undefined;

export function setFractionalDigits(input: number): void {
  globalFractionalDigits = input;
}

export function getFractionalDigits(): number {
  if (globalFractionalDigits === undefined) {
    throw new Error("Fractional digits not set");
  }
  return globalFractionalDigits;
}

/** The amount of tokens that will be sent to the user */
export function creditAmount(token: TokenTicker, factor: Uint53 = new Uint53(1)): Amount {
  const amountFromEnv = process.env[`FAUCET_CREDIT_AMOUNT_${token}`];
  const amount = amountFromEnv ? Uint53.fromString(amountFromEnv).toNumber() : 10;
  const value = new Uint53(amount * factor.toNumber());

  const fractionalDigits = getFractionalDigits();
  return {
    quantity: value.toString() + "0".repeat(fractionalDigits),
    fractionalDigits: fractionalDigits,
    tokenTicker: token,
  };
}

export function refillAmount(token: TokenTicker): Amount {
  const factorFromEnv = Number.parseInt(process.env.FAUCET_REFILL_FACTOR || "0", 10) || undefined;
  const factor = new Uint53(factorFromEnv || defaultRefillFactor);
  return creditAmount(token, factor);
}

export function refillThreshold(token: TokenTicker): Amount {
  const factorFromEnv = Number.parseInt(process.env.FAUCET_REFILL_THRESHOLD || "0", 10) || undefined;
  const factor = new Uint53(factorFromEnv || defaultRefillThresholdFactor);
  return creditAmount(token, factor);
}

/** true iff the distributor account needs a refill */
export function needsRefill(account: Account, token: TokenTicker): boolean {
  const balanceAmount = account.balance.find(b => b.tokenTicker === token);

  const balance = balanceAmount
    ? Decimal.fromAtomics(balanceAmount.quantity, balanceAmount.fractionalDigits)
    : Decimal.fromAtomics("0", 0);

  const thresholdAmount = refillThreshold(token);
  const threshold = Decimal.fromAtomics(thresholdAmount.quantity, thresholdAmount.fractionalDigits);

  // TODO: perform < operation on Decimal type directly
  // https://github.com/iov-one/iov-core/issues/1375
  return balance.toFloatApproximation() < threshold.toFloatApproximation();
}