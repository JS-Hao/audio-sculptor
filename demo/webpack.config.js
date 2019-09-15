const path = require('path');
const config = require('./config');
const proxyPass = {
  capsule: {
    dev: 'http://school-beta.test.seewo.com/time-capsule/',
    test: 'http://school.test.seewo.com/time-capsule/',
    prod: 'http://school.seewo.com/time-capsule/',
  },
  enow: {
    dev: 'http://enow-beta-teacher.test.seewo.com',
    test: 'http://enow.test.seewo.com',
    prod: 'http://enow.seewo.com',
  },
  upload: {
    dev: 'http://edu-dev.test.seewo.com',
    test: 'http://edu.test.seewo.com',
    prod: 'http://edu.seewo.com',
  },
  'enow/thumbnail': {
    dev: 'http://edu-dev.test.seewo.com',
    test: 'http://edu.test.seewo.com',
    prod: 'http://edu.seewo.com',
  },
};

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
      {
        test: /\.less/,
        exclude: /node_modules/,
        use: ['style-loader', 'css-loader', 'less-loader'],
      },
      {
        test: /\.less$/,
        include: /node_modules/,
        use: ['style-loader', 'css-loader', 'less-loader'],
      },
      {
        test: /\.scss/,
        include: /node_modules/,
        use: ['style-loader', 'css-loader', 'sass-loader'],
      },
      {
        test: /\.css$/,
        include: /node_modules/,
        use: ['style-loader', 'css-loader'],
      },
      {
        test: /\.(eot|otf|ttf|woff|woff2)$/,
        include: /\@enow/,
        use: 'file-loader',
      },
      {
        test: /\.svg$/,
        include: /\@enow/,
        loader: 'file-loader',
      },
    ],
  },
  devServer: {
    contentBase: path.join(__dirname, 'src'),
    compress: true,
    port: 9000,

    proxy: {
      '/enow/thumbnail': {
        // 缩略图服务
        target: proxyPass['enow/thumbnail'][config.env],
        secure: false,
        pathRewrite: { '^/enow/thumbnail': '/thumbnail' },
        changeOrigin: true,
      },
      '/school': {
        target: proxyPass['capsule'][config.env],
        changeOrigin: true,
        secure: false,
        pathRewrite: { '^/school': '' },
      },
      '/enow': {
        target: proxyPass['enow'][config.env],
        changeOrigin: true,
        secure: false,
        // pathRewrite: { '^/enow': '' },
      },
      '/upload': {
        target: proxyPass['upload'][config.env],
        changeOrigin: true,
        secure: false,
        pathRewrite: { '^/upload': '' },
      },
    },
  },
  resolve: {
    alias: {
      '@cvte/inferno-with-canvas': path.join(process.cwd(), './node_modules/@cvte/inferno-with-canvas'),
      immutable: path.join(process.cwd(), './node_modules/immutable'),
      '@enow/enow': path.join(process.cwd(), './node_modules/@enow/enow'),
      // '@capsule/enow-recorder': path.join(process.cwd(), '../../packages/enow-recorder/src/index.ts'),
      // '@capsule/player': path.join(process.cwd(), '../../packages/player/src/index.ts'),
      // '@capsule/rec': path.join(process.cwd(), '../../packages/rec/src/index.ts'),
      // '@capsule/utils': path.join(process.cwd(), '../../packages/utils/src/index.ts'),
      // '@capsule/upload': path.join(process.cwd(), '../../packages/upload/src/index.ts'),
    },
  },
};
