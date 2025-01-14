import path from "path";
const HtmlWebpackPlugin = require('html-webpack-plugin');
import { Configuration as WebpackConfig } from "webpack";
import { Configuration as WebpackDevServerConfig } from "webpack-dev-server";

interface Configuration extends WebpackConfig {
    devServer?: WebpackDevServerConfig;
}

const commonConfig: Configuration = {
    resolve: {
        extensions: [".tsx", ".ts", ".js"],
        alias: {
            '@': path.resolve(__dirname, 'src/renderer'),
            '@assets': path.resolve(__dirname, 'src/assets'),
        }
    },
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: "ts-loader",
                exclude: /node_modules/,
            },
            {
                test: /\.(png|jpg|jpeg|gif)$/i,
                type: 'asset/resource',
                generator: {
                    filename: 'assets/[hash][ext][query]'
                }
            },
            {
                test: /\.svg$/,
                use: ['@svgr/webpack', 'url-loader'],
            },
            {
                test: /\.css$/,
                use: [
                    "style-loader",
                    {
                        loader: "css-loader",
                        options: {
                            importLoaders: 1,
                            modules: {
                                auto: true,
                                localIdentName: "[name]__[local]--[hash:base64:5]",
                            },
                        }
                    },
                    {
                        loader: "postcss-loader",
                        options: {
                            postcssOptions: {
                                config: path.resolve(__dirname, "./postcss.config.js"),
                            },
                        },
                    },
                ],
            },
        ],
    },
};

const rendererConfig: Configuration = {
    ...commonConfig,
    target: "web",
    entry: "./src/renderer/index.tsx",
    output: {
        path: path.resolve(__dirname, "dist/renderer"),
        filename: "renderer.js",
    },
    plugins: [
        new HtmlWebpackPlugin({
            template: "./public/index.html",
        }),
    ],
    devServer: {
        static: {
            directory: path.join(__dirname, "dist/renderer"),
        },
        port: 3001,
        hot: true,
        compress: true,
        historyApiFallback: true,
        open: false,
        devMiddleware: {
            writeToDisk: true,
        },
    },
    devtool: 'source-map',
};

const mainConfig: Configuration = {
    ...commonConfig,
    target: "electron-main",
    entry: "./src/main/main.ts",
    output: {
        path: path.resolve(__dirname, "dist/main"),
        filename: "main.js",
    },
    resolve: {
        ...commonConfig.resolve,
        fallback: {
            __dirname: false,
            __filename: false,
            fsevents: false,
        }
    },

};

const preloadConfig: Configuration = {
    ...commonConfig,
    target: "electron-preload",
    entry: "./src/main/preload.ts",
    output: {
        path: path.resolve(__dirname, "dist/main"),
        filename: "preload.js",
    },
};

export default [rendererConfig, mainConfig, preloadConfig]; 