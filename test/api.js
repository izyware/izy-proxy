var modtask = function() {}
modtask.__apiInterfaceType = 'jsonio';
modtask.processQueries = function(queryObject, cb) {
    modtask.doChain([
        ['log', '-------------------------------------------------------------------------------------------------------------'],
        ['log', 'testing izyware api system and configuration for the API system'],
        ['log', 'verify frame_getnode'],
        ['frame_getnode', modtask],
        function(chain) {
            if (typeof(modtask.node.runQuery2) == 'function') {
                return chain([['set', 'outcome', { success: true }]]);
            } else {
                return chain([['set', 'outcome', { reason: 'expected frame_getnode to return a valid node' }]]);
            }
        },
        ['returnOnFail'],
        ['log', 'verify frame_importpkgs'],
        ['frame_importpkgs', ['kernel']],
        ['returnOnFail']
    ], cb);
}