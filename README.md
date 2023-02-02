### Superfluid Steam Lifecycle Notifications using Push Protocol

This project provides real-time notifications for superfluid steam lifecycle(creation, update, deletion) events using Push Protocol. The notifications are delivered to users via channels.

#### Workflow Architecture

![superfluidxpush-architecture](https://user-images.githubusercontent.com/29351207/215531163-328cbad5-c93f-49da-8fee-e135c973cafd.png)

#### Getting started

To get started, you should be opted in to streams channel(0xDc7c5B449D4417A5aa01bf53aD280b1BEDf4b078) on push staging app(follow video below) and have Push Protocol browser extension. Once you have these, whenever you create/update/delete streams on superfluid app, you should be getting notified on push channel about your streams.

#### Steps to get started

1. Go to https://staging.push.org/ and connect your wallet
2. Opt in to Superfluid streams channel(0xDc7c5B449D4417A5aa01bf53aD280b1BEDf4b078) on push staging app by searching for the channel and clicking on "Opt In" button
3. Download and install Push staging browser extension from https://chrome.google.com/webstore/detail/push-staging-protocol-alp/bjiennpmhdcandkpigcploafccldlakj and add your(receiver) wallet address to the extension
4. Go to https://app.superfluid.finance/send and connect your wallet to Superfluid app and select Goerli testnet
5. Select receiver address, token and amount
6. Click on "Send Stream" button
7. You should be getting notified on push channel about your streams
8. Try updating and deleting streams and you should be getting notified about your streams on push channel

#### Demo

https://user-images.githubusercontent.com/29351207/215961261-b9ed4491-5606-4599-9410-606b2573169d.mp4

![Superfluid_stream-notiication](https://user-images.githubusercontent.com/29351207/215981324-5bcabda2-b827-4da1-a885-c977c8ab1772.png)

#### Contributing

If you are interested in contributing to the project, please review the CONTRIBUTING.md file for more information.

#### License

This project is licensed under the MIT License - see the LICENSE file for details.
