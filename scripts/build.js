const { build } = require('vite');
const { build: buildMain } = require('esbuild');
const path = require('path');
const fs = require('fs');

async function buildMainProcess() {
    console.log('开始构建主进程...');
    await buildMain({
        entryPoints: ['src/main/index.ts'],
        bundle: true,
        platform: 'node',
        outdir: path.join(__dirname, '../dist/main'),
        external: ['electron']
    });
    console.log('主进程构建完成');
}

async function buildPreload() {
    console.log('开始构建预加载脚本...');
    const outdir = path.join(__dirname, '../dist/preload');

    // 确保输出目录存在
    if (!fs.existsSync(outdir)) {
        fs.mkdirSync(outdir, { recursive: true });
    }

    await buildMain({
        entryPoints: ['src/preload/index.ts'],
        bundle: true,
        platform: 'node',
        outdir,
        external: ['electron'],
        format: 'cjs',
        target: ['node16'],
        minify: false,
        sourcemap: true
    });

    // 验证文件是否被创建
    const outputFile = path.join(outdir, 'index.js');
    if (fs.existsSync(outputFile)) {
        console.log('预加载脚本构建成功:', outputFile);
    } else {
        throw new Error('预加载脚本文件未被创建');
    }
}

async function buildRenderer() {
    console.log('开始构建渲染进程...');
    await build({
        configFile: path.resolve(__dirname, '../vite.config.ts'),
        build: {
            outDir: path.join(__dirname, '../dist/renderer'),
            emptyOutDir: true
        }
    });
    console.log('渲染进程构建完成');
}

async function buildAll() {
    try {
        console.log('开始清理 dist 目录...');
        // 清理 dist 目录
        const distPath = path.join(__dirname, '../dist');
        if (fs.existsSync(distPath)) {
            fs.rmSync(distPath, { recursive: true });
        }
        fs.mkdirSync(distPath, { recursive: true });

        await buildMainProcess();
        await buildPreload();
        await buildRenderer();
        console.log('所有构建任务完成');

        // 验证所有必要文件是否存在
        const files = [
            '../dist/main/index.js',
            '../dist/preload/index.js',
            '../dist/renderer/index.html'
        ];

        for (const file of files) {
            const filePath = path.join(__dirname, file);
            if (!fs.existsSync(filePath)) {
                throw new Error(`缺少必要文件: ${filePath}`);
            }
        }
    } catch (error) {
        console.error('构建失败:', error);
        process.exit(1);
    }
}

buildAll(); 