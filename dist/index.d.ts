import { SocketOpts, StateChangeCallback, EventCallback } from './types';
export declare class SocketIoClientBiz {
    private _opts;
    private _state;
    private _stateChangeSubscriptions;
    private _socket;
    private _events;
    constructor(opts: SocketOpts);
    private validate;
    connect(cb: {
        (authCode: string): void;
    }): void;
    private connectToWebsocket;
    disconnect(): void;
    onStateChange(cb: StateChangeCallback): void;
    private changeState;
    subscribe(topic: string, event: string, callback: EventCallback): void;
    private startProcess;
    private endProcess;
}
export { SocketOpts, CONNECT_EVENT, BIZ_EVENT, CLIENT_STATE, AUTH_CODE, StateChangeCallback, EventMessage, SUBSCRIBE_CODE, EventCallback } from './types';
