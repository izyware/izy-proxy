/* izy-loadobject nodejs-require */
module.exports = function() {
  var modtask = function(chainItem, cb, $chain) {
    var i = 0;
    switch (chainItem[i++]) {
      case 'izynode.__chainProcessorConfig':
        var __chainProcessorConfig = chainItem[i++];
        if (typeof(__chainProcessorConfig) != 'object') return $chain.chainReturnCB({ reason: '__chainProcessorConfig must be an object'});
        modtask.__chainProcessorConfig = __chainProcessorConfig;
        $chain.set('outcome', { success: true });
        cb();
        return true;
        break;
      case 'frame_getnode':
        $chain.set('outcome', { success: true, data: modtask.ldmod('rel:../../node/generic').getNode(modtask.__chainProcessorConfig) });
        // backwards compat for ['frame_getnode', modtask] style components
        var containerParam = chainItem[i++];
        if (containerParam) containerParam.node = $chain.get('outcome').data;
        cb();
        return true;
        break;
    }
  }

  modtask.__$d = ['rel:../../node/generic'];
  return modtask;
};

module.exports.forcemodulereload = true;
