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

## NOTE
for more details, visit https://izyware.com
