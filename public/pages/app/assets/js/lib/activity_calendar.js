//Calendar
//Depends on fullcalendar.js
define(
  ["models/activity_calendar_event"], 
  function(ActivityCalEvent) {

  var Calendar = (function() {

    chevronArrowIsRight = function($header) {
      return ($header.find('i.icon-caret-right').length !== 0)
    };

    jQuery.fn.openForm = function() {
      var container = $(this);
      var body = container.find(".accordion-body");
      if (body.length === 1) { body.show() };
      if ( chevronArrowIsRight(container) ) {
        if (this.find('i.icon-caret-right').length === 1) {
          this.find('i.icon-caret-right').removeClass('icon-caret-right').addClass('icon-caret-down');
        } else {
          this.find('i.icon-caret-right').removeClass('icon-caret-right').addClass('icon-caret-down');
        }
      }
      return $(this);
    };

    function Calendar(container, eventsFn) {
      this.currentlyRendered = false;
      this.container = container;
      this.filteredEventsFn = eventsFn;
    };

    Calendar.prototype.load = function() {
      var self = this;
      $(this.container).prepend('<div id="calendar"></div>');
      this.$el = $(this.container).find('div#calendar');
      var height = $("#visualizations-outer-container").height() - 40;
      this.$el.fullCalendar({
        height:height,
        header: {
          left: 'agendaDay,agendaWeek,month',
          center: 'title',
          right: 'prev,next today'
        },
        // 
        selectable: true,
        editable: true,
        events: function(start, end, callback) {

          var eventsInPeriod, eventObjs;

          var filtered_events = self.filteredEventsFn();

          eventsInPeriod = filtered_events.filter(function(event) { 
            return (
              ( event.get_field_value('start') >= start && event.get_field_value('start') <= end ) || 
              ( event.get_field_value('end') >= start && event.get_field_value('end') <= end )
            );
          });

          eventObjs = eventsInPeriod.map(function(event) { 
            return _.extend({id: event.cid}, event.fieldsToJSON()) 
          });

          callback(eventObjs);
        },
        
        eventClick: function(calEvent, jsEvent, view) {
          var bbModel = UsersActivities.get(calEvent.id);
          editActivityView.updateModel( bbModel );
          //editActivityView should have an updated start time and an updated 'currentState'
          $('div#edit-event-container').openForm().effect("highlight", {}, 1000);
        },

        dayClick: function(timeClicked, allDay, jsEvent, view) {
          var y = timeClicked.getFullYear(),
              m = timeClicked.getMonth(),
              d = timeClicked.getDate(),
              h = timeClicked.getHours(),
              min = timeClicked.getMinutes();

          if (allDay) {
            h = 12;
            min = 0;
          };

          var newModel =  new ActivityCalEvent({
                            xelement_id: ACTIVITIES_GUID,
                            user_id: Dynamo.CurrentUser().id,
                            group_id: Dynamo.CurrentUser().get("group_id")
                          }),
              s = new Date(y, m, d, h, min),
              e = new Date(y, m, d, h+1, min);
          newModel.set_field('start', 'datetime', s);
          newModel.set_field('end', 'datetime', e);
          editActivityView.updateModel(newModel);
          $('div#edit-event-container').openForm().effect("highlight", {}, 1000);
        }    
      });

    };

    Calendar.prototype.reload = function() {
      this.$el.fullCalendar( 'refetchEvents' );
    };

    Calendar.prototype.remove = function() {
      this.currentlyRendered = false;
      this.$el.remove();
    };   

    Calendar.prototype.render = function() {

      if (!this.currentlyRendered) {
        this.load();
        this.currentlyRendered = true;
      } else {
        this.reload();
      }

    };

    return Calendar;

  }) ();


  return Calendar;
})
