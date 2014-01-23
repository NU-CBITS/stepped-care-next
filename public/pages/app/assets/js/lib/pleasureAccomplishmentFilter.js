define(["lib/appHelper"], function(appHelper) {

  var pleasureAccomplishmentFilter = function(event) {

    var eventFields = event.fieldsToJSON();
    var currentFilters = appHelper.selectedValues("#experience-filters");
    if (currentFilters.length < 1) { return true; }

    if(parseInt(eventFields.actual_pleasure) < 6) {
      var actual_pleasure = "low_actual_pleasure";
    }
    else {
      var actual_pleasure = "high_actual_pleasure";
    }
    
    if(parseInt(eventFields.actual_accomplishment) < 6) {
      var actual_accomplishment = "low_actual_accomplishment";
    }
    else {
      var actual_accomplishment = "high_actual_accomplishment";
    }

    if(parseInt(eventFields.predicted_accomplishment) < 6) {
      var predicted_accomplishment = "low_predicted_accomplishment";
    }
    else {
      var predicted_accomplishment = "high_predicted_accomplishment";
    }

    if(parseInt(eventFields.predicted_pleasure) < 6) {
      var predicted_pleasure = "low_predicted_pleasure";
    }
    else {
      var predicted_pleasure = "high_predicted_pleasure";
    }

    if(_.contains(currentFilters, actual_pleasure) ) {
      return true;
    }

    if(_.contains(currentFilters, actual_accomplishment) ) {
      return true;
    }
    
    if(_.contains(currentFilters, predicted_pleasure) ) {
      return true;
    }
    
    if(_.contains(currentFilters, predicted_accomplishment) ) {
      return true;
    }
  }

  return pleasureAccomplishmentFilter;
  
});