var modtask = {};
modtask.handle = function(__moduleSearchPaths) {
  if (!__moduleSearchPaths) __moduleSearchPaths = [module.parent.filename.split('/').slice(0, -1).join('/') + '/'];
  return function(req, res) {
    require('../../index').newChain({
      chainItems: [
        ['//inline/' + (req.method.toUpperCase() === 'POST' ? (req.body.path || req.path) : req.path), (req.method.toUpperCase() === 'POST' ? req.body : req.query)]
      ],
      __chainProcessorConfig: {
        __moduleSearchPaths
      }
    }, outcome => {
      delete outcome.__callstack;
      delete outcome.__callstackStr;
      res.send(outcome);
    });
  };
};

module.exports = modtask;
