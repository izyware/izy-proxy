"use strict";

var fs = require('fs');
module.exports = function (config, pluginName) {
  var name = 'logging';
  return {
    success: true,
    name,
    canHandle: function(req) {
      return (~req.url.indexOf('/izyproxylogging'));
    },
    handle: function (req, res, serverObjs) {
      if (~req.url.indexOf('/izyproxylogging')) {
        if (serverObjs.acceptAndHandleCORS(req, res)) return;
        var logEntries = serverObjs.modtask.logEntries;
        res.writeHead(200, serverObjs.getCORSHeaders({'Content-Type': 'application/json' }));
        return res.end(JSON.stringify({
          maxLogLength: serverObjs.modtask.maxLogLength,
          logEntries
        }));
      }

      // No-one handled the requests, so say 404
      return serverObjs.sendStatus({
        status: 404,
        subsystem: name
      }, 'The requested resource was not found');
    }
  };
};
