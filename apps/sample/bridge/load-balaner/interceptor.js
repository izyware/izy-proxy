/* izy-loadobject nodejs-require */
module.exports = function() {
  
  // Round robin load balancing is a technique that distributes client requests to a group of targets in rotation. 
  // It's a simple way to balance server load and provide fault tolerance.
  // It is often used when servers have similar processing capabilities and resources.

  const targets = ['privatebox-1:80', 'privatebox-2:80']; 
  const modtask = {};
  modtask.should = async queryObject => queryObject.url.match('/load-balaner');
  modtask.perform = async (queryObject) => {
    let nextTarget = targets.shift();
    targets.push(nextTarget);
    console.log(`route ${queryObject.url} to ${nextTarget}`);
    return { success: true, proxyTarget: nextTarget };
  }
};
module.exports.forcemodulereload = true;