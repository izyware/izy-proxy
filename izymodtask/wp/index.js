/* izy-loadobject nodejs-require */
module.exports = (function() {
  var modtask = {};
  modtask.getRootModule = function(dir, __moduleSearchPaths, forceRequireOnLoadFromFile) {
    var props = {};
    if (!dir) dir = __dirname;
    props.__contextualName = dir + '/__contextualName_for_Root';
    props.__rootPathForAnchorDirectory = modtask.getBootstrapPath();
    if (!__moduleSearchPaths)
      __moduleSearchPaths = [];

    __moduleSearchPaths = __moduleSearchPaths.slice();
    __moduleSearchPaths.push(dir + '/');
    props.__moduleSearchPaths = __moduleSearchPaths;
    var k = modtask.getKernel();
    k.forceRequireOnLoadFromFile = forceRequireOnLoadFromFile;
    var mod = k.rootModule.usermodule;
    for(var p in props) {
      mod[p] = props[p];
    }
    return mod;
  }

  modtask.getBootstrapPath = function() {
    return __dirname + '/bootstrap.js';
  }

  modtask.getKernel = function() {
    return require('./bootstrap.js')();
  }

  modtask.extractConfigFromCmdLine = function(params) {
    var config = null;
    var prop = false;

    if (!params) {
      params = ['node', 'cli.js'];
      params.push('method');
      var cmdParams;
      if (__izywareEmbeddedObject.params) {
        cmdParams = __izywareEmbeddedObject.params;
        //  cmdParams.shift();
        for (i = 0; i < cmdParams.length; ++i)
          params.push(cmdParams[i]);
      } else {
        cmdParams = process.argv[2].split('__SLSH__');
        cmdParams.shift();
        cmdParams.shift();
        var i;
        for (i = 0; i < cmdParams.length; ++i)
          params.push(cmdParams[i].split('=')[1]);
      }
    }

    params.forEach(function (val, index, array) {
      if (index < 2) return;
      if (!config) {
        config = {};
        prop = null;
      }
      if (!prop) {
        prop = val;
      } else {
        config[prop] = val;
        prop = null;
      }
    });

    config = modtask.flatToJSON(config);
    var outcome = modtask.expandStringEncodedConfigValues(config);
    outcome.data = config;
    return outcome;
  }

  modtask.jsonToFlat = function(obj, prefix, data) {
    if (!data) data = {};
    if (!prefix) prefix = '';
    var newKey = '';
    for (var p in obj) {
        newKey = p;
        if (prefix.length) newKey = prefix + '.' + newKey;
        if (typeof(obj[p]) == 'object') {
            modtask.jsonToFlat(obj[p], newKey, data);
        } else {
            data[newKey] = obj[p];
        }
    }
    return data;
  }

  modtask.flatToJSON = function(obj) {
    var p;
    var ret = {};
    var tokens ;
    for(p in obj) {
      if (p.indexOf('.') == -1) {
        ret[p] = obj[p];
        continue;
      }
      tokens = p.split('.');
      var j, dest = ret, token;
      for(j=0; j < tokens.length - 1; ++j) {
        token = tokens[j];
        if (!dest[token]) {
          dest[token] = {};
        }
        dest = dest[token];
      }
      dest[tokens[j]] = obj[p];
    }
    return ret;
  }

  modtask.expandStringEncodedConfigValues = function(config, outcome) {
    if (!outcome) outcome = {};
    var p;
    for(p in config) {
      switch(typeof(config[p])) {
        case 'string':
          var token = 'json:';
          if (config[p].indexOf(token) == 0) {
            try {
              config[p] = JSON.parse(config[p].substr(token.length, config[p].length - token.length));
            } catch(e) {
              outcome.success = false;
              outcome.reason = 'cannot parse ' + config[p] + ': ' + e.message;
              return outcome;
            }
          }
          break;
        case 'object':
          modtask.expandStringEncodedConfigValues(config[p], outcome);
          if (!outcome.success) return outcome;
          break;
      }
    }
    outcome.success = true;
    outcome.data = config;
    return outcome;
  }
  return modtask;
})();
