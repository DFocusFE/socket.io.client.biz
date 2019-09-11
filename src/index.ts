import io from 'socket.io-client'

import {
  SocketOpts,
  CONNECT_EVENT,
  BIZ_EVENT,
  CLIENT_STATE,
  AUTH_CODE,
  StateChangeCallback,
  EventMessage,
  SUBSCRIBE_CODE,
  EventCallback,
  EventStruct,
  Subscription
} from './types'

import { toUrl } from './helper'

const DISCONNECT_EVENTS = [
  CONNECT_EVENT.CONNECT_ERROR,
  CONNECT_EVENT.CONNECT_TIMEOUT,
  CONNECT_EVENT.DISCONNECT,
  CONNECT_EVENT.ERROR,
  CONNECT_EVENT.RECONNECT_ERROR,
  CONNECT_EVENT.RECONNECT_FAILED
]

export class SocketIoClientBiz {
  private _opts: SocketOpts
  private _state: CLIENT_STATE
  private _stateChangeSubscriptions: Array<StateChangeCallback>
  private _socket: SocketIOClient.Socket
  private _events: Array<EventStruct> = []

  constructor(opts: SocketOpts) {
    this._opts = opts
    this._state = CLIENT_STATE.DISCONNECTED

    this.validate()

    this._stateChangeSubscriptions = []
    this._events = []
  }

  private validate() {
    ;['base', 'projectId', 'token'].forEach(key => {
      if (!this._opts[key]) {
        throw new Error(`${key} is missed in passed opts`)
      }
    })
  }

  public connect(cb: { (error: string): void }) {
    if (this._socket) {
      throw new Error('You cannot call connect multiple times')
    }

    this.connectToWebsocket(cb)
  }

  private connectToWebsocket(cb: { (error: string): void }) {
    const { base, projectId, token } = this._opts
    this._socket = io(toUrl(base, projectId), { multiplex: false })

    this.changeState(CLIENT_STATE.CONNECTING)
    console.debug('Trying to connect to ssp Server...')

    this._socket.on(CONNECT_EVENT.RECONNECT, () => {
      this.changeState(CLIENT_STATE.CONNECTED)
    })

    const errorListener = (...args: Array<string>) => {
      cb(args[0])
    }

    this._socket.on(CONNECT_EVENT.ERROR, errorListener)

    this._socket.on(CONNECT_EVENT.CONNECT, () => {
      const localSocket = this._socket

      // handshake for authentication purpose
      this._socket.emit(BIZ_EVENT.AUTH, { projectId, token }, (authCode: AUTH_CODE) => {
        console.debug('Handshake status', authCode)
        // failed to auth, disconnect and won't retry
        if (AUTH_CODE.AUTH_FAILED === authCode) {
          cb(authCode)
          return this.disconnect()
        }

        this._socket.off(CONNECT_EVENT.ERROR, errorListener)

        cb('')

        DISCONNECT_EVENTS.forEach(e => {
          this._socket.on(e, () => {
            this.changeState(CLIENT_STATE.DISCONNECTED)
            this.endProcess(localSocket)
          })
        })

        this.startProcess()
        this.changeState(CLIENT_STATE.CONNECTED)
      })
    })
  }

  public disconnect() {
    try {
      this.changeState(CLIENT_STATE.DISCONNECTED)

      // this._stateChangeSubscriptions = []
      // this._events = []

      const socket = this._socket
      this._socket = null

      socket.close()
    } catch (error) {
      console.warn('Closing ', error)
    }
  }

  public onStateChange(cb: StateChangeCallback): Subscription {
    if (!cb) {
      return {
        dispose() {}
      }
    }
    if (!this._stateChangeSubscriptions.includes(cb)) {
      this._stateChangeSubscriptions.push(cb)
    }

    return {
      dispose: () => {
        this._stateChangeSubscriptions = this._stateChangeSubscriptions.filter(c => c !== cb)
      }
    }
  }

  private changeState(state: CLIENT_STATE) {
    this._state = state
    this._stateChangeSubscriptions.forEach(cb => {
      cb(this._state)
    })
  }

  public subscribe(topic: string, event: string, callback: EventCallback): Subscription {
    if (!topic || !event || !callback) {
      throw new Error('topic or event or callback cannot be empty')
    }

    if (CLIENT_STATE.CONNECTED === this._state) {
      throw new Error('subscribe cannot be called after connection established')
    }

    const e = {
      topic,
      event,
      callback: (event: string): void => {
        const message: EventMessage = JSON.parse(event)
        if (message.topic === e.topic) {
          callback(message)
        }
      }
    }

    this._events.push(e)

    return {
      dispose: () => {
        this._socket.off(event, e.callback)
      }
    }
  }

  private startProcess() {
    const topics = this._events.map(e => e.topic)

    this._socket.emit(BIZ_EVENT.SUBSCRIBE, topics, (subscribeCode: SUBSCRIBE_CODE) => {
      console.debug('subscribe ack code:', subscribeCode)
      if (SUBSCRIBE_CODE.SUB_SUCCESS !== subscribeCode) {
        // do nothing if it is not allowed
        return
      }

      this._events.forEach(e => {
        this._socket.on(e.event, e.callback)
      })
    })
  }

  private endProcess(socket: SocketIOClient.Socket) {
    this._events.forEach(e => {
      socket.off(e.event)
    })

    DISCONNECT_EVENTS.forEach(e => {
      socket.off(e)
    })
  }
}

export {
  SocketOpts,
  CONNECT_EVENT,
  BIZ_EVENT,
  CLIENT_STATE,
  AUTH_CODE,
  StateChangeCallback,
  EventMessage,
  SUBSCRIBE_CODE,
  EventCallback
} from './types'
