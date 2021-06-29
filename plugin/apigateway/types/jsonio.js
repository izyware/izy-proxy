/* izy-loadobject nodejs-require */
module.exports = (function() {
    var featureModulesPath = 'rel:../../../features/v2/';
    var modtask = {};
    modtask.handle = function(serverObjs, mod, chainHandlers, methodToCall) {
        if (serverObjs.acceptAndHandleCORS()) return;

        var req = serverObjs.req;
        var res = serverObjs.res;

        if (['POST'].indexOf(req.method) == -1) {
            return serverObjs.sendStatus({
                status: 401,
                subsystem: modtask.__myname
            }, 'JSONIO is only support via POST');
        };

        var body = '';
        req.on('data', function(data) {
            body += data;
        });
        req.on('end', function() {
            modtask.processQuery(body, serverObjs, mod, chainHandlers, methodToCall);
        });
    }

    modtask.processQuery = function(query, serverObjs, mod, chainHandlers, methodToCall) {
        var jcbEncode = function(outcome) {
            // Stringify might fail on this one when there are circular refs/functions
            delete outcome.__callstack;
            delete outcome.__callstackStr;
            var retStr = '';
            try {
                retStr = JSON.stringify(outcome);
            } catch(e) {
                retStr = JSON.stringify({ reason: e.message });
            }
            var headers = serverObjs.getCORSHeaders();
            headers['Content-Type'] = 'application/json; charset=utf-8';
            serverObjs.res.writeHead(200, headers);
            serverObjs.res.end(retStr);
        };

        var queryObject;
        try {
            queryObject = JSON.parse(query);
        } catch (e) {
            return jcbEncode({ reason: 'Malformed query. JSON.parse(query) failed' });
        }

        try {
            var context = { session: modtask.ldmod(featureModulesPath + 'session/main').get() };
            modtask.ldmod(featureModulesPath + 'pkg/run').runJSONIOModuleInlineWithChainFeature(
            mod,
            methodToCall,
            queryObject,
            context,
            chainHandlers,
            jcbEncode);
        } catch (e) {
            return jcbEncode({ reason: 'Cannot process query: ' + e.message });
        }
    }
    return modtask;
})();
