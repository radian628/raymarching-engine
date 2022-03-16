const HtmlWebpackPlugin = require("html-webpack-plugin");
const path = require("path");

module.exports = {
  mode: "development",
  // devServer: {
  //   static: {
  //     directory: path.resolve(__dirname)
  //   },
  //   compress: true,
  //   port: 8080
  // },
  watch: true,
  entry: "./src/main.tsx",
  output: {
    filename: "bundle.[hash].js",
    path: path.resolve(__dirname, "build")
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: "./src/index.html"
    })
  ],
  resolve: {
    modules: [__dirname, "src", "node_modules"],
    extensions: ["*", ".js", ".jsx", ".ts", ".tsx"]
  },
  module: {
    rules: [
      {
        test: /\.jsx?$/,
        exclude: /node_modules/,
        loader: require.resolve("babel-loader")
      },
      {
        test: /\.tsx?$/,
        exclude: /node_modules/,
        use: ["babel-loader"]
      },
      {
        test: /\.css$/,
        use: ["style-loader", "css-loader"]
      },
      {
        test: /\.png|svg|jpg|gif$/,
        use: ["file-loader"]
      }
    ]
  }
}