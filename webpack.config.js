const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const webpack = require("webpack");

const rendererConfig = {
    mode: process.env.NODE_ENV === "development" ? "development" : "production",
    entry: "./src/renderer/index.tsx",
    target: "web",
    output: {
        path: path.resolve(__dirname, "dist/renderer"),
        filename: "[name].js",
        publicPath: "/",
        assetModuleFilename: 'assets/[name][ext]'
    },
    resolve: {
        extensions: [".ts", ".tsx", ".js", ".jsx"],
        fallback: {
            "dgram": false,
            "os": require.resolve("os-browserify/browser"),
            "path": require.resolve("path-browserify"),
            "stream": require.resolve("stream-browserify"),
            "buffer": require.resolve("buffer/"),
            "crypto": require.resolve("crypto-browserify"),
            "util": require.resolve("util/"),
            "assert": require.resolve("assert/"),
            "url": require.resolve("url/"),
            "events": require.resolve("events/"),
            "http": require.resolve("stream-http"),
            "https": require.resolve("https-browserify"),
            "net": false,
            "tls": false,
            "fs": false,
            "child_process": false,
            "ws": false,
            "socket.io-client": false
        }
    },
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                exclude: /node_modules/,
                use: {
                    loader: "ts-loader",
                    options: {
                        transpileOnly: true,
                    },
                },
            },
            {
                test: /\.css$/,
                use: [
                    MiniCssExtractPlugin.loader,
                    "css-loader",
                    {
                        loader: "postcss-loader",
                        options: {
                            postcssOptions: {
                                plugins: [
                                    "tailwindcss/nesting",
                                    "tailwindcss",
                                    "autoprefixer",
                                ],
                            },
                        },
                    },
                ],
            },
            {
                test: /\.(png|jpe?g|gif|svg)$/i,
                type: "asset/resource",
                generator: {
                    filename: 'assets/images/[name][ext]'
                }
            },
        ],
    },
    plugins: [
        new HtmlWebpackPlugin({
            template: path.resolve(__dirname, "src/renderer/index.html"),
            filename: 'index.html'
        }),
        new MiniCssExtractPlugin({
            filename: "styles.css",
        }),
        new webpack.ProvidePlugin({
            Buffer: ['buffer', 'Buffer'],
            process: 'process/browser',
            global: ['global']
        })
    ],
    devServer: {
        static: {
            directory: path.join(__dirname, "dist/renderer"),
        },
        port: 3001,
        hot: true,
        historyApiFallback: true,
        devMiddleware: {
            publicPath: '/'
        }
    },
};

const mainConfig = {
    mode: process.env.NODE_ENV === "development" ? "development" : "production",
    entry: "./src/main/main.ts",
    target: "electron-main",
    output: {
        path: path.resolve(__dirname, "dist/main"),
        filename: "main.js",
    },
    resolve: {
        extensions: [".ts", ".js"],
    },
    module: {
        rules: [
            {
                test: /\.ts$/,
                exclude: /node_modules/,
                use: {
                    loader: "ts-loader",
                    options: {
                        transpileOnly: true,
                    },
                },
            },
        ],
    },
};

const preloadConfig = {
    name: 'preload',
    mode: process.env.NODE_ENV === "development" ? "development" : "production",
    entry: "./src/main/preload.ts",
    target: "electron-preload",
    output: {
        path: path.resolve(__dirname, "dist/main"),
        filename: "preload.js",
    },
    resolve: {
        extensions: [".ts", ".js"],
    },
    module: {
        rules: [
            {
                test: /\.ts$/,
                exclude: /node_modules/,
                use: {
                    loader: "ts-loader",
                    options: {
                        transpileOnly: true,
                    },
                },
            },
        ],
    },
    stats: {
        errorDetails: true
    },
    devtool: 'source-map'
};

module.exports = [rendererConfig, mainConfig, preloadConfig]; 