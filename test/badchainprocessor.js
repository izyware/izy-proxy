
var modtask = function(chainItem, cb, $chain) {
  var i = 0;
  switch(chainItem[i++]) {
    case 'test.chain.item.calling.cb.more.than.once':
      cb({ success: true });
      cb({ success: true });
      return true;
    // Even though the system will complain that it did not find the the verb, it would still run the console.log statement above.
    // Therefore, we should notify the chain that the processor is rogue
    case 'test.chainitem.missing.return.true.for.handler':
      setTimeout(function() {
        cb({ success: true });
      }, 100);
      // this is the missing block.
      // return true;
  };
  return false;
};

