module.exports.taskrunnerProcessor = {
     verbose: false,
     loopMode: true,
     readonly: false,
     delay: 5000,
     // values: 'izyware', 'inline'
     // 'inline' would require izynode configuration ('frame_getnode') when package that is not available locally needs to be loaded
     // 'izyware' would require import.pkgloadermodconfig.auth to import from the cloud
     apiExecutionContext: 'izyware',
     authenticate: {
          izyware_taskrunner_key_id: 'your_access_key',
          izyware_taskrunner_secret_access_key: 'your_secret_key'
     },
     izyware_runtime_id: 'FROM_IZYCLOUD_DASHBOARD_izyware_runtime_id'
};

module.exports.__chainProcessorConfig = {
     runpkg: {
          verbose: false
     },
     'import': {
          // ['importpkgs'] behavior. caches per chain instance
          cacheImportedPackagesInMemory: true,
          pkgloadermodname: 'samples/pkgloader/izycloud',
          pkgloadermodconfig: {
               auth: 'FROM_IZYCLOUD_DASHBOARD_pkgloader_auth_token'
          },
          verbose: false
     },
     izynode: {
          accesstoken: 'FROM_IZYCLOUD_DASHBOARD_izynode_auth_token',
          dataservice: 'https://theaddr/that/supports_izynode_protocol',
          // Other options for restricted sandboxes are:
          // - qry/transport/scrsrc
          // - qry/transport/toolbar (message queue based)
          groupidobject: {
               transportmodule: 'qry/transport/http'
          },
          encryptqueries : false,
          verbose: false
     }
};
