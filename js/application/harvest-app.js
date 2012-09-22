define(['backbone', 'underscore', 'lib/utility', 'lib/backbone-utility', 'lib/backbone-couch-schema-model', 'lib/backbone.couchdb', 'modelbinder'], function (Backbone, _, Utility, BackboneUtility, BackboneSchemaModel, Backbone, ModelBinder) {

  var HarvestApp = {
    Models:{},
    Collections:{},
    Views:{},
    Routers:{},
    Templates:{

    }
  };

  // TODO This should become a harvest-task (rename model)
  // TODO How should the results be persisted ? In the same model ? or in another ? Maybe another would be better for tracking changes to pages ...
  //
  HarvestApp.Models.Harvest = BackboneSchemaModel.extend({
    defaults: {
      createdAt: new Date(),
      updatedAt: new Date(),
      type: 'harvest'
    },
    schema: {
      description: 'JavaScript snippet',
      type: 'harvest',
      properties: {
        url: {
          name: 'URL',
          type: 'string',
          required: false,
          pattern: /^(https?):\/\/([^\/]*)(\/.*)?$/,
          'default': 'The url formats supported by this script'
        },
        script: {
          name: 'Script',
          type: 'string',
          'default': 'The actual script to execute on the target site.',
          maxLength: 1000000
        }
      }
    }
  });

  HarvestApp.Models.HarvestResult = BackboneSchemaModel.extend({
    defaults: {
      createdAt: new Date(),
      type: 'harvest-result'
    },
    schema: {
      description: 'Harvest result',
      type: 'harvest-result',
      properties: {
        result: {
          name: 'Result',
          type: 'object',
          required: false
        },
        url: {
          name: 'URL',
          type: 'string'
        },
        createdAt: {
          name: 'Creation date',
          type: 'date-time'
        },
        workerId: {
          name: 'Worker ID',
          type: 'string'
        },
        harvestId: {
          name: 'Harvest ID',
          type: 'string',
          required: true
        }
      }
    }
  });

  HarvestApp.Collections.HarvestCollection = Backbone.couch.Collection.extend({
    model:HarvestApp.Models.Harvest,
    change_feed:true,
    couch:function () {
      return {
        view:Backbone.couch.options.design + '/by_type',
        key: 'harvest',
        include_docs:true
      }
    },
    initialize:function () {
      this._db = Backbone.couch.db(Backbone.couch.options.database);
      Backbone.couch.Collection.prototype.initialize.apply(this, arguments);
    }
  });

  HarvestApp.Collections.HarvestResultCollection = Backbone.couch.Collection.extend({
    model: HarvestApp.Models.HarvestResult,
    change_feed: true,
    couch: function(){
      return {
        view: Backbone.couch.options.design + '/by_type',
        key: 'harvest-result',
        include_docs: true
      }
    }
  });

  HarvestApp.Views.HarvestTableItemView = BackboneUtility.Views.TableItemView.extend({
    initialize:function (options) {
      BackboneUtility.Views.TableItemView.prototype.initialize.apply(this, arguments);
    }
  });

  HarvestApp.Views.HarvestTableView = BackboneUtility.Views.TableView.extend({
    itemView: HarvestApp.Views.HarvestTableItemView,
    initialize: function(options){
      BackboneUtility.Views.TableView.prototype.initialize.call(this, options);
    }
  });

  HarvestApp.Views.HarvestTableControlView = BackboneUtility.Views.TableControlView.extend({
    tableView: HarvestApp.Views.HarvestTableView,
    columns: [
      {name: 'URL', value: 'url', type: 'text'},
      {name: 'Last updated', value: 'updatedAt', type: 'text'}
    ],
    initialize:function (options) {
      BackboneUtility.Views.TableControlView.prototype.initialize.call(this, options);
      _.bindAll(this, 'render');
    },
    render:function () {
      BackboneUtility.Views.TableControlView.prototype.render.call(this);
      return this;
    }
  });

  HarvestApp.Views.HarvestResultTableControlView = BackboneUtility.Views.TableControlView.extend({
    events:{
      'click .btn.delete-all':'deleteAll'
    },
    initialize:function (opts) {

      _.extend(this, opts);

      this.template = _.template('<div class="pull-right control top">' +
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

      if (confirm('Are you sure you want to delete all visible results?')) {
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

  HarvestApp.Views.HarvestEditView = BackboneUtility.Views.ModelEditView.extend({
    events:{

    },
    initialize:function (options) {
      _.bindAll(this, 'render');
      BackboneUtility.Views.ModelEditView.prototype.initialize.call(this, options);

    },
    render: function(){
      BackboneUtility.Views.ModelEditView.prototype.render.apply(this, arguments);

      /*_.delay(function () {
        var textarea = this.$('textarea:first');
        if (!this.editor && textarea.length > 0) {
          var JavaScriptMode = AceJavascriptMode.Mode;

          if (!textarea.attr('id')) {
            textarea.attr('id', 'textarea-' + new Date().toISOString());
          }
          if (!textarea.html()) {
            textarea.html('alert();\n\n');
          }
          textarea.css({
            width: '400px',
            height: '600px'
          });
          this.editor = Ace.edit(textarea.attr('id'));
          // this.editor.getSession().setMode(new JavaScriptMode());
        }
      }, 600);*/


    }
  });

  HarvestApp.Routers.HarvestRouter = BackboneUtility.Routers.ScaffoldViewBasedRouter.extend({
    modelName: 'harvest',
    pluralModelName: 'harvests',
    modelClass: HarvestApp.Models.Harvest,
    tableControlViewClass: HarvestApp.Views.HarvestTableControlView,
    modelEditViewClass:HarvestApp.Views.HarvestEditView,
    initialize: function(options){
      this.collection = new HarvestApp.Collections.HarvestCollection();
      BackboneUtility.Routers.ScaffoldViewBasedRouter.prototype.initialize.apply(this, arguments);
    }
  });

  HarvestApp.Routers.HarvestResultRouter = BackboneUtility.Routers.ScaffoldViewBasedRouter.extend({
    modelName:'harvest-result',
    pluralModelName:'harvest-results',
    modelClass:HarvestApp.Models.HarvestResult,
    tableControlViewClass: HarvestApp.Views.HarvestResultTableControlView,
    initialize:function (options) {
      this.collection = new HarvestApp.Collections.HarvestResultCollection();
      BackboneUtility.Routers.ScaffoldViewBasedRouter.prototype.initialize.apply(this, arguments);
    }
  });

  return HarvestApp;

});