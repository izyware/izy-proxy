module.exports = () => {};
module.exports.basePath = __dirname;
module.exports.callpretty = action => {
  const offset = 4, end = 13, step = 2;
  for(let i=end;i >= offset; i--) {
    if (process.argv[i-step]) {
      process.argv[i] = process.argv[i-step];
    }
  }
  process.argv[offset-2] = 'callpretty';
  process.argv[offset-1] = action;
  require('izy-proxy/cli');
}