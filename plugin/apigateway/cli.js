var modtask = function(chain) {}
modtask.runWithMethod = function(queryObject, cb) {
  var method = queryObject.method;
  var config = queryObject.config;
  if (method != 'chain') return cb({ reason: 'non chain methods are not supported' });
  modtask.doChain([config.chain.action, config.chain.queryObject]);
}
