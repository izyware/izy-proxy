var modtask = {};
modtask.handle = function(serverObjs) {
    var req = serverObjs.req;
    var res = serverObjs.res;
    modtask.doChain([
        ['frame_getnode', modtask],
        function(chain) {
            if (typeof(modtask.node.runQuery2) == 'function') {
                return chain(['outcome', { success: true }]);
            } else {
                return chain(['outcome', { reason: 'expected frame_getnode to return a valid node' }]);
            }
        },
        ['log', 'verify frame_importpkgs'],
        ['frame_importpkgs', ['kernel']]
    ], function(outcome) {
        var headers = serverObjs.getCORSHeaders();
        headers['Content-Type'] = 'text/html';
        serverObjs.res.writeHead(200, headers);
        delete outcome.__callstack;
        serverObjs.res.end(JSON.stringify(outcome));
    });
}