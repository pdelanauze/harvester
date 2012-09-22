/**
 * Created with IntelliJ IDEA.
 * User: pat
 * Date: 12-05-10
 * Time: 2:15 PM
 * To change this template use File | Settings | File Templates.
 */
define(['underscore', 'backbone', 'lib/utility', 'lib/backbone-utility', 'lib/backbone-couch-schema-model', 'lib/backbone.couchdb', 'application/vent'],function (_, Backbone, Utility, BackboneUtility, BackboneCouchSchemaModel, Backbone, Vent) {

  var BackgroundTaskApp = {
    Models:{},
    Collections:{},
    Routers:{},
    Views: {},
    App:{
      router:false
    }
  };

  BackgroundTaskApp.Models.BackgroundTask = BackboneCouchSchemaModel.extend({
    defaults:{
      type:'background-task',
      taskType: 'harvest-task',
      createdAt: new Date().toISOString()
    },
    schema: {
      description: 'Background task',
      type: 'background-task',
      properties: {
        taskType: {
          title: 'Task type',
          type: 'string',
          required: true
        },
        arguments: {
          type: 'array',
          title: 'Arguments'
        },
        url: {
          type: 'string',
          required: true
        },
        workerId: {
          type: 'string',
          title: 'The worker assigned to the task, if any'
        },
        locked_at: {
          type: 'date-time',
          title: 'The time at which the task was locked'
        }
      }
    }
  });

  BackgroundTaskApp.Collections.BackgroundTaskCollection = Backbone.couch.Collection.extend({
    model:BackgroundTaskApp.Models.BackgroundTask,
    change_feed:true,
    couch:function () {
      return {
        view:Backbone.couch.options.design + '/background_tasks',
        include_docs:true,
        filter: {
          filter: Backbone.couch.options.design + '/by_type',
          key: 'background-task'
        }
      }
    },
    initialize:function () {
      // TODO Should this be here ?? Maybe take this out everywhere ...
      this._db = Backbone.couch.db(Backbone.couch.options.database);
      Backbone.couch.Collection.prototype.initialize.apply(this, arguments);
    }
  });

  BackgroundTaskApp.Views.BackgroundTaskTableControlView = BackboneUtility.Views.TableControlView.extend({
    events:{
      'click .btn.delete-all':'deleteAll'
    },
    initialize:function (opts) {

      _.extend(this, opts);

      this.template = _.template('<div class="pull-right control top">' +
          '<a href="#/' + this.pluralModelName + '/new" class="btn btn-primary"><i class="icon-plus"></i> New background task</a>' +
          ' <a href="#/' + this.pluralModelName + '/delete-all" class="btn btn-danger delete-all"><i class="icon-minus"></i> Delete all</a>' +
          '</div>' +
          '<div class="table-container"></div>');

      BackboneUtility.Views.TableControlView.prototype.initialize.apply(this, arguments);


    },
    deleteAll:function () {
      var ctx = this;
      var toDelete = [];
      this.collection.each(function (m) {
        toDelete.push({
          _id:m.get('_id'),
          _rev:m.get('_rev'),
          _deleted:true
        });
      });

      if (confirm('Are you sure you want to delete all visible tasks?')) {
        $.ajax({
          url:'/' + Backbone.couch.options.database + '/_bulk_docs',
          type:'POST',
          data:JSON.stringify({
            docs:toDelete
          }),
          contentType:'application/json',
          dataType:'json',
          success:function () {
            ctx.collection.fetch();
          }
        });
      }
      return false;
    }
  });

  BackgroundTaskApp.Routers.BackgroundTaskRouter = BackboneUtility.Routers.ScaffoldViewBasedRouter.extend({
    modelName:'background-task',
    pluralModelName:'background-tasks',
    modelClass:BackgroundTaskApp.Models.BackgroundTask,
    parentContainer:$("#apps-container").append('<div class="background-task-app-container"></div>'),
    tableControlViewClass: BackgroundTaskApp.Views.BackgroundTaskTableControlView,
    initialize:function (opts) {
      BackboneUtility.Routers.ScaffoldViewBasedRouter.prototype.initialize.apply(this, arguments);
      this.collection = new BackgroundTaskApp.Collections.BackgroundTaskCollection();
    }
  });

  return BackgroundTaskApp;
});