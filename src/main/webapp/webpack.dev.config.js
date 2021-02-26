const webpackConfig = require('./webpack.config.js');
const path = require('path');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
const appJson = require('./scripts/app.json');
const appContextPath = appJson ? appJson.projectContext : "";
const fireballDev = String(process.env.FIREBALL_DEV).toLowerCase() === "true";
const fs = require('fs');
const appSourceDir = "../../src/main/resources/static";

process.env.NODE_ENV = 'development';
process.env.WEBPACK_BUILD_MODE_LIBRARY = true;

// set the mode to development
webpackConfig.mode = 'development';

if (!fireballDev) {
    webpackConfig.plugins.push(new BundleAnalyzerPlugin({
        analyzerMode : "static",
        reportFilename : "../reports/bundleAnalyzer.html",
        openAnalyzer: false
    }));
}

// remove the eslint loader from the config - which is the first entry
if (webpackConfig && webpackConfig.module && webpackConfig.module.rules) {
    webpackConfig.module.rules.splice(0, 1);
}

// add the apps css file to the entry so it is watched
if (webpackConfig && webpackConfig.entry && webpackConfig.entry.app && appJson && appJson.appModuleName) {
    webpackConfig.entry.app.push("./css/" + appJson.appModuleName + ".css");
}

webpackConfig.devServer = {
    contentBase: path.resolve(__dirname),
    watchContentBase : true,
    compress: false,
    port: 8989,
    hot: true,
    open : true,
    openPage : appContextPath,
    historyApiFallback: true,
    https: true
};

// only configure a proxy server when there is a context path provided
if (appContextPath) {

    // add before middleware to the dev server to watch the source directory and copy changes into the build directory
    let watchingSource = false;
    webpackConfig.devServer.before = (app, server) => {
        if (!watchingSource) {
            watchingSource = true;
            let watchSourceDir = (sourceDir) => {
                fs.watch(sourceDir, {recursive : true}, (evt, filename) => {
                    // copy changed files but ignore intellij tmp files
                    if (filename && !filename.endsWith("___")) {
                        console.log("Detected change to " + filename  + "; copying to build dir...");
                        fs.copyFile(path.resolve(sourceDir, filename), path.resolve(__dirname, filename), err => {
                            if (err) {
                                console.error(err);
                            }
                        });
                    }
                });
                console.log("Watching source dir: " + sourceDir);
            }
            watchSourceDir(path.resolve(__dirname, appSourceDir));

            // watch common ui if it is defined by an env var
            if (process.env.FIREBALL_COMMON_UI_SOURCE_DIR) {
                // TODO may need to exclude some of these
                watchSourceDir(path.resolve(process.env.FIREBALL_COMMON_UI_SOURCE_DIR, 'src/main/webapp'));
            }
        }
    };

    webpackConfig.devServer.proxy = [{
        context: (url) => {
            if (url.startsWith("/services") || url.startsWith("/theme")) {
                return true;
            }
            return false;
        },
        target: 'http://localhost:8080/' + appContextPath,
        secure: false, // required since local certs are self-signed
        changeOrigin: true
    }];
}

webpackConfig.optimization = {
    minimize : false
};

webpackConfig.devtool = "#inline-source-map";

module.exports = webpackConfig;