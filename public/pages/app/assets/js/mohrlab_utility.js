// Must Fit the Schema Listed At
// http://mohrlab.northwestern.edu/utility/sendmail.cfm
// msgFields
// { 
//   "from"     : "emailsender@example.com",
//   "to"       : "emailreceiver@example.com",
//   "subject"  : "email plain text example",
//   "contents" : "mime type compatible contents",
//   //optional
//   "mime"     : "[text] | plain | html",
//   "cc"       : "trish@example.com, gabe@example.com",
//   "bcc"      : "evan@example.com, chris@example.com"
// }
SendEmail = function(msgFields, ajax_opts) {
  var aOpts = _.extend({ 
    url: "http://mohrlab.northwestern.edu/utility/sendmail.cfm", 
    type: "POST", 
    data: { mailJSON: JSON.stringify(msgFields) } 
  }, ajax_opts);
  $.ajax(aOpts);
};

// Must Fit the Schema Listed At
// http://mohrlab.northwestern.edu/utility/log.cfm
//
// the payload is expected to pass in the following keys:
// event_type
// readable_content
// content_object
RECENT_FAILED_LOGS = 0;
LogReviewableUserAction = function(payload, ajax_opts) {

  var complete_payload = _.extend({
    client_environment : ENVIRONMENT,
    study_name : "Social_Networking",
    group_id: Dynamo.CurrentGroup().id,
    user_id: Dynamo.CurrentUser().id,
    username: Dynamo.CurrentUser().get("username"),
    session_id: localStorage.getItem("session_id"),
    created_at: ((new Date()).toString()),
  }, payload);

  var aOpts = _.extend({ 
    url: "http://mohrlab.northwestern.edu/utility/log.cfm", 
    type: "POST", 
    data: { logJSON: JSON.stringify(complete_payload) }, 
    error: function(jqXHR, textStatus, errorThrown) {
      console.warn("Logging Action Failed: ", jqXHR, textStatus, errorThrown);
      ++RECENT_FAILED_LOGS;
      SendEmail({
        "mime"      : "text/html",
        "from"      : "cbits@northwestern.edu",
        "to"        : "j-ho@northwestern.edu, j-duffecy@northwestern.edu, m.begale@gmail.com",
        "subject"   : "Social Networking - ERROR: Log Failure",
        "contents"  : (
          t.h3("The following was not logged successfully:") +
          t.div( t.p(JSON.stringify(complete_payload)) ) +
          t.div("# logs recently failed: "+RECENT_FAILED_LOGS)
        ),
        "cc": "",
        "bcc": ""
      });
    },
    success: function(data, textStatus, jqXHR) {
      console.log("Action Logged: ", data, textStatus, jqXHR);
      RECENT_FAILED_LOGS = 0;
    }
  }, ajax_opts);

  $.ajax(aOpts);

};