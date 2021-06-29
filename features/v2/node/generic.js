/* izy-loadobject nodejs-require */
module.exports = (function() {
  var modtask = function() {}
  modtask.getNode = function(cfg) {
    if (!cfg) cfg = {};
    var transportmodule = cfg.transportmodule;
    if (!transportmodule && cfg.groupidobject) {
      transportmodule = cfg.groupidobject.transportmodule;
    }
    if (transportmodule == 'izy-proxy') {
      return modtask.transportModule(cfg);
    }
    var node = modtask.ldmod('ui/node/direct').sp({
      'accesstoken': cfg.accesstoken,
      'dataservice': cfg.dataservice,
      'groupidobject': {
        transportmodule: cfg.transportmodule
      },
      encryptqueries: cfg.encryptqueries,
    }).sp('verbose', cfg.verbose);
    return node;
  }

  modtask.hexEncode = function(str) {
    // Node Environment?
    if (typeof(Buffer) == 'function') {
      return new Buffer(str, 'utf8').toString('hex');
    }
    var hex, i;
    var result = '';
    for (i=0; i< str.length; i++) {
      hex = str.charCodeAt(i).toString(16);
      result += ('0' + hex).slice(-2);
    }
    return result;
  }

  modtask.transportModule = function(cfg) {
    return {
      runQuery2: function(q, okpush, failpush) {
        if (typeof(q) == 'object' && typeof(q['join']) == 'function')
          q = q.join('__QUERY_SEP__');
        q = modtask.ldmod('ui/node/auth').signRequest(q, cfg.accesstoken);
        var url = cfg.dataservice + 'index.php';
        if (cfg.verbose) console.log('izyNode: POST "' + q + '" to ' + url);

        q = 'hex_' + modtask.hexEncode(q);
        
        modtask.ldmod('rel:../http').universalHTTP().sendRequest({
          method: 'POST',
          url: url,
          headers: {
            'content-type': 'text/html; charset=utf-8'
          },
          body: q
        }, function(outcome) {
          if (!outcome.success) return failpush(outcome);
          if (outcome.status != 200) return failpush({
            success: false,
            reason: outcome.responseText || outcome.reason,
            status: outcome.status
          });
          var res = outcome.responseText;
          modtask.modstr = modtask.ldmod('core/string');
          var ret = [];
          var successtoken = 'SUCCESS: ';
          if (modtask.modstr.startsWith(res, successtoken)) {
            res = res.substr(successtoken.length);
            if (res == 'OK' || res.length == 0) {
            } else {
              res = res.split('__ROW__');
              for(i=1; i < res.length; ++i) {
                var row = res[i].split(',');
                for(j=0; j < row.length; ++j) {
                  row[j] = row[j].replace(/__COMMA__/g, ',');
                }
                ret.push(row);
              }
              // Non RowEncoded
              if (ret.length == 0) {
                ret.push(res);
              }
            }
            okpush(ret);
          } else if (modtask.modstr.startsWith(res, 'FAIL: ')) {
            description = res.substr(6, res.length-6);
            return failpush({ reason: description });
          } else {
            return failpush({ reason: 'Unrecognized response from IzyNode: ' + res });
          }
        });
      }
    }
  };
  return modtask;
})();
