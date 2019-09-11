---
sidebarDepth: 4
---

# API

## SocketIoClientBiz

`(opts: SocketOpts): SocketIoClientBiz`

- construct a client instance

**Usage**

```javascript
import { SocketIoClientBiz } from 'socket.io.client.biz'

const bizClient = new SocketIoClientBiz({
  base: 'http://demo.ssp.com',
  token: 'your token for authentication',
  projectId: 'project you are going to watch',
  // set to false to disable reconnect feature
  reconnect: {
    reconnection: true,
    reconnectionDelay: 20000
  }
})
```

## Methods

### connect

`(callback: { (error: string): void }): void`

- open the connection with server

**Usage**

```javascript
bizClient.connect(err => {
  if (err) {
    console.log(`Failed to connect`, err)
  }
})
```

### onStateChange

`(state: CLIENT_STATE): Subscription`

- listen for client state change

**Usage**

```javascript
// watch every connection state change
const stateChangeSub = bizClient.onStateChange(state => {
  console.log('state changed to', state)
})

// you can dispose this subscription later
stateChangeSub.dispose()
```

### subscribe

`(topic: string, event: string, cb: EventCallback): Subscription`

- subscribe event for specific topic

**Usage**

```javascript
// watch for specific event along with its topic
const eventSub = bizClient.subscribe('spaces', 'SPACE_ADDED', (message: EventMessage) => {
  console.log(message)
})

// you can dispose this subscription later
eventSub.dispose()
```

### disconnect

`(): void`

- manually close the connection with server side

**Usage**

```javascript
bizClient.disconnect()
```
