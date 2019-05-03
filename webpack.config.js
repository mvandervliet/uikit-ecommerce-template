const path = require('path');

const buildDir = path.resolve(__dirname, 'build');

module.exports = {
  entry: {
    uikit: ['./src/scripts/uikit.js'],
    app: ['./src/scripts/app.js'],
  },
  devtool: 'eval',
  output: {
    path: buildDir,
    publicPath: '/',
    filename: "scripts/[name].js",
  },
  optimization: {
    usedExports: true,
  },
  resolve: {
    extensions: [ ".js" ],
  },
  module: {
    rules: [
      {
        test: /\.(js)$/,
        exclude: /node_modules/,
        use: ['babel-loader'],
      },
    ]
  },
  plugins: [
    
  ],
};
