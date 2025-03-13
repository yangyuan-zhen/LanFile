const { spawn } = require('child_process');
const path = require('path');
const { createServer } = require('vite');
const electron = require('electron');

// 开发服务器配置
const VITE_PORT = 3001;

async function startApp() {
    try {
        // 启动 Vite 开发服务器
        const server = await createServer({
            configFile: path.resolve(__dirname, '../vite.config.ts'),
            server: {
                port: VITE_PORT
            }
        });

        await server.listen();
        console.log(`Vite 开发服务器运行在: http://localhost:${VITE_PORT}`);

        // 等待一段时间确保服务器完全启动
        await new Promise(resolve => setTimeout(resolve, 1000));

        // 启动 Electron 应用
        const electronProcess = spawn(electron, ['.'], {
            stdio: 'inherit',
            env: {
                ...process.env,
                NODE_ENV: 'development',
                VITE_DEV_SERVER_URL: `http://localhost:${VITE_PORT}`
            }
        });

        electronProcess.on('close', () => {
            server.close();
            process.exit();
        });

        electronProcess.on('error', (err) => {
            console.error('Electron 进程错误:', err);
            server.close();
            process.exit(1);
        });

        // 处理进程终止信号
        process.on('SIGTERM', () => {
            server.close();
            electronProcess.kill();
            process.exit();
        });
    } catch (error) {
        console.error('启动应用失败:', error);
        process.exit(1);
    }
}

startApp(); 