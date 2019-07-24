var modtask = {};
modtask.handle = function(serverObjs) {
    modtask.doChain([
      ['nop'],
      function(chain) {
        x.y = 1;
      }
    ], function(outcome) {
      var headers = serverObjs.getCORSHeaders();
      headers['Content-Type'] = 'text/html; charset=utf-8';
      serverObjs.res.writeHead(200, headers);
      delete outcome.__callstack;
      serverObjs.res.end(JSON.stringify(outcome));
    });
}