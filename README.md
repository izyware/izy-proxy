For more details, see: [izy-proxy-help-article]

## Deployment Setup

### Requirements

You need npm > 3.10.6. The npm install behavior is different in earlier versions. The tool requires that all the node dependencies be installed in flat node_modules subdirectory.
If you happen to use an older version of npm, the work around is shown below:


### Build
To build an artifact for cloud deployment (i.e. docker container), in any clean subdirectory use:

```

mkdir ~/srv/<type>/_version_ (or any location you would like have izyware tools deployed to)
cd ~/srv/<type>/_version_
npm init -f; npm install --save izy-proxy; mkdir -p node_modules/configs/izy-proxy;
```

If you are using npm < 3.10.6, you must also do:

```
cp -r node_modules/izy-proxy/node_modules/* node_modules/; cp -r node_modules/izy-circus/node_modules/* node_modules/;
```


### Update
To update, just rebuild a new side by side version. This will allow you to roll back to an older version in case there is a failure.

## Running

### Picking the correct configuration
The samples directory contains sample configuration files that you can use for tcpserver, taskrunner, ... modes:

```
cp node_modules/izy-proxy/samples/taskrunner_production_config.js node_modules/configs/izy-proxy/taskrunner.js 
```

Note that some configurations may require additional local packages. For example pkgloader/dbnode, depends on components/pkgman/dbnode being locally present. Make sure to include the relevant components locally and add a search path reference under modtask/config/kernel/extstores/file.js to the appropriate location.

### TCP Server Mode
```
cd node_modules/izy-proxy
node tcpserver/app.js (or if you are using pm2, do pm2 tcpserver/app.js)
```

Make sure the the *cwd* for the server process is set to the location for the izy-proxy installation. This is important because the *cwd* is used in locating plugin, thirdparty modules and the configuration.

After the server is running, the following should work:

```
GET /izyproxystatus

status: 200
```

### TaskRunner Mode
You may also run the tool in the task runner configuration. Please make sure that the configuration file is setup properly.

```
cd node_modules/izy-proxy
node taskrunner/app.js  (or if you are using pm2, do pm2 start node taskrunner/app.js)
```

For testing your deployment, you can overwrite the default config options by launching the taskrunner in the interactive mode

```
node cli.js method taskrunner taskrunner.readOnlyMode true taskrunner.loopMode false taskrunnerProcessor.verbose true
```

See the configuration reference for taskrunner for the list of command line options.

#### Periodically Running Dynamic Code
The task runner will run the following chain command:

    [taskParameters]
    
where taskParameters is defined in the Izy Cloud Dashboard. This will allow for flexibility in terms of what/where to run the tasks:


To run mypackage:mymodule as JSONIO API Interface (what), inline (transport), inside the context of the izy-proxy process (where), simply set the taskParameters to:

    ///mypackage:mymodule

To run mypackage:mymodule as JSONIO API Interface (what), over HTTPS (transport), inside the context server.com (where), simply set the taskParameters to:

    //myserver.com/mypackage:mymodule
    
To run mypackage:mymodule as a chain (what), inline (transport), inside the context of the izy-proxy process (where), simply set the taskParameters to:

    //chain/mypackage:mymodule



### IZY TIP
When upgrading or deploying a node (ec2-node or a docker container), you should deep clone the directory as a backup and switch back/forth with pm2 until things work:

```
mkdir ~/izyware_backup; cp -r ~/izyware/* ~/izyware_backup/
pm2 stop 1
pm2 start 2
.... update ~/izyware/ ...
```

Notice that you should put your containers behind a load balancer (i.e. AWS elb) to avoid ending up with broken connections.

## Testing and QA
Since the izy-proxy contains a heterogeneous set of component, full testing will entail running each test piece seperately.

```

### Test the chaining engine functionality
node test/all.js

### Test the API plug-in
node cli.js method api api.path :test/api

### Test the Socket plug-in
node cli.js method socket socket.path izy-pop3/proxypkg:directdb socket.testmod izy-pop3/proxypkg/test/android socket.user user@yourdomain.com socket.pass your_password socket.verbose.writes true socket.verbose.ondata true

### Test remote servers over TCP/SSL
node cli.js method socket socket.path pop3.izyware.com socket.port 110 socket.testmod izy-pop3/proxypkg/test/android socket.user user  socket.pass 'password!' socket.verbose.mock true
```

### Test Automation 

#### Data Library
Enterprise customers can take advantage of thousands of data samples for testing. Data samples include real world data for:

* Mobile devices interacting with standard protocol stacks
* User browsing history analytics data
* ...

#### The mock library 
You can use the mock library for simulating raw sockets, protocols (HTTP, etc.), databases, browser extension environments, etc. 

You can use the mock libraries in conjuction with the data library to improve your test coverage.

#### The assertion library
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


### Container Deployment Configuration Verification For Enterprise Customers

Use the commandline interface to simulate calling the forgot-password POST api call from your enterprise container:

```
 node cli.js method verifyconfig api.email <youremail>
```

If everything is successful, you should be able to replicate the online behavior locally.

### Continious Testing Via Tasks
It is recommended the you test the live deployment for configuration and infrastructure issues using the task engine and the following module:

    //chain/izy-proxy/test:cloudwatch/base
    
    

## Using the CLI (Commandline Interface) for launching and testing components
While enterprise gold customers have access to Izyware Studio, the standard users can still use the command line for launching and debugging components that may be launched in the taskrunner context or in the TCP server context.

```
node cli.js method verifyconfig userdata...
node cli.js method api api.path <path/to/api/module> api.queryObject.key1 value1 ...
node cli.js method socket ...
node cli.js method taskrunner ...
node cli.js method chain ...  
```

Of all the methods, the chain is the most powerful, because it will allow you to run remote, local and other types of modules using a JSON API style interface or just chain:

```
node cli.js method chain chain.action "//chain/izy-proxy/test/chain" chain.p1.name 123456 chain.p1.value 991
```

## Configuration for the artifact

The TCP server expects the configuration file to be at:

```
../configs/izy-proxy/config.js relative to app.js
```

so in the example above, the config.js would go in:

```
node_modules/configs/izy-proxy/config.js
```

It is best to keep the configurations in a seperate location and just copy them over as shown in the deployment section.


The Taskrunner expects the configuration file to be at:

```
../configs/izy-proxy/taskrunner.js relative to app.js
```

### Sample TaskRunner Server taskrunner.js config file

Please refer to the following sample file:

    samples/taskrunner_production_config.js

### Sample TCP Server config.js file
Please refer to the following sample file:

    samples/tcpserver_production_config.js

#### __chainProcessorConfig For Chain Processing
Chain processing is optional and should be used when heterogeneous development across multiple platforms is needed.

To support chain processing in the izy-proxy container execution context, simply drop the __chainProcessorConfig in the config file.

The chain handler should be configued based on the following criteria:
* Security Context
* Network Configuration
* Performance Considerations

## Plugins

The tool has an extensive and powerful plugin system that allows you to very easily break your application up into isolated pieces of business logic, and reusable pieces.

### Creating a plugin

Create a plugin by cloning the `default` subfolder under the `plugin` directory. You must also register the plugin in the config file.

To automatically test the plug-ins below, send a GET request and expect 200 status code.

#### circus

To test this plug-in, try:

```
/testcircus
```

#### apigateway

To test this plug-in, try:

```
/apigateway/apigatewaytest%3Aviewer/top
```

#### default

 ```
 /favicon.ico
 ```

## Handling CORS

The serverObjs variable allows the plug-in modules to handle CORS. Note that to handle CORS a plug-in must:
* Handle the OPTIONS request from the browser. A sample response is provided in the OPTIONS
* Provide the Access-Control-Allow-XXX headers in each request

You should customize the Access-Control-Allow-XXX headers for your own business needs.

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


## sessionObjects
The plug-ins may use the sessionObjects to share states and parsed information across the canHandle and handle stages. This will allow for writing high performance plug-ins.

## Module Paths

If you wish to access izy modules from the file system, you may customize the module path resolution rulesets defined in:

```
izy-proxy/modtask/config/kernel/extstores/file.js
```

Please refer to the comments in the file to understand how to reference external modules.


## Simplified JSONIO apis
You can leverage this feature to create standard apis that send/recieve JSON objects. The advantages are:
* No need to manage the HTTP metadata and headers
* JSONIO api security context can be 'transported' and simulated by the IDE, thus making implementation very very easy.
* The end-points can be directly consumed from chains anywhere in the cloud.

By default, `doChain` is enabled inside the api module. A typical implementatin would look like:

```
var modtask = function() {}
modtask.__apiInterfaceType = 'jsonio';
modtask.processQueries = function(queryObject, cb) {
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



## Bridging and consuming resources across different networks
Bridging and consuming resources across different networks can be difficult.  A common scenario is to integrate DBMS, files, etc. that are only accessable to the intranet or just the local computing resources (for example localhost) inside thirdparty web apps or SASS services. Izyware Proxy Component (izy-proxy) simplifies this process by exposing the heterogeneous resources via standard api gateway.

### Benefits Of Using the API Gateway
The major benefit is that by exposing the functionality as an api access point, it can then be pulled in any thirdparty app while controlling permissions and session management tasks automatically via the Izyware Framework.

### Recommended Configuration

The following solution is recommended:
* A running instance of izy-proxy INSIDE the intranet with access to the resources.
* A DNS entry that would resolve to the INTRANET IP ADDRESS of izy-proxy resource. e.g.

    	localhost.izyware.com		  127.0.0.1
    	intranetservice1.izyware.com  10.0.0.231
    	....

* SSL certificates corresponding to the DNS resources above: In most cases is not needed for the public facing izy-server instances where the HTTPS connections are handled by a load balancer. But in this scenarios, the izy-proxy instance should handle the HTTPS connection directly (see server.js):

     	../configs/izy-proxy/certificates/privatekey.pem

### Packaging
It is recommended that the functionality be organized and packaged as an izyware app. This approach will have the following benefits:

* A boilerplate app can be created (by cloning an existing one) which would immediately provide dashboard, toolbar, etc. features that can be accessed in the UI
* The app can be immediately used and integrated inside existing business workflows either via the api access points or via the frames/slides UI automation framework.

To make cloning and reusability easier, it is further recommended that the bridge functionality be implemented as a subpackage using the following scheme:


    app_name/bridge/api

For example, the sample app included with izy-proxy uses:

    apps/sample/bridge/api.js

This would result in the route:

    https://dnsentry.com/apigateway/%3Aapps/sample/bridge%3Aapi

## Using the package to extend existing node apps

Setup the environment by:

```
npm install izy-proxy
mkdir -p modtask/config/kernel/extstores
cp ./node_modules/izy-proxy/modtask/config/kernel/extstores/file.js modtask/config/kernel/extstores/
```

You should then edit the modtask/config/kernel/extstores/file.js and add the hard coded and relative paths for the location of your repositories.

Finally you can do:

```
require('izy-proxy').doChain([
	['log', 'hello world'],
	['frame_importpkgs', 'izy.machinelearning.moduleSim'],
	....
]);
```

## Enabling your apps via the Izy-Chaining scripting environment
Your application functionality may be consumed via the universal scripting environment.

It is recommended that you expose the functionality via an importable chain module. As of version 2.0 the chaining library will support importing and registering new chain handlers.

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

## NOTE
for more details, visit [izyware]

# Known Issues
* When there is chain crash in taskrunner (i.e. request package is missing) the dashboard wont report it
    * metascope task is an example
    * The error gets initially captured but overwritten by the total number
* Sockets plugin does not have tests inside test/cloudwatch/base 
* customers have reported that sometimes the outcome key upon the execution of `//chain/xxx` calls gets tampered with. See gmailsync customer issue: 3512aed7e0a354ecd803efcec7b3ce30cb004e35
* publish (izy-proxy/features/v2) as independent packages
* improve izy-proxy doChain so that:
    * allow labels / goto functionality
    * setTimoue internally

# Changelog
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
