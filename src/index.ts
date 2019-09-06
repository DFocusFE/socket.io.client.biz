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
  EventStruct
} from './types'

import { toUrl } from './helper'

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

  public connect(cb: { (authCode: string): void }) {
    if (this._socket) {
      throw new Error('You cannot call connect multiple times')
    }

    this.connectToWebsocket(cb)
  }

  private connectToWebsocket(cb: { (authCode: string): void }) {
    const { base, projectId, token } = this._opts
    this._socket = io(toUrl(base, projectId), { multiplex: false })

    this.changeState(CLIENT_STATE.CONNECTING)
    console.debug('Trying to connect to ssp Server...')

    const disconnectEvents = [
      CONNECT_EVENT.CONNECT_ERROR,
      CONNECT_EVENT.CONNECT_TIMEOUT,
      CONNECT_EVENT.DISCONNECT,
      CONNECT_EVENT.ERROR,
      CONNECT_EVENT.RECONNECT_ERROR,
      CONNECT_EVENT.RECONNECT_FAILED
    ]

    disconnectEvents.forEach(e => {
      this._socket.on(e, () => {
        this.changeState(CLIENT_STATE.DISCONNECTED)
        this.endProcess()
      })
    })

    this._socket.on(CONNECT_EVENT.RECONNECT, () => {
      this.changeState(CLIENT_STATE.CONNECTED)
    })

    this._socket.on(CONNECT_EVENT.CONNECT, () => {
      // handshake for authentication purpose
      this._socket.emit(BIZ_EVENT.AUTH, { projectId, token }, (authCode: AUTH_CODE) => {
        console.debug('Handshake status', authCode)
        // failed to auth, disconnect and won't retry
        if (AUTH_CODE.AUTH_FAILED === authCode) {
          cb(authCode)
          return this.disconnect()
        }
        this.changeState(CLIENT_STATE.CONNECTED)

        this.startProcess()
      })
    })
  }

  public disconnect() {
    try {
      this.changeState(CLIENT_STATE.DISCONNECTED)

      this._stateChangeSubscriptions = []
      this._events = []

      const socket = this._socket
      this._socket = null

      socket.close()
    } catch (error) {
      console.warn('Closing ', error)
    }
  }

  public onStateChange(cb: StateChangeCallback) {
    if (!cb) {
      return
    }
    if (this._stateChangeSubscriptions.every(c => c !== cb)) {
      this._stateChangeSubscriptions.push(cb)
    }
  }

  private changeState(state: CLIENT_STATE) {
    this._state = state
    this._stateChangeSubscriptions.forEach(cb => {
      cb(this._state)
    })
  }

  public subscribe(topic: string, event: string, callback: EventCallback) {
    if (!topic || !event || !callback) {
      throw new Error('topic or event or callback cannot be empty')
    }

    this._events.push({
      topic,
      event,
      callback
    })
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
        this._socket.on(e.event, (event: string) => {
          const message: EventMessage = JSON.parse(event)
          if (message.topic === e.topic) {
            e.callback(message)
          }
        })
      })
    })
  }

  private endProcess() {
    this._events.forEach(e => {
      this._socket.off(e.event)
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
