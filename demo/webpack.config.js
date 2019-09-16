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
        target: 'https://169.254.20.62:3001',
        changeOrigin: true,
        secure: false,
        pathRewrite: { '^/static': '' },
      },
    },
  },
};
