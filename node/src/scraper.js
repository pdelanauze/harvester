var nano = require('nano');
var logger = require('winston');

var server = nano("http://localhost:5984");
var db = server.use("harvester");

var HarvestTaskWorker = require('./harvest_task_worker').HarvestTaskWorker;
var couchdbWorker = require('./couchdb_worker');

// Create the task workers
var harvestTaskWorker = new HarvestTaskWorker(db);
var dispatcher = new couchdbWorker.Dispatcher([harvestTaskWorker]);
var lockableTaskWorker = new couchdbWorker.LockableTaskWorker(dispatcher, db);

var feed = db.follow({since:"now", include_docs: true});
feed.on('change', function (change) {

  if (change.doc && !change.deleted && change.doc.type && change.doc.type === 'background-task'){
    logger.debug('Received task', change.doc._id, change.doc.workerId);
    lockableTaskWorker.work(change.doc, function(){
      logger.debug('Completed task execution', change.doc._id);
    });
  }

});
feed.follow();
logger.info('Listening for tasks');