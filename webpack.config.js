var webpack = require("webpack");
var CopyWebpackPlugin = require('copy-webpack-plugin');
module.exports = {
  entry: './entry.jsx',
  devtool: 'source-map',
  module: {
    loaders: [
      {
        test: /\.(jsx|js)$/,
        loader: 'babel',
        exclude: /node_modules/,
        babelrc:false,
        query: {
          presets: ['es2015', 'stage-0', 'react'],
        }

      },
      {
        test: /\/node_modules\/three\/.*js$/,
        loader: 'babel',
        babelrc:false,
        query: {
          presets: ['es2015', 'stage-0', 'react'],
        }

      },
      {test: /\.scss$/, loaders: ['style','css?-minimize', 'postcss', 'sass'] },
      {test: /\.(woff|woff2)$/, loader: "url-loader"},
      {test: /\.ttf$/, loader: "url-loader"},
      {test: /\.jpe?g$/, loaders: ['url'] },

      {test: /\.eot$/, loader: "file-loader"},
      {test: /\.svg$/, loader: "file-loader"},
      {test: /\.glsl$/, loader: "raw"},
      {
        test: /\.styl/,
        // loader: 'css-loader!stylus-loader'
        loaders: [
          'style',
          'css?modules&importLoaders=2&localIdentName=[name]__[local]__[hash:base64:6]',
          'stylus'
        ]
      }
    ]
  },
  plugins: [
    new webpack.ProvidePlugin({$: "jquery", jQuery: "jquery"}),

  ],
  output: {
    path: __dirname + '/build/app/',
    publicPath: "/app/",
    filename: 'application.js',
  }
};
