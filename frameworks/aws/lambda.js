const exec = require('child_process').exec;
exports.handler = (event, context, callback) => {
    var wrapperPrefix = 'izy-lambda-handler';
    const izyhostdir = (__dirname + '/../../../..').replace('//', '/');
    var cliString = process.env.AWS_LAMBDA_CLI_STRING + '';
    cliString = cliString.replace(/\/izyhostdir/g, izyhostdir);
    const cmd = `node ${izyhostdir}/node_modules/izy-proxy/cli.js callpretty ${cliString}`;
    var myenvironment = {
        cmd: cmd,
        timezoneOffset: new Date().getTimezoneOffset()
    };
    console.log(wrapperPrefix, JSON.stringify(myenvironment));
    const child = exec(cmd, {
        cwd: izyhostdir
    }, error => {
        var outcome = { success: true, data: null };
        if (error) outcome = { reason: error.toString(), error:  error };
        console.log(wrapperPrefix, outcome);
        callback(error, JSON.stringify(outcome));
    });
    child.stdout.on('data', data => console.log(data));
    child.stderr.on('data', data => console.log(data, wrapperPrefix));
};
