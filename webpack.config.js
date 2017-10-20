const webpack = require('webpack');
// const CopyWebpackPlugin = require('copy-webpack-plugin');
module.exports = function(precompileVars, isProduction) {
  return {
    entry: './entry.jsx',
    devtool: 'source-map',
    resolve: {
      extensions: ['.ts', '.js']
    },
    module: {
      rules: [
        {
          test: /\.(jsx|js)$/,
          use: [
            {
              loader: 'babel-loader'
            }
          ],
          exclude: /(node_modules)/,

        },
        {
          test: /\.glsl$/,
          use: 'raw-loader'
        },
        {
          test: /\.scss$/,
          use: [
            {
              loader: 'style-loader'
            },
            {
              loader: 'css-loader',
              options: {
                sourceMap: !isProduction,
                minimize: true
              }
            },
            {
              loader: 'postcss-loader',
              options: {
                sourceMap: !isProduction
              }
            },
            {
              loader: 'sass-loader',
              options: {
                sourceMap: !isProduction
              }
            },
          ]
        },
        {
          test: /\.(jpeg|jpg|png|gif)$/,
          use: 'url-loader'
        },
        {
          test: /\.ts$/,
          use: [
            { loader: 'ts-loader'}
          ]
        },
        {
          test: /\.svg$/,
          issuer: /\.(js|jsx)$/,
          use: [{
            loader: 'svg-loader'
          }]
        },
        {
          test: /\.(woff2|woff|eot|ttf)$/,
          use: {
            loader: 'url-loader',
            options: {
              limit: 65000,
            }
          }
        }
      ]
    },
    resolveLoader: {
      modules: ['node_modules', './']
    },
    plugins: [
      new webpack.ProvidePlugin({$: 'jquery', jQuery: 'jquery'}),

    ],
    devServer: {
      headers: { 'Access-Control-Allow-Origin': '*' }
    },
    output: {
      path: __dirname + '/build/app/',
      publicPath: '/app/',
      filename: 'application.js',
    }
  };
};
