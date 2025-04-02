const path = require('path');

module.exports = {
  style: {
    sass: {
      loaderOptions: {
        implementation: require('sass'),
      },
    },
  },
  webpack: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
    configure: {
      module: {
        rules: [
          {
            test: /\.scss$/,
            use: [
              'style-loader',
              'css-loader',
              'sass-loader',
            ],
          },
        ],
      },
    },
  },
}; 