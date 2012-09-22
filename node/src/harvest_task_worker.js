// Count all of the links from the nodejs build page
var jsdom = require("jsdom");

function HarvestTaskWorker(db) {
  this.taskType = 'harvest-task';
  this.db = db;
}

HarvestTaskWorker.prototype.execute = function (task, callback) {

  var ctx = this;

  // First find the corresponding harvest implementation for the given url
  // We'll extract the domain, get a list of harvest implementations for this domain, and filter on those to see which
  // ones correspond to the given url
  var url = task.url;
  var matches = /^(https?):\/\/([^\/]*)(\/.*)?$/.exec(url);
  if (matches) {
    this.db.view('harvester', 'for_domain', {key:matches[2], include_docs:true}, function (err, response) {
      var harvests = [];
      var results = response.rows;
      results.forEach(function (harvest) {

        var r = new RegExp(harvest.doc.url);
        // if (url.indexOf(harvest.doc.url) === 0) {
        if (r.exec(url)) {
          harvests.push(harvest.doc);
        }
      });

      if (harvests.length === 0) {
        callback('Could not find a compatible harvest implementation for URL: ', url);
      } else {
        // Now iterate over every found function and return them in the callback
        harvests.forEach(function (harvest) {
          jsdom.env(url, [
            'http://code.jquery.com/jquery-1.5.min.js'
          ], function (errors, window) {
            var result = new Function('window', '$', 'callback', harvest.script)(window, window.$, function (result, options) {

              if (options && options.produceTasks) {
                // Produce tasks for the gathered URLs
                // Should simply be an array of strings
                if (result instanceof Array) {

                  result.forEach(function (link) {

                    var r = new RegExp(harvest.url);
                    if (r.exec(link)) {
                      callback('Cannot emit a URL that matches the current harvest task\'s URL expression, otherwise we get an infinite loop...', link);
                    } else {
                      // Create a harvest task for this link
                      var harvestTask = {
                        type:'background-task',
                        taskType:'harvest-task',
                        url:link,
                        createdAt:new Date().toISOString(),
                        harvestId:task.harvestId
                      };

                      ctx.db.insert(harvestTask, function (err) {
                        callback(err, harvestTask);
                      });
                    }

                  });

                } else {
                  callback('Received a task producer link, but the results was not a list of URLs', result);
                }

              } else {
                // Persist the regular harvest result
                var harvestResult = {
                  type:'harvest-result',
                  result:result,
                  url:task.url,
                  createdAt:new Date().toISOString(),
                  workerId:ctx.workerId,
                  harvestId:task.harvestId
                };

                ctx.db.insert(harvestResult, function (err) {
                  callback(err, harvestResult);
                });
              }

              window.close();
            });
          });
        });
      }

    });


  } else {
    callback('Unable to parse the URL of the harvest task...', url);
  }


};

exports.HarvestTaskWorker = HarvestTaskWorker;
