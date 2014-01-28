define(["lib/appHelper", "views/comments_view"], 
  function(   appHelper,         CommentsView) {

  var CoachPanelConversationView = Backbone.View.extend({

    initialize: function(options) {
      _.bindAll(this);
      _.extend(this, Backbone.Events);
      
      //postModel is expected to derive from Dynamo.Data
      this.postModel        = options.postModel;          delete options.postModel;
      this.postsCollection  = options.postsCollection;    delete options.postsCollection;
      this.comments         = options.groupWideComments;  delete options.groupWideComments;

      this.options = options;

      var debouncedReRenderPosts = _.debounce(this.renderPosts, 5000, true);
      var debouncedReRenderComments = _.debounce(this.reRenderCurrentPostComments, 5000, true);

      this.postsCollection.on('add',                  debouncedReRenderPosts);
      this.postsCollection.on('remove',               debouncedReRenderPosts);
      this.postsCollection.on('reset',                debouncedReRenderPosts);

      // this.comments.on('add',                 debouncedReRenderPosts, this);
      this.comments.on('add',                 debouncedReRenderComments, this);

      this.comments.on('change:from_server',  debouncedReRenderPosts, this);
      this.comments.on('change:from_server',  debouncedReRenderComments, this);

      // if (options.onNewCallback) {
      //   this.onNewCallback = _.debounce(options.onNewCallback, 5000);
      //   this.postsCollection.on('add',                this.onNewCallback);
      //   this.postsCollection.on('change:from_server', this.onNewCallback);
      //   this.comments.on('change:from_server',        this.onNewCallback);
      // };

      this.user  = USERS.get(this.options.user_id);
      this.coach = appHelper.groupCoach();

    },

    events: {
      "click button#submit-post"  : "addPost",
      "click div.post"            : "changeCurrentPost"
    },

    addPost: function(clickEvent) {

      var $postText = this.$el.find("textarea#new-post");
      var m = new this.postModel({
        xelement_id:  this.options.posts_key,
        user_id:      this.options.user_id,
        group_id:     this.options.group_id,
      });
      
      m.setText($postText.val());
      
      // Empty Message
      if (m.getText().length < 1) {

        appHelper.flashMessage({ 
          kind: "error", 
          message: "You cannot send an empty message."
        });

      }
      // Non-Empty Message
      else {
        
        //remove message text in DOM.
        $postText.val("");

        // Mark as a message as from the coach if it is one.
        if ( this.userIsCoach() ) {
          m.setAsCoachMessage(Dynamo.CurrentUser().id);
        }

        m.save(null, { async:false });
        
        // Save Succeeded        
        if (!m.isNew()) {

          this.postsCollection.add(m);

          var emailAtts, successMessage;
          if (!appHelper.isCoach( Dynamo.CurrentUser() )) {
            emailAtts = {
              recipient_username: this.coach.get("username"),
              sender_username:    Dynamo.CurrentUser().get("username"),
            };
            successMessage = "Your message and email notification were sent to your coach. Please allow up to 48 hours for a response.";
          }
          else {
            emailAtts = {
              recipient_username: this.user.get("username"),
              sender_username:    this.coach.get("username")
            }
            successMessage = "You sent a message to "+this.user.get("username");
          }

          appHelper.sendMessageNotification(emailAtts, { 
            success: function() {
              appHelper.flashMessage({ 
                kind: "success", 
                message: successMessage
              });
            },
            error: function() {
              appHelper.flashMessage({ 
                kind: "warn", 
                message: "Your message was sent, but email notification failed; We've received notification and are looking into it."
              });
            }
          });

        }
        // Save Failed
        else {
          
          appHelper.flashMessage({ 
            kind: "error", 
            message: "There was an error and your message was not sent; Please try reloading the page."
          });

        }
      }
    },

    htmlTemplate: ""+
      "<div>"+
        "<textarea id='new-post' class='form-control' placeholder='Start a new conversation.'></textarea><br>"+
        "<button class='btn btn-info' id='submit-post'>Send&nbsp;<i class='icon-long-arrow-right'></i></button>"+
      "</div>"+
      "<div class='row-fluid'>"+
      "<div class='span12'>"+
        "<h3 class='message-header'>Conversations</h3>"+
        "<div id='posts'        class='span5 well'></div>"+
        "<div id='current-post' class='span7'></div>"+
        "</div>"+
      "</div>",

    _postTemplate: _.template(""+
      "<div class='post (%= status_class %)' data-post-id='(%= cid %)'>"+
        "<span class='last-comment pull-right'>(%= last_comment_at %)</span>"+
        "(% if (isCoach) { %)"+
          "(% if (participantHasRead) { %)" +
            "<span class='participant-read-status pull-left' "+
                  "title='This check means the participant has read "+
                          "the latest message in the thread'>"+
                  "<i class='icon-check-sign'></i>"+
            "</span>"+
          "(% } else { %)"+
            "<span class='participant-read-status pull-left' "+
                  "title='The participant has NOT read the latest message you sent."+
                          "The last time they read this thread was (%= last_participant_view %)'>"+
                  "<i class='icon-check-minus'></i>"+
            "</span>"+
          "(% } %)"+ 
        "(% } %)"+
        "<div class='text'>(%= text %)</div>"+
      "</div>"),

    _currentPostTemplate: _.template(""+
        "<div class='created-at'>(%= created_at %)</div>"+
        "<div class='text'>(%= text %)</div>"+
        "<div class='comments'></div>"),

    lastMessageInThread: function(post) {

      var commentsForPost = this.comments.where(function(comment) {
              return ( comment.get_field_value("commented_on_id") == post.id )
            }, { 
               comparator: function(c) { return (new Date(c.get("created_at") )); }
            });

      // commentsForPost.sort();
      var lastComment =  commentsForPost.last();

      return lastComment || post;
    },

    timeOfLastComment: function(post) {

      return new Date( (this.lastMessageInThread(post)).get("created_at") );

    },

    messageIsNew: function(post, lastMessage) {
      var lastViewed;

      // If the current user is not the coach, and the user id of the message belongs to the
      // current user, then clearly the message is not new, as in a two-person conversation,
      // they must have written it.
      if ( this.userIsCoach() && !!lastMessage.get("from_coach") ) { 
        return false;
      }

      lastViewed = post.get_field_value( this.lastViewedField() );
      // If the current user has never viewed the thread before, then it is new.
      if (!lastViewed) { return true }
      // otherwise, compare when the last message was created and when they last viewed it.
      return (new Date(lastMessage.get("created_at")) > new Date(lastViewed) );

    },

    userIsCoach : function() {
      return ( Dynamo.CurrentUser().get("study_role") == "Coach" );
    },

    urgentReplyNeeded: function(post, lastMessage) {

      if (lastMessage.get("user_id") === Dynamo.CurrentUser().id) {
        return false;
      }

      if ( this.userIsCoach() ) {

        var twoDaysInMilli = 1000*3600*48;
        var lastViewed = new Date(post.get_field_value("last_viewed_at"));
        var lastViewedPlusWindow = new Date( lastViewed.getTime() + twoDaysInMilli );

        return (new Date(lastMessage.get("created_at")) > lastViewedPlusWindow )

      };

    },

    urgencyClass: function(post, lastMessage ) {

      if (this.urgentReplyNeeded(post, lastMessage)) {
        return "urgent"
      };

      if (this.messageIsNew(post, lastMessage)) {
        return "unread"
      };

      return "read"

    },

    render: function() {
  
      this.$el.html(this.htmlTemplate);
      this.renderPosts();

      return this;
    },

    participantHasReadLatest: function(post) {

      var lastMessage = this.lastMessageInThread(post);

      if (this.userIsCoach()) {
        
        // if the last message is the original post, then for the moment,
        // then check to see if came from the participant.
        // if it came from the participant, then clearly the participant 
        // has "read" it, as they are the ones who wrote it.
        if (lastMessage.get_field_value("commented_on_id") == void 0) {
          var fromCoach = lastMessage.get_field_value("from_coach");
          if (fromCoach === false || fromCoach === "false") { return true };
        }

        // If the last message is either a comment, or a post from the coach,
        // then compare the last time that the participant looked at the 
        // thread with when the post was created.
        var lastViewedString = post.get_field_value("last_viewed_by_participant_at")
        if (!lastViewedString) { return false };
        var lastViewedTime = new Date( lastViewedString );
        return ( lastViewedTime > (new Date(lastMessage.get("created_at"))) )
        
      }
      else {

        return !this.messageIsNew(post, lastMessage);

      }

    },

    relativeTimestamp: function(datetime) {
      var now = new Date();
      var milliInADay = 3600*24*1000;
      var diffInMilli = Math.abs(now - datetime);
      if (diffInMilli < milliInADay) {
        return datetime.toLocaleTimeString();
      };
      if (diffInMilli < 2*milliInADay  ) {
        return "yesterday, "+datetime.toLocaleTimeString();
      };
      if ( diffInMilli < 15*milliInADay  ) {
        return ( Math.floor(diffInMilli / milliInADay).toString() )+" days ago, "+datetime.toLocaleTimeString();
      };      

      return datetime.toLocaleString()
    },

    renderPosts: function() {

      //fetch Posts.
      this.postsCollection.fetch({ async: false });

      //when Empty.
      if (this.postsCollection.length == 0) {
        this.$el.find('div.posts').text("No messages yet.")
        return this;
      };

      //fetch Group-Wide Comments.
      appHelper.fetchGroupWideData([this.comments]);
      
      this.$el.find('div#posts').empty();

      this.postsCollection.comparator = this.timeOfLastComment;
      this.postsCollection.sort();
      
      var numberUnread = 0;
      this.postsCollection.each(function(post, index) {
            
        var lastMessage = this.lastMessageInThread(post);
        var lastParticipantViewText = post.get_field_value("last_viewed_by_participant_at");

        if (lastParticipantViewText) {
          lastParticipantViewText = new Date(lastParticipantViewText);
        } else {
          lastParticipantViewText = "never";
        };

        var fields = _.extend({}, post.fieldsToJSON(), {
          isCoach               : this.userIsCoach(),
          participantHasRead    : this.participantHasReadLatest(post),
          last_participant_view : lastParticipantViewText,
          status_class          : this.urgencyClass(post, lastMessage),
          last_comment_at       : this.relativeTimestamp(new Date(lastMessage.get("created_at")))
        });

        if (this.messageIsNew(post, lastMessage)) { 
          numberUnread++; 
        }

        this.$el.find('div#posts').prepend( this._postTemplate(fields) );
        
      }, this);

      this.numberUnread = numberUnread;
      if (numberUnread > 0) {
        this.trigger("messages:unread", numberUnread);
      };

      if (this.currentPost) {
        this.$el.find('div.post[data-post-id="'+this.currentPost.cid+'"]')
        .addClass("selected");
      }
      

    },

    changeCurrentPost: function(clickEvent) {

      var postId = $(clickEvent.currentTarget).data("post-id")

      this.currentPost = this.postsCollection.get( postId ) || this.postsCollection.first();
  
      return this.renderCurrentPost();

    },

    lastViewedField: function() {
      return ( this.userIsCoach() ? "last_viewed_by_coach_at" : "last_viewed_by_participant_at" )
    },

    renderCurrentPost: function() {
      var self = this;

      this.$el.find('div#current-post').addClass('well').html( this._currentPostTemplate(this.currentPost.fieldsToJSON()) );
      $('.text').addClass('widget');
      appHelper.fetchGroupWideData([this.comments]);

      
      this.currentPostCommentsView = new CommentsView({
          collectionAtts: {
            xelement_id: this.currentPost.id,
            storyRoot: "coach/"
          },
          reconstructCollection: function() {
            this.collection = self.comments.where(function(comment) {
              return ( comment.get_field_value("commented_on_id") == self.currentPost.id )
            }, { 
               comparator: function(c) { return (new Date(c.get("created_at") )); }
            });
          }
      });

      this.currentPostCommentsView.commentedOnCollection =  this.postsCollection;
      this.currentPostCommentsView.setElement(this.$el.find("div#current-post div.comments:first")[0]);
      this.currentPostCommentsView.render();

      var viewTime = new Date();

      this.currentPost.set_field("last_viewed_at", "datetime", viewTime);
      this.currentPost.set_field(this.lastViewedField(),  "datetime", viewTime);
      this.currentPost.save(null, { async: false });

      this.renderPosts();

      return this.currentPost;
    },  

    reRenderCurrentPostComments: function() {
      if ( this.currentPostCommentsView ) {
        this.currentPostCommentsView.render();        
      }
    }

  });

  return CoachPanelConversationView;

});
