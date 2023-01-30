import { BigInt, Address, ethereum, crypto, Bytes } from "@graphprotocol/graph-ts";
import { FlowUpdated as FlowUpdatedEvent } from "../generated/Superfluid/Superfluid";
import { Stream, StreamRevision } from "../generated/schema";
import { sendEPNSNotification } from "./EPNSNotification";
export const subgraphID = "salmandabbakuti/superfluid-stream-push";

let ZERO_BI = BigInt.fromI32(0);

function getFlowActionType(
  oldFlowRate: BigInt,
  newFlowRate: BigInt
): string {
  return oldFlowRate.equals(ZERO_BI)
    ? "CREATED"
    : newFlowRate.equals(ZERO_BI)
      ? "TERMINATED"
      : "UPDATED";
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

  let recipient = event.params.receiver.toHex(),
    type = "3",
    title = `Your Superfluid Stream Update`,
    body = `Your Superfluid stream with token address ${event.params.token.toHex()} from ${event.params.sender.toHex()} is ${streamType.toLowerCase()}`,
    subject = "Your Superfluid Stream Update",
    message = `Your Superfluid stream with token address ${event.params.token.toHex()} from ${event.params.sender.toHex()} is ${streamType.toLowerCase()}`,
    image = "https://user-images.githubusercontent.com/29351207/215538608-77f5f873-00f9-44fb-91d5-f4cc8c980756.png",
    secret = "null",
    cta = `https://goerli.etherscan.io/tx/${event.transaction.hash.toHex()}`,

    notification = `{\"type\": \"${type}\", \"title\": \"${title}\", \"body\": \"${body}\", \"subject\": \"${subject}\", \"message\": \"${message}\", \"image\": \"${image}\", \"secret\": \"${secret}\", \"cta\": \"${cta}\"}`;

  sendEPNSNotification(
    recipient,
    notification
  );
}