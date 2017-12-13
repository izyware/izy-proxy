## izy-proxy
IZY Proxy server is part of the Izyware framework for building applications and services using the interactive tools.

It enables developers to focus on creating reusable user experiences instead of spending time building and maintaining code and infrastructure.

## Deployment

```
npm i izy-proxy
node ./node_modules/izy-proxy/app.js
```

If you are using PM2 to manage your node processes, you can:

```
pm2 start ./node_modules/izy-proxy/app.js
```

## Sample Config

Use the following as a guideline:

```

module.exports = {
  port: {
    http: 80,
    https: 443
  },
  proxy: {
    timeoutInMs: 60000
  },
	// Array of plug-in definitions 
	plugins: [
	{
		// Only do this while developing plug-ins
		// This will reload the node modules for plug-in per request 
		reloadPerRequest: false, 
		name: 'apigateway'
	},
	{
		aliases: ['.domain_to_alias_to_izyware.com'],
		// Only do this while developing plug-ins
		// This will reload the node modules for plug-in per request 
		reloadPerRequest: false, 
		name: 'circus',
		bootstrapUrl: 'https://izyware.com/chrome_extension.js',
		cache: {
			folder: '/tmp/izy-circus'
		}
	}
	]
};


```

## Plugins

The tool has an extensive and powerful plugin system that allows you to very easily break your application up into isolated pieces of business logic, and reusable pieces.

### Creating a plugin

Create a plugin by cloning the `default` subfolder under the `plugin` directory. You must also register the plugin in the config file.

## Module Paths

If you wish to access izy modules from the file system, you may customize the module path resolution rulesets defined in:

```
izy-proxy/modtask/config/kernel/extstores/file.js
```

currentdir and __dirname are two variables that allow you to construct relative paths.

### Automatic Deployments using npm i under node_modules

```
currentdir: node_modules/izy-proxy/
__dirname: node_modules/izy-proxy/node_modules/izy-circus/node_modules/izymodtask
```

## NOTE
for more details, visit https://izyware.com
