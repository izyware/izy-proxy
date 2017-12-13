"use strict";

var fs = require('fs');
module.exports = function (config, pluginName) {
  var name = 'default';
  return {
    success: true,
    name,
    canHandle: function(req) {
      return true;
    },
    handle: function (req, res, serverObjs) {
      if (~req.url.indexOf('/favicon.ico')) {

        var img = fs.readFileSync('./favicon.ico');
        res.writeHead(200, {'Content-Type': 'image/x-icon' });
        return res.end(img, 'binary');
      }

      // No-one handled the requests, so say 404
      return serverObjs.sendStatus({
        status: 404,
        host: req.headers.host,
        url: req.url,
        subsystem: name
      }, 'The requested resource was not found');
      /*
       * If you would rather have another microservice take over from here, use the following:
       *
       serverObjs.proxy.web(req, res, {
        target: {
          host: '127.0.0.1',
          port: 99991
        }
      });
      */
    }
  };
};
