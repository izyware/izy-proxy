"use strict";

var fs = require('fs');
module.exports = function (config, pluginName) {
  if (!config.tblName) {
    return { reason: 'Please define config.tblName' };
  }
  var name = pluginName;
  return {
    success: true,
    name,
    canHandle: function(req, sessionObjects, serverObjs) {
      proxyAnalytics(req, config, sessionObjects, serverObjs);
      return false;
    },
    handle: function (req, res, serverObjs) {}
  };
};


// Non blocking, failsafe
function proxyAnalytics(req, config, sessionObjects, serverObjs) {
  var scheme = sessionObjects.scheme;
  try {
    var rootmod = require('izymodtask').getRootModule();
    var b64 = rootmod.ldmod('encodedecode/base64');
    var wrap = function(val) {
      if (!val) val = '';
      return "NOQUOTE__FROM_BASE64('" + b64.enc(val) + "')";
    }
    var sql = rootmod.ldmod('sql/q');
    var qs = [];
    var connectionInfo = {
      // This is in UTC
      recordtm: new Date().toISOString().replace(/T/, ' ').replace(/\..+/, ''),
      host: wrap(req.headers.host),
      method: 'GET',
      // todo parse this into components using the standard server parser
      path: req.url,
      scheme: (req.headers["x-original-request-is-ssl"] == "yes" || scheme == 'https') ? 'https' : 'http',
      ipv4: 'NOQUOTE__INET_ATON("' + (req.headers['x-forwarded-for'] || req.connection.remoteAddress) + '")',
      accept:  wrap(req.headers.accept),
      cookie: wrap(req.headers.cookie),
      referer: wrap(req.headers.referer),
      useragent: wrap(req.headers['user-agent']),
      useragentmd5: 'NOQUOTE__MD5("' + req.headers['user-agent'] + '")'
    };
    qs.push(sql.getInsert(config.tblName, [connectionInfo]));
    rootmod.ldmod('pkgloader').getNode().runQuery2(qs, function () {}, function (outcome) {
      serverObjs.serverLog('runQuery2 error: ' + outcome.reason, 'ERROR');
    });
  } catch(e) {
    serverObjs.serverLog('Exception error: ' + e.message, 'ERROR');
  }
}
