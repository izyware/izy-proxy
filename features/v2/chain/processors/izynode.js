/* izy-loadobject nodejs-require */
module.exports = (function() {
  var modtask = function(chainItem, cb, $chain) {
    var i = 0;
    switch (chainItem[i++]) {
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
})();
