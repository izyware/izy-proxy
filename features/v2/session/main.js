var modtask = function() {}

modtask.data = {
  ownerType: null,
  ownerId: null
};

modtask.set = function(data) {
  modtask.ldmod('kernel/mod').ldonce(modtask.__myname).data = data;
}

modtask.get = function(data) {
  return modtask.ldmod('kernel/mod').ldonce(modtask.__myname).data;
}
