import { useState, useEffect } from "react";
import { Drawer, Button, Tabs, Avatar, message, notification } from "antd";
import { BellOutlined } from "@ant-design/icons";
import { PushAPI, CONSTANTS as PUSH_CONSTANTS } from "@pushprotocol/restapi";
import { useAddress, useSigner } from "@thirdweb-dev/react";
import { superfluidChannelAddress } from "@/utils/constants";
import NotificationTab from "./NotificationTab";

export default function NotificationDrawer() {
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [isSocketConnected, setIsSocketConnected] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notificationType, setNotificationType] = useState("superfluid");
  const [pushSdk, setPushSdk] = useState(null);
  const [stream, setStream] = useState(null);

  const address = useAddress();
  const signer = useSigner();

  const initializePushSdk = async () => {
    try {
      const pushSdkInstance = await PushAPI.initialize(signer, {
        env: PUSH_CONSTANTS.ENV.STAGING,
        account: address
      });

      const streamInstance = await pushSdkInstance.initStream(
        [
          PUSH_CONSTANTS.STREAM.NOTIF,
          PUSH_CONSTANTS.STREAM.CONNECT,
          PUSH_CONSTANTS.STREAM.DISCONNECT
        ],
        { raw: true }
      );

      setPushSdk(pushSdkInstance);
      setStream(streamInstance);

      // connect to stream
      streamInstance.connect();

      streamInstance.on(PUSH_CONSTANTS.STREAM.CONNECT, handleStreamConnect);
      streamInstance.on(
        PUSH_CONSTANTS.STREAM.DISCONNECT,
        handleStreamDisconnect
      );
      streamInstance.on(PUSH_CONSTANTS.STREAM.NOTIF, handleStreamNotification);
    } catch (error) {
      console.error("Push SDK initialization error:", error);
      message.error("Failed to initialize push SDK");
    }
  };

  const handleStreamConnect = () => {
    console.log("Stream connected");
    setIsSocketConnected(true);
  };

  const handleStreamDisconnect = () => {
    console.log("Stream disconnected");
    setIsSocketConnected(false);
  };

  const handleStreamNotification = (feedItem) => {
    console.log("Received new notification:", feedItem);
    const { message, channel, timestamp } = feedItem;

    notification.info({
      message: message?.notification?.title,
      description: message?.notification?.body,
      duration: 6,
      icon: (
        <Avatar
          shape="circle"
          size="small"
          alt="notification icon"
          src={channel?.icon}
        />
      )
    });

    const data = {
      app: channel?.name,
      icon: channel?.icon,
      url: channel?.url,
      acta: message?.payload.cta,
      asub: message?.notification?.title,
      amsg: message?.notification?.body,
      aimg: message?.notification?.aimg,
      epoch: timestamp
    };

    const newNotification = {
      payload: { data }
    };

    console.log("New notification", newNotification);
    setNotifications((prevNotifications) => [
      newNotification,
      ...prevNotifications
    ]);
  };

  const toggleConnection = () => {
    isSocketConnected ? stream?.disconnect() : stream?.connect();
  };

  const getNotifications = async () => {
    try {
      const response = await pushSdk.notification.list("INBOX", {
        raw: true,
        limit: 20,
        page: 1,
        ...(notificationType === "superfluid" && {
          channels: [superfluidChannelAddress]
        })
      });
      console.log("Notifications response:", response);
      setNotifications(response);
    } catch (error) {
      console.error("Notification retrieval error:", error);
      message.error("Failed to get notifications");
    }
  };

  const handleOptInToChannel = async () => {
    try {
      const response = await pushSdk.notification.subscribe(
        `eip155:80001:${superfluidChannelAddress}`,
        {
          settings: [
            {
              enabled: true,
              value: "1"
            }
          ]
        }
      );
      console.log("Opt-in response:", response);
      message.success("Opted-in to channel to receive notifications");
    } catch (error) {
      console.error("Opt-in error:", error);
      message.error("Failed to opt-in to channel");
    }
  };

  useEffect(() => {
    if (address && signer) {
      initializePushSdk();
    }

    // Product tour
    const productTour = localStorage.getItem("product_tour") === null;
    if (productTour) {
      setTimeout(() => {
        notification.info({
          message: "Welcome to Superfluid Push Dashboard!",
          description:
            "Hey there! Just a friendly reminder to check your notifications in our app. We've got some important updates, messages, and personalized offers waiting for you. Thanks for using our app!"
        });
      }, 3000);
      localStorage.setItem("product_tour", "done");
    }

    return () => {
      if (stream) {
        stream.disconnect();
        stream.removeAllListeners();
      }
    };
  }, [address, signer]);

  useEffect(() => {
    if (pushSdk) {
      getNotifications();
    }
  }, [pushSdk, notificationType]);

  return (
    <div>
      <BellOutlined
        style={{
          fontSize: "23px",
          color: "white",
          marginRight: "10px"
        }}
        onClick={() => setDrawerVisible(!drawerVisible)}
      />
      <Drawer
        style={{
          color: "black"
        }}
        title="Push Notifications"
        placement="right"
        closeIcon={true}
        onClose={() => setDrawerVisible(false)}
        open={drawerVisible}
        autoFocus
      >
        <h3>Push Socket</h3>
        <p>Connection Status: {isSocketConnected ? "🟢" : "🔴"}</p>
        <Button type="primary" shape="round" onClick={toggleConnection}>
          {isSocketConnected ? "Disconnect" : "Connect"}
        </Button>
        <Tabs
          animated
          onChange={(key) => setNotificationType(key)}
          items={[
            {
              label: "Superfluid",
              key: "superfluid",
              children: (
                <NotificationTab
                  title="Superfluid"
                  notifications={notifications}
                  handleOptInToChannel={handleOptInToChannel}
                />
              )
            },
            {
              label: "Inbox",
              key: "inbox",
              children: (
                <NotificationTab
                  title="Inbox"
                  notifications={notifications}
                  handleOptInToChannel={handleOptInToChannel}
                />
              )
            }
          ]}
        />
      </Drawer>
    </div>
  );
}
