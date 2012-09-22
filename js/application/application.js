define([
  'jquery',
  'lib/backbone-utility',
  'application/couchdb-replication-app/couchdb-replication-app',
  'application/todo-app',
  'application/harvest-app',
  'application/background-task-app/background-task-app'
], function ($, BackboneUtility, CouchDBReplicationApp, TodoApp, HarvestApp, BackgroundTaskApp) {

  var Application = {};
  Application.start = function () {

    $(function () {

      var mainAppView = new BackboneUtility.Views.AppView({
        el: $("#apps-container")
      });

      var replicationRouter = new CouchDBReplicationApp.Routers.ReplicationRouter({
        appView: mainAppView
      });

      var todoRouter = new TodoApp.Routers.TodoRouter({
        appView: mainAppView
      });

      var harvesterRouter = new HarvestApp.Routers.HarvestRouter({
        appView: mainAppView
      });

      var harvestResultRouter = new HarvestApp.Routers.HarvestResultRouter({
        appView: mainAppView
      });

      var backgroundTaskRouter = new BackgroundTaskApp.Routers.BackgroundTaskRouter({
        appView:mainAppView
      });

    });

  }

  return Application;

});