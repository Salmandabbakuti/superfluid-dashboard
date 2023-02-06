### Superfluid Stream Lifecycle Notifications using Push Protocol

This project provides real-time notifications for superfluid stream lifecycle(creation, update, deletion) events using Push Protocol. The notifications are delivered to users via channels.

#### Workflow Architecture

![superfluid-streamsXpush_architecture](https://user-images.githubusercontent.com/29351207/216531845-761631c3-78b7-421b-9723-ac31fe3fb7cc.png)

#### Getting started

To get started, you should be opted in to streams channel(0xDc7c5B449D4417A5aa01bf53aD280b1BEDf4b078) on push staging app(follow video below) and have Push Protocol browser extension. Once you have these, whenever you create/update/delete streams on superfluid app, receiver should be getting notified on push channel about your streams.

#### Steps to get started(Via superfluid official app)

1. Go to https://staging.push.org/ and connect your wallet
2. Opt in to Superfluid streams channel(https://staging.push.org/#/channels?channel=0xDc7c5B449D4417A5aa01bf53aD280b1BEDf4b078) on push staging app by searching for the channel and clicking on "Opt In" button
3. Download and install Push staging browser extension from https://chrome.google.com/webstore/detail/push-staging-protocol-alp/bjiennpmhdcandkpigcploafccldlakj and add your(receiver) wallet address to the extension
4. Go to https://app.superfluid.finance/send and connect your wallet to Superfluid app and select Goerli testnet
5. Select receiver address, token and amount
6. Click on "Send Stream" button
7. Receiver should be getting notified on push channel about stream(if they also opted-in to channel)
8. Try updating and deleting stream and Receiver should be getting notified about stream on push channel

##### Getting started via local setup

```
cd client
npm install
npm run start
```

#### Demo

https://user-images.githubusercontent.com/29351207/215961261-b9ed4491-5606-4599-9410-606b2573169d.mp4

https://user-images.githubusercontent.com/29351207/216773709-d732db09-578f-4f70-a000-9050823270f1.mp4

![Superfluid_stream-ui](https://user-images.githubusercontent.com/29351207/216894300-78b626ba-1554-4aea-8bc5-0ca50003353c.png)
![Superfluid_stream-app-notif](https://user-images.githubusercontent.com/29351207/216761308-eeb06b90-5baa-4983-a47d-383ebbd010c1.png)
![Superfluid_stream-ext-notiication](https://user-images.githubusercontent.com/29351207/215981324-5bcabda2-b827-4da1-a885-c977c8ab1772.png)

#### Contributing

If you are interested in contributing to the project, please review the CONTRIBUTING.md file for more information.

#### License

This project is licensed under the MIT License - see the LICENSE file for details.
