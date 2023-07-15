/* izy-loadobject nodejs-require */
module.exports = (function() {

  var modtask = function(chainItem, next, $chain) {
    if (!modtask.__chainProcessorConfig) modtask.__chainProcessorConfig = {};
    var loggingConfig = modtask.__chainProcessorConfig;
    var datastreamMonitor = modtask.create(loggingConfig);

    var i = 0;
    var params = {};
    params.action = chainItem[i++];

    switch (params.action) {
      case 'monitoring.forcelog':
        datastreamMonitor.log(chainItem[i++]);
        next();
        return true;
        break;
      case 'monitoring.log':
        var monitoringData = $chain.get('monitoringData');
        if (datastreamMonitor.shouldAlwaysLog || (monitoringData && monitoringData.shouldLog))
          datastreamMonitor.log(chainItem[i++]);
        next();
        return true;
        break;
      case 'monitoring.update':
        var monitoringData = datastreamMonitor(chainItem[i++]).data;
        $chain.set('monitoringData', monitoringData);
        $chain.set('outcome', { success: true, data: monitoringData });
        next();
        return true;
        break;
    }

    return false;
  }

  modtask.createForMethodCallLogging = function(monitoringConfig, fillinValues) {
    return {
      log: function(queryObject) {
        return modtask.log(queryObject, fillinValues, monitoringConfig);
      }
    }
  }

  modtask.create = function(queryObject, cb) {
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
    ret.log = function(q) {
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
    const delta = len - str.length;
    if (delta < 0) return str.substr(0, len);
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
    if (typeof(queryObject) == 'string') {
      console.log('WARNING, do log log strings. use { key: \'eventName\', msg: {} }. String follows: \r\n', queryObject);
      return {};
    }
    var monitoringConfig = _monitoringConfig || queryObject.verbose || {};
    var level = queryObject.level || 4;
    var key = queryObject.key;
    var msg = queryObject.msg || '';
    var shouldIgnore = false;
    var serviceName = '';
    var actionString = '';
    var fullcontext = ['', '', ''];
    var invokeString = { method: '', module: '', callee : '' };
    var outcomeMonitoring = null;
    var extraInfoInLogs = null;
    var levelForcesLogging = false;

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
                case 'connectionId':
                  fullcontext[2] = msg[p];
                  break;
                case 'module':
                  invokeString.module = msg[p];
                  break;
                case 'service':
                  serviceName = msg[p].name || msg[p].invokeString;
                  break;
                case 'context':
                  fullcontext[0] = msg[p];
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

    var prefix = modtask.fixLen(serviceName, 20);
    var context = '{' + modtask.fixLen(fullcontext.join('.'), 3) + '}';
    var invokeStringStr = invokeString.module + '?' + invokeString.method + (invokeString.callee ? '->' + invokeString.callee : '');

    if (levelForcesLogging) {} else {
      if (!monitoringConfig[key]) {
        shouldIgnore = true;
      }

      const { filter } = monitoringConfig;
      if (typeof(filter) == 'object') {
        if (filter.services) {
          shouldIgnore = true;
          const service = msg['service'] || {};
          if (filter.services.indexOf && filter.services.indexOf(service.name) >= 0) {
            shouldIgnore = false;
          }
        }

        if (filter.invokeStrings) {
          shouldIgnore = true;
          for(var i=0; i < filter.invokeStrings.length; ++i) {
            if (invokeStringStr.indexOf(filter.invokeStrings[i]) >= 0) {
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
    if (monitoringConfig && monitoringConfig.useANSIColors) {
      // See https://en.m.wikipedia.org/wiki/ANSI_escape_code#Colors
      const colors = {
        service: '[33m',
        invokeString: '[0;94m',
        action: '[36m',
        outcomeSuccess: '[1;33m',
        outcomeFail: '[1;31m'
      };
      function ansiColorBlock(color, block) {
        return '\x1b' + color + block + '\x1b[0m';
      }
      line = ansiColorBlock(colors.service, '[' + prefix + '] ')
        + context
        + ansiColorBlock(colors.invokeString, '(' + invokeStringStr + ') ')
        + ansiColorBlock(colors.action, actionString)
        + (outcomeMonitoring ? ansiColorBlock(outcomeMonitoring.success? colors.outcomeSuccess : colors.outcomeFail, outcomeMonitoringTxt) : '')
        + ' ' + txt;
    } else {
      if (actionString.length) actionString = '*' + actionString + '*';
      line = '[' + prefix + '] ' + context + '(' + invokeStringStr + ') ' + actionString
        + (outcomeMonitoring ? outcomeMonitoringTxt  : '')
        + ' ' + txt;
    }

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
    console.log(timestampInfo.tzString + ' ' + line);
    if (extraInfoInLogs) {
      console.log('_________________________ extraInfoInLogs __________________________');
      console.log(extraInfoInLogs);
      console.log('^^^^^^^^^^^^^^^^^^^^^^^^^ extraInfoInLogs ^^^^^^^^^^^^^^^^^^^^^^^^^');
    } else {
    }
  }

  return modtask;
})();
