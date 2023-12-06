"use client";
import { useEffect, useState } from "react";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { formatEther } from "@ethersproject/units";
import { useAddress, useSigner } from "@thirdweb-dev/react";
import {
  Avatar,
  Button,
  Card,
  Input,
  message,
  Space,
  Table,
  Tag,
  Select,
  Popconfirm
} from "antd";
import { SyncOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";
import styles from "./page.module.css";

import {
  supportedTokens,
  fdaixContract,
  fusdcxContract,
  ftusdxContract,
  maticxContract,
  cfav1ForwarderContract,
  calculateFlowRateInTokenPerMonth,
  calculateFlowRateInWeiPerSecond,
  STREAMS_QUERY,
  subgraphClient as client
} from "../utils";

dayjs.extend(relativeTime);

export default function Home() {
  const [streams, setStreams] = useState([]);
  const [streamInput, setStreamInput] = useState({ token: supportedTokens[0].address });
  const [updatedFlowRate, setUpdatedFlowRate] = useState(null);
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);
  const [searchFilter, setSearchFilter] = useState({
    type: "",
    token: "",
    searchInput: ""
  });
  const [balances, setBalances] = useState({
    fdaix: 0,
    fusdcx: 0,
    ftusdx: 0,
    maticx: 0
  });

  const signer = useSigner();
  const address = useAddress();
  const account = address?.toLowerCase();

  useEffect(() => {
    if (account) {
      getStreams();
      getTokenBalances();
      // sync streams every 30 seconds
      const intervalId = setInterval(getStreams, 30000);
      return () => clearInterval(intervalId);
    }
  }, [account]);

  const handleCreateStream = async ({
    token,
    sender = account,
    receiver,
    flowRate
  }) => {
    if (!account || !signer)
      return message.error("Please connect wallet first");
    if (!token || !sender || !receiver || !flowRate)
      return message.error("Please fill all the fields");
    console.log("create inputs: ", { token, sender, receiver, flowRate });
    try {
      setLoading(true);
      const flowRateInWeiPerSecond = calculateFlowRateInWeiPerSecond(flowRate);
      console.log("flowRateInWeiPerSecond: ", flowRateInWeiPerSecond);
      const tx = await cfav1ForwarderContract
        .connect(signer)
        .createFlow(token, sender, receiver, flowRateInWeiPerSecond, "0x");
      await tx.wait();
      message.success("Stream created successfully");
      setLoading(false);
    } catch (err) {
      setLoading(false);
      message.error("Failed to create stream");
      console.error("failed to create stream: ", err);
    }
  };

  const handleUpdateStream = async ({
    token,
    sender = account,
    receiver,
    flowRate
  }) => {
    if (!account || !signer)
      return message.error("Please connect wallet first");
    if (!flowRate) return message.error("Please enter new flow rate");
    console.log("update inputs: ", { token, sender, receiver, flowRate });
    try {
      setLoading(true);
      const flowRateInWeiPerSecond = calculateFlowRateInWeiPerSecond(flowRate);
      console.log("flowRateInWeiPerSecond: ", flowRateInWeiPerSecond);
      const tx = await cfav1ForwarderContract
        .connect(signer)
        .updateFlow(token, sender, receiver, flowRateInWeiPerSecond, "0x");
      await tx.wait();
      message.success("Stream updated successfully");
      setLoading(false);
    } catch (err) {
      setLoading(false);
      message.error("Failed to update stream");
      console.error("failed to update stream: ", err);
    }
  };

  const handleDeleteStream = async ({ token, sender, receiver }) => {
    if (!account || !signer)
      return message.error("Please connect wallet first");
    console.log("delete inputs: ", { token, sender, receiver });
    try {
      setLoading(true);
      const tx = await cfav1ForwarderContract
        .connect(signer)
        .deleteFlow(token, sender, receiver, "0x");
      await tx.wait();
      message.success("Stream deleted successfully");
      setLoading(false);
    } catch (err) {
      setLoading(false);
      message.error("Failed to delete stream");
      console.error("failed to delete stream: ", err);
    }
  };

  const getStreams = () => {
    setDataLoading(true);
    // update search filters based on type
    const { type, token, searchInput } = searchFilter;
    const filterObj = {};
    if (token) filterObj.token = token;
    if (type === "INCOMING") {
      filterObj.receiver = account;
    } else if (type === "OUTGOING") {
      filterObj.sender = account;
    } else if (type === "TERMINATED") {
      filterObj.flowRate = "0";
    }
    client
      .request(STREAMS_QUERY, {
        skip: 0,
        first: 100,
        orderBy: "createdAt",
        orderDirection: "desc",
        where: {
          and: [
            filterObj,
            { or: [{ sender: account }, { receiver: account }] },
            ...(searchInput && [
              {
                or: [
                  { sender_contains_nocase: searchInput },
                  { receiver_contains_nocase: searchInput },
                  { token_contains_nocase: searchInput }
                ]
              }
            ])
          ]
        }
      })
      .then((data) => {
        console.log("streams: ", data.streams);
        setStreams(data.streams);
        setDataLoading(false);
      })
      .catch((err) => {
        setDataLoading(false);
        message.error("Something went wrong. Is the Subgraph running?");
        console.error("failed to get streams: ", err);
      });
  };

  const getTokenBalances = async () => {
    // get balances of all supportedTokens
    const [
      fdaixBalance,
      fusdcxBalance,
      ftusdxBalance,
      maticxBalance
    ] = await Promise.all([
      fdaixContract.connect(signer).balanceOf(account),
      fusdcxContract.connect(signer).balanceOf(account),
      ftusdxContract.connect(signer).balanceOf(account),
      maticxContract.connect(signer).balanceOf(account)
    ]);
    // show balances upto 3 decimal places
    setBalances({
      fdaix: parseFloat(formatEther(fdaixBalance)).toFixed(3),
      fusdcx: parseFloat(formatEther(fusdcxBalance)).toFixed(3),
      ftusdx: parseFloat(formatEther(ftusdxBalance)).toFixed(3),
      maticx: parseFloat(formatEther(maticxBalance)).toFixed(3)
    });
    console.log("balances: ", balances);
  };

  const columns = [
    {
      title: "Asset",
      key: "token",
      width: "5%",
      render: ({ token }) => {
        const tokenData = supportedTokens.find(
          (oneToken) => oneToken.address === token
        ) || {
          icon: "",
          symbol: "Unknown"
        };
        return (
          <>
            <Avatar shape="circle" size="large" src={tokenData.icon} />
            <a
              href={`http://localhost:8545/token/${token}`}
              target="_blank"
              rel="noreferrer"
              style={{ marginLeft: 10 }}
            >
              {tokenData.symbol}
            </a>
          </>
        );
      }
    },
    {
      title: "Sender",
      key: "sender",
      ellipsis: true,
      width: "10%",
      render: ({ sender }) => (
        <a
          href={`http://localhost:8545/address/${sender}`}
          target="_blank"
          rel="noreferrer"
        >
          {sender === account ? `${sender} (You)` : sender}
        </a>
      )
    },
    {
      title: "Receiver",
      key: "receiver",
      ellipsis: true,
      width: "10%",
      render: ({ receiver }) => (
        <a
          href={`http://localhost:8545/address/${receiver}`}
          target="_blank"
          rel="noreferrer"
        >
          {receiver === account ? `${receiver} (You)` : receiver}
        </a>
      )
    },
    {
      title: "Flow Rate",
      key: "flowRate",
      sorter: (a, b) => a.flowRate - b.flowRate,
      width: "5%",
      render: ({ flowRate, token }) => {
        // calculate flow rate in supportedTokens per month
        const monthlyFlowRate = calculateFlowRateInTokenPerMonth(flowRate);
        const tokenSymbol =
          supportedTokens.find((oneToken) => oneToken.address === token)?.symbol ||
          "Unknown";
        return (
          <span style={{ color: "#1890ff" }}>
            {monthlyFlowRate} {tokenSymbol}/mo
          </span>
        );
      }
    },
    {
      title: "Created / Updated At",
      key: "createdAt",
      sorter: (a, b) => a.createdAt - b.createdAt,
      width: "5%",
      render: ({ createdAt, updatedAt }) => (
        <Space direction="vertical">
          <span>{dayjs(createdAt * 1000).format("DD MMM YYYY")}</span>
          <span>{dayjs(updatedAt * 1000).format("DD MMM YYYY")}</span>
        </Space>
      )
    },
    {
      title: "Actions",
      width: "5%",
      render: (row) => (
        <>
          {row.sender === account && row.flowRate !== "0" ? (
            <Space size="small">
              <Popconfirm
                title={
                  <Input
                    type="number"
                    placeholder="Flowrate in no. of tokens"
                    addonAfter="/month"
                    value={updatedFlowRate}
                    onChange={(e) => setUpdatedFlowRate(e.target.value)}
                  />
                }
                // add descrition as input number to update flow rate
                description="Enter new flow rate"
                onConfirm={() =>
                  handleUpdateStream({ ...row, flowRate: updatedFlowRate })
                }
              >
                <Button type="primary" shape="circle">
                  <EditOutlined />
                </Button>
              </Popconfirm>
              <Popconfirm
                title="Are you sure to delete?"
                onConfirm={() => handleDeleteStream(row)}
              >
                <Button type="primary" shape="circle" danger>
                  <DeleteOutlined />
                </Button>
              </Popconfirm>
            </Space>
          ) : (
            <Space>
              <Tag color={row.sender === account ? "blue" : "green"}>
                {row.sender === account ? "OUTGOING" : "INCOMING"}
              </Tag>
              {row.flowRate === "0" && <Tag color="red">TERMINATED</Tag>}
            </Space>
          )}
        </>
      )
    }
  ];

  return (
    <>
      {account ? (
        <div>
          {/* Balances Section Starts */}
          <Card
            bordered
            title="Super Tokens"
            className={styles.cardContainer}
            style={{ marginBottom: 20 }}
            extra={
              <Button
                type="primary"
                shape="circle"
                onClick={getTokenBalances}
                disabled={loading}
                icon={<SyncOutlined spin={dataLoading} />}
              />
            }
          >
            {supportedTokens.map((token, i) => (
              <Space key={i}>
                <Avatar shape="circle" size="small" src={token.icon} />
                <span>{token.symbol}</span>
                <span>
                  {balances[token?.name?.toLowerCase()] || "0.0"}
                </span>{" "}
              </Space>
            ))}
          </Card>
          {/* Balances Section Ends */}
          {/* Create Stream Section Starts */}
          <Card
            bordered
            title="Create Stream"
            className={styles.cardContainer}
            actions={[
              <Button
                key="create"
                type="primary"
                shape="round"
                style={{ marginTop: 10 }}
                disabled={loading}
                loading={loading}
                onClick={() => handleCreateStream(streamInput)}
              >
                Send
              </Button>
            ]}
          >
            <Input
              type="text"
              placeholder="Receiver Wallet Address"
              allowClear
              name="receiver"
              value={streamInput.receiver || ""}
              onChange={(e) =>
                setStreamInput({
                  ...streamInput,
                  receiver: e.target.value
                })
              }
              style={{
                borderRadius: 10,
                marginBottom: 10
              }}
            />
            <Space>
              <label htmlFor="token">Select Token:</label>
              <Select
                defaultValue={supportedTokens[0].symbol}
                name="token"
                id="token"
                value={streamInput?.token || supportedTokens[0].address}
                style={{
                  borderRadius: 10,
                  marginBottom: 10
                }}
                onChange={(val) =>
                  setStreamInput({ ...streamInput, token: val })
                }
              >
                {supportedTokens.map((token, i) => (
                  <Select.Option value={token.address} key={i}>
                    <Avatar shape="circle" size="small" src={token.icon} />{" "}
                    {token.symbol}
                  </Select.Option>
                ))}
              </Select>
              {/*  add flowrate input */}
              <Input
                type="number"
                name="flowRate"
                addonAfter="/month"
                placeholder="Flowrate in no. of tokens"
                value={streamInput?.flowRate}
                onChange={(e) =>
                  setStreamInput({ ...streamInput, flowRate: e.target.value })
                }
                style={{
                  borderRadius: 10,
                  marginBottom: 10
                  // width: 120
                }}
              />
            </Space>
          </Card>
          {/* Create Stream Section Ends */}

          {/* Streams Table Starts */}
          <h2>My Streams</h2>
          <Space>
            <label htmlFor="search">Token:</label>
            <Select
              defaultValue=""
              style={{ width: 120 }}
              value={searchFilter?.token || ""}
              onChange={(val) =>
                setSearchFilter({ ...searchFilter, token: val })
              }
            >
              <Select.Option value="">All</Select.Option>
              {supportedTokens.map((token, i) => (
                <Select.Option value={token.address} key={i}>
                  <Avatar shape="circle" size="small" src={token.icon} />{" "}
                  {token.symbol}
                </Select.Option>
              ))}
            </Select>
            <label htmlFor="search">Stream Type:</label>
            <Select
              defaultValue=""
              style={{ width: 120 }}
              value={searchFilter?.type || ""}
              onChange={(val) =>
                setSearchFilter({ ...searchFilter, type: val })
              }
            >
              <Select.Option value="">All</Select.Option>
              <Select.Option value="INCOMING">
                <Tag color="green">INCOMING</Tag>
              </Select.Option>
              <Select.Option value="OUTGOING">
                <Tag color="blue">OUTGOING</Tag>
              </Select.Option>
              <Select.Option value="TERMINATED">
                <Tag color="red">TERMINATED</Tag>
              </Select.Option>
            </Select>
            <Input.Search
              placeholder="Search by address"
              value={searchFilter?.searchInput || ""}
              enterButton
              allowClear
              onSearch={getStreams}
              onChange={(e) =>
                setSearchFilter({
                  ...searchFilter,
                  searchInput: e.target.value
                })
              }
            />
            <Button type="primary" onClick={getStreams}>
              <SyncOutlined />
            </Button>
          </Space>
          <Table
            className="table_grid"
            columns={columns}
            rowKey="id"
            dataSource={streams}
            scroll={{ x: 970 }}
            loading={dataLoading}
            pagination={{
              pageSizeOptions: [5, 10, 20, 25, 50, 100],
              showSizeChanger: true,
              showQuickJumper: true,
              defaultCurrent: 1,
              defaultPageSize: 10,
              size: "small"
            }}
          />
          {/* Streams Table Ends */}
        </div>
      ) : (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            height: "100%",
            textAlign: "center"
          }}
        >
          <h2>Welcome to Superfluid Dashboard</h2>
          <h2>
            View and manage your Superfluid streams with ease. Including in-house realtime notifications about your streams
          </h2>
          <h2>Connect your wallet to get started</h2>
        </div>
      )}
    </>
  );
}
