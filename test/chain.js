
function testV2() {
  require('../index').newChain([
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

    ['newChain', {
      // This will help with debugging when the chain fails (i.e. could not find a processor, etc.)
      chainName: 'Chain For Testing Replay',
      chainItems: [
        ['log', 'testing replay'],
        function(chain) {
          var counter = chain.get('counter') || 0;
          if (counter < 2) {
            counter++;
            chain.set('counter', counter);
            return chain(['log', 'counter is '  + counter]);
          } else {
            chain([
              ['set', 'outcome', { success: true }],
              ['return']
            ]);
          }
        },
        ['replay']
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
    $chain => $chain($chain.get('outcome').success ? ['set', 'outcome', { success: true }] : ['set', 'outcome', { reason: 'frame_getnode did not get the node obj' }]),
    ['returnOnFail'],

    ['log', 'test delay'],
    ['delay', 500],
    ['log', 'after delay'],

    ['return'],
    ['log', 'you should not see his message']
  ],
    // Optional callback function when the chain is 'returned' or errored. If no errors, outcome.success = true otherwise reason.
    // Notice that this will NOT give any clues on chain variables such as $chain.outcome
  function (outcome) {
    if (outcome.success) return console.log('* All items ran successfully');
    console.log('\r\n************************************ ERRROR *********************************************');
    console.log('* reason=     ', outcome.reason);
    console.log('* chain.name= ', outcome.chain.name);
    console.log('* chain.chainItemBeingProcessed= ', outcome.chain.chainItemBeingProcessed);
    console.log('*********************************************************************************');
  });
}

testV2();