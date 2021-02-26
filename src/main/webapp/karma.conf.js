if (process.env.CHROME_BIN) {
    process.env.PUPPETEER_SKIP_CHROMIUM_DOWNLOAD = true;
    console.log("Found CHROME_BIN environment variable with a value of " + process.env.CHROME_BIN + " - skipping download");
}
else {
    process.env.PUPPETEER_SKIP_CHROMIUM_DOWNLOAD = false;
    process.env.CHROME_BIN = require('puppeteer').executablePath();
    console.log("CHROME_BIN environment variable not found; setting to " + process.env.CHROME_BIN);
}

const path = require('path');
const webpackConfig = require('./webpack.dev.config.js');
const basePath = path.join(__dirname, './');
const fireballDev = String(process.env.FIREBALL_DEV).toLowerCase() === "true";
webpackConfig.entry = undefined;
webpackConfig.output = undefined;
webpackConfig.plugins = [];

let preprocessors = {};
preprocessors[(fireballDev ? '../../test/' : '') + 'scripts/**/*_test.js'] = 'webpack';

module.exports = (config) => {
    config.set({
        basePath: basePath,
        failOnEmptyTestSuite: false,
        frameworks: ['jasmine'],
        files: [
            {pattern : (fireballDev ? '../../test/' : '') + 'scripts/**/*_test.js', watched : false}
        ],
        webpack: webpackConfig,
        preprocessors: preprocessors,
        webpackMiddleware: {
            stats: 'normal'
        },
        reporters: ['progress'],
        port: 9876,  // karma web server port
        colors: true,
        logLevel: config.LOG_INFO,
        browsers: ['ChromeHeadless'],
        browserDisconnectTimeout: 10000,
        browserDisconnectTolerance : 2,
        browserNoActivityTimeout: 30000,
        captureTimeout : 120000,
        autoWatch: false,
        singleRun: true, // Karma captures browsers, runs the tests and exits
        concurrency: Infinity,
        plugins: [
            'karma-jasmine',
            'karma-chrome-launcher',
            'karma-webpack'
        ]
    });
};