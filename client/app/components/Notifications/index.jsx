import { Drawer, Button, Tabs, Avatar, message, notification } from "antd";
import { BellOutlined } from "@ant-design/icons";
import { PushAPI, CONSTANTS } from "@pushprotocol/restapi";
import { useAddress, useSigner } from "@thirdweb-dev/react";
import { useState, useEffect } from "react";
import { superfluidChannelAddress } from "@/utils/constants";
import NotificationTab from "./NotificationTab";

const isFirstTimeUser = localStorage.getItem("product_tour") === null;

export default function NotificationDrawer() {
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [isSocketConnected, setIsSocketConnected] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notificationType, setNotificationType] = useState("superfluid");
  const [pushSdk, setPushSdk] = useState(null);
  const [stream, setStream] = useState(null);

  const address = useAddress();
  const signer = useSigner();

  const getNotifications = async () => {
    pushSdk.notification
      .list("INBOX", {
        raw: true,
        limit: 20,
        page: 1,
        ...(notificationType === "superfluid" && {
          channels: [superfluidChannelAddress]
        })
      })
      .then((res) => {
        console.log("notifications res->", res);
        setNotifications(res);
      })
      .catch((err) => {
        console.error("notification err->", err);
        message.error("Failed to get notifications");
      });
  };

  const handleOptInToChannel = async () => {
    pushSdk.notification
      .subscribe(`eip155:80001:${superfluidChannelAddress}`, {
        settings: [
          {
            enabled: true,
            value: "1"
          }
        ]
      })
      .then((res) => {
        message.success("Opted-in to channel to receive notifications");
        console.log("optin res->", res);
      })
      .catch((err) => {
        console.error("optin err->", err);
        message.error("Failed to opt-in to channel");
      });
  };

  const initializePushSdk = async (signer, account) => {
    try {
      const pushSdk = await PushAPI.initialize(signer, {
        env: CONSTANTS.ENV.STAGING,
        account
      });

      // realtime notifications
      const stream = await pushSdk.initStream(
        [
          CONSTANTS.STREAM.NOTIF,
          CONSTANTS.STREAM.CONNECT,
          CONSTANTS.STREAM.DISCONNECT
        ],
        { raw: true }
      );

      setPushSdk(pushSdk);
      setStream(stream);

      // Connect to stream on initialization
      stream.connect();

      // Set stream event handling
      stream.on(CONSTANTS.STREAM.CONNECT, () => {
        console.log("Stream connected");
        setIsSocketConnected(true);
      });

      stream.on(CONSTANTS.STREAM.DISCONNECT, () => {
        console.log("Stream disconnected");
        setIsSocketConnected(false);
      });

      stream.on(CONSTANTS.STREAM.NOTIF, (feedItem) => {
        console.log("Received new notification:", feedItem);
        notification.info({
          message: feedItem?.message?.notification?.title,
          description: feedItem?.message?.notification?.body,
          duration: 6,
          icon: (
            <Avatar
              shape="circle"
              size="small"
              alt="notification icon"
              src={feedItem?.channel?.icon}
            />
          )
        });
        const { channel, message, timestamp } = feedItem;
        const newNotification = {
          app: channel.name,
          icon: channel.icon,
          url: channel.url,
          acta: message.notification.payload.cta,
          asub: message.notification.title,
          amsg: message.notification.body,
          aimg: message.notification.aimg,
          epoch: timestamp
        };
        console.log("New notification", newNotification);
        setNotifications((prev) => [newNotification, ...prev]);
      });
    } catch (err) {
      console.error("push sdk init err->", err);
      message.error("Failed to initialize push sdk");
    }
  };

  const toggleConnection = () => {
    if (isSocketConnected) {
      stream.disconnect();
    } else {
      stream.connect();
    }
  };

  useEffect(() => {
    if (address && signer) {
      initializePushSdk(signer, address);
    }
  }, [address, signer]);

  useEffect(() => {
    if (pushSdk) {
      getNotifications();
      // if first time user, greet user with and notification and ask to check notifications'
      if (isFirstTimeUser) {
        setTimeout(() => {
          notification.info({
            message: "Welcome to Superfluid Push Dashboard!",
            description:
              "Hey there! Just a friendly reminder to check your notifications in our app. We've got some important updates, messages, and personalized offers waiting for you. Thanks for using our app!"
          });
        }, 3000);
        localStorage.setItem("product_tour", "done");
      }
    }
  }, [pushSdk, notificationType]);

  return (
    <div>
      <BellOutlined
        style={{
          fontSize: "23px",
          color: "white",
          marginRight: "10px" // Adjust the gap as needed
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
        <p>Connection Status : {isSocketConnected ? "🟢" : "🔴"}</p>
        <Button type="primary" shape="round" onClick={toggleConnection}>
          {isSocketConnected ? "Disconnect" : "Connect"}
        </Button>
        <Tabs
          animated
          onChange={(key) => {
            console.log(key);
            setNotificationType(key);
          }}
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
      {/* Notification Drawer Ends */}
    </div>
  );
}
