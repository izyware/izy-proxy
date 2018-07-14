
function testV2() {
  require('./index').newChain([
    ['log', 'testing newChainContext'],
    ['set', 'newChainContext', {}],
    ['newChain', {
      // This will help with debugging when the chain fails (i.e. could not find a processor, etc.)
      name: 'izy-proxy-test.newChain1',
      chain: [
        ['log', 'new chain logging items'],
        ['set', 'outcome', { success: true }],
        ['return']
      ],
      // If this is not an object, it will be keyed off the parent context
      context: 'newChainContext',
      options: {}
    }],
    ['returnOnFail'],

    // Make sure you have configs/izy-proxy/context locally
    ['chain.importProcessor', 'configs/izy-proxy/context'],
    ['returnOnFail'],

    ['log', 'test runpkg'],
    ['//izyware/ui/w/shell/credsrecovey:api/forgotpassword', {
      email: 'this_email_address_should_not_exists@izyware.com'
    }],
    (chain) => {
      if ('email not found' == chain.outcome.reason) return chain([['log', 'runpkg on izycloud worked!']]);
      chain(['return']);
    },

    // use set, get for manipulating key/value pairs on the context object
    ['set', 'outcome', {success: true}],

    // context would be accessible here
    (chain) => chain(chain.outcome.success ? ['continue'] : ['return']),

    ['log', 'if you see this message it means that the logging is working'],
    ['return'],
    ['log', 'you should not see his message']
  ], function (outcome) { // optional
    console.log('\r\n************************************ Chain Done *********************************************');
    if (outcome.success) return console.log('* All items ran successfully');
    console.log('* reason=     ', outcome.reason);
    console.log('* chain.name= ', outcome.chain.name);
    console.log('* chain.chainItemBeingProcessed= ', outcome.chain.chainItemBeingProcessed);
    console.log('*********************************************************************************');
  });
}

function testV1() {
  require('./index').doChain([
    // Make sure you have configs/izy-proxy/context locally
    ['chain.importProcessor', 'configs/izy-proxy/context'],
    ['returnOnFail'],

    // test runpkg
    ['//izyware/ui/w/shell/credsrecovey:api/forgotpassword', {
      email: 'this_email_address_should_not_exists@izyware.com'
    }],

    (chain) => {
      if ('email not found' == chain.outcome.reason) return chain([['log', 'runpkg on izycloud worked!']]);
      chain(['return']);
    },

    // use set, get for manipulating key/value pairs on the context object
    ['set', 'outcome', {success: true}],

    // context would be accessible here
    (chain) => chain(chain.outcome.success ? ['continue'] : ['return']),

    ['log', 'if you see this message it means that the logging is working'],
    ['return'],
    ['log', 'you should not see his message']
  ], console.log);
}

testV2();