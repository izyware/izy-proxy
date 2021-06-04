var modtask = {};
modtask.handle = function(__moduleSearchPaths) {
  return function(req, res) {
    require('../../index').newChain({
      chainItems: [
        ['//inline/' + req.path, (req.method.toUpperCase() === 'POST' ? req.body : req.query)],
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
