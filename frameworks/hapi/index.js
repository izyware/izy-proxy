var modtask = {};
modtask.handle = function(__moduleSearchPaths) {
  if (!__moduleSearchPaths) __moduleSearchPaths = [module.parent.filename.split('/').slice(0, -1).join('/') + '/'];
  return function(req, res) {
    require('../../index').newChain({
      chainItems: [
        ['//inline/' + (req.method.toUpperCase() === 'POST' ? (req.payload.path || req.path) : req.path), (req.method.toUpperCase() === 'POST' ? req.payload : req.query)],
        ['continue']
      ],
      __chainProcessorConfig: {
        __moduleSearchPaths
      }
    }, outcome => {
      delete outcome.__callstack;
      delete outcome.__callstackStr;
      res(JSON.stringify(outcome));
    });
  };
};

module.exports = modtask;
