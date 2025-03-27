// @ts-ignore
import { ExpressPeerServer } from 'peer';
import express from 'express';
import http from 'http';

export function startPeerServer(port = 9000) {
    const app = express();
    const server = http.createServer(app);

    const peerServer = ExpressPeerServer(server, {
        path: '/myapp',
        allow_discovery: true
    });

    app.use('/myapp', peerServer);

    server.listen(port, () => {
        console.log(`PeerJS server running on port ${port}`);
    });

    return server;
} 