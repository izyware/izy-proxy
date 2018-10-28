var modtask = function(config, finalCb) {
	if (!finalCb) finalCb = function() {};


	var isThereAMatch = function(cumulativeStr, condition) {
		if (condition == cumulativeStr || cumulativeStr.indexOf(condition) >= 0) return true;
		if (typeof(condition) == 'object' && condition.test) {
			return condition.test(cumulativeStr);
		}
		return false;
	}

	var verbose = config.verbose;
	var cbs = {};
	var onCalls  = 0;
	var obj = {
		on: function(item, cb) {
			onCalls++;
			cbs[item] = cb;
			if (onCalls == 4) {
				if (verbose) console.log('*** TEST CLIENT SETUP, INITIAL SETUP ***');
				processNextInteraction(null);
			}
		},
		write: function(buf) {
			var str = buf.toString('ascii');
			if (verbose) console.log('*** TEST CLIENT RECIEVED ***', JSON.stringify(str));
			transferData(str);
		},
		close: function() {
			if (verbose) console.log('*** TEST CLIENT CLOSE ***');
		},
		destroy: function() {
			if (verbose) console.log('*** TEST CLIENT DESTROY ***');
		}
	};

	var alreadyFinalized = false;
	var responseCounter = -1;
	var cumulativeStr = '';
	function processNextInteraction(dataStr) {
		if (dataStr) cumulativeStr += dataStr;
		if (alreadyFinalized) {
			if (verbose) console.log('*** TEST CLIENT GETTING DATA AFTER FINALIZATION ***');
			return finalCb({ response: 'More data transfer after finalized' });
		}
		var found = false;
		if (cumulativeStr.length > 0) {
			var i;
			var currentRespose = null;
			// Only check the current one
			for (i = responseCounter; i < responseCounter+1; ++i) {
				currentRespose = config.responses[i];
				if (isThereAMatch(cumulativeStr, currentRespose[1])) {
					found = true;
					responseCounter = i + 1;
					break;
				}
			}
		} else {
			// Just move by 1
			found = true;
			responseCounter++;
		}

		if (found) {
			cumulativeStr = '';
			if (responseCounter >= config.responses.length) {
				if (verbose) console.log('*** TEST CLIENT AT THE END ***');
				return finalize({ success: true });
			}
			currentRespose = config.responses[responseCounter];
			if (currentRespose[0] && currentRespose[0].length) {
				if (verbose) console.log('*** TEST CLIENT SAYS ***', JSON.stringify(currentRespose[0].toString()));
				cbs.data(currentRespose[0]);
			} else {
				if (verbose) console.log('*** Nothing to write ***');
			}
		} else {
			if (verbose) console.log('*** Waiting for proper response ***', JSON.stringify(currentRespose[1]));
		}

		function finalize(outcome) {
			if (verbose) console.log('finalize: ' + (outcome.success ? 'success' : outcome.reason));
			alreadyFinalized = true;
			return finalCb(outcome);
		}
	}

	function transferData(dataStr) {
		processNextInteraction(dataStr);
	}
	return obj;
}
