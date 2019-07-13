var featureModulesPath = 'features/v2/';
modtask.handle = function(rootmod, serverObjs, mod, chainHandlers) {
    mod.doChain = function (chainItems, _cb) {
        if (!_cb) {
            _cb = function (outcome) {
                return serverObjs.sendStatus({
                    status: 500,
                    subsystem: modtask.__myname
                }, mod.__myname + ' did not specify a callback for chain');
            }
        };
        return rootmod.ldmod(featureModulesPath + 'chain/main').newChain({
            chainName: mod.__myname,
            chainAttachedModule: mod,
            chainItems: chainItems,
            context: mod,
            chainHandlers: chainHandlers
        },
          _cb, // chainCb
          false, // doNotRunChain,
          // handlerWhenChainReturnCBThrows
        function(outcome) {
            return serverObjs.sendStatus({
                status: 500,
                subsystem: mod.__myname,
            }, outcome.reason);
        });
    };
    return mod.handle(serverObjs);
}