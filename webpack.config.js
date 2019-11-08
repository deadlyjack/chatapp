const path = require('path');

module.exports = {
    mode: 'development',
    entry: {
        index: './app/src/index.js',
        account: './app/src/account.js'
    },
    output: {
        path: path.resolve(__dirname, 'public'),
        filename: '[name].js'
    },
    module: {
        rules: [{
            test: /\.hbs$/,
            use: {
                loader: 'raw-loader'
            }
        }, {
            test: /\.js$/,
            use: {
                loader: 'babel-loader',
                options: {
                    presets: ['@babel/preset-env']
                }
            }
        }]
    }
};