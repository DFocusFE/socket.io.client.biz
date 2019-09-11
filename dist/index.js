'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var io = _interopDefault(require('socket.io-client'));

(function (CLIENT_STATE) {
    CLIENT_STATE["CONNECTED"] = "connected";
    CLIENT_STATE["CONNECTING"] = "connecting";
    CLIENT_STATE["DISCONNECTED"] = "disconnected";
})(exports.CLIENT_STATE || (exports.CLIENT_STATE = {}));
(function (CONNECT_EVENT) {
    CONNECT_EVENT["CONNECT"] = "connect";
    CONNECT_EVENT["CONNECT_ERROR"] = "connect_error";
    CONNECT_EVENT["CONNECT_TIMEOUT"] = "connect_timeout";
    CONNECT_EVENT["CONNECTING"] = "connecting";
    CONNECT_EVENT["DISCONNECT"] = "disconnect";
    CONNECT_EVENT["ERROR"] = "error";
    CONNECT_EVENT["RECONNECT"] = "reconnect";
    CONNECT_EVENT["RECONNECT_ATTEMPT"] = "reconnect_attempt";
    CONNECT_EVENT["RECONNECT_FAILED"] = "reconnect_failed";
    CONNECT_EVENT["RECONNECT_ERROR"] = "reconnect_error";
    CONNECT_EVENT["RECONNECTING"] = "reconnecting";
    CONNECT_EVENT["PINT"] = "ping";
    CONNECT_EVENT["PONG"] = "pong";
})(exports.CONNECT_EVENT || (exports.CONNECT_EVENT = {}));
(function (BIZ_EVENT) {
    BIZ_EVENT["AUTH"] = "auth";
    BIZ_EVENT["SUBSCRIBE"] = "subscribe";
})(exports.BIZ_EVENT || (exports.BIZ_EVENT = {}));
(function (AUTH_CODE) {
    AUTH_CODE["AUTH_SUCCESS"] = "auth_success";
    AUTH_CODE["AUTH_FAILED"] = "auth_fail";
})(exports.AUTH_CODE || (exports.AUTH_CODE = {}));
(function (SUBSCRIBE_CODE) {
    SUBSCRIBE_CODE["SUB_SUCCESS"] = "sub_success";
    SUBSCRIBE_CODE["SUB_FAILED"] = "sub_fail";
})(exports.SUBSCRIBE_CODE || (exports.SUBSCRIBE_CODE = {}));

function toUrl(...paths) {
    return paths
        .join('/')
        .replace(/\/+/g, '/')
        .replace(/^\//, '')
        .replace(/\/$/, '')
        .replace(/http:\//, 'http://')
        .replace(/https:\//, 'https://');
}

const DISCONNECT_EVENTS = [
    exports.CONNECT_EVENT.CONNECT_ERROR,
    exports.CONNECT_EVENT.CONNECT_TIMEOUT,
    exports.CONNECT_EVENT.DISCONNECT,
    exports.CONNECT_EVENT.ERROR,
    exports.CONNECT_EVENT.RECONNECT_ERROR,
    exports.CONNECT_EVENT.RECONNECT_FAILED
];
class SocketIoClientBiz {
    constructor(opts) {
        this._events = [];
        this._opts = opts;
        this._state = exports.CLIENT_STATE.DISCONNECTED;
        this.validate();
        this._stateChangeSubscriptions = [];
        this._events = [];
    }
    validate() {
        ['base', 'projectId', 'token'].forEach(key => {
            if (!this._opts[key]) {
                throw new Error(`${key} is missed in passed opts`);
            }
        });
    }
    connect(cb) {
        if (this._socket) {
            throw new Error('You cannot call connect multiple times');
        }
        this.connectToWebsocket(cb);
    }
    connectToWebsocket(cb) {
        const { base, projectId, token } = this._opts;
        this._socket = io(toUrl(base, projectId), { multiplex: false });
        this.changeState(exports.CLIENT_STATE.CONNECTING);
        console.debug('Trying to connect to ssp Server...');
        this._socket.on(exports.CONNECT_EVENT.RECONNECT, () => {
            this.changeState(exports.CLIENT_STATE.CONNECTED);
        });
        const errorListener = (...args) => {
            cb(args[0]);
        };
        this._socket.on(exports.CONNECT_EVENT.ERROR, errorListener);
        this._socket.on(exports.CONNECT_EVENT.CONNECT, () => {
            const localSocket = this._socket;
            // handshake for authentication purpose
            this._socket.emit(exports.BIZ_EVENT.AUTH, { projectId, token }, (authCode) => {
                console.debug('Handshake status', authCode);
                // failed to auth, disconnect and won't retry
                if (exports.AUTH_CODE.AUTH_FAILED === authCode) {
                    cb(authCode);
                    return this.disconnect();
                }
                this._socket.off(exports.CONNECT_EVENT.ERROR, errorListener);
                cb('');
                DISCONNECT_EVENTS.forEach(e => {
                    this._socket.on(e, () => {
                        this.changeState(exports.CLIENT_STATE.DISCONNECTED);
                        this.endProcess(localSocket);
                    });
                });
                this.startProcess();
                this.changeState(exports.CLIENT_STATE.CONNECTED);
            });
        });
    }
    disconnect() {
        try {
            this.changeState(exports.CLIENT_STATE.DISCONNECTED);
            // this._stateChangeSubscriptions = []
            // this._events = []
            const socket = this._socket;
            this._socket = null;
            socket.close();
        }
        catch (error) {
            console.warn('Closing ', error);
        }
    }
    onStateChange(cb) {
        if (!cb) {
            return {
                dispose() { }
            };
        }
        if (!this._stateChangeSubscriptions.includes(cb)) {
            this._stateChangeSubscriptions.push(cb);
        }
        return {
            dispose: () => {
                this._stateChangeSubscriptions = this._stateChangeSubscriptions.filter(c => c !== cb);
            }
        };
    }
    changeState(state) {
        this._state = state;
        this._stateChangeSubscriptions.forEach(cb => {
            cb(this._state);
        });
    }
    subscribe(topic, event, callback) {
        if (!topic || !event || !callback) {
            throw new Error('topic or event or callback cannot be empty');
        }
        if (exports.CLIENT_STATE.CONNECTED === this._state) {
            throw new Error('subscribe cannot be called after connection established');
        }
        const e = {
            topic,
            event,
            callback: (event) => {
                const message = JSON.parse(event);
                if (message.topic === e.topic) {
                    callback(message);
                }
            }
        };
        this._events.push(e);
        return {
            dispose: () => {
                this._socket.off(event, e.callback);
            }
        };
    }
    startProcess() {
        const topics = this._events.map(e => e.topic);
        this._socket.emit(exports.BIZ_EVENT.SUBSCRIBE, topics, (subscribeCode) => {
            console.debug('subscribe ack code:', subscribeCode);
            if (exports.SUBSCRIBE_CODE.SUB_SUCCESS !== subscribeCode) {
                // do nothing if it is not allowed
                return;
            }
            this._events.forEach(e => {
                this._socket.on(e.event, e.callback);
            });
        });
    }
    endProcess(socket) {
        this._events.forEach(e => {
            socket.off(e.event);
        });
        DISCONNECT_EVENTS.forEach(e => {
            socket.off(e);
        });
    }
}

exports.SocketIoClientBiz = SocketIoClientBiz;
