
function testV2() {
  require('./index').newChain([
    ['log', 'testing newChainContext'],
    ['set', 'newChainContext', {}],
    ['newChain', {
      // This will help with debugging when the chain fails (i.e. could not find a processor, etc.)
      chainName: 'newChain1',
      chainItems: [
        ['log', 'new chain logging items'],
        ['set', 'outcome', { success: true }],
        ['return']
      ]
    }],
    ['returnOnFail'],

    // Make sure you have configs/izy-proxy/context locally
    ['chain.importProcessor', 'configs/izy-proxy/context'],
    ['returnOnFail'],

    ['log', 'test runpkg'],
    ['//izyware/ui/w/shell/credsrecovey:api/forgotpassword', {
      email: 'this_email_address_should_not_exists@izyware.com'
    }],
    ($chain) => {
      if ('email not found' == $chain.get('outcome').reason) return $chain([['log', 'runpkg on izycloud worked!']]);
      $chain(['return']);
    },

    ['log', 'test getter/setter'],
    ['set', 'testKey', 'testValue'],
    ($chain) => {
      if ($chain.get('testKey') != 'testValue') {
        $chain.set('outcome', { reason: 'set/getValue failed' });
        $chain(['return']);
      } else {
        $chain(['continue']);
      }
    },

    // use set, get for manipulating key/value pairs on the context object
    ['set', 'outcome', {success: true}],

    // context would be accessible here
    ($chain) => $chain($chain.get('outcome').success ? ['continue'] : ['return']),

    ['log', 'if you see this message it means that the logging is working'],

    ['frame_getnode'],
    $chain => $chain($chain.get('node') ? ['set', 'outcome', { success: true }] : ['set', 'outcome', { reason: 'frame_getnode did not get the node obj' }]),
    ['returnOnFail'],

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

testV2();