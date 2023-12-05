import { Drawer, Button, Tabs, Card, Avatar, Empty, message } from "antd";
import Image from "next/image";
import dayjs from "dayjs";
import { BellOutlined } from "@ant-design/icons";
import { PushAPI, CONSTANTS } from "@pushprotocol/restapi";
import { useAddress, useSigner } from "@thirdweb-dev/react";
import { useState, useEffect } from "react";
import { superfluidChannelAddress } from "@/utils/constants";

export default function NotificationDrawer() {
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [isSocketConnected, setIsSocketConnected] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notificationType, setNotificationType] = useState("inbox");
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
          channels: [`eip155:80001:${superfluidChannelAddress}`]
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

  const optInToChannel = async () => {
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
      const stream = await pushSdk.initStream([
        CONSTANTS.STREAM.NOTIF,
        CONSTANTS.STREAM.CONNECT,
        CONSTANTS.STREAM.DISCONNECT
      ]);

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

      stream.on(CONSTANTS.STREAM.NOTIF, (data) => {
        console.log("new notification->", data);
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
    }
  }, [pushSdk, notificationType]);

  const NotificationTab = ({ title }) => {
    return (
      <div>
        <h3>{title}</h3>
        {notifications.length > 0 ? (
          notifications.map((oneNotification, id) => {
            const {
              payload: { data }
            } = oneNotification;
            const { app, icon, acta, asub, amsg, aimg, url, epoch } = data;
            // time to now from epoch using dayjs
            const timestamp = dayjs.unix(epoch).fromNow();
            return (
              <Card
                key={id}
                style={{
                  cursor: "pointer",
                  marginTop: 14,
                  borderRadius: 10,
                  border: "1px solid #d9d9d9"
                }}
                title={
                  <a href={url} target="_blank" rel="noopener noreferrer">
                    <Card.Meta
                      avatar={<Avatar shape="circle" size="large" src={icon} />}
                      title={app}
                      description={timestamp}
                    />
                  </a>
                }
              >
                <a href={acta} target="_blank" rel="noopener noreferrer">
                  <Card.Meta title={asub} description={amsg} />
                  {aimg && (
                    <Image
                      width={260}
                      style={{ marginTop: 10, borderRadius: 10 }}
                      alt="post-media"
                      src={aimg}
                    />
                  )}
                </a>
              </Card>
            );
          })
        ) : (
          <>
            <Button type="primary" shape="round" onClick={optInToChannel}>
              Opt-in
            </Button>
            <Empty description="No notifications. Opt-in to channels to receive notifications" />
          </>
        )}
      </div>
    );
  };

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
              children: <NotificationTab title="Superfluid" />
            },
            {
              label: "Inbox",
              key: "inbox",
              children: <NotificationTab title="Inbox" />
            }
          ]}
        />
      </Drawer>
      {/* Notification Drawer Ends */}
    </div>
  );
}
