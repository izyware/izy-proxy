var modtask = function(chainItem, next, $chain) {
  var i = 0;
  var params = {};
  params.action = chainItem[i++];
  switch (params.action) {
    case 'assert.value':
      params.test = chainItem[i++] || {};
      var testCondition = params.test;
      var previousOutcome = $chain.get('outcome');
      var objectToCheckAgainst;
      switch(typeof(testCondition)) {
        case 'string':
        case 'number':
          objectToCheckAgainst = { assertionValue: previousOutcome };
          testCondition = { __verbose__: { testeeObj: false }, assertionValue: testCondition };
          break;
        default:
          objectToCheckAgainst = Object.assign({}, previousOutcome);
          break;
      }

      var verbose = testCondition.__verbose__ || { };
      if (verbose.testeeObj) console.log('testeeObj: ', objectToCheckAgainst);

      var newOutcome = testObjectValues(testCondition, objectToCheckAgainst);
      $chain.set('outcome', newOutcome);
      if (!newOutcome.success) {
          return $chain.chainReturnCB(newOutcome);
      };
      next();
      return true;
  }
  return false;
}

var testObjectValues = function(testCondition, objectToCheckAgainst) {
  var contextMsg = ' ';
  if (testCondition.__contextName__) {
    contextMsg = '[' + testCondition.__contextName__;
    if (!objectToCheckAgainst.success && objectToCheckAgainst.reason)  {
      contextMsg += ', reason: ' + objectToCheckAgainst.reason;
    }
    contextMsg += '] ';
  }

  var verbose = testCondition.__verbose__ || { };

  var operatorFunctions = {
    'same length': function(props, description) {
      if (typeof(props[0]) != 'string') {
        return({ reason: contextMsg + 'Expected ' + description + ' to be string ' + ' but got ' + typeof(props[0]) });
      }

      var desiredLength = String(props[1]).length;
      if (props[0].length != desiredLength) {
        return({ reason: contextMsg + 'Expected ' + description + ' to be have the length ' + desiredLength + ' but got ' + props[0].length });
      }
      return { success: true };
    },
    'greater than': function(props, description) {
      if (props[0] > props[1]) {
        return({ reason: contextMsg + 'Expected ' + description + ' to be greater than ' + props[0] + ' but got ' + props[1] });
      }
      return { success: true };
    },
    equal: function(props, description) {
      if (props[0] != props[1]) {
        return({ reason: contextMsg + 'Expected ' + description + ' to equal ' + props[0] + ' but got ' + props[1] });
      }
      return { success: true };
    },
    contain: function(props, description, inverse) {
      if (!props[1]) {
        return({ reason: contextMsg + 'Expected ' + description + ' to contain ' + props[0] + ' but the property was missing.' });
      }
      var condition = (props[1] + '').indexOf(props[0]) == -1;
      if (inverse) condition = !condition;
      var addNot = inverse ? 'not ' : '';
      if (condition) {
        return({ reason: contextMsg + 'Expected ' + description + ' to ' + addNot + 'contain \'' + props[0] + '\'.' });
      }
      return { success: true };
    },
    notcontain: function(props, description) {
      return operatorFunctions.contain(props, description, true);
    }
  }

  var dfs = function(testerObj, testeeObj, namespace, operator) {
    if (typeof(testerObj) != typeof(testeeObj)) {
      return { success: false, reason: contextMsg +  'Expected ' + typeof(testerObj)  + ' but got ' + typeof(testeeObj) + ' at ' + namespace };
    }

    // Array and Object
    if (typeof(testerObj) == 'object') {
      if (testerObj == null) {
        if (typeof(testeeObj) == 'object' && testeeObj == null) return { success : true };
        return { reason: contextMsg + 'Expected null for ' + namespace + ' but got ' + testeeObj };
      };

      var p;
      if (!operator && testerObj.__operators__) operator = testerObj.__operators__;
      if (!operator) operator = {};
      var isEmpty = true;
      for(p in testerObj) {
        if (p == '__operators__' || p == '__contextName__' || p == '__verbose__') continue;
        isEmpty = false;
        var outcome = dfs(
          testerObj[p],
          testeeObj[p],
          namespace.length ? namespace + '.' + p : p,
          operator[p]
        );
        if (!outcome.success) return outcome;
      }

      if (isEmpty) {
        if (Object.keys(testeeObj).length != 0) {
          return { reason: contextMsg + 'Expected an empty array/object for ' + namespace + ' but it was non-empty.'};
        }
      }
      return { success: true };
    };

    if (!operator) operator = 'equal';

    if (verbose.testCondition) {
      console.log('------------- checking testCondition ------------');
      console.log('key: "' + namespace + '"');
      console.log('testerObj', testerObj);
      console.log('testeeObj', testeeObj);
      console.log('operator', operator);
      console.log('--------------------------------------');
    }

    if (!operatorFunctions[operator]) {
      return { reason: contextMsg + 'Unknown operator "' + operator + '"' };
    }
    return operatorFunctions[operator]([testerObj, testeeObj], namespace);
  };
  return dfs(testCondition, objectToCheckAgainst, '', testCondition.__operators__);
}
