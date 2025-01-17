import http from 'http';
import mdns from 'multicast-dns';
import { AddressInfo } from 'net';

export class NetworkService {
    private httpServer: http.Server;
    private mdnsInstance: any;
    private serviceName = 'lanfile';

    constructor() {
        this.httpServer = http.createServer(this.handleRequest);
        this.mdnsInstance = mdns();
        this.setupMDNS();
    }

    private handleRequest = (req: http.IncomingMessage, res: http.ServerResponse) => {
        // 基础路由处理
        if (req.url === '/ping') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 'ok' }));
            return;
        }

        res.writeHead(404);
        res.end();
    };

    private setupMDNS() {
        this.mdnsInstance.on('query', (query: any) => {
            // 响应查询请求
            const questions = query.questions || [];
            questions.forEach((q: any) => {
                if (q.name === this.serviceName) {
                    this.broadcastService();
                }
            });
        });
    }

    private broadcastService() {
        const address = this.httpServer.address() as AddressInfo;
        if (!address) return;

        this.mdnsInstance.respond({
            answers: [{
                name: this.serviceName,
                type: 'SRV',
                data: {
                    port: address.port,
                    target: require('os').hostname()
                }
            }]
        });
    }

    public start() {
        // 启动 HTTP 服务器，使用随机端口
        this.httpServer.listen(0, () => {
            const address = this.httpServer.address() as AddressInfo;
            console.log(`HTTP server is running on port ${address.port}`);

            // 初始广播服务
            this.broadcastService();
        });
    }

    public stop() {
        this.httpServer.close();
        this.mdnsInstance.destroy();
    }
} 