/* izy-loadobject nodejs-require */
module.exports = (function() {

  var modtask = function(chainItem, next, $chain) {
    if (!modtask.__chainProcessorConfig) modtask.__chainProcessorConfig = {};
    const { monitoringConfig, fillinValues } = modtask.__chainProcessorConfig;
    var datastreamMonitor = modtask.createForMethodCallLogging(monitoringConfig, fillinValues);

    var i = 0;
    var params = {};
    params.action = chainItem[i++];

    switch (params.action) {
      case 'monitoring.log':
        datastreamMonitor.log(chainItem[i++]);
        next();
        return true;
        break;
    }

    return false;
  }

  modtask.createForMethodCallLogging = function(monitoringConfig, fillinValues) {
    const logFn = function(queryObject) {
      return modtask.log(queryObject, fillinValues, monitoringConfig);
    };
    return {
      log: logFn,
      createForStreamMonitoring: function(queryObject) {
        return modtask.create(queryObject, logFn);
      }
    }
  }

  modtask.create = function(queryObject, logOverrideFn) {
    var totalDataSize = 0;
    var totalBufferBeforeLogging = 0;
    var firstSampleTS = null;
    var samplesPerSecond = null;
    let { intervalSeconds, streamProperties } = queryObject;
    let shouldAlwaysLog = false;
    if (!intervalSeconds) intervalSeconds = 5;
    if (!streamProperties) {
      streamProperties = {
        sampleRate: 1
      };
      shouldAlwaysLog = true;
    }
    const numberOfChannels = streamProperties.numberOfChannels || 1;
    const bitsPerSample = streamProperties.bitsPerSample || 8;
    var ret  = function(numNewSamplesRecieved) {
      var now = (new Date()).getTime();
      var step = numNewSamplesRecieved*bitsPerSample / 8;
      totalDataSize += step;
      totalBufferBeforeLogging += step;
      if (totalDataSize == step) {
        firstSampleTS = now;
      };
      var shouldLog = shouldAlwaysLog || totalDataSize == step ||
      (intervalSeconds < (totalBufferBeforeLogging / (bitsPerSample / 8 * numberOfChannels) / streamProperties.sampleRate));
      if (shouldLog) {
        if (now > firstSampleTS) {
          samplesPerSecond = totalDataSize * 8 / ((now - firstSampleTS) / 1000) / bitsPerSample ;
        }
        totalBufferBeforeLogging = 0;
      }
      totalFriendly = modtask.formatFriendly(totalDataSize, 'B', 1024).data.str;
      samplesPerSecondFriendly = modtask.formatFriendly(samplesPerSecond, 'HZ', 1000).data.str;
      return { success: true, data: { shouldLog, totalDataSize, totalFriendly, samplesPerSecond, samplesPerSecondFriendly } };
    }
    ret.log = logOverrideFn || function(q) {
      if (!q.verbose && queryObject.verbose) q.verbose = queryObject.verbose;
      if (!q.key && queryObject.key) q.key = queryObject.key;
      return modtask.log(q);
    }
    ret.shouldAlwaysLog = shouldAlwaysLog;
    return ret;
  }

  modtask.formatFriendly = function(number, name, thousand) {
    if (!thousand) thousand = 1000;
    var data = { units: 0, unitName: '', number, thousand, str: 'n/a' };
    if (!number) return { success: true, data };
    var unitNames = ['M', 'K', ''];
    for(var i=0; i < unitNames.length;++i) {
      data.units = number / (Math.pow(thousand, unitNames.length-1-i));
      data.unitName = unitNames[i];
      if (data.units > 1) break;
    }
    data.units = +((data.units).toFixed(2));
    data.str = data.units + data.unitName + name;
    return { success: true, data };
  }

  modtask.fixLen = function(str, len) {
    if (!str) str = '';
    var inverse = false;
    if (len < 0) {
      inverse = true;
      len = -len;
    }
    const delta = len - str.length;
    if (delta < 0) return (inverse ? str.substr(-delta, len) : str.substr(0, len));
    for(var i=0; i < delta; ++i) str += ' ';
    return str;
  }

  // levels: trace(6), debug(5), info(4), warn(3), error(2), fatal(1)
  modtask.log = function(queryObject, fillinValues, _monitoringConfig) {
    const currentDate = new Date();
    const timestampInfo = {
      ts: currentDate.getTime(),
      tzString: currentDate.toLocaleString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' }).split('/')[1] + ' ' + currentDate.toLocaleString('en-US', { hour12: false }).split(', ')[1]
    };
    if (!queryObject) queryObject = { msg: { data: '' }};
    else if (typeof(queryObject) != 'object') {
      queryObject = { msg: { data: queryObject }};
    }
    if (!queryObject.msg && !queryObject.key && !queryObject.level) {
      queryObject = { msg: queryObject };
    }
    if (typeof(queryObject.msg) == 'string') {
      queryObject.msg = { data: queryObject.msg };
    }

    var monitoringConfig = _monitoringConfig || queryObject.verbose || {};
    var level = queryObject.level || 4;
    var key = queryObject.key;
    var msg = queryObject.msg || {};
    var shouldIgnore = false;
    var serviceName = '';
    var actionString = '';
    var fullcontext = { user: '', network: '' };
    var invokeString = { method: '', module: '', callee : '' };
    var audioSource = null;
    var warnings = [];
    var audioDestinations = [];
    var outcomeMonitoring = null;
    var extraInfoInLogs = null;
    var levelForcesLogging = false;
    var fieldsSchema = monitoringConfig.fieldsSchema || {
      "timestamp": true,
      "service": true,
      "context": true,
      "invokeString": true,
      "action": true,
      "device": true,
      "outcome": true,
      "misc": true
    };

    if (monitoringConfig.forceUpToLevel) {
      if (level <= monitoringConfig.forceUpToLevel) levelForcesLogging = true;
    }

    if (fillinValues) {
      for (var p in fillinValues) {
        msg[p] = fillinValues[p];
      }
    }

    var elements = [];
    switch(typeof(msg)) {
        case 'object':
            for(var p in msg) {
              switch(p) {
                case 'outcome':
                  outcomeMonitoring = msg[p];
                  if (typeof(outcomeMonitoring) != 'object') {
                    outcomeMonitoring = { success: true, data: _outcome };
                  };
                  delete outcomeMonitoring.__callstackStr;
                  if (monitoringConfig.extraInfoInLogs) extraInfoInLogs = outcomeMonitoring;
                  break;
                case 'errorObject':
                  if (msg[p] instanceof Error) {
                    elements.push(p + ': ' + msg[p].toString());
                    extraInfoInLogs = msg[p];
                  }
                  else {
                    if (monitoringConfig.extraInfoInLogs) extraInfoInLogs = new Error(JSON.stringify(msg[p]));
                    elements.push(p + ': ' + msg[p]);
                  }
                  break;
                case 'audioSource':
                  if (typeof(msg[p]) == 'object') {
                    audioSource = { name: msg[p].name, id: msg[p].deviceId };
                  }
                  break;
                case 'audioDestinations':
                  audioDestinations = msg[p];
                  break;
                case 'connectionId':
                  fullcontext.network = msg[p];
                  break;
                case 'user':
                  fullcontext.user = msg[p].id;
                  break;
                case 'module':
                  invokeString.module = msg[p];
                  break;
                case 'service':
                  serviceName = msg[p].name || msg[p].invokeString;
                  break;
                case 'context':
                  warnings.push('remove context from log');
                  break;
                case 'invokeString':
                  invokeString.callee = msg[p];
                  break;
                case 'method':
                  invokeString.method = msg[p];
                  break;
                case 'action':
                  actionString = msg[p];
                  break;
                default:
                  elements.push((p == 'data' ? '' : p + ': ')+(typeof(msg[p]) == 'object' ? JSON.stringify(msg[p]) : msg[p]));
                  break;
              }
            }
            break;
    }


    if (queryObject.subMethod) {
      invokeString.callee += queryObject.subMethod;
    }

    var invokeStringStr = invokeString.module + '?' + invokeString.method + (invokeString.callee ? '->' + invokeString.callee : '');
    var deviceString = '';
    if (audioSource) {
      deviceString += (audioSource.name || audioSource.id);
    }
    if (audioDestinations && audioDestinations.length) {
      deviceString += '=>';
      for(var i=0; i < audioDestinations.length; ++i) {
        deviceString += (audioDestinations[i].name || audioDestinations[i].id);
      }
    }

    if (levelForcesLogging) {} else {
      if (!monitoringConfig[key]) {
        shouldIgnore = true;
      }

      const { filter } = monitoringConfig;
      if (typeof(filter) == 'object') {
        shouldIgnore = false;
        if (!shouldIgnore && filter.services) {
          shouldIgnore = true;
          const service = msg['service'] || {};
          if (!service.name) service.name = '';
          for(var i=0; i < filter.services.length; ++i) {
            if (service.name.indexOf(filter.services[i]) >= 0) {
              shouldIgnore = false;
              break;
            }
          }
        }

        if (!shouldIgnore && filter.invokeStrings) {
          shouldIgnore = true;
          for(var i=0; i < filter.invokeStrings.length; ++i) {
            if (invokeStringStr.indexOf(filter.invokeStrings[i]) >= 0) {
              shouldIgnore = false;
              break;
            }
          }
        }

        if (!shouldIgnore && filter.devices) {
          shouldIgnore = true;
          for(var i=0; i < filter.devices.length; ++i) {
            if (deviceString.indexOf(filter.devices[i]) >= 0) {
              shouldIgnore = false;
              break;
            }
          }
        }

        if (!shouldIgnore && filter.actions) {
          shouldIgnore = true;
          for(var i=0; i < filter.actions.length; ++i) {
            if (actionString.indexOf(filter.actions[i]) >= 0) {
              shouldIgnore = false;
              break;
            }
          }
        }
      }
    }

    if (shouldIgnore) return {};

    var outcomeMonitoringTxt = '';
    if (outcomeMonitoring) {
      outcomeMonitoringTxt = outcomeMonitoring.success ? outcomeMonitoring.data : outcomeMonitoring.reason;
    };
    var txt = elements.join(',');
    var line = '';

    // See https://en.m.wikipedia.org/wiki/ANSI_escape_code#Colors
    const colors = {
      service: '[33m',
      context: '[34m',
      invokeString: '[0;94m',
      action: '[36m',
      outcomeSuccess: '[1;33m',
      outcomeFail: '[1;31m',
      device: '[0;35m'
    };
    function formatField(field, val, color) {
      var len = null;
      if (!fieldsSchema[field]) return '';
      if (typeof(fieldsSchema[field]) == 'object') {
        var cfg = fieldsSchema[field];
        len = cfg.len;
        if (!len) return '';
        val = (cfg.prefix || '') + modtask.fixLen(val, len) + (cfg.postfix || '');
      }
      if (monitoringConfig && monitoringConfig.useANSIColors) {
        return '\x1b' + (color || colors[field]) + val + '\x1b[0m' + ' ';
      }
      return val + ' ';
    }

    line = ''
      + formatField('service', serviceName)
      + formatField('context', fullcontext.user + '@' + fullcontext.network)
      + formatField('invokeString', invokeStringStr)
      + formatField('action', actionString)
      + formatField('device', deviceString)
      + (outcomeMonitoring ? formatField('outcome', outcomeMonitoringTxt, outcomeMonitoring.success? colors.outcomeSuccess : colors.outcomeFail) : '')
      + txt
      + warnings.join('-');

    if (monitoringConfig && monitoringConfig.monitoringIngestionService) {
      try {
        monitoringConfig.monitoringIngestionService({
          ts: timestampInfo.ts,
          line,
          extraInfoInLogs
        });
      } catch(e) {
        console.log('ERROR[monitoringConfig.monitoringIngestionService]: ', e);
      }
      return ;
    };

    try {
      if (typeof(document) == 'object' && document.monitoringIngestionService) {
        document.monitoringIngestionService({
            ts: timestampInfo.ts,
            line
        });
      }
    } catch(e) {}
    console.log((fieldsSchema.timestamp ? (timestampInfo.tzString + '') : '') + line);
    if (extraInfoInLogs) {
      console.log('_________________________ extraInfoInLogs __________________________');
      console.log(extraInfoInLogs);
      console.log('^^^^^^^^^^^^^^^^^^^^^^^^^ extraInfoInLogs ^^^^^^^^^^^^^^^^^^^^^^^^^');
    } else {
    }
  }

  return modtask;
})();
