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
  EventCallback
} from './types'

export class SocketIoClientBiz {
  private _opts: SocketOpts
  private _state: CLIENT_STATE
  private _stateChangeSubscriptions: Array<StateChangeCallback>
  private _socket: SocketIOClient.Socket
  private _topicsSubscribed: Array<string> = []

  constructor(opts: SocketOpts) {
    this._opts = opts
    this._state = CLIENT_STATE.DISCONNECTED

    this.validate()

    this._stateChangeSubscriptions = []
    this._topicsSubscribed = []
  }

  private validate() {
    ;['base', 'projectId', 'token'].forEach(key => {
      if (!this._opts[key]) {
        throw new Error(`${key} is missed in passed opts`)
      }
    })
  }

  public connect() {
    if (this._socket) {
      throw new Error('You cannot call connect multiple times')
    }

    return this.connectToWebsocket()
  }

  public disconnect() {
    try {
      this.changeState(CLIENT_STATE.DISCONNECTED)

      this._stateChangeSubscriptions = []
      this._topicsSubscribed = []

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

  public subscribe(...topics: Array<string>) {
    if (!topics || !topics.length) {
      throw new Error('topics cannot be empty')
    }

    if (this._state !== CLIENT_STATE.CONNECTED) {
      return Promise.reject(
        new Error('You cannot subscribe topics while connection has not been established')
      )
    }

    return new Promise((resolve, reject) => {
      this._socket.emit(BIZ_EVENT.SUBSCRIBE, topics, (subscribeCode: SUBSCRIBE_CODE) => {
        console.debug('subscribe ack code:', subscribeCode)
        if (SUBSCRIBE_CODE.SUB_SUCCESS !== subscribeCode) {
          // reject is not allowed
          return reject()
        }
        this._topicsSubscribed.push(...topics)
        resolve()
      })
    })
  }

  public on(topic: string, event: string, eventCallback: EventCallback) {
    if (!topic || !event) {
      throw new Error('topic and event cannot be empty')
    }

    if (this._topicsSubscribed.every(t => t !== topic)) {
      console.warn(`You are trying to listen a topic: ${topic} without subscribe first`)
      return
    }

    this._socket.on(event, (e: string) => {
      const message: EventMessage = JSON.parse(e)
      if (message.topic === topic) {
        eventCallback(message)
      }
    })
  }

  private connectToWebsocket() {
    const { base } = this._opts
    this._socket = io(base, { multiplex: false })
    const { token, projectId } = this._opts

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
      })
    })

    this._socket.on(CONNECT_EVENT.RECONNECT, () => {
      this.changeState(CLIENT_STATE.CONNECTED)
    })

    return new Promise((resolve: { (value: CLIENT_STATE): void }, reject) => {
      this._socket.on(CONNECT_EVENT.CONNECT, () => {
        // handshake for authentication purpose
        this._socket.emit(BIZ_EVENT.AUTH, { projectId, token }, (authCode: AUTH_CODE) => {
          console.debug('Handshake status', authCode)
          // failed to auth, disconnect and won't retry
          if (AUTH_CODE.AUTH_FAILED === authCode) {
            return reject(this.disconnect())
          }
          this.changeState(CLIENT_STATE.CONNECTED)
          return resolve(CLIENT_STATE.CONNECTED)
        })
      })
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
