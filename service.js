/* izy-loadobject nodejs-require */
module.exports = function() {
  var modtask = function(chainItem, next, $chain) {
    if (!modtask.__chainProcessorConfig) modtask.__chainProcessorConfig = {};

    var i = 0;
    var params = {};
    params.action = chainItem[i++];

    const serviceToken = '//service/';
    if (params.action.indexOf(serviceToken) == 0) {
      let str = params.action.substr(serviceToken.length);
      if (str.indexOf('?') == -1) {
        return $chain.chainReturnCB({ reason: 'please use service?method call signature' });
      };
      str = str.split('?');
      const serviceName = str[0];
      const method = str[1];
      const methodQueryObject = chainItem[i++] || {};
      $chain.newChainForProcessor(modtask, function(outcome) {
        // error only?
          console.log('warning_place2_', outcome);
      }, {},[
          ['//inline/?run', { serviceName, method, methodQueryObject }],
          chain => {
            $chain.set('outcome', chain.get('outcome'));
            next();
          }
      ]);
      return true;
    }

    switch (params.action) {
      case 'service.subscribeTo':
        modtask.subscribeTo({
          serviceName: chainItem[i++],
          module: $chain.chainAttachedModule
        });
        next();
        return true;
        break;
    }

    return false;
  }

  modtask.compose = queryObject => {
    let composeConfig = typeof(queryObject) == 'object' ? queryObject : null;
    modtask.doChain([
      composeConfig ? ['nop'] : ['//inline/json?loadById', { id: queryObject }],
      chain => {
        const storeLib = modtask.ldmod('lib/globals');
        storeLib.setupGlobals();
        storeLib.set('serviceCompose', composeConfig || chain.get('outcome').data);
        chain(['outcome', { success: true }]);
      }
    ]);
  };

  modtask.run = (queryObject, cb) => {
    let { serviceName, method, methodQueryObject } = queryObject;
    
    let outcome = modtask.getServiceObject(serviceName);
    if (!outcome.success) return cb(outcome);
    const { monitoringConfig, service } = outcome.data;

    modtask.doChain([
      ['nop'],
      chain => chain(['newChain', {
        context: {
          detectModuleReuseAcrossChains: 'error',
          methodCallContextObjectsProvidedByChain: { service, monitoringConfig },
          monitoringConfig
        },
        chainItems: [
          chain => chain(['chain.importProcessor', 'lib/monitoring', {
            monitoringConfig,
            fillinValues: {
              module: modtask.__myname,
              method
            }
          }]),
          chain => chain([service.invokeString + '?' + method, methodQueryObject])
        ]
      }]),
      chain => {
        chain(['outcome', chain.get('outcome')]);
      }
    ]);
  }

  modtask.start = queryObject => {
    modtask.doChain([
      ['//inline/service?compose', queryObject.serviceComposeId],
      [`//service/${queryObject.service}?onConfig`]
    ]);
  }

  modtask.getServiceObject = function(serviceName) {
    if (!serviceName) return { reason: 'must specify service name in queryObject' };
    const storeLib = modtask.ldmod('lib/globals');
    storeLib.setupGlobals();
    const serviceCompose = storeLib.get('serviceCompose');
    if (!serviceCompose) return { reason: 'please do service compose.' };
    if (!serviceCompose.__services) serviceCompose.__services = {};
    if (!serviceCompose.__services[serviceName]) serviceCompose.__services[serviceName] = { name: serviceName };
    
    const service = serviceCompose.__services[serviceName];

    const user = serviceCompose.user;

    const serviceConfig = serviceCompose[service.name];
    if (!serviceConfig) return { reason: 'service is not defined in compose. please define: ' + service.name };
    if (!serviceConfig.pkgModuleString) return { reason: 'please define pkgModuleString for config: ' + service.name };

    const invokeString = '//inline/' + serviceConfig.pkgModuleString;
    service.invokeString = invokeString;
    service.user = user;
    service.composeConfig = serviceConfig;

    return { success: true, data: { service, monitoringConfig: serviceCompose.verbose }};
  }

  modtask.getSubscriptionMapForService = function(serviceName) {
    if (typeof(serviceName) != 'string') return { reason: 'pass in a serviceName string' };
    const storeLib = modtask.ldmod('lib/globals');
    storeLib.setupGlobals();
    const serviceCompose = storeLib.get('serviceCompose');
    if (!serviceCompose) return { reason: 'please do service compose.' };
    if (!serviceCompose.__subscriptions) serviceCompose.__subscriptions = {};
    if (!serviceCompose.__subscriptions[serviceName]) serviceCompose.__subscriptions[serviceName] = {};
    return { success: true, data: serviceCompose.__subscriptions[serviceName] };
  }

  modtask.subscribeTo = function(queryObject) {
    const { serviceName, module } = queryObject;
    let outcome = modtask.getSubscriptionMapForService(serviceName);
    if (!outcome.success) return outcome;
    outcome.data[module.itemid] = module;
    return { success: true };
  }

  // We cannot use monitoring here. This may be called outside of a service context
  modtask.notifySubscribers = function(queryObject, cb, context) {
    let { notification, serviceName, source } = queryObject;
    const { service } = context;
    if (!serviceName && service) {
      serviceName = service.name;
    };

    if (!source) return cb({ reason: 'please specify source' });

    let outcome = modtask.getSubscriptionMapForService(serviceName);
    if (!outcome.success) return outcome;
    const subs = outcome.data;

    for(let p in subs) {
      const module = subs[p];
      outcome = { success: true };
      if (module && typeof(module.onservice) == 'function') {
        try {
          module.onservice({ source, serviceName, notification });
        } catch(e) {
          outcome.reason = 'onservice failed on ' + module.__myname + ': ' + e;
        }
      }
    }
    return cb(outcome);
  }

  return modtask;
};

module.exports.forcemodulereload = true;
