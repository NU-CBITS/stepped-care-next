// refer to BackboneKnockoutCollectionView in js/backbone_knockout_view.js
// in order to better understand individual keys and their meaning.

define(["lib/appHelper"], function(appHelper) {

  var CommentsView =  BackboneKnockoutCollectionView.extend({
    className: "panel panel-default",
    getElementAttsfn: "fieldsToJSON",   //  Function to call on model object to get its attribute fields
    computedElementAtts: {
      user: function(model) {
        var guid = model.get("user_id");
        return function() { 
          return USERS.get(guid).attributes 
        };
      },
      datetime_created_at: function(model) {
        return function() { 
          return ( (new Date(model.get("created_at"))).toString("h:mm tt MMM d, yyyy") );
        };
      }
    },
    afterInitialize: function() {
      var self = this;
      
      this.commentedOnCollection = this.options.commentedOnCollection || this.commentedOnCollection;
      
      this.collection.listenTo(app.CoachConvoComments, 'change', this.reconstructCollection , this);    
      this.collection.listenTo(app.CoachConvoComments, 'add', this.reconstructCollection, this);

    },
    reconstructCollection: function() {
      var self = this;
      this.collection = app.CoachConvoComments.where(function(comment) {
        return ( comment.get_field_value("commented_on_id") == self.collectionAtts.xelement_id )
      });
    },
    afterKoModelCreation: function() {
      var self = this;
      self.knockoutModel.hideComments = ko.observable( (self.options.initiallyHideComments || false) );
      self.knockoutModel.showComments = ko.computed(function() { return !self.knockoutModel.hideComments() }); 
      self.knockoutModel.textForToggle = ko.computed(function() {
        return (self.knockoutModel.hideComments() ? "show" : "hide");
      });
      self.knockoutModel.toggleVisibility = function() {
        self.knockoutModel.hideComments( !self.knockoutModel.hideComments() );
      };
    },
    commentedOnCollection: function() {
      return XELEMENTS
    },
    commentedOnTitleText: function(commentedOn) {
      if (this.options.commentedOnTitleText) {
        return this.options.commentedOnTitleText(commentedOn);
      };
      return commentedOn.get_field_value("text");
    },
    knockoutTemplate: function() { return app.templates["partial/comments"] },
    knockoutElementTemplate: function() { return app.templates["partial/comment"] },
    // Function called before a comment is added to a collection
    // returning false prevents addition of comment to model.
    // implementation prohibits empty comments 
    validateBeforeAdd: function(modelToAdd) {

      var commentText = modelToAdd.get_field_value("text");

      if (  _.isString(commentText) && 
            (commentText !== "" && commentText !== " ")  && 
            !(/^<p>(&nbsp;\s*)*\n*<\/p>\n*$/.test(commentText)) ) {
        return true;
      }
      else {
        alert("Sorry, you can't submit an empty comment :)");
        return false;
      };

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
    },   
    // Function is called whenever a comment is added.
    onElementAdded: function(modelAdded) {

        // Since a user conversation uses the user_id of the participant,
        // add in who their coach was and the fact that this message was sent
        // from the coach if that is the case.
        var isCoach = ( Dynamo.CurrentUser().get("study_role") == "Coach" );
        modelAdded.set_field("from_coach", "boolean",  isCoach);
        if (isCoach) {
          modelAdded.set_field("coach_id", "string", Dynamo.CurrentUser().id );
        }
        modelAdded.save(null, {async:false});

        // Every comment results in an activity feed event.
        var username = Dynamo.CurrentUser().get("username");

        // Clear existing data in editor(s)
        this.$el.find("input[type='text'],textarea").first().val('');

        app.CoachConvoComments.add(modelAdded);

        // HERE:
        // objectCommentedOn may be an xelement, but it will not be when it is
        // something that is another user's creation, like an Activity, Thought Record, or General Message.
        var objectCommentedOn = (_.result(this, 'commentedOnCollection')).get( modelAdded.get_field_value("commented_on_id") );

        appHelper.createFeedEvent({
          username: username,
          action: "commented on",
          category: "comments",
          direct_object_id: objectCommentedOn.id,
          message: "Commented on '"+this.commentedOnTitleText(objectCommentedOn)+"'",
          story_route: this.storyRoute(modelAdded, objectCommentedOn)
        });

    },
    afterRender: function($selector) {
      return this;
    }
  });

  return CommentsView;

});