const path = require('path');
const webpack = require('webpack');
const webpackVendorConfig = require('./webpack.vendor.config');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const UglifyJsPlugin = require('uglifyjs-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const OptimizeCSSAssetsPlugin = require("optimize-css-assets-webpack-plugin");
const CopyWebpackPlugin = require('copy-webpack-plugin');
const fireballDev = String(process.env.FIREBALL_DEV).toLowerCase() === "true";
// const buildModeLibrary = String("${js.buildModeLibrary}").toLowerCase() === "true";

module.exports = {

    mode: 'production',
    context: __dirname,
    stats: "normal",
    entry: {
        app: [
            './scripts/app.js',
            './css/widget.scss'
        ]
    },
    resolve: {
        extensions: ['.js', '.jsx', '.ts', '.json', '.html', '.css', '.scss'],
        alias: webpackVendorConfig.alias,
        symlinks : false,
        modules: [
            path.resolve(__dirname, (fireballDev ? '../' : '') + '../../node_modules'),
            path.resolve(__dirname, 'scripts')
        ]
    },
    resolveLoader: {
        alias: {
            'text': 'raw-loader'
        }
    },
    module: {
        rules: [
            {
                test: /\.js$/,
                include: path.resolve(__dirname, 'scripts'),
                exclude: /lib/,
                loader: 'eslint-loader',
                enforce: 'pre'
            },
            {
                test: /\.(sa|sc|c)ss$/, include: path.resolve(__dirname, 'css'),
                use: [MiniCssExtractPlugin.loader, {
                    loader: 'css-loader',
                    options: {
                        url: false,
                        import: true
                    }
                }, 'sass-loader']
            },
            {test: /\.hbs$/, use : ["handlebars-loader"]},
            {test: /\.ts$/, include: path.resolve(__dirname, 'scripts'), use: ['ts-loader']},
            {
                test: /\.(js|jsx)$/, include: path.resolve(__dirname, 'scripts'),
                use: {
                    loader : 'babel-loader',
                    options : {
                        presets : ['@babel/preset-env', '@babel/preset-react', '@babel/preset-typescript']
                    }
                }
            },
            {test: /\.(png|svg|jpg|gif)$/, include: path.resolve(__dirname, 'images'), use: ['file-loader']},
            {test: /\.(woff|woff2|eot|ttf|otf)$/, include: path.resolve(__dirname, 'fonts'), use: ['file-loader']},
            {
                test: require.resolve('jquery'),
                use: [
                    {loader: 'expose-loader', options: 'jQuery'},
                    {loader: 'expose-loader', options: '$'}
                ]
            }
        ]
    },
    plugins: [
        new webpack.ProvidePlugin({
            "$" : "jquery",
            "jQuery" : "jquery"
        }),
        new HtmlWebpackPlugin({
            template: './index.html.hbs',
            filename : 'index.html',
            favicon: "favicon.ico",
            showErrors: true,
            minify: false,
            xhtml: true,
            inject : false
        }),
        new MiniCssExtractPlugin({
            filename: 'css/[name].css',
            chunkFilename: 'css/[id].css'
        }),
        new webpack.IgnorePlugin(/^\.\/locale$/, /moment$/),
        new CopyWebpackPlugin([
            // Common UI Resources
            {from: path.resolve(__dirname, 'theme'), to: 'theme'},
            {from: path.resolve(__dirname, 'fonts'), to: 'fonts'},
            {from: path.resolve(__dirname, 'images'), to: 'images'},
            {from: path.resolve(__dirname, 'css/print.css'), to: 'css/print.css'},
            {from: path.resolve(__dirname, 'scripts/lib/modernizr.min.js'), to: 'scripts/lib/modernizr.min.js'}
        ])
    ],
    optimization: {
        removeAvailableModules: true,
        removeEmptyChunks: true,
        mergeDuplicateChunks: true,
        splitChunks: {
            chunks: "async",
            name: true,
            cacheGroups: {
                vendor: {
                    test: /[\\/]node_modules[\\/]/,
                    priority: 1,
                    name: "vendor",
                    enforce: true
                }
            }
        },
        minimize: true,
        minimizer: [
            new UglifyJsPlugin({
                parallel: true
            }),
            new OptimizeCSSAssetsPlugin({})
        ]
    },
    output: {
        path: path.resolve(__dirname, 'dist/'),
        filename: 'scripts/[name].[hash].js',
        chunkFilename: 'scripts/[id].[hash].js',
        library: 'fireball',
        libraryTarget: 'umd'
    }
};