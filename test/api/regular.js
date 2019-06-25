var modtask = {};
modtask.handle = function(serverObjs) {
    var req = serverObjs.req;
    var res = serverObjs.res;
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
        ['frame_importpkgs', ['kernel']]
    ], function(outcome) {
        var headers = serverObjs.getCORSHeaders();
        headers['Content-Type'] = 'text/html';
        serverObjs.res.writeHead(200, headers);
        serverObjs.res.end(JSON.stringify(outcome));
    });
}