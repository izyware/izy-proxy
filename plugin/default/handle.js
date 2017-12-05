"use strict";

var fs = require('fs');
module.exports = function (config, pluginName) {
  return {
    success: true,
    name: 'default',
    canHandle: function(req) {
      return true;
    },
    handle: function (req, res, proxy) {
      if (~req.url.indexOf('/favicon.ico')) {

        var img = fs.readFileSync('./favicon.ico');
        res.writeHead(200, {'Content-Type': 'image/x-icon' });
        return res.end(img, 'binary');
      }

      // No-one handled the requests, so say 404
      res.writeHead(404);
      var info = {
        status: 404,
        host: req.headers.host,
        url: req.url
      };
      res.write("<html><head><title>izy-proxy error</title></head><body><h1>The requested resource was not found</h1><h2>" + JSON.stringify(info) +  "</h2></body></html>");
      res.end();

      /*
       * If you would rather have another microservice take over from here, use the following:
       *
      proxy.web(req, res, {
        target: {
          host: '127.0.0.1',
          port: 99991
        }
      });
      */
    }
  };
};
