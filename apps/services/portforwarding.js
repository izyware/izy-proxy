/* izy-loadobject nodejs-require */
module.exports = function() {
  var modtask = function() {};
  const Net = require('net');

  modtask.onConfig = function(queryObject, cb, context) {
    const { datastreamMonitor } = modtask;
    const { service, monitoringConfig } = context;

    const serviceConfig = service.composeConfig;
    datastreamMonitor.log({ level: 2, msg: {
      data: 'starting service',
      serviceConfig
    }});

    // Obsolete variables. Need to stop passing these, since they are available in context
    const verbose = monitoringConfig;
    const user = service.user;

    if (service.serviceConfig) return cb({ reason: 'service is not reconfigurable' });
    service.serviceConfig = serviceConfig;

    
    if (!serviceConfig.address) return cb({ reason: 'please specify address' });
    if (!serviceConfig.forwardingAddress) return cb({ reason: 'please specify forwardingAddress' });
    var serviceInstance = {
      forwardingAddress: serviceConfig.forwardingAddress
    };
    
    modtask.doChain([
      ['//inline/net/socket?setupServer', { address: serviceConfig.address, handshakeProtocol: 'manual' }],
      ['outcome', { success: true }]
    ]);
  };

  modtask.onNewConnection = function(queryObject, cb, context) {
    const { datastreamMonitor } = modtask;
    const { service } = context;
    const { connectionId, serviceConfig, serviceInstance, verbose } = queryObject;
    const connection = global.__connections[connectionId];
    const { socket } = connection;
    if (!serviceConfig.forwardingAddress) return cb({ reason: 'specify serviceConfig.forwardingAddress (this is probably due to mis-routed item to portforwarding)'});

    let forwardSocket = new Net.Socket();
    forwardSocket.on('end', function() {
      datastreamMonitor.log({ msg: {
        connectionId,
        data: 'forwardSocket ended the connection, ending socket'
      }});
      socket.end();
    });

    forwardSocket.on('error', function(err) {
      datastreamMonitor.log({ msg: {
        connectionId,
        data: `forwardSocket error: ${err.toString()}`
      }});
      socket.end();
    });


    const address = serviceConfig.forwardingAddress.split(':');
    const sourceAddress = { port: address[1], host: address[0] };
    datastreamMonitor.log({ msg: {
      connectionId,
      data: `connecting to forwardsocket`,
      sourceAddress
    }});

    forwardSocket.connect(sourceAddress, function() {
      datastreamMonitor.log({ msg: {
        connectionId,
        data: `binding two sockets`
      }});
      socket.on('data', uint8Array => {
        if (serviceConfig.logdata) console.log('>>>>', JSON.stringify(uint8Array.toString()));
        forwardSocket.write(uint8Array)
      });
      forwardSocket.on('data', uint8Array => {
        if (serviceConfig.logdata) console.log('<<<<', JSON.stringify(uint8Array.toString()));
        socket.write(uint8Array)
      });
    });
  };
  
  modtask.onClose = function(queryObject, cb) {
      return cb({ success: true });
  }

  return modtask;
};
module.exports.forcemodulereload = true;
