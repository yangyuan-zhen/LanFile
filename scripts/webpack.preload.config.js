const path = require('path');

module.exports = {
    entry: './src/preload/index.ts',
    output: {
        path: path.resolve(__dirname, '../dist/preload'),
        filename: 'index.js',
    },
    resolve: {
        extensions: ['.ts', '.js'],
    },
    module: {
        rules: [
            {
                test: /\.ts$/,
                exclude: /node_modules/,
                use: 'ts-loader',
            },
        ],
    },
    target: 'electron-preload',
    stats: {
        errorDetails: true,
    },
    devtool: 'source-map',
} 