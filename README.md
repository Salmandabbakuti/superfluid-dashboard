### Asset Streaming with Superfluid

This project includes a user-friendly dashboard where users can easily create, update, and delete superfluid streams, as well as monitor their status in real time with an in-house notification system. The dashboard provides a centralized location for users to manage all of their streams, view important details, and receive notifications.

The dashboard is intuitive and easy to use, allowing users to quickly and efficiently manage their financial transactions. With this project, users can receive real-time notifications about stream creation, updates, and deletions, ensuring that they have up-to-date information using Push Protocol. The notifications are delivered to users via push channels.

The beauty of this project is that users can get notified of streams even if they created/modified/deleted the stream from the official app/or through SDK or contract. This streamlined process helps to streamline communication and improves the overall efficiency of financial transactions, ensuring that all parties involved are always on the same page.

#### Workflow Architecture

![superfluid-streamsXpush_architecture](https://user-images.githubusercontent.com/29351207/218289848-8a71e2d6-a14a-45f8-9f3a-9cd85292fbbd.png)

#### Getting started

To get started, you should be opted in to streams channel(0xDc7c5B449D4417A5aa01bf53aD280b1BEDf4b078) on push staging app(follow video below) and have Push Protocol browser extension. Once you have these, whenever you create/update/delete streams on superfluid app, receiver should be getting notified on push channel about your streams.

### Deployed Resources:

- [Superfluid Asset Streaming App](https://superfluid-streams-push.vercel.app/)
- [Superfluid Asset Streaming Subgraph](https://thegraph.com/hosted-service/subgraph/salmandabbakuti/superfluid-stream-push)
- [Superfluid Streams Push Channel](https://staging.push.org/#/channels?channel=0xDc7c5B449D4417A5aa01bf53aD280b1BEDf4b078)

##### Getting started via local setup

```
cd client
npm install
npm run start
```

#### Demo

##### With Superfluid Asset Streaming App

https://user-images.githubusercontent.com/29351207/216773709-d732db09-578f-4f70-a000-9050823270f1.mp4

##### With Superfluid official app

1. Go to https://staging.push.org/ and connect your wallet
2. Opt in to Superfluid streams channel(https://staging.push.org/#/channels?channel=0xDc7c5B449D4417A5aa01bf53aD280b1BEDf4b078) on push staging app by searching for the channel and clicking on "Opt In" button
3. Download and install Push staging browser extension from https://chrome.google.com/webstore/detail/push-staging-protocol-alp/bjiennpmhdcandkpigcploafccldlakj and add your(receiver) wallet address to the extension
4. Go to https://app.superfluid.finance/send and connect your wallet to Superfluid app and select Goerli testnet
5. Select receiver address, token and amount
6. Click on "Send Stream" button
7. Receiver should be getting notified on push channel about stream(if they also opted-in to channel)
8. Try updating and deleting stream and Receiver should be getting notified about stream on push channel

https://user-images.githubusercontent.com/29351207/215961261-b9ed4491-5606-4599-9410-606b2573169d.mp4

#### Screenshots

![Superfluid_stream-ui](https://user-images.githubusercontent.com/29351207/218626354-7ce1f35f-6abd-4518-8ae9-35d312a5ca0c.png)
![Superfluid_stream-app-notif](https://user-images.githubusercontent.com/29351207/218627229-eefd2141-3747-4eab-9af4-0ac0865a61c3.png)
![Superfluid_stream-ext-notiication](https://user-images.githubusercontent.com/29351207/218626309-082158ee-806a-4d9c-890f-84eb99b49146.png)

#### Contributing

If you are interested in contributing to the project, please review the CONTRIBUTING.md file for more information.

#### License

This project is licensed under the MIT License - see the LICENSE file for details.

### Safety

This is experimental software and evolving quickly. It is not ready for production use. Use at your own risk.

Superfluid Asset Streaming App is a proof of concept and is not ready for production use. It is not audited and has not been tested for security. Use at your own risk.
I do not give any warranties and will not be liable for any loss incurred through any use of this codebase.
