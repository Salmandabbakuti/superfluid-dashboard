import { BigInt, Address, ethereum, crypto, Bytes } from "@graphprotocol/graph-ts";
import { FlowUpdated as FlowUpdatedEvent } from "../generated/Superfluid/Superfluid";
import { Stream, StreamRevision } from "../generated/schema";
import { sendEPNSNotification } from "./EPNSNotification";
export const subgraphID = "salmandabbakuti/superfluid-stream-push";

let ZERO_BI = BigInt.fromI32(0);
let ONE_BI = BigInt.fromI32(1);

function getFlowActionType(
  oldFlowRate: BigInt,
  newFlowRate: BigInt
): string {
  return oldFlowRate.equals(ZERO_BI)
    ? "CREATE"
    : newFlowRate.equals(ZERO_BI)
      ? "TERMINATE"
      : "UPDATE";
}

function getStreamID(
  senderAddress: Address,
  receiverAddress: Address,
  tokenAddress: Address,
  revisionIndex: number
): string {
  return (
    senderAddress.toHex() +
    "-" +
    receiverAddress.toHex() +
    "-" +
    tokenAddress.toHex() +
    "-" +
    revisionIndex.toString()
  );
}

/**
 * Take an array of ethereum values and return the encoded bytes.
 * @param values
 * @returns the encoded bytes
 */
export function encode(values: Array<ethereum.Value>): Bytes {
  return ethereum.encode(
    // forcefully cast Value[] -> Tuple
    ethereum.Value.fromTuple(changetype<ethereum.Tuple>(values))
  )!;
}

// Get Higher Order Entity ID functions
// CFA Higher Order Entity
export function getStreamRevisionID(
  senderAddress: Address,
  receiverAddress: Address,
  tokenAddress: Address
): string {
  const values: Array<ethereum.Value> = [
    ethereum.Value.fromAddress(senderAddress),
    ethereum.Value.fromAddress(receiverAddress),
  ];
  const flowId = crypto.keccak256(encode(values));
  return (
    flowId.toHex() +
    "-" +
    tokenAddress.toHex()
  );
}
/**
 * Gets or initializes the Stream Revision helper entity.
 */
export function getOrInitStreamRevision(
  senderAddress: Address,
  recipientAddress: Address,
  tokenAddress: Address
): StreamRevision {
  const streamRevisionId = getStreamRevisionID(
    senderAddress,
    recipientAddress,
    tokenAddress
  );
  let streamRevision = StreamRevision.load(streamRevisionId);
  if (streamRevision == null) {
    streamRevision = new StreamRevision(streamRevisionId);
    streamRevision.revisionIndex = 0;
    streamRevision.periodRevisionIndex = 0;
  }
  return streamRevision as StreamRevision;
}

// export function getOrInitStream(event: FlowUpdatedEvent): Stream {

//   // Create a streamRevision entity for this stream if one doesn't exist.
//   const streamRevision = getOrInitStreamRevision(
//     event.params.sender,
//     event.params.receiver,
//     event.params.token
//   );
//   const id = getStreamID(
//     event.params.sender,
//     event.params.receiver,
//     event.params.token,
//     streamRevision.revisionIndex
//   );

//   // set stream id
//   streamRevision.mostRecentStream = id;
//   streamRevision.save();

//   let stream = Stream.load(id);
//   if (stream == null) {
//     const currentTimestamp = event.block.timestamp;
//     stream = new Stream(id);
//     stream.createdAt = currentTimestamp;
//     stream.token = event.params.token.toHex();
//     stream.sender = event.params.sender.toHex();
//     stream.receiver = event.params.receiver.toHex();
//     stream.flowRate = event.params.flowRate;
//     stream.updatedAt = currentTimestamp;
//   }
//   return stream as Stream;
// }

function exponentToBigInt(decimals: BigInt): BigInt {
  let bd = BigInt.fromString('1');
  for (let i = ZERO_BI; i.lt(decimals as BigInt); i = i.plus(ONE_BI)) {
    bd = bd.times(BigInt.fromString('10'));
  }
  return bd;
}

export function handleFlowUpdated(event: FlowUpdatedEvent): void {
  // Create a streamRevision entity for this stream if one doesn't exist.
  const streamRevision = getOrInitStreamRevision(
    event.params.sender,
    event.params.receiver,
    event.params.token
  );
  const streamId = getStreamID(event.params.sender, event.params.receiver, event.params.token, streamRevision.revisionIndex);
  // set stream id
  streamRevision.mostRecentStream = streamId;
  streamRevision.save();

  let stream = Stream.load(streamId);
  if (stream == null) {
    const currentTimestamp = event.block.timestamp;
    stream = new Stream(streamId);
    stream.sender = event.params.sender.toHex();
    stream.receiver = event.params.receiver.toHex();
    stream.token = event.params.token.toHex();
    stream.flowRate = event.params.flowRate;
    stream.createdAt = currentTimestamp;
    stream.updatedAt = currentTimestamp;
    stream.txHash = event.transaction.hash.toHex();
  }
  const streamType = getFlowActionType(stream.flowRate, event.params.flowRate);
  stream.type = streamType;
  stream.save();

  let power = exponentToBigInt(BigInt.fromI32(18));

  let recipient = "0xDc7c5B449D4417A5aa01bf53aD280b1BEDf4b078",
    type = "1",
    title = `Superfluid Stream Update`,
    body = `You have received ${event.params.flowRate.div(power).toString()} DAI from ${event.params.sender.toHex()}`,
    subject = "Superfluid Stream Update",
    message = `You have received ${event.params.flowRate.div(power).toString()} DAI from ${event.params.sender.toHex()}`,
    image = "https://play-lh.googleusercontent.com/i911_wMmFilaAAOTLvlQJZMXoxBF34BMSzRmascHezvurtslYUgOHamxgEnMXTklsF-S",
    secret = "null",
    cta = `https://goerli.etherscan.io/tx/${event.transaction.hash.toHex()}`,

    notification = `{\"type\": \"${type}\", \"title\": \"${title}\", \"body\": \"${body}\", \"subject\": \"${subject}\", \"message\": \"${message}\", \"image\": \"${image}\", \"secret\": \"${secret}\", \"cta\": \"${cta}\"}`;

  sendEPNSNotification(
    recipient,
    notification
  );
}