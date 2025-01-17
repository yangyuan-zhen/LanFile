"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var path_1 = __importDefault(require("path"));
var html_webpack_plugin_1 = __importDefault(require("html-webpack-plugin"));
var mini_css_extract_plugin_1 = __importDefault(require("mini-css-extract-plugin"));
var rendererConfig = {
    mode: process.env.NODE_ENV === "development" ? "development" : "production",
    entry: "./src/renderer/index.tsx",
    target: "web",
    output: {
        path: path_1.default.resolve(__dirname, "dist/renderer"),
        filename: "renderer.js",
        publicPath: "/",
    },
    resolve: {
        extensions: [".ts", ".tsx", ".js", ".jsx"],
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
                    mini_css_extract_plugin_1.default.loader,
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
            },
        ],
    },
    plugins: [
        new html_webpack_plugin_1.default({
            template: path_1.default.resolve(__dirname, "src/renderer/index.html"),
        }),
        new mini_css_extract_plugin_1.default({
            filename: "styles.css",
        }),
    ],
    devServer: {
        static: {
            directory: path_1.default.join(__dirname, "dist/renderer"),
        },
        port: 3001,
        hot: true,
        historyApiFallback: true,
    },
};
var mainConfig = {
    mode: process.env.NODE_ENV === "development" ? "development" : "production",
    entry: "./src/main/main.ts",
    target: "electron-main",
    output: {
        path: path_1.default.resolve(__dirname, "dist/main"),
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
var preloadConfig = {
    mode: process.env.NODE_ENV === "development" ? "development" : "production",
    entry: "./src/main/preload.ts",
    target: "electron-preload",
    output: {
        path: path_1.default.resolve(__dirname, "dist/main"),
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
};
exports.default = [rendererConfig, mainConfig, preloadConfig];
