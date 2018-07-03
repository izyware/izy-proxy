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
    chain(['exit']);
  },

  // use set, get for manipulating key/value pairs on the context object
  ['set', 'outcome', { success : true }],

  // context would be accessible here
  (chain) => chain(chain.outcome.success? ['continue'] : ['return']),

  ['log', 'if you see this message it means that the logging is working'],
  ['return'],
  ['log', 'you should not see his message']
], function(outcome) { // optional
  console.log('finalOutcome', outcome);
});