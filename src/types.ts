export enum CLIENT_STATE {
  CONNECTED = 'connected',
  CONNECTING = 'connecting',
  DISCONNECTED = 'disconnected'
}

export enum CONNECT_EVENT {
  CONNECT = 'connect',
  CONNECT_ERROR = 'connect_error',
  CONNECT_TIMEOUT = 'connect_timeout',
  CONNECTING = 'connecting',
  DISCONNECT = 'disconnect',
  ERROR = 'error',
  RECONNECT = 'reconnect',
  RECONNECT_ATTEMPT = 'reconnect_attempt',
  RECONNECT_FAILED = 'reconnect_failed',
  RECONNECT_ERROR = 'reconnect_error',
  RECONNECTING = 'reconnecting',
  PINT = 'ping',
  PONG = 'pong'
}

export enum BIZ_EVENT {
  AUTH = 'auth',
  SUBSCRIBE = 'subscribe'
}

export enum AUTH_CODE {
  AUTH_SUCCESS = 'auth_success',
  AUTH_FAILED = 'auth_fail'
}

export enum SUBSCRIBE_CODE {
  SUB_SUCCESS = 'sub_success',
  SUB_FAILED = 'sub_fail'
}

interface RetryOpts {
  /**
   * whether to reconnect automatically.
   * Default is true
   */
  reconnection: boolean
  /**
   * number of reconnection attempts before giving up
   * Default is Infinity
   */
  reconnectionAttempts: number
  /**
   * how long to initially wait before attempting a new reconnection (1000). Affected by +/- randomizationFactor, for example the default initial delay will be between 500 to 1500ms.
   * Default is 1000
   */
  reconnectionDelay: number
  /**
   * maximum amount of time to wait between reconnections (5000). Each attempt increases the reconnection delay by 2x along with a randomization as above
   * Default is 5000
   */
  reconnectionDelayMax: number
}

export interface SocketOpts {
  base: string
  projectId: string
  token: string

  reconnect?: RetryOpts
}

export interface StateChangeCallback {
  (state: CLIENT_STATE): void
}

export interface EventMessage {
  projectId: string
  topic: string
  event: string
  payload: string
}

export interface EventCallback {
  (message: EventMessage): void
}
