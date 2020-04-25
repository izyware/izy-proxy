For more details, see: [izy-proxy-help-article]

# Deployment Setup

## Requirements

You need npm > 3.10.6. The npm install behavior is different in earlier versions. The tool requires that all the node dependencies be installed in flat node_modules subdirectory.
If you happen to use an older version of npm, the work around is shown below:


## Build
To build an artifact for cloud deployment (i.e. docker container), in any clean subdirectory use:

```

mkdir ~/srv/<type>/_version_ (or any location you would like have izyware tools deployed to)
cd ~/srv/<type>/_version_
npm init -f; npm install --save izy-proxy; mkdir -p node_modules/configs/izy-proxy;
```

If you are using npm < 3.10.6, you must also do:

```
cp -r node_modules/izy-proxy/node_modules/* node_modules/;
```


## Update
To update, just rebuild a new side by side version. This will allow you to roll back to an older version in case there is a failure.

### IZY TIP
When upgrading or deploying a node (ec2-node or a docker container), you should deep clone the directory as a backup and switch back/forth with pm2 until things work:

```
mkdir ~/izyware_backup; cp -r ~/izyware/* ~/izyware_backup/
pm2 stop 1
pm2 start 2
.... update ~/izyware/ ...
```

Notice that you should put your containers behind a load balancer (i.e. AWS elb) to avoid ending up with broken connections.


# Service Modes

## Picking the correct configuration
The samples directory contains sample configuration files that you can use for tcpserver, taskrunner, ... modes:

```
cp node_modules/izy-proxy/samples/taskrunner_production_config.js node_modules/configs/izy-proxy/taskrunner.js
cp node_modules/izy-proxy/samples/tcpserver_production_config.js node_modules/configs/izy-proxy/tcpserver.js
```

Note that some configurations may require additional local packages. For example pkgloader/dbnode, depends on components/pkgman/dbnode being locally present. Make sure to include the relevant components locally and add a search path reference under modtask/config/kernel/extstores/file.js to the appropriate location.

## Checking The Package Import Configuration For your Service Dependencies
Package import configuration issues may not come up at service start up but may be caused if your service is referencing a package that is not locally available.

To ensure that the package import configuration is setup correctly for service and the credentials are valid, try importing a the service handler package from the cli, using your config file:

```
node cli.js method chain chain.action "//inline/myservice:handler" chain.queryObject.success true chain.relConfigFile ../configs/izy-proxy/taskrunner

node cli.js method chain chain.action "//inline/myservice:handler" chain.queryObject.success true chain.relConfigFile ../configs/izy-proxy/tcpserver
```


## TCP Server Mode
```
cd node_modules/izy-proxy
node tcpserver/app.js (or if you are using pm2, do pm2 start tcpserver/app.js)
```


Make sure the the *cwd* for the server process is set to the location for the izy-proxy installation. This is important because the *cwd* is used in locating plugin, thirdparty modules and the configuration.


For testing your deployment, you can overwrite the default config options by launching the component in the interactive mode

```
node cli.js method tcpserver __chainProcessorConfig.runpkg.verbose true meta.action checkconfig
node cli.js method tcpserver __chainProcessorConfig.runpkg.verbose true
```

After the server is running, the following should work:

```
curl -v localhost:20080/izyproxystatus

<html><head><title>izy-proxy</title></head><body>

<h1>OK, version=3.0</h1>

<h2>{
	"status": 200,
	"host": "localhost:20080",
	"url": "/izyproxystatus",
	"subsystem": "server"
}</h2></body></html>
```


### Handling CORS

The serverObjs variable allows the plug-in modules to handle CORS. Note that to handle CORS a plug-in must:
* Handle the OPTIONS request from the browser. A sample response is provided in the OPTIONS
* Provide the Access-Control-Allow-XXX headers in each request

You should customize the Access-Control-Allow-XXX headers for your own business needs.


## TaskRunner Mode
You may also run the tool in the task runner configuration.


Make sure to edit ../configs/izy-proxy/taskrunner.js. At a minimum the following values need to be set:

* pkgloadermodconfig.auth
* izyware_runtime_id

```
cd node_modules/izy-proxy
node taskrunner/app.js  (or if you are using pm2, do pm2 start node taskrunner/app.js)
```

For testing your deployment, you can overwrite the default config options by launching the taskrunner in the interactive mode

```
node cli.js method taskrunner taskrunnerProcessor.verbose true taskrunnerProcessor.readonly true taskrunnerProcessor.loopMode false meta.action checkconfig

node cli.js method taskrunner taskrunnerProcessor.verbose true taskrunnerProcessor.readonly true taskrunnerProcessor.loopMode false
```

See the configuration reference for taskrunner for the list of command line options.

### Periodically Running Dynamic Code
The task runner will run the following chain command:

    [taskParameters]

where taskParameters is defined in the Izy Cloud Dashboard. This will allow for flexibility in terms of what/where to run the tasks:


To run mypackage:mymodule as JSONIO API Interface (what), inline (transport), inside the context of the izy-proxy process (where), simply set the taskParameters to:

    ///mypackage:mymodule

To run mypackage:mymodule as JSONIO API Interface (what), over HTTPS (transport), inside the context server.com (where), simply set the taskParameters to:

    //myserver.com/mypackage:mymodule?method

To run mypackage:mymodule as a chain (what), inline (transport), inside the context of the izy-proxy process (where), simply set the taskParameters to:

    //inline/mypackage:mymodule?method


# Testing and QA
Since the izy-proxy contains a heterogeneous set of component, full testing will entail running each test piece seperately.

```
### Test the chaining engine functionality
### SHOULD ALWAYS WORK
node test/chain/all.js
node cli.js method chain chain.action "//inline/izy-proxy/test/chain:module_setting_the_outcome" chain.queryObject.success true chain.queryObject.testKey testValue chain.relConfigFile ../configs/izy-proxy/taskrunner

### Test chains, runpkg and API plug-in -- require localhost connection (just run node tcpserver/app.js on a seperate terminal)
* node test/all.js

### Test the Socket plug-in
/* running the socket handler module directly without going through the TCP/IP stack */
node cli.js method socket socket.path izy-pop3/proxypkg:directdb socket.testmod izy-pop3/proxypkg/test/android socket.verbose.pipe.s1data true socket.verbose.pipe.s2data true socket.verbose.pipe.teardown true socket.verbose.mock false socket.user user  socket.pass 'password!'

/* Test remote servers over TCP/SSL */
node cli.js method socket socket.path pop3.izyware.com socket.port 110 socket.testmod izy-pop3/proxypkg/test/android socket.verbose.pipe.s1data true socket.verbose.pipe.s2data true socket.verbose.pipe.teardown true socket.verbose.mock false socket.user user  socket.pass 'password!'

### Test TaskRunner
From the dashboard, select the "izy-proxy smoke tests" task and run it on your node by

node cli.js method taskrunner taskrunnerProcessor.verbose true taskrunnerProcessor.readonly true taskrunnerProcessor.loopMode false meta.action checkconfig

```

## Test Automation

### Data Library
Enterprise customers can take advantage of thousands of data samples for testing. Data samples include real world data for:

* Mobile devices interacting with standard protocol stacks
* User browsing history analytics data
* ...

### The mock library
You can use the mock library for simulating raw sockets, protocols (HTTP, etc.), databases, browser extension environments, etc.

You can use the mock libraries in conjuction with the data library to improve your test coverage.

### The assertion library
You can use the assertion library to to quickly write integrate tests for your service endpoints:


    ['chain.importProcessor', 'components/net/http:chain'],
    ['chain.importProcessor', 'izy-proxy/test/assert:chain'],
    ['net.httprequest', { url: 'https://myservice/endpoint' }],
    ['assert.value', {
       /* optional */
       __contextName__: 'Provide the explanation and contet when an assertion failure is reported',
       /* Optional */
      __operators__: {
        success: 'equal',
        status: 'equal'
        // reason: 'contain'
      },
      success: true,
      status: 200
    }],

the system will deserialize the api.queryObject.* into a JSON queryObject that gets passed into the JSONIO api handlers.


### Continious Testing Via Tasks
It is recommended the you test the live deployment for configuration and infrastructure issues using the task engine and the following module:

    //inline/izy-proxy/test:cloudwatch/base



## Using the CLI (Commandline Interface) for launching and testing components
While enterprise gold customers have access to Izyware Studio, the standard users can still use the command line for launching and debugging components that may be launched in the taskrunner context or in the TCP server context.

```
node cli.js method api api.path <path/to/api/module> api.queryObject.key1 value1 ...
node cli.js call [//cloud/]<invokeString> queryObject.key1 value1 ...
node cli.js method socket ...
node cli.js method taskrunner ...
node cli.js method chain ...
```

Of all the methods, the chain is the most powerful, because it will allow you to any chain command (remote, local, etc.) while composing an arbitrary JSON queryObject

```
node cli.js method chain chain.action "//inline/izy-proxy/test/chain:module_setting_the_outcome" chain.queryObject.success true chain.queryObject.testKey testValue

will show

{ success: 'true', testKey: 'testValue' }

```

of course you could use it for remote connections, i.e.

```
node cli.js method chain chain.action "//service/accountmanager:api/forgotpassword?send" \
 chain.queryObject.email xxx@yourizywaredomain.com
```

# Plugins
The tool has an extensive and powerful plugin system that allows you to very easily break your application up into isolated pieces of business logic, and reusable pieces.

## Creating a plugin

Create a plugin by cloning the `default` subfolder under the `plugin` directory. You must also register the plugin in the config file.

To automatically test the plug-ins below, send a GET request and expect 200 status code.

The plug-ins may use the sessionObjects to share states and parsed information across the canHandle and handle stages. This will allow for writing high performance plug-ins.


## apigateway

To test this plug-in, try:

```
/apigateway/apigatewaytest%3Aviewer/top
```

## default

 ```
 /favicon.ico
 ```

## Logging

There is an *optional* plug-in called logging. If you would like to remotely view the internal server logs (or view the entries from your your dashboard), you must enable it in the config:

```
{
	name: 'logging',
	reloadPerRequest: false,
	ipwhitelist: ['1.2.3.4']
}
```

Due to security requirements, you must whitelist the IP address in order to access the logging feature.

## Creating TCP/UDP services using the socket plug-in
You can use the socket plug-in for creating non HTTPs application layer services (SMTP, POP, SOCKS, etc.) that can be deployed from the IzyCloud environment. To configure a node add the following to the plug-ins config:


```
module.exports = {
	plugins: [
	{
		name: 'socket',
		customRequestHandler: true,
		items: [
			{ port: 20110, handlerPath: ':test/socket' }
		]
		__chainProcessorConfig: __chainProcessorConfig
	}]
}
```


See the testing instructions above (under `Testing`) for howto test the service handler directly from the command line. The following verbose flags (and the default values) are available


```
    socketwhile: false,
    writes: false,
    ondata: false,
    connect: false,
    terminate: true,
    error: true,
    close: false,
    end: false,
    datacopy: false,
    detectStandardOK: false,
    authenticate: false
    mock: false
```

## Handling Domain Based Requests
Use the http plug-in to handle the domain based requests. The http plug-in will use cloudservices data base to configure the raw http handlers.


# Platform Features

## Uniform Local And Cloud Module Access

If you wish to access izy modules from the file system, you may customize the module path resolution rulesets defined in:

```
izy-proxy/modtask/config/kernel/extstores/file.js
```

Please refer to the comments in the file to understand how to reference external modules.


## Chain Processing
Your application functionality may be consumed via the universal scripting environment.

It is recommended that you expose the functionality via an importable chain module. As of version 2.0 the chaining library will support importing and registering new chain handlers.

Chain processing is optional and should be used when heterogeneous development across multiple platforms is needed.

To support chain processing in the izy-proxy container execution context, simply drop the __chainProcessorConfig in the config file.

The chain handler should be configued based on the following criteria:
* Security Context
* Network Configuration
* Performance Considerations

Note that when setting up a new chain special attention must be paid to chainAttachedModule and context object. context object gets accessed when doing $chain.get, $chain.set. In some settings (for example FE components) it may make sense to set both the context and chainAttachedModule to the same object (i.e. modui) while in some other contexts it does not make sense to do so.

## Package Runner (runpkg) and using invokeString over the JSONIO APIs
You can leverage this feature to create and consume service components that send/recieve JSON objects across service level boundaries. The advantages are:

* No need to manage the HTTP metadata and headers
* JSONIO api security context can be 'transported' and simulated by the IDE, thus making implementation very very easy.
* The end-points can be directly consumed from chains anywhere in the cloud.

By default, `doChain` is enabled inside the module.

Notice that when settings up the runpkg chain processor, one of the configuration parameters is sessionMod which will be used to carry the authorization info when packages are run:

    * When calls use the inline signature, the { ownerId, ownerType } is 'trusted' and used from the sessionMod
    * When calls are over http (even local environment), the authorizationToken will be used from the sessionMod and used as the bearer token for the HTTP authorization method.


The difference between the context object for non JSONIO calls (i.e. plugin/http/handle newChain method) and the context object for JSONIO calls that gets setup inside the chain gets constructed for //inline/ or //cloud/ calls could sometimes get confused. It is worth remembering that non JSONIO calls (i.e. http handler) do not have built in authentication schemas and the implemtation is up to the user.

We will review the legacy and current implementations and call signatures below

### Version 5

The following schema is supported

    ///pkg:module?method&forcepackagereload=1&methodnotfoundstatus=statuscode

* forcepackagereload: will force a cloud import for the pkg:module, overriding file system or any other cached copies. This will have a performance hit but will ensure freshest and latests code.
* methodnotfoundstatus: normally if module does not implement module (see rules for V3 below) the outcome will not be success. with this feature, the outcome will be successful and status meta key will be set to statuscode.

### Version 3
starting with V3, new signature added to specify method in the invokeString

    //service/pkg:path?method

to maintaine backward compatibility with V2, the following procedure is followed:

* if method is defined, it will try to find it on modtask. and modtask.actions and if found, will launch with the following signature

        function(queryObject, cb, context)

* if method is not defined, it will probe for modtask.processQuery and if that is found it will launch. Otherwise, it will try to run the entire module as a chain, with the following context object preset:

        context: {
          queryObject: queryObject,
          context: context
        }

    the values can easily be access via $chain.get('queryObject'), ...


### V1 and V2
A typical implementatin would look like:

```
var modtask = function() {}
modtask.__apiInterfaceType = 'jsonio';
modtask.processQueries = function(queryObject, cb, context) {
    modtask.doChain([
        ['nop'],
        ['frame_getnode', modtask],
        ['frame_importpkgs', ['sql/jsonnode']],
        ['frame_importpkgs', ['ui/node']],
        ['frame_importpkgs', ['encodedecode']],
        function(_push) {
        	...
        }
```

This can be consumed from anywhere in the cloud via chaining, i.e:

```
	['//cloud_cluster_addr/path/to/packge:module/handler', payload, modtask],
	function(_push) {
		console.log(modtask.outcome);
	}
```



# Case Study: Bridging and consuming resources across different networks
Bridging and consuming resources across different networks can be difficult.  A common scenario is to integrate DBMS, files, etc. that are only accessable to the intranet or just the local computing resources (for example localhost) inside thirdparty web apps or SASS services. Izyware Proxy Component (izy-proxy) simplifies this process by exposing the heterogeneous resources via standard api gateway.

## Benefits Of Using the API Gateway
The major benefit is that by exposing the functionality as an api access point, it can then be pulled in any thirdparty app while controlling permissions and session management tasks automatically via the Izyware Framework.

## Recommended Configuration
The following solution is recommended:
* A running instance of izy-proxy INSIDE the intranet with access to the resources.
* A DNS entry that would resolve to the INTRANET IP ADDRESS of izy-proxy resource. e.g.

    	localhost.izyware.com		  127.0.0.1
    	intranetservice1.izyware.com  10.0.0.231
    	....

* SSL certificates corresponding to the DNS resources above: In most cases is not needed for the public facing izy-server instances where the HTTPS connections are handled by a load balancer. But in this scenarios, the izy-proxy instance should handle the HTTPS connection directly (see server.js):

     	../configs/izy-proxy/certificates/privatekey.pem

# Packaging
It is recommended that the functionality be organized and packaged as an izyware app. This approach will have the following benefits:

* A boilerplate app can be created (by cloning an existing one) which would immediately provide dashboard, toolbar, etc. features that can be accessed in the UI
* The app can be immediately used and integrated inside existing business workflows either via the api access points or via the frames/slides UI automation framework.

To make cloning and reusability easier, it is further recommended that the bridge functionality be implemented as a subpackage using the following scheme:


    app_name/bridge/api

For example, the sample app included with izy-proxy uses:

    apps/sample/bridge/api.js

This would result in the route:

    https://dnsentry.com/apigateway/%3Aapps/sample/bridge%3Aapi

# Extending existing node apps

Setup the environment by:

```
npm install izy-proxy
mkdir -p modtask/config/kernel/extstores
cp ./node_modules/izy-proxy/modtask/config/kernel/extstores/file.js modtask/config/kernel/extstores/
```

You should then edit the modtask/config/kernel/extstores/file.js and add the hard coded and relative paths for the location of your repositories.

Finally you can do:

```
var argv = process.argv.slice(0);
require('izy-proxy').newChain({
      chainItems: [
					['log', 'hello world'],
					['outcome', { success: true }]
//          ['sysview'],
//          ['chain.importProcessor', 'apps/tasks/api:taskrunner_chain', {}]
      ],
      __chainProcessorConfig: {}
  },
  function(outcome) {
		console.log('service chain outcome', outcome.success, outcome.reason);
  });
```

NOTE: require('izy-proxy') will manipulate the argv. you should always make a copy before the call as shown above.

As an alternative, you may reference functionality directly into the node environment:


```
require('izy-proxy/server').run({
  verbose: {
    WARNING: true,
    INFO: true,
    ERROR: true
  },

  port: {
    http: 20080
  },


  plugins: [{
      name: 'http',
      domains: [
        { handlerMod: 'mypath/myhandler', domain: 'testdomain.com' }
      ],
      __chainProcessorConfig: {
        import: {
          pkgloadermodname: 'samples/pkgloader/izycloud'
        }
      }
    }
  ]
});
```

## NOTE
for more details, visit [izyware]

# Known Issues

## Feature Requests
* pass the IP address and headers metadata to the { sessionObjs } already present in HTTP handler as well as the RAW APIS
    * does it make sense to consolidate the model for RAW APIs and HTTP handlers?
    * note that in the node environment, req.connection.remoteAddress return 127.0.0.1 if you are behind a proxy
    * for customers using ngin-x proxy, utilize request.headers['X-Forwarded-For'] to pass this down
    * Note: this information will NOT be avilable in JSON/IO apis. The point of JSON/IO apis is transport independence and doing this will introduce the trainsport specific concept into it.

## Chains
* the get_node is essentially a get_sql service. best implementations would be
    * over HTTP to JSON (for all non master nodes)
    * (only master nodes) using sockets (no mysqlutil node package dependency) -- this will allow turning toolbar into master
    * q/sql/jsonnode pacakge should provide a chain processor for chain level consumption


# Changelog

## V5
* for pkgrunner implement methodnotfoundstatus
    * now supporting ///pkg:module?method&forcepackagereload=1&methodnotfoundstatus=statuscode
    * allow probing for existance of methods
* add support for __chainProcessorConfig.__moduleSearchPaths
    * doChain would only be able to locate module dependencies path resolver from root/modtask/... which is not practical
* set outcome to the loaded module on chain.ldmod/ldpath
    * this will allow loading of modules directly from the initial chain without having access to modtask.ldmod
* allow local definition for modToPkgMap in the runpkg.__chainProcessorConfig
    * without this, modtask.ldmod('kernel/path').toInvokeString will fail for locally located modules (i.e. on disk imported vs. cloud imported)
    * the package names are used extensively for access control and customization. therefore we cannot assign arbitrary names to the packages
* leverage izy-loadobject nodejs-require feature and replace relRequire calls.
* add dontUseDefaultRelConfigFile per customer feedback
    * customers have been requesting to get rid of warning message when config not present
* implement runpkg.setSession
    * this will allow chains for each session for properly set current user for the sesssion.
* runpkg: strip out method call params when determining invokeString from rel package name
* izynode: add support for non node environments
* add sessionMan documentation
* add explicit depencies in building the bootstrapers or statically linked components
* pkgloader/izycloud: remove dependency to Kernel http module and use proxy universal http
* allow chain context to be function or object

## V3
* remove nodejs dependency to izy-circus
* http plugin: pass in the full object to the http handler
* add test for delay/replay combo
* explicitly disallow /// launch strings
* add interactive configuration for tcpserver through meta.action in the cli
* pass in { sessionObjs } as context to the http handler
    * not a good idea to mix sessionObjs up with serverObjs because sessionObjs can be used to share info across plug-ins and session handling
    * this scheme is consistent with call signature for jsonio calls
* pass in __chainProcessorConfig.runpkg to http and socket handlers to allow debugging issues
* add parameter checking to importPkgs
* add the ability to encode json objects at the commandline, i.e.

        node cli.js method chain chain.action '//../...' chain.queryObject.provisioningConfig.type json:[\"domain_manager\"] chain.queryObject.provisioningConfig.userids json:[\"@userlastinsertid\"]

* open the universal HTTP library (in runpkg)
    * can be consumed by all subsystems
    * standard signature for handling errors, non 200s, etc.
    * single lib working in all scripting environments
* Explicitly send in the utf-8 character set in the HTTP headers
* Added the new IzyNode type "izy-proxy" that uses hex encoding
    * This will work in environments that use older encodings on some areas of the stack (i.e. the HTTP server or Scripting)
    * removes the dependency to ui/node/* libraries
* When the query has the non latin unicode and encryption is turn on it happens
    * In consistent between front-end and backend.
* fix bug in izyNode config is not correctly transffered to getNode
* add more tests coverage for parity across //network/ and //local/
    * added tests to ensure that parameter types are being serialized and deserlized correctly across context boundaries
* improve error reporting and diagnostics
* make sure pkgloader is configured correctly for socket handler loader
* add chain.relConfigFile option to chain cli
* improve socket.pipe to copy cached data
    * this will allow the developers to write socket chains without worrying about timing bugs, etc.
* fix JSON encoding bug where  outcome.__callstack would call circular referencing error
* retire decodeBase64Content
* allow ldPkgMan to work even when no pkgloadermodname is provided (features/v2/chain/processors/import.js)
    * this will allow the system to function as long as long modules are available locally
    * used to fail before even trying to check if modules were present locally
* add handlerWhenChainReturnCBThrows to newChain
    * needed in settings where making doChain available for pkgruns (example rawhttp APIs, etc.)
* add test/all.js
* add test/runpkg, testing for runpkg across //inline/ and //network/
* add test/api making sure that API system still supports JSONIO agnostic with mod.handle for generic purposes
* fix the customer reported issue where for JSON/IO luanches, //inline/ should be 100% consistent with //network/ for all combinations.
    * Prior to V3 the the API plug-in wont deliver consistency because if modtask.jsonio is not defined -- will think its a raw API and expects mod.handle.
    * This will make it harder for customer to create cloud components that can be deployed reliably to different cloud environment.
    * updated the API system use the same parser for uri that runpkg offers
        * moved the rawhttp, mod.handle interface with chain enabled into its own module within the api plug-in

* clean app the server module.
    * now clients can create server apps with embedded configrations
    * made the certificate paths optional
* add ability to define http domains as inline parameters.
    * this will allo non connected apps to work local
* fix bug with cloud import auth
    * when auth is not defined, the cloud import will not hit the izycloud
* deprecated noReimportIfAlreadyLoaded since the forcepackagereload=1 for pkgrun
* new features chain.deportPkgs and forcepackagereload=1
    * for pkgrunner string you can do ///pkg:module?method&forcepackagereload=1
    * this will force a chain.deportPkgs before importpkgs
    * it will allow flexibility for customizing how the remote tasks can be updated
    * it will work well with importpkgs and caching layer there
        * INLINESTORE, Minicore, Kernel is scoped per rootmode  (thus so will ldonce)
        * the __importCache is scoped per import processor
* socket plugin and processor was upgraded to allow for an easier and more intuitive interface
    * using socketIds to communicate between the processor and clients. this should allow for embedded socket applications
    * added socket.mock ajd socket.pipe features
* updated most chain processors to
    * use the new outcome reporting model (immediate chain exit on failure)
    * ditch doChain in favor of newChainForProcessor
* the following cotext and callback pattern specific utility wrappers around newChain have been introduced
    * newChainForProcessor: while handling an item in a $chain will run a new chain in a new context, and on failure will exit the $chain. when success it will do next (move on to the next item in the $chain). The new running context will be tied to the processor module and the resulting callstack in case of a failure will trace to the processor.
    * newChainForModule: runs a chain in a new running context tied to the given module and context object. The new running context will be tied to the processor module and the resulting callstack in case of a failure will trace to the module. The callback will have to decide whether to exit the $chain on failure or just report it as an output.

* deprecated $chain.doChain
    * this would 'share' the running context (callbacks and context) across $chain and the new chain which will lead to maintaince issues
* updated //inline/ to support '//inline/pkg:module?processQueries' call pattern with optional package and module paths
    * useful for calling internal methods in a module from a chain without writing code
    * '//inline/' call pattern would either call processQueries or run the entire module as chain
    * '//inline/?actionName' will run modtask.actions.actionName(...)
* updated //inline/ to support pure chain interfaces in addition to processQueries
    * the 'queryObject' and 'context' will be passed as chain keys
    * unified running JSONIO type modules with chains enabled by adding runJSONIOModuleInlineWithChainFeature to pkg/run
    * all other subsystem, including the APIs should be using this
* deprecated //chain/ launch method in favor of //inline/
    * //chain/ was sharing context across chains which can lead to problems

* modified the outcome reporting and error handling model for the chain finalCallback to immediately terminate and report as opposed to shoving the outcome in chain.
    * if there is a system level chain failure it will be reported as the finalCallback(outcome)
    * if the system level is successful, $chain.get('outcome') will be reported
    * without this it would require everyone to add a ['return'] to the end of every chain or add ['ROF'] after every call to pump the outcome to the CB which is annoying. It will also make error reporting less useful because the call stack will be at ['ROF'] or ['return'] instead of the previous expression that caused it.

* deprecated the the explicit
* added the ability to attach running contexts to modules
    * chainAttachedModule is added to $chain and chainName will refernce the module name
    * this will provide valuable information when reporting failures and construcing stack traces
* runpkg: deep clone the inline launch parameters
    * this will ensure that the execution contexts are seperate and the data will not be leaked or corrupted
    * will allow for running packages in parallel without the fear of packages stepping on each others data
* added tracing and callstack for chains
    * this will great aid the end user in creating and maintain complex chain based services
     Error Handling:
    * locating the error is typically the hardest thing to do which this feature will help accomplish
    * error reporting should give back modules, and where in the modules, and the path (stack trace) that got things there
      * type of errors
        * syntax error inside a dynamic function
        * dynamic/statuc chain calling invalid commands, etc.
        * source code errors when loading
* fixing command line bug and adding meta.action checkconfig for allowing quick configuration testing on deployments and testing
* bugfix: make sure importPackage tests the existence of pkgName/package.js

## V2
* cloudservice: allow handling of wildcard for subdomains
* implement universalHTTP transport layer to allow reusing izy-proxy components in the browser and other environments.
* add support for relative paths in the pkgrunner luanch string

        ['//izyware.com/rel:modname', {}, mod]

* add dontDefaultToHttpWhenServiceNameUnrecognized flag to pkgrunner
* Pass in authorization token as part of the session object to the pkgrunner
    * The token might be used for making HTTP based (not inline) calls
* Pass in the current session when making inline requests.
* New impementation of Authorization header security
    * Accept Bearer autorization tokens sent via the HTTP headers
    * Updated the OPTIONS response to indicate that authorization headers are accepted when making cross domain calls.
* added test/cloudwatch/base for running service tests on a live version
    * this will enable an automated task for doing tests on the live service from the IzyCloud enterprise dashboard
    * The following plug-ins are covered
        * APIs
        * http
        * circus
* added assertion library to enable simple smoke tests
    * consolidated from toolbar and other libraries
* added options for cacheImportedPackagesInMemory and noReimportIfAlreadyLoaded to the runpkg, and import chains to allow dynamic remote updating of the modules in the task runner.
    * If this is not turned on, the module updates will only be picked up on taskrestarts which is not desirable.
* restructured the taskrunner component and added sample config file for standalone deployment of the taskrunner.
    * added `apiExecutionContext` to taskrunnerProcessor config for remote and local configurations and deployments.
    * added samples/pkgloader/izycloud that uses POST `ui/ide:cloudstorage/api` with auth token to do package loading inside the Chains (i.e. when using the taskrunnder)
* added the ability to configure chain processors
* added the ability to 'replay' a chain and thus looping through easy
    * this is important for processing data sets:

            ['newChain', {
              chainName: modtask.__myname + '.loop',
              chainItems: [
                function(chain) {
                  if (offset >= maxOffset) {
                    return chain([
                      ['log', 'ran ' + maxOffset + ' sets of queries'],
                      ['set', 'lastOutcome', {
                        data: queryResults,
                        success: true
                      }],
                      ['return']
                    ]);
                  }
                  chain([
                    ['log', (offset+1) + ' of ' + maxOffset]
                  ]);
                },
                ['ROF'],
                ['replay']
              ]

* the seperation of contexts, ability to import and doChain/newChain will enable the apps/tasks/api feature
    * The taskprocessor will define procesor commands (apps/tasks/api/chain) and will be imported
        * process seqs.onNewTask and capture the outcome if error without CONTAMINATING itself
    * The task itself will have a chain seqs.onNewTask (see izy-proxy/taskrunner/main.js)
        * pre import relevant processors (task.*)
* improved doChain so that it will create the context (dataspace, callbacks) on the fly so that the chain processors can also have doChain internally and the 'finally' part can be optionally localized (similar to how the try/catch works. The layer that has the catch will work).
    * This will allow us to have nested chains, and subchains, etc.
* pass the $chain to the chain handler that would allow access to chain context as well as doing doChain, newChain, etc.
    * being able to doChain internally is important because the chain handlers may need to utilized other commands inside the current context.
    * having newChain is also important to be able to isolate a set of commands (for example the task manager running an external module).
    * virtually, doChain/newChain will allow differentiation on the following:
        * will it have a new context or will it share the context with parent?
        * will it have an outcome handler or will it go to parent?
* improved chain management so that we can 'importProcessor' processors, since chain 'actions' will be 'processed' by processors.
    * this will open up implementation by chain.
    * if a handler is redeclared, it will process instead of the parent context



[izyware]: https://izyware.com
[izy-proxy-help-article]: https://izyware.com/help/article/izy-proxy-readme