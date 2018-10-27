var modtask = function(config, finalCb) {
	if (!finalCb) finalCb = function() {};

	var verbose = false;
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
	function processNextInteraction(dataStr) {
		if (alreadyFinalized) {
			return finalCb({ response: 'More data transfer after finalized' });
		}
		var found = false;
		if (dataStr) {
			var i;
			var currentRespose = null;
			for (i = responseCounter; i < config.responses.length; ++i) {
				currentRespose = config.responses[i];
				if (currentRespose[1] == dataStr || dataStr.indexOf(currentRespose[1]) >= 0) {
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
			return finalize({ reason: 'Invalid response' });
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
