// node cli.js
// node cli.js method
// node cli.js method taskrunner
// node cli.js method taskrunner taskrunner.verbose
// [CRASH] node cli.js method taskrunner taskrunner.verbose true

if (process.argv.length == 6) {
  process.argv.push('___crashworkaround___padding___params___');
}

require('izymodtask').runCmd('cli.method');
