var logger = require('winston');
var _ = require('underscore')._;
var uuid = require('node-uuid');

function Dispatcher(workers) {
  this.workers = {};
  _.each(workers, this.register, this);
}

Dispatcher.prototype.register = function (worker) {
  this.workers[worker.taskType] = worker;
};

Dispatcher.prototype.unregister = function (worker) {
  delete this.workers[worker.taskType];
};

/**
 * Task requires a taskType attribute
 * @param task
 */
Dispatcher.prototype.execute = function (task, callback) {
  var w = this.workers[task.taskType];
  if (w) {
    w.execute(task, function (err, result) {
      if (err) {
        logger.error('Error executing task type: ' + task.taskType);
      }
      callback.apply(this, arguments);
    });
  } else {
    var msg = 'Could not find worker for task type: ' + task.taskType;
    logger.error(msg);
    callback(msg);
  }
};

exports.Dispatcher = Dispatcher;

function LockableTaskWorker(dispatcher, db) {
  this.dispatcher = dispatcher;
  this.db = db;
  this.workerId = uuid.v4();
}

/**
 * Attempt a lock and run the callback function
 *
 * @param task
 * @param callback
 */
LockableTaskWorker.prototype.attemptLock = function (task, callback) {
  task.workerId = this.workerId;
  this.db.insert(task, task._id, function (err, body, header) {
    if (!err) {
      task._rev = body.rev;
    }
    callback(err, task);
  });
};

LockableTaskWorker.prototype.execute = function (task, callback) {

  var ctx = this;
  ctx.dispatcher.execute(task, function (err, result) {
    if (!err) {
      if (!task._deleted) {
        ctx.db.destroy(task._id, task._rev, function (err, body) {
          if (!err) {
            task._deleted = true;
          } else {
            logger.error('Task complete, but unable to delete it: ', task._id, body);
          }
        });
      }
    } else {
      logger.error('Error during \'' + task.taskType + '\' task execution', err);
    }
  });
};

LockableTaskWorker.prototype.work = function (task, callback) {

  var ctx = this;
  if (!task.workerId) {
    ctx.attemptLock(task, function (err, task) {
      if (!err) {
        ctx.execute(task, callback);
      }
    });
  }
};

exports.LockableTaskWorker = LockableTaskWorker;