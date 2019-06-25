var modtask = function(chainItem, cb, $chain) {
  var i = 0;
  switch (chainItem[i++]) {
    case 'frame_getnode':
      $chain.set('outcome', { success: true, data: modtask.getNode() });
      // backwards compat for ['frame_getnode', modtask] style components
      var containerParam = chainItem[i++];
      if (containerParam) containerParam.node = $chain.get('outcome').data;
      cb();
      return true;
      break;
  }
}

modtask.getNode = function() {
  var cfg = modtask.__chainProcessorConfig || {};
  var node = modtask.ldmod('ui/node/direct').sp({
    'accesstoken': cfg.accesstoken,
    'dataservice': cfg.dataservice,
    'groupidobject': {
      transportmodule: cfg.transportmodule
    }
  }).sp('verbose', cfg.verbose);
  return node;
}
