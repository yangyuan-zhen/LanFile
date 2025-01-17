import { Configuration as WebpackConfig } from "webpack";
import { Configuration as WebpackDevServerConfig } from "webpack-dev-server";
interface Configuration extends WebpackConfig {
    devServer?: WebpackDevServerConfig;
}
declare const _default: Configuration[];
export default _default;
