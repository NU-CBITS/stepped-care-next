define([], function() {
  
  var ReviewActivitiesView = Backout.CollectionView.extend({

    initialize: function(options) {
      this.getReviewableActivities = options.getReviewableActivities;
      this.activitiesObserver = options.activitiesObserver;
    },

    //
    // Standard for any Backout.CollectionView
    // 
    emptyCollectionTemplate: function() {
      return t.div( 
                    t.h4("Congratulations, you've reviewed all your past scheduled activities!") + 
                    t.h4("You can always schedule some more, so you'll have some to review later ;)")
                  )
    },
    template: function() { 
      return DIT["activity_tracker/review_events_table"] 
    },
    elementKoTemplate: function() { 
      return DIT["activity_tracker/review_event_row"] 
    },

    //
    // Specific to ReviewActivities
    //
    onModelSaved: function(savedModel) {
      this.activitiesObserver.afterSave(savedModel);
      this.rebuildCollection();
    },

    rebuildCollection: function() {
      this.collection = this.getReviewableActivities();
      this._setCollectionEvents();
      this.collection.on("collection:model:saved", this.onModelSaved, this);
      this.initialRender();
    },

    storyRoute: function(modelAdded, commentedOn) {
      if (modelAdded.routeToModel) {
        return modelAdded.storyRoute;
      };
      if (this.collection.storyRoute) {
        return this.collection.storyRoute
      };  
      if (this.collection.storyRoot) {
        return (this.collection.storyRoot + commentedOn.id)
      };
      return null;
    }

  });

  return ReviewActivitiesView;

});