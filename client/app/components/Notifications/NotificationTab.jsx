import { Button, Card, Empty, Avatar } from "antd";
import Image from "next/image";
import dayjs from "dayjs";

export default function NotificationTab({
  title,
  notifications,
  handleOptInToChannel
}) {
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
          <Button type="primary" shape="round" onClick={handleOptInToChannel}>
            Opt-in
          </Button>
          <Empty description="No notifications. Opt-in to channels to receive notifications" />
        </>
      )}
    </div>
  );
}
