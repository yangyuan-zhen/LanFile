const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");

const rendererConfig = {
    mode: process.env.NODE_ENV === "development" ? "development" : "production",
    entry: "./src/renderer/index.tsx",
    target: "web",
    output: {
        path: path.resolve(__dirname, "dist/renderer"),
        filename: "renderer.js",
        publicPath: "/",
        assetModuleFilename: 'assets/[name][ext]'
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
        }),
        new MiniCssExtractPlugin({
            filename: "styles.css",
        }),
    ],
    devServer: {
        static: {
            directory: path.join(__dirname, "dist/renderer"),
        },
        port: 3001,
        hot: true,
        historyApiFallback: true,
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