# socket.io.client.biz

[![NPM version][npm-image]][npm-url]
![][david-url]
![][dt-url]
![][license-url]

DFocus wanted ssp solution - javascript-client.

`socket.io.client.biz` is made for domain specific business scenarios. It consists of following features:

- re-connect
- authentication via token
- project based, let's say you are working on a SaaS platform, several projects may subscribe topics individually
- easy to distinguish events from topics
- no need to worry about re-subscribe process whenever re-connect triggered

## Install

### yarn

```bash
yarn add socket.io.client.biz
```

### npm

```bash
npm install --save socket.io.client.biz
```

## Import

### ES2015

```javascript
import { SocketIoClientBiz } from 'socket.io.client.biz'
```

### CommonJS

```javascript
const { SocketIoClientBiz } = require('socket.io.client.biz')
```

## Usage

```javascript
import { SocketIoClientBiz } from 'socket.io.client.biz'

const bizClient = new SocketIoClientBiz({
  base: 'http://demo.ssp.com/msg-center/websocket',
  token: 'your token for authentication',
  projectId: 'project you are going to watch',
  // set to false to disable reconnect feature
  reconnect: {
    reconnection: true,
    reconnectionDelay: 20000
  }
})

// watch every connection state change
bizClient.onStateChange(state => {
  console.log('state changed to', state)
})

// connect
bizClient
  .connect()
  .then(() => {
    return bizClient.subscribe('spaces', 'users')
  })
  .then(() => {
    bizClient.on('spaces', 'SPACE_ADDED', (message: EventMessage) => {
      console.log(message)
    })
  })
```

## LICENSE

[MIT License](https://raw.githubusercontent.com/DFocusFE/socket.io.client.biz/master/LICENSE)

[npm-url]: https://npmjs.org/package/socket.io.client.biz
[npm-image]: https://badge.fury.io/js/socket.io.client.biz.png
[david-url]: https://david-dm.org/DFocusFE/socket.io.client.biz.png
[dt-url]: https://img.shields.io/npm/dt/socket.io.client.biz.svg
[license-url]: https://img.shields.io/npm/l/socket.io.client.biz.svg
