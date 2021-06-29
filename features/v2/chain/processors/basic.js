/* izy-loadobject nodejs-require */
module.exports = (function() {
  var modtask = function(chainItem, cb, $chain) {
    var i = 0;
    var params = {};
    params.action = chainItem[i++];
    switch (params.action) {
      case 'returnOnFail':
      case 'ROF':
      case 'return':
        var outcome = $chain.get('outcome') || { reason: 'asked to return from a chain that does not have the outcome object defined. please use [set, outcome, ...] to fix this issue.' };
        if (outcome.success && (params.action == 'returnOnFail' || params.action == 'ROF')) {
          cb();
          return true;
        }
        // we wont call the cb function here.
        $chain.chainReturnCB(outcome);
        return true;
      case 'outcome':
        var outcome = chainItem[i++];
        if (typeof(outcome) != 'object') {
          $chain.chainReturnCB({ reason: 'outcome needs to be an object'});
          return true;
        }
        $chain.set('outcome', outcome);
        $chain.chainReturnCB(outcome);
        return true;
      case 'log':
        console.log(chainItem[i++]);
        cb();
        return true;
      case 'set':
        $chain.set(chainItem[i++], chainItem[i++]);
        cb();
        return true;
      case 'delay':
      case 'continue':
      case 'nop':
        var delay = chainItem[i++] || 0;
        if (delay) {
          setTimeout(cb, delay);
        } else {
          cb();
        }
        return true;
      case 'sysview':
        require('izymodtask').getRootModule().ldmod('s_root').cmdlineverbs.sysview();
        cb();
        return true;
    }
    return false;
  }
  return modtask;
})();
