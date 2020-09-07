"use strict";

var defaults = {
  verbose: {
    healthCheck: true,
    masterSlaveMessages: false,
    restartSlave: true
  },
  clusterConfig: {
    healthCheckIntervalSeconds: 10,
    slaveMaxAllowedMemoryMB: 900,
    slaveTTLSeconds: 60*60*24*365 // 1 Year
  }
}

var uncaughtException = function(err) {
  var message = err.message;
  message = '[uncaughtException -- server system should have caught this] ' + (message || '');
  myLog(message);
};
process.on('uncaughtException', uncaughtException);

var myLog = function(p1, p2) {
  if (!p2) p2 = '';
  console.log('[' + processId + '] ', p1, p2);
}

function startSlave(config) {
  var clusterConfig = config.cluster || defaults.clusterConfig;
  var verbose = clusterConfig.verbose || defaults.verbose;
  process.on('message', message => {
    var metrics = { rss: process.memoryUsage().rss, pid: process.pid };
    if (verbose.masterSlaveMessages) myLog('Send metrics to master', metrics.rss);
    process.send(metrics);
  });
  require('../server').run(config);
}

function startMaster(config) {
  const cp = require('child_process');
  let slaveInstance = null;

  var clusterConfig = config.cluster || defaults.clusterConfig;
  var verbose = clusterConfig.verbose || defaults.verbose;

  function restartSlave() {
    slaveMetrics = { rss: 0, pid: 0 };
    if (slaveInstance) {
      if (verbose.restartSlave) myLog('kill ', slaveInstance.pid);
      var success = slaveInstance.kill();
      if (verbose.restartSlave) myLog('success:', success);
    }

    if (verbose.restartSlave) myLog('create new slave');
    slaveInstance = cp.fork(`${__dirname}/app.js`,
      ['slave'],
      { silent: false }
    );

    slaveInstance.starttimeUTS = Date.now();

    slaveInstance.on('message', (_slaveMetrics) => {
      slaveMetrics.rss = _slaveMetrics.rss;
      slaveMetrics.pid = _slaveMetrics.pid;
    });
  }


  var slaveMetrics = { rss: 0, pid: 0 };

  var healthCheck = function() {
    if (!slaveMetrics.rss) slaveMetrics.rss = 0;
    slaveMetrics.rssMB = Math.round(slaveMetrics.rss / (1024*1024));
    if (slaveInstance) {
      if (!slaveInstance.starttimeUTS) slaveInstance.starttimeUTS = Date.now();
      slaveMetrics.uptimeSeconds = Math.round((Date.now() - slaveInstance.starttimeUTS) / 1000);
    } else {
      slaveMetrics.uptimeSeconds = 0;
    }
    slaveMetrics.instantiate = !slaveInstance;
    slaveMetrics.memoryTrigger = slaveMetrics.rssMB > clusterConfig.slaveMaxAllowedMemoryMB;
    slaveMetrics.TTLExpired = slaveMetrics.uptimeSeconds > clusterConfig.slaveTTLSeconds;
    if (verbose.healthCheck) myLog('healthCheck', slaveMetrics);

    if (slaveMetrics.instantiate || slaveMetrics.memoryTrigger || slaveMetrics.TTLExpired) {
      restartSlave();
    } else {
      if (verbose.masterSlaveMessages) myLog('get metrics for', slaveInstance.pid)
      slaveInstance.send({}); // Have slave send us back their metrics
    }
    setTimeout(function() {
      healthCheck();
    }, clusterConfig.healthCheckIntervalSeconds*1000);
  }
  healthCheck();
}

var config = require('../../configs/izy-proxy/tcpserver');
var mode = process.argv[2];
if (!mode && config.cluster) {
  mode = 'master';
} else {
  mode = 'standalone';
}
var processId =  mode + '.' + process.pid;
switch(mode) {
  case 'slave':
    startSlave(config);
    break;
  case 'master':
    startMaster(config);
    break;
  default:
    require('../server').run(config);
}
