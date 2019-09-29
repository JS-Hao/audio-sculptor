const path = require('path');

module.exports = {
  entry: {
    index: './src/index.js',
  },
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, 'dist'),
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: ['babel-loader'],
      },
    ],
  },
  devServer: {
    contentBase: path.join(__dirname, 'src'),
    compress: true,
    port: 9000,

    proxy: {
      '/static': {
        target: 'http://172.18.134.43:8000',
        changeOrigin: true,
        secure: false,
        pathRewrite: { '^/static': '' },
      },
    },
  },
};
