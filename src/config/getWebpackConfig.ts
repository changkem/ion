import chalk from 'chalk';
import { join } from 'path';
import webpack from 'webpack';
import { isString } from 'util';
import WebpackBar from 'webpackbar';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import CleanWebpackPlugin from 'clean-webpack-plugin';
import ErrorPlugin from 'friendly-errors-webpack-plugin';
import MiniCssExtractPlugin from 'mini-css-extract-plugin';

import { Options } from '../util/merge';
import { resolve } from '../util/helper';
import getBabelConfig from './getBabelConfig';
import { IonConfig } from '../util/resolveConfig';
import getPostcssConfig from './getPostcssConfig';
import isTs from '../util/isTypescript';

function getCssOptions({ cssModule }: IonConfig) {
  const options: any = {
    sourceMap: true,
    importLoaders: 1,
  };
  if (cssModule) {
    options.modules = true;
    options.localIdentName = isString(cssModule)
      ? cssModule
      : '[local]-[hash:base64:5]';
  }
  return options;
}

function getHash({ hash = 8 }: IonConfig) {
  if (hash <= 0) {
    console.log(chalk.yellow('hash must be greater than 0'));
  }
  return hash;
}

export default function getWebpackConfig(ionConfig: IonConfig): Options {
  const cwdPath = process.cwd();
  const hash = getHash(ionConfig);
  const cssOptions = getCssOptions(ionConfig);
  const babelOptions = getBabelConfig(ionConfig);
  const postCssOptions = getPostcssConfig(ionConfig);

  const {
    alias = {},
    entry = { app: ['./src/index.js'] },
    publicPath = '/',
  } = ionConfig;

  const styleLoader =
    process.env.NODE_ENV === 'development'
      ? resolve('style-loader')
      : MiniCssExtractPlugin.loader;

  const isTypescript = isTs(entry.app[0]);

  /* eslint-disable */
  const cssLoader = isTypescript
    ? [
        {
          loader: resolve('css-loader'),
          options: cssOptions,
        },
        {
          loader: resolve('typed-css-modules-loader'),
          options: {
            modules: true,
            namedExport: true,
          },
        },
      ]
    : [
        {
          loader: resolve('css-loader'),
          options: cssOptions,
        },
      ];
  /* eslint-disable */
  return {
    context: cwdPath,
    entry,
    output: {
      path: join(cwdPath, './dist'),
      filename: `js/[name].[hash:${hash}].js`,
      publicPath,
      chunkFilename: `js/[name].[chunkhash:${hash}].async.js`,
      hotUpdateChunkFilename: 'hot/hot-update.js',
      hotUpdateMainFilename: 'hot/hot-update.json',
    },
    resolve: {
      // modules: ['node_modules', join(cwdPath, './node_modules')],
      extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
      alias,
    },
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          exclude: /(node_modules)/,
          use: [
            resolve('react-hot-loader/webpack'),
            {
              loader: resolve('babel-loader'),
              options: babelOptions,
            },
            resolve('ts-loader'),
          ],
        },
        {
          test: /\.tsx?$/,
          enforce: 'pre',
          loader: resolve('source-map-loader'),
        },
        {
          test: /\.jsx?$/,
          exclude: /(node_modules)/,
          loader: resolve('babel-loader'),
          options: babelOptions,
        },
        {
          test: /\.css$/,
          use: [
            styleLoader,
            ...cssLoader,
            {
              loader: resolve('postcss-loader'),
              options: postCssOptions,
            },
          ],
        },
        {
          test: /\.less$/,
          use: [
            styleLoader,
            ...cssLoader,
            {
              loader: resolve('postcss-loader'),
              options: postCssOptions,
            },
            {
              loader: resolve('less-loader'),
              options: {
                sourceMap: true,
                javascriptEnabled: true,
              },
            },
          ],
          exclude: /node_modules/,
        },
        {
          test: /\.less$/,
          use: [
            styleLoader,
            {
              loader: resolve('postcss-loader'),
              options: postCssOptions,
            },
            {
              loader: resolve('less-loader'),
              options: {
                sourceMap: true,
                javascriptEnabled: true,
              },
            },
          ],
          exclude: /src/,
        },
      ],
    },
    plugins: [
      new MiniCssExtractPlugin({
        filename: `main.[contenthash:${hash}].css`,
      }),
      // 防止每次文件hash都改变
      new webpack.HashedModuleIdsPlugin(),
      new ErrorPlugin(),
      new WebpackBar({
        name: '🚚  Ion Tools',
      }),
      new webpack.DllReferencePlugin({
        context: join(cwdPath, './public'),
        manifest: require(join(cwdPath, './public/lib/manifest.json')),
      }),
      new HtmlWebpackPlugin({
        filename: 'index.html',
        minify: {
          removeComments: true,
          collapseWhitespace: false,
        },
        template: join(cwdPath, './public/index.html'),
      }),
      new CleanWebpackPlugin(join(cwdPath, 'dist')),
    ],
  };
}
