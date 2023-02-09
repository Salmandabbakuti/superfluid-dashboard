import { useEffect, useState } from "react";
import * as PushAPI from "@pushprotocol/restapi";
import { createSocketConnection, EVENTS } from "@pushprotocol/socket";
import { NotificationItem, Chat } from "@pushprotocol/uiweb";
import { GraphQLClient, gql } from "graphql-request";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { Framework } from "@superfluid-finance/sdk-core";
import { providers, ethers } from "ethers";
import {
  Tabs,
  notification,
  Avatar,
  Button,
  Layout,
  Menu,
  Card,
  Drawer,
  Input,
  message,
  Popconfirm,
  Empty,
  Space,
  Table,
  Tag,
  Select,
  InputNumber
} from "antd";
import {
  BellOutlined,
  BarsOutlined,
  EditOutlined,
  DeleteOutlined
} from "@ant-design/icons";
import "antd/dist/antd.css";
import "./styles.css";

const { Header, Footer, Sider, Content } = Layout;
dayjs.extend(relativeTime);

const SUPERFLUID_CHANNEL_ADDRESS = "0xDc7c5B449D4417A5aa01bf53aD280b1BEDf4b078"; // Superfluid channel address

const client = new GraphQLClient(
  "https://api.thegraph.com/subgraphs/name/salmandabbakuti/superfluid-stream-push",
  { headers: {} }
);

const tokens = [
  {
    name: "fDAIx",
    symbol: "fDAIx",
    address: "0xf2d68898557ccb2cf4c10c3ef2b034b2a69dad00",
    icon:
      "https://raw.githubusercontent.com/superfluid-finance/assets/master/public//tokens/dai/icon.svg"
  },
  {
    name: "fUSDCx",
    symbol: "fUSDCx",
    address: "0x8ae68021f6170e5a766be613cea0d75236ecca9a",
    icon:
      "https://raw.githubusercontent.com/superfluid-finance/assets/master/public//tokens/usdc/icon.svg"
  },
  {
    name: "fTUSDx",
    symbol: "fTUSDx",
    address: "0x95697ec24439e3eb7ba588c7b279b9b369236941",
    icon:
      "https://raw.githubusercontent.com/superfluid-finance/assets/master/public//tokens/tusd/icon.svg"
  }
];

const calculateFlowRate = (amount) => {
  if (amount) {
    // convert from wei/sec to token/month for displaying in UI
    return Math.round(ethers.utils.formatEther(amount) * 60 * 60 * 24 * 30);
  }
  return 0;
};

const calculateFlowRateInWeiPerSecond = (amount) => {
  // convert amount from token/month to wei/second for sending to superfluid
  const flowRateInWeiPerSecond = ethers.utils
    .parseEther(amount.toString())
    .div(2592000)
    .toString();
  return flowRateInWeiPerSecond;
};

const STREAMS_QUERY = gql`
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
      status
      flowRate
      createdAt
      updatedAt
    }
  }
`;

export default function App() {
  const [notifications, setNotifications] = useState([]);
  const [sdkSocket, setSdkSocket] = useState(null);
  const [isSocketConnected, setIsSocketConnected] = useState(false);
  const [account, setAccount] = useState(null);
  const [provider, setProvider] = useState(null);
  const [chainId, setChainId] = useState(null);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [streams, setStreams] = useState([]);
  const [streamInput, setStreamInput] = useState({ token: tokens[0].address });
  const [loading, setLoading] = useState(false);
  const [superfluidSdk, setSuperfluidSdk] = useState(null);
  const [updatedFlowRate, setUpdatedFlowRate] = useState(0);

  const handleConnectWallet = async () => {
    if (window?.ethereum) {
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts"
      });
      console.log("Using account: ", accounts[0]);
      const provider = new providers.Web3Provider(window.ethereum);
      const { chainId } = await provider.getNetwork();
      if (chainId !== 5) {
        message.info("Switching to goerli testnet");
        // switch to the goerli testnet
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: "0x5" }]
        });
      }
      console.log("chainId:", chainId);
      const sf = await Framework.create({
        chainId,
        provider
      });
      setSuperfluidSdk(sf);
      setProvider(provider);
      setChainId(chainId);
      setAccount(accounts[0]);
    } else {
      console.warn("Please use web3 enabled browser");
      message.warn("Please install Metamask or any other web3 enabled browser");
    }
  };

  useEffect(() => {
    if (account && chainId) {
      const sdkSocket = createSocketConnection({
        user: `eip155:${chainId}:${account}`, // user address in CAIP
        env: "staging",
        socketOptions: { autoConnect: true }
      });
      setSdkSocket(sdkSocket);
      addSocketEvents(sdkSocket);
      getNotifications();
      getStreams();
      return () => {
        if (sdkSocket) {
          removeSocketEvents(sdkSocket);
          sdkSocket.disconnect();
        }
      };
    }
  }, [account, chainId]);

  useEffect(() => {
    if (provider) {
      console.log("window.ethereum", window.ethereum);
      window.ethereum.on("accountsChanged", () => window.location.reload());
      window.ethereum.on("chainChanged", (chainId) =>
        setChainId(parseInt(chainId))
      );
      window.ethereum.on("connect", (info) =>
        console.log("connected to network", info)
      );

      // sync streams every 30 seconds
      const intervalCall = setInterval(() => {
        getStreams();
      }, 30000);

      return () => {
        clearInterval(intervalCall);
        window.ethereum.removeAllListeners();
      };
    }
  }, [provider]);

  const addSocketEvents = (sdkSocket) => {
    sdkSocket?.on(EVENTS.CONNECT, () => {
      console.log("Connected to Push Protocol");
      setIsSocketConnected(true);
    });

    sdkSocket?.on(EVENTS.DISCONNECT, () => {
      console.log("Disconnected from Push Protocol");
      setIsSocketConnected(false);
    });

    sdkSocket?.on(EVENTS.USER_FEEDS, (feedItem, b, c) => {
      console.log("Received new notification:", feedItem, b, c);
      notification.info({
        message: feedItem?.payload?.notification?.title,
        description: feedItem?.payload?.notification?.body,
        duration: 6,
        icon: (
          <Avatar
            shape="circle"
            size="large"
            alt="notification icon"
            src={feedItem?.payload?.data?.icon}
          />
        )
      });
      const {
        payload: { data },
        source
      } = feedItem;
      const newNotification = {
        cta: data.acta,
        app: data.app,
        icon: data.icon,
        title: data.asub,
        message: data.amsg,
        image: data.aimg,
        url: data.url,
        blockchain: source
      };
      console.log("New notification", newNotification);
      setNotifications((prev) => [feedItem, ...prev]);
    });
  };

  const removeSocketEvents = (sdkSocket) => {
    sdkSocket?.off(EVENTS.CONNECT);
    sdkSocket?.off(EVENTS.DISCONNECT);
    sdkSocket?.off(EVENTS.USER_FEEDS);
  };

  const toggleConnection = () => {
    if (isSocketConnected) {
      console.log("Disconnecting from Push Protocol");
      sdkSocket.disconnect();
    } else {
      console.log("Connecting to Push Protocol");
      sdkSocket.connect();
    }
  };

  const getNotifications = () => {
    PushAPI.user
      .getFeeds({
        user: `eip155:${chainId}:${account}`, // user address in CAIP
        env: "staging",
        page: 1,
        limit: 10,
        raw: true
      })
      .then((feeds) => {
        console.log("user notifications: ", feeds);
        setNotifications(feeds);
      })
      .catch((err) => {
        console.error("failed to get user notifications: ", err);
      });
  };

  const optInToChannel = async () => {
    await PushAPI.channels.subscribe({
      env: "staging",
      signer: provider.getSigner(),
      channelAddress: `eip155:${chainId}:${SUPERFLUID_CHANNEL_ADDRESS}`, // channel address in CAIP
      userAddress: `eip155:${chainId}:${account}`, // user address in CAIP
      onSuccess: () => {
        console.log("opt-in success");
        message.success("Opted-in to channel to receive notifications");
      },
      onError: (err) => {
        console.error("opt-in error", err);
        message.error("Failed to opt-in to channel");
      }
    });
  };

  const getStreams = () => {
    setLoading(true);
    client
      .request(STREAMS_QUERY, {
        skip: 0,
        first: 100,
        orderBy: "createdAt",
        orderDirection: "desc",
        where: {
          sender: account
        }
      })
      .then((data) => {
        console.log("streams: ", data.streams);
        setStreams(data.streams);
        setLoading(false);
      })
      .catch((err) => {
        setLoading(false);
        message.error("Something went wrong!");
        console.error("failed to get streams: ", err);
      });
  };

  const handleCreateStream = async ({
    token,
    sender = account,
    receiver,
    flowRate
  }) => {
    console.log("create inputs: ", token, sender, receiver, flowRate);
    if (!token || !sender || !receiver || !flowRate)
      return message.error("Please fill all the fields");
    try {
      setLoading(true);
      const superToken = await superfluidSdk.loadSuperToken(token);
      const flowRateInWeiPerSecond = calculateFlowRateInWeiPerSecond(flowRate);
      console.log("flowRateInWeiPerSecond: ", flowRateInWeiPerSecond);
      let flowOp = superToken.createFlow({
        sender,
        receiver,
        flowRate: flowRateInWeiPerSecond
      });

      await flowOp.exec(provider.getSigner());
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
    console.log("update inputs: ", token, sender, receiver, flowRate);
    if (!flowRate) return message.error("Please enter new flow rate");
    try {
      setLoading(true);
      const superToken = await superfluidSdk.loadSuperToken(token);
      const flowRateInWeiPerSecond = calculateFlowRateInWeiPerSecond(flowRate);
      console.log("flowRateInWeiPerSecond: ", flowRateInWeiPerSecond);
      let flowOp = superToken.updateFlow({
        sender,
        receiver,
        flowRate: flowRateInWeiPerSecond
      });
      await flowOp.exec(provider.getSigner());
      message.success("Stream updated successfully");
      setLoading(false);
    } catch (err) {
      setLoading(false);
      message.error("Failed to update stream");
      console.error("failed to update stream: ", err);
    }
  };

  const handleDeleteStream = async ({ token, sender, receiver }) => {
    try {
      setLoading(true);
      const superToken = await superfluidSdk.loadSuperToken(token);
      let flowOp = superToken.deleteFlow({
        sender,
        receiver
      });

      await flowOp.exec(provider.getSigner());
      message.success("Stream deleted successfully");
      setLoading(false);
    } catch (err) {
      setLoading(false);
      message.error("Failed to delete stream");
      console.error("failed to delete stream: ", err);
    }
  };

  const Inbox = () => {
    return (
      <div>
        <h3>Inbox</h3>
        {notifications.length > 0 ? (
          notifications.map((oneNotification, id) => {
            const {
              payload: { data },
              source
            } = oneNotification;
            const { app, icon, acta, asub, amsg, aimg, url } = data;
            return (
              <NotificationItem
                key={id} // any unique id
                notificationTitle={asub}
                notificationBody={amsg}
                cta={acta}
                app={app}
                icon={icon}
                image={aimg}
                url={url}
                chainName={source}
                isSpam={false}
              />
            );
          })
        ) : (
          <Empty description="No notifications. Opt-in to channels to receive notifications" />
        )}
      </div>
    );
  };

  const SuperfluidNotifications = () => {
    const superfluidNotifications = notifications.filter(
      ({ sender }) => sender === SUPERFLUID_CHANNEL_ADDRESS
    );
    return (
      <div>
        <h3>Superfluid Streams</h3>
        {superfluidNotifications.length > 0 ? (
          superfluidNotifications.map((oneNotification, id) => {
            const {
              payload: { data },
              source
            } = oneNotification;
            const { app, icon, acta, asub, amsg, aimg, url } = data;
            return (
              <NotificationItem
                key={id} // any unique id
                notificationTitle={asub}
                notificationBody={amsg}
                cta={acta}
                app={app}
                icon={icon}
                image={aimg}
                url={url}
                chainName={source}
                isSpam={false}
              />
            );
          })
        ) : (
          <>
            <Button type="primary" shape="round" onClick={optInToChannel}>
              Opt-in
            </Button>
            <Empty description="No notifications. Opt-in to channel to receive notifications" />
          </>
        )}
      </div>
    );
  };

  const columns = [
    {
      title: "Asset",
      key: "token",
      width: "5%",
      render: ({ token }) => {
        const tokenData = tokens.find(
          (oneToken) => oneToken.address === token
        ) || {
          icon: "",
          symbol: "Unknown"
        };
        return (
          <>
            <Avatar shape="circle" size="large" src={tokenData.icon} />
            <a
              href={`https://goerli.etherscan.io/token/${token}`}
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
      title: "Receiver",
      key: "receiver",
      ellipsis: true,
      width: "10%",
      render: ({ receiver }) => (
        <a
          href={`https://goerli.etherscan.io/address/${receiver}`}
          target="_blank"
          rel="noreferrer"
        >
          {receiver}
        </a>
      )
    },
    {
      title: "Flow Rate",
      key: "flowRate",
      sorter: (a, b) => a.flowRate.localeCompare(b.flowRate),
      width: "5%",
      render: ({ flowRate, token }) => {
        // calculate flow rate in tokens per second
        const monthlyFlowRate = calculateFlowRate(flowRate);
        const tokenSymbol =
          tokens.find((oneToken) => oneToken.address === token)?.symbol ||
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
      sorter: (a, b) => a.createdAt.localeCompare(b.createdAt),
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
          {row.status === "TERMINATED" ? (
            <Tag color="red">TERMINATED</Tag>
          ) : (
            <Space size="small">
              <Popconfirm
                title={
                  <InputNumber
                    addonAfter="/month"
                    placeholder="New Flow Rate"
                    onChange={(val) => setUpdatedFlowRate(val)}
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
          )}
        </>
      )
    }
  ];

  return (
    <>
      <Layout style={{ minHeight: "100vh" }}>
        <Sider theme="dark" breakpoint="lg" collapsedWidth="0">
          {account && (
            <Card type="inner" size="small">
              <Card.Meta
                title={
                  <Button
                    type="primary"
                    shape="round"
                    onClick={() => window.location.reload()}
                  >
                    Disconnect
                  </Button>
                }
                description={`${account.slice(0, 8)}...${account.slice(-8)}`}
                avatar={
                  <Avatar
                    shape="circle"
                    size="large"
                    alt="Profile"
                    src={`https://api.dicebear.com/5.x/open-peeps/svg?seed=${account}`}
                  />
                }
              />
            </Card>
          )}
          <div className="logo" />
          <Menu
            theme="dark"
            mode="inline"
            defaultSelectedKeys={["notifications"]}
            items={[
              {
                key: "dashboard",
                icon: <BarsOutlined />,
                label: "Dashboard"
              },
              {
                key: "notifications",
                icon: <BellOutlined />,
                label: "Notifications",
                onClick: () => setDrawerVisible(!drawerVisible)
              }
            ]}
          />
        </Sider>
        <Layout className="site-layout">
          <Header className="site-layout-background" style={{ padding: 0 }}>
            <h1 style={{ textAlign: "center", color: "white" }}>
              Superfluid Streams
              <BellOutlined
                style={{
                  float: "right",
                  marginTop: "19px",
                  marginRight: "12px",
                  fontSize: "23px",
                  color: "white"
                }}
                onClick={() => setDrawerVisible(!drawerVisible)}
              />
            </h1>
            {/* add notification bell icon here */}
          </Header>
          <Content
            className="site-layout-background"
            style={{
              margin: "24px 16px",
              padding: 24,
              minHeight: 280
            }}
          >
            {provider ? (
              <div>
                {/* Create Stream Section Starts */}
                <Card className="new-post-card-container" title="Send Stream">
                  <Input
                    type="text"
                    placeholder="Receiver Wallet Address"
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
                      marginBottom: 10,
                      width: "100"
                    }}
                  />
                  <Space>
                    <label htmlFor="token">Select Token:</label>
                    <Select
                      defaultValue={tokens[0].symbol}
                      name="token"
                      id="token"
                      value={streamInput?.token || tokens[0].address}
                      style={{
                        borderRadius: 10,
                        marginBottom: 10
                      }}
                      onChange={(val) =>
                        setStreamInput({ ...streamInput, token: val })
                      }
                    >
                      <Select.Option value={tokens[0].address}>
                        {tokens[0].symbol}
                      </Select.Option>
                      <Select.Option value={tokens[1].address}>
                        {tokens[1].symbol}
                      </Select.Option>
                      <Select.Option value={tokens[2].address}>
                        {tokens[2].symbol}
                      </Select.Option>
                    </Select>
                    {/*  add flowrate input */}
                    <InputNumber
                      name="flowRate"
                      addonAfter="/month"
                      placeholder="Flow Rate"
                      value={streamInput?.flowRate || 0}
                      onChange={(val) =>
                        setStreamInput({ ...streamInput, flowRate: val })
                      }
                      style={{
                        borderRadius: 10,
                        marginBottom: 10
                        // width: 120
                      }}
                    />
                  </Space>
                  <Button
                    type="primary"
                    shape="round"
                    style={{ marginTop: 10 }}
                    onClick={() => handleCreateStream(streamInput)}
                  >
                    Send Stream
                  </Button>
                </Card>
                {/* Create Stream Section Ends */}

                {/* Streams Table Starts */}
                <h2>My Streams</h2>
                <Table
                  className="table_grid"
                  columns={columns}
                  rowKey="id"
                  dataSource={streams}
                  scroll={{ x: 970 }}
                  loading={loading}
                  pagination={{
                    pageSizeOptions: [10, 25, 50, 100],
                    showSizeChanger: true,
                    defaultCurrent: 1,
                    defaultPageSize: 10,
                    size: "default"
                  }}
                  onChange={() => { }}
                />
                {/* Streams Table Ends */}

                {/* Notification Drawer Starts */}
                <Drawer
                  title="Push Notifications"
                  placement="right"
                  // width={500}
                  closable={true}
                  onClose={() => setDrawerVisible(false)}
                  open={drawerVisible}
                >
                  <h3>Push Socket</h3>
                  <p>Connection Status : {isSocketConnected ? "🟢" : "🔴"}</p>
                  <Button
                    type="primary"
                    shape="round"
                    onClick={toggleConnection}
                  >
                    {isSocketConnected ? "Disconnect" : "Connect"}
                  </Button>
                  <Tabs
                    animated
                    onChange={getNotifications}
                    items={[
                      {
                        label: "Superfluid",
                        key: "item-2",
                        children: <SuperfluidNotifications />
                      },
                      {
                        label: "Inbox",
                        key: "item-1",
                        children: <Inbox />
                      }
                    ]}
                  />
                </Drawer>
                {/* Notification Drawer Ends */}
              </div>
            ) : (
              <Button
                style={{ marginLeft: "30%" }}
                type="primary"
                shape="round"
                onClick={handleConnectWallet}
              >
                Connect Wallet
              </Button>
            )}
          </Content>
          <Footer style={{ textAlign: "center" }}>
            {account && (
              <Chat
                account={account} //user address
                supportAddress="0xc2009D705d37A9341d6cD21439CF6B4780eaF2d7" //support address
                apiKey={process.env.REACT_APP_PUSH_CHAT_API_KEY}
                env="staging"
              />
            )}
            <a
              href="https://github.com/Salmandabbakuti"
              target="_blank"
              rel="noopener noreferrer"
            >
              © {new Date().getFullYear()} Salman Dabbakuti. Powered by
              Superfluid & Push Protocol
            </a>
          </Footer>
        </Layout>
      </Layout>
    </>
  );
}
