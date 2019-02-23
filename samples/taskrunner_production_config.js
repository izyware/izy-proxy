module.exports = {
     taskrunnerProcessor: {
          // values: 'izyware', 'inline'
          // 'inline' would require izynode configuration ('frame_getnode') when package that is not available locally needs to be loaded
          // 'izyware' would require import.pkgloadermodconfig.auth to import from the cloud
          apiExecutionContext: 'izyware',
          verbose: false
     },
     taskrunner: {
          loopMode: true,
          readOnlyMode: false,
          delay: 5000
     },
     runpkg: {
          verbose: false,
          // When it tries to run a module in the 'inline' mode, should the we try to use the in memory version or import the package everytime?
          // This can have performance implications but it is neccessary for remote update applications
          // This is also closely related to the 'cacheImportedPackagesInMemory' in the import chain
          noReimportIfAlreadyLoaded: false
     },
     'import': {
          cacheImportedPackagesInMemory: false,
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
          transportmodule: 'qry/transport/http',
          encryptqueries : false,
          verbose: false
     },
     authenticate: {
          izyware_taskrunner_key_id: 'FROM_IZYCLOUD_DASHBOARD__access_key',
          izyware_taskrunner_secret_access_key: 'FROM_IZYCLOUD_DASHBOARD__secret_key'
     },
     izyware_runtime_id: 'FROM_IZYCLOUD_DASHBOARD_runtime_id'
};