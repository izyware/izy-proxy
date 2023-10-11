module.exports = () => {};
  
module.exports.basePath = __dirname;
module.exports.pipe = (action, moduleSearchPaths) => {
  if (!moduleSearchPaths) {
    moduleSearchPaths = [module.parent.path + '/', module.parent.path + '/../'];
  }
  if (!action) action = ['callpretty'];
  const offset = 2, step = action.length, end = offset + 10 + step;
  for(let i=end;i >= offset; i--) {
    if (process.argv[i-step]) {
      process.argv[i] = process.argv[i-step];
    }
  }
  for(let i=0; i < action.length; ++i) {
    process.argv[offset + i] = action[i];
  };
  process.__izyProxyCliModuleSearchPaths = moduleSearchPaths;
  require('izy-proxy/cli');
}