define(["lib/appHelper"], function(appHelper) {
  
  var timeFrameFilter = function (event) {

    var timeFilters = appHelper.selectedValues("#time-filters");

    if ( _.isEmpty(timeFilters) ) { return true };

    //if not empty, gotta figure out if event fits filters;
    var eventStart = event.get_field_value('start'),
        eventEnd = event.get_field_value('end');

    var earliestAcceptableStartTime = null, 
        latestAcceptableEndTime = null;

    if ( _.contains(timeFilters, "mornings") ) {
      // earliestAcceptableStartTime = 5;
      // latestAcceptableEndTime = 12
      var hoursRange, hoursArray = [5, 6, 7, 8, 9, 10, 11];
      hoursRange = _.range(eventStart.getHours(), eventEnd.getHours())
      if (!(_.isEmpty(_.intersection(hoursRange, hoursArray)))) {return true}
    }

    if ( _.contains(timeFilters, "afternoons") ) { 
      // if (earliestAcceptableStartTime == null) {
      //   earliestAcceptableStartTime = 12;
      // };
      // latestAcceptableEndTime = 12 + 6;
      var hoursRange, hoursArray = [12, 13,14, 15, 16, 17];
      hoursRange = _.range(eventStart.getHours(), eventEnd.getHours())
      if (!(_.isEmpty(_.intersection(hoursRange, hoursArray)))) {return true}
    };

    if ( _.contains(timeFilters, "evenings") ) { 
      // if (earliestAcceptableStartTime == null) {
      //   earliestAcceptableStartTime = 12+6;
      // };
      // latestAcceptableEndTime = 23;
      var hoursRange, hoursArray = [18, 19, 20, 21, 22, 23, 24];
      hoursRange = _.range(eventStart.getHours(), eventEnd.getHours())
      if (!(_.isEmpty(_.intersection(hoursRange, hoursArray)))) {return true}
    };

    // if (eventStart.getHours() < earliestAcceptableStartTime) { return false }
    // if ( (eventEnd.getHours() < 5) || (eventEnd.getHours() > latestAcceptableEndTime) ) { return false }

    // return true;
    return false;
  }

  return timeFrameFilter;

});