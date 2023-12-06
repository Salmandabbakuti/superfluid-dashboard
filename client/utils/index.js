import { formatEther, parseEther } from "@ethersproject/units";
import { Contract } from "@ethersproject/contracts";
import { GraphQLClient, gql } from "graphql-request";
import { cfav1ForwarderAddress, subgraphUrl, fDAIxAddress, fUSDCxAddress, fTUSDxAddress, MATICxAddress } from "./constants.js";

const cfav1ForwarderABI = [
  "function createFlow(address token, address sender, address receiver, int96 flowrate, bytes userData) returns (bool)",
  "function updateFlow(address token, address sender, address receiver, int96 flowrate, bytes userData) returns (bool)",
  "function deleteFlow(address token, address sender, address receiver, bytes userData) returns (bool)",
];

const erc20ABI = [
  "function balanceOf(address) external view returns (uint256)",
];

// load contracts
export const cfav1ForwarderContract = new Contract(cfav1ForwarderAddress, cfav1ForwarderABI);
export const fdaixContract = new Contract(
  fDAIxAddress,
  erc20ABI
);
export const fusdcxContract = new Contract(
  fUSDCxAddress,
  erc20ABI
);
export const ftusdxContract = new Contract(
  fTUSDxAddress,
  erc20ABI
);

export const maticxContract = new Contract(
  MATICxAddress,
  erc20ABI
);

export const supportedTokens = [
  {
    name: "fDAIx",
    symbol: "fDAIx",
    address: fDAIxAddress,
    icon:
      "https://raw.githubusercontent.com/superfluid-finance/assets/master/public/tokens/dai/icon.svg"
  },
  {
    name: "fUSDCx",
    symbol: "fUSDCx",
    address: fUSDCxAddress,
    icon:
      "https://raw.githubusercontent.com/superfluid-finance/assets/master/public/tokens/usdc/icon.svg"
  },
  {
    name: "fTUSDx",
    symbol: "fTUSDx",
    address: fTUSDxAddress,
    icon:
      "https://raw.githubusercontent.com/superfluid-finance/assets/master/public/tokens/tusd/icon.svg"
  },
  {
    name: "MATICx",
    symbol: "MATICx",
    address: MATICxAddress,
    icon:
      "https://raw.githubusercontent.com/superfluid-finance/assets/master/public/tokens/matic/icon.svg"
  }
];

export const calculateFlowRateInTokenPerMonth = (amount) => {
  if (isNaN(amount)) return 0;
  // convert from wei/sec to token/month for displaying in UI
  // 2628000 = 1 month in seconds(sf recommendation)
  const flowRate = (formatEther(amount) * 2628000).toFixed(9);
  // if flowRate is floating point number, remove unncessary trailing zeros
  return flowRate.replace(/\.?0+$/, "");
};

export const calculateFlowRateInWeiPerSecond = (amount) => {
  // convert amount from token/month to wei/second for sending to superfluid
  const flowRateInWeiPerSecond = parseEther(amount.toString())
    .div(2628000)
    .toString();
  return flowRateInWeiPerSecond;
};

export const STREAMS_QUERY = gql`
  query getStreams(
    $skip: Int
    $first: Int
    $orderBy: Stream_orderBy
    $orderDirection: OrderDirection
    $where: Stream_filter
  ) {
    streams(
      skip: $skip
      first: $first
      orderBy: $orderBy
      orderDirection: $orderDirection
      where: $where
    ) {
      id
      sender
      receiver
      token
      flowRate
      createdAt
      updatedAt
    }
  }
`;

export const subgraphClient = new GraphQLClient(
  subgraphUrl,
  { headers: {} }
);