const path = require('path');

module.exports = {
    entry: './src/main/index.ts',
    output: {
        path: path.resolve(__dirname, '../dist/main'),
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
    target: 'electron-main',
} 