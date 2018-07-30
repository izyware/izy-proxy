

function test1() {
  var numTimesCalled = 0;
  require('../index').newChain([
    ['log', 'test.chain.item.calling.cb.more.than.once'],
    // Make sure you have configs/izy-proxy/context locally
    ['chain.importProcessor', '../../test/badchainprocessor'],
    ['test.chain.item.calling.cb.more.than.once'],

    ['return']
  ],
  // Optional callback function when the chain is 'returned' or errored. If no errors, outcome.success = true otherwise reason.
  // Notice that this will NOT give any clues on chain variables such as $chain.outcome
  function (outcome) {
    numTimesCalled++;
    if (numTimesCalled > 1) {
      return console.log('ERRROR: numTimesCalled > 1');
    }
    console.log('Successful');
  });
}

function test2() {
  var numTimesCalled = 0;
  require('../index').newChain([
      ['log', 'test.chainitem.missing.return.true.for.handler'],
      // Make sure you have configs/izy-proxy/context locally
      ['chain.importProcessor', '../../test/badchainprocessor'],
      ['test.chainitem.missing.return.true.for.handler'],

      ['return']
    ],
    // Optional callback function when the chain is 'returned' or errored. If no errors, outcome.success = true otherwise reason.
    // Notice that this will NOT give any clues on chain variables such as $chain.outcome
    function (outcome) {
      numTimesCalled++;
      if (numTimesCalled > 1) {
        return console.log('ERRROR: numTimesCalled > 1');
      }
      if (outcome.success) return console.log('** fail: did not expect success');
      if (outcome.reason.indexOf('Could not find a processor for') != 0) return console.log('** fail: unexpected reason: ', outcome.reason);
      console.log('Successful');
    });
}

test1();
test2();
