var modtask = {};
modtask.handle = function(serverObjs) {
    modtask.doChain([
      ['nop']
    ], function(outcome) {
        x.y = 1;
    });
}