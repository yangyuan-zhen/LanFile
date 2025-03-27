declare module 'peer' {
    import { Server } from 'http';
    import * as express from 'express';

    export interface PeerServerOptions {
        path?: string;
        allow_discovery?: boolean;
        proxied?: boolean | string;
        port?: number;
        host?: string;
        [key: string]: any;
    }

    export function ExpressPeerServer(
        server: Server,
        options?: PeerServerOptions
    ): express.Router;
} 