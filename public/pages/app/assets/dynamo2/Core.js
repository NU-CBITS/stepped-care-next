// Dynamo.Core.js

// Dynamo is a client-side Xelements framework
// built on top of Backbone.js
//
// Dynamo's Hard Dependencies are:
//
// Underscore.js
// jQuery.js
// Backbone.js
//
// Its purpose is to simplify the coding of client-side applications
// that adhere to the Trireme-expected schema of Xelements, Users, Groups, and Data.
//
// Dynamo is split up into core files and domain-specific files.
//
// The Core Specifies a set of Backbone-based Models, Views, and Collections
// for interaction with a Trireme-based Xelements-schema server endpoint as well as classes
// that handle the core xelements-schema classes of xelements, users, groups, and data.
//
// Domain-specific files specify a set of additional Model, View and Collection Backbone-based classes for Xelements
// that provide differentiated functionality based upon an Xelement's xelement_type.
// (ITLR: Users, Groups, Data as well? for the moment, unlikely.)
//
// Separating Dynamo into these two sections is part of a design that allows selection of
// Dynamo 'core' attributes that can then later affect the definition of classes in the domain-specific files.
//
// That is, the way that domain-specific classes operate can be altered based upon how Dynamo is configured after the
// inclusion of Dynamo Core files.
//
// Pragmatically, including Dynamo should be done in multiple steps:
//
// <script type="text/javascript" src="JS/Dynamo/Dynamo.Core.js "></script>
// <!-- Define The Location of Trireme -->
// <script>  Dynamo.TriremeURL = "https://[Fill in]";  </script>
// <script type="text/javascript" src="JS/Dynamo/Dynamo.Core.Models.js"></script>
// <script type="text/javascript" src="JS/Dynamo/Dynamo.Core.Collections.js"></script>
// <script type="text/javascript" src="JS/Dynamo/Dynamo.Core.Views.js"></script>
// <script>
//    Dynamo.XelementClass = Dynamo.UnitaryXelement; // Define the Xelement Model Class to be used in the mantle classes.
// </script>
//
// Free to include additional domain-specific files, such as "Guides.Views"
//

// Due to the way that we initialize any Global Templates,
// We change underscore Template Settings!
// We Define:
// - an interpolate regex to match expressions that should be interpolated verbatim,
// - an escape regex to match expressions that should be inserted after being HTML escaped,
// - an evaluate regex to match expressions that should be evaluated without insertion into the resulting string.

_.templateSettings = {
  evaluate    : /\(%([\s\S]+?)%\)/g,
  interpolate : /\(%=([\s\S]+?)%\)/g,
  escape      : /\(%-([\s\S]+?)%\)/g
};


Dynamo = {};
_.bindAll(Dynamo);


Dynamo.initialize = function(options) {
  Dynamo.loadTemplates(options);
}

// For interaction with phonegap; will return the phone's ID if it has one.
Dynamo.deviceID = function() {

  if ( (typeof(device) != "undefined") && _.isObject(device) && device.uuid) {
    return device.uuid;
  }
  else {
    return "NO-DEVICE-ID";
  };

};

Dynamo.changeLocation = function(newLocation) {
  window.location.href = newLocation;
};

Dynamo.replaceLocation = function(newLocation) {
  window.location.replace(newLocation);
};

Dynamo.redirectTo = function(fileName, options) {
  var path = location.pathname.split("/")
  path[path.length - 1] = fileName;
  if (options && options.as && options.as == "link") {
    Dynamo.changeLocation( path.join("/") );
  } else {
    Dynamo.replaceLocation( path.join("/") );
  }
};

// Authenticating User
// In most circumstances, the Authenticating User will be the current user,
// but in circumstances where we would simply like to authenticate as the Application,
// we can override the Authenticating User and leave the CurrentUser as is.
Dynamo.AUTHENTICATING_USER_ID = function() { 
  var authenticatingUser = Dynamo.CurrentUser().id || "STEPPED-CARE-TEST-USER";
  return authenticatingUser 
};

Dynamo.ApplicationAuthorization = function(appXel) {

  function coerceToNumber(maybeNum) {
    return typeof(maybeNum) == "number" ? maybeNum : 1;
  };

  _.bindAll(this);
  this.authProperties = appXel.authorizingProperties || [];
  this.propTypes = appXel.authorizingPropertyTypes || {};
  this.propDefaults = appXel.authorizingPropertyDefaults || {};
  this.propValues = appXel.metacontent().authorizingPropertyValues || { self: {}, sub_elements: {} };
  
  this.propDefault = function(property) {
    if ( ! _.contains(this.authProperties, property) ) {
      throw (new Error("property '"+property+"' is not valid for authorization") );
    }
    return this.propDefaults[property];
  };

  this.getElementPropValue = function(elementId, property) {
    if ( this.propValues[elementId] && this.propValues[elementId].self ) {
      return this.propValues[elementId].self[property]
    }
    else {
      return null;
    }
  };

  this.getNestedElementPropValue = function(parentId, elementId, property) {
    try {
      subElementAuth = this.propValues[parentId].sub_elements[elementId];  
    }
    catch(e) {
      subElementAuth = false;
      console.warn("Error raised trying to find authorization values for Xelement ", parentId, e);
    }
    
    if (subElementAuth) {
     return Dynamo.strToType(this.propTypes[property], subElementAuth.self[property]);
    }
    return void 0;
  };

  this.authPropVal = function(property, elementId, parentElementId) {
    var default_value =  this.propDefault(property);

    if (parentElementId) {

      var parentAuthValue = this.getElementPropValue(parentElementId, property) || default_value;

      return [ parentAuthValue, this.getNestedElementPropValue(parentElementId, elementId, property) ];

    };

    if ( this.getElementPropValue(elementId, property) ) {
      return [ this.getElementPropValue(elementId, property) ]
    }
    else {
      return [ default_value ]
    }

  };

  this.usableNumDaysIn = function(elementId, parentElementId) {
    var firstAvailabilityArray = this.authPropVal("firstAvailability", elementId, parentElementId);
    var usableOnDay = _.max(_.compact(firstAvailabilityArray));
    // console.log("In AppAuth usableNumDaysIn (elementId, parentId), array, usableOnDay)", elementId, parentElementId, firstAvailabilityArray, usableOnDay );
    return usableOnDay;
  };

};

Dynamo.initializeApplicationAuthorization = function(appXelement) {
  if (! Dynamo._currentAuthorization ) {
    Dynamo._currentAuthorization = new Dynamo.ApplicationAuthorization(appXelement);
  }
};



//
// Current Session and Login
// -------------
//
// A collection of functions for handling logins
// and session data.
// 

Dynamo.session = {};
Dynamo.session.set    = function(key, value) { 
  return window.sessionStorage.setItem(key, value); 
}

Dynamo.session.get    = function(key) { 
  return window.sessionStorage.getItem(key); 
}

Dynamo.session.remove = function(key) { 
 return  window.sessionStorage.removeItem(key);
}


// CurrentUser
// Function which returns the currently authenticated user,
// or redirects to the login page.
Dynamo.CurrentUser = function() {

  // If already defined.
  if (Dynamo._CurrentUser) {
    return Dynamo._CurrentUser;
  }

  // For testing, let some Dynamo params define the current user:
  if (Dynamo.CURRENT_USER_ID && Dynamo.CURRENT_GROUP_ID) {
    Dynamo._CurrentUser =  new User({
      guid: Dynamo.CURRENT_USER_ID,
      group_id: Dynamo.CURRENT_GROUP_ID
    });
    return Dynamo._CurrentUser;
  };

  if ( Dynamo.session.get('CurrentUser') ) {

    // $.cookie.json = true;
    var user_atts = JSON.parse(Dynamo.session.get('CurrentUser'));
    
    // USERS is expected to be the globally defined and available of collection of users.
    if (typeof(USERS) !== "undefined") {
      Dynamo._CurrentUser = USERS.get(user_atts.guid);

      // Having a CurrentUser Item in LS, but having it not be part of available users =
      // particular / uncommon situation more likely related to admins w/ different envs for same app;
      if (!Dynamo._CurrentUser) {
        Dynamo.session.remove('CurrentUser');
        alert("It seems you are signed in as a nonexistent user; You will be brought to the login page.");
        Dynamo.redirectTo("login.html");
      };

    } else {

      // Must not matter too much; Create a Dummy user.
      Dynamo._CurrentUser = new Dynamo.User(user_atts)

    };

    return Dynamo._CurrentUser;
  };

  // no cookie exists and...
  if (Dynamo.loginRequired()) {

    Dynamo.redirectTo("login.html");

  }
  else {
    
    Dynamo._CurrentUser = new Dynamo.User({
      phone_guid: "DEFAULT-DYNAMO-USER_"+Dynamo.deviceID(),
      username: "DEFAULT-DYNAMO-USER_"+Dynamo.deviceID(),
      group_id: "DEFAULT-DYNAMO-USER-GROUP-1"
    });

    Dynamo._CurrentUser.dualstorage_id = "CURRENT-USER";
    Dynamo.session.set('CurrentUser', JSON.stringify(Dynamo._CurrentUser.toJSON()));
    Dynamo.session.set('CurrentUserSaved', "false");
    
    Dynamo._CurrentUser.save({
      success: function() {
        Dynamo.session.set('CurrentUser', JSON.stringify(Dynamo._CurrentUser.toJSON()));
        Dynamo.session.set('CurrentUserSaved', "true");
        console.log("Dynamo._CurrentUser was saved: ", Dynamo._CurrentUser);
      }
    });

    return Dynamo._CurrentUser;
  };

};

Dynamo.CurrentGroup = function() {
  if (typeof (USER_GROUPS) == "undefined") {
    new Error("CurrentGroupMembers expects a global variable, USER_GROUPS, which contains all available groups.")
  };
  return ( USER_GROUPS.get(Dynamo.CurrentUser().get('group_id') ) )
}

Dynamo.CurrentGroupMembers = function() {
  if (typeof (USER_GROUPS) == "undefined") {
    new Error("CurrentGroupMembers expects a global variable, USER_GROUPS, which contains all available groups.")
  };
  return ( USER_GROUPS.get(Dynamo.CurrentUser().get('group_id') ) ).users
};

// A page using dynamo can require that a user be logged in.
// defaults to false.
Dynamo._loginRequired = false

// Check if Dynamo is currently requiring a log in by the user
Dynamo.loginRequired = function() {
  return Dynamo._loginRequired;
};

//Method which logs in a user
Dynamo.login = function(user_atts, redirectPath) {

  var sessionId = guid();
  Dynamo.session.set('CurrentUser', JSON.stringify(user_atts));
  Dynamo.session.set('SessionId', sessionId);

  var sessionEvent =  new Dynamo.Data({
                        user_id: user_atts.guid,
                        group_id: user_atts.group_id,
                        xelement_id: "STEPPED-CARE-SESSIONS-GUID",
                        session_id: sessionId
                      });
  sessionEvent.set_field("session_id", "string", sessionId);
  sessionEvent.set_field("action", "string", "login");
  sessionEvent.save(null, { async:false });
  
  Dynamo.redirectTo(redirectPath, { as: "link"});

};

// Method called on page in which you would like to require
// a user to be logged in.
Dynamo.requireLogin = function() {
  Dynamo._loginRequired = true;
};


//
// loadTemplates
// -------------
//
// Allowing for completely-client-side templating independent of
// the page on which they live proved a challenging problem to find a solution for,
// This solution works as follows:
// - If no templates exist, change to to templates.html
// in order to load them into local storage.
// if it is specified in the options to also load application-specific templates,
// then load those as well.
// upon completion, it is expected that we will return to the URL from which this
// method was called.
// This method will again be called from the beginning,
// but, having found templates, the page will continue to load as normal.
//
// If we are currently on:
//   http://www.somedomain.com/index.html
// dynamo's templates.html are expected to be at:
//   http://www.somedomain.com/dynamo/templates.html
// an application's templates are expected to be at:
//   http://www.somedomain.com/app_templates.html
Dynamo.loadTemplates = function(options) {
  if (DIT) {
    Dynamo.DIT = DIT;
    //If the DIT variable exists here, then it assumes you have defined DIT in a javascript file that defines all necessary templates;
    return;
  };

  // If DIT is not already defined, then there are two circumstances: Either templates have been stored in localStorage already,
  // or we need to redirect to dynamo/templates.html to store them in localStorage.

  DIT = localStorage.getItem("DYNAMO_TEMPLATES");
  if (!DIT) { //redirect.

    var path = window.location.href.split("/");

    if (options && options.load_app_templates) {

      path[path.length - 1] = "app_templates.html";
      localStorage.setItem("AFTER_DYNAMO_TEMPLATE_LOAD_URL", path.join("/"));
      localStorage.setItem("AFTER_APPLICATION_TEMPLATE_LOAD_URL", window.location.href);

    }
    else {

      localStorage.setItem("AFTER_DYNAMO_TEMPLATE_LOAD_URL", window.location.href);

    };

    path[path.length - 1] = "dynamo/templates.html";
    window.location.href = path.join("/");

  } else { //parse from localStorage.

    $(window).on("unload", function() {
      localStorage.removeItem("AFTER_DYNAMO_TEMPLATE_LOAD_URL");
      localStorage.removeItem("DYNAMO_TEMPLATES");
      localStorage.removeItem("APPLICATION_TEMPLATES");
    });

    DIT = Dynamo.DIT = JSON.parse(DIT);

  };

};

Dynamo.loadAppTemplates = function() {
  DAT = localStorage.getItem("APPLICATION_TEMPLATES");
  if (!DAT) {


    window.location.href = templatesLocation;
  } else {
    $(window).on("unload", function() {

    });
    DAT = JSON.parse(DAT);
  };

}


// Underscore methods that we want to implement on a Model.
var methods = ['forEach', 'each', 'map', 'reduce', 'reduceRight','keys', 'values', 'pick', 'isEmpty', 'isEqual'];
// Mix in each Underscore method as a proxy to `Model#attributes`.
_.each(methods, function(method) {
  Backbone.Model.prototype[method] = function() {
    return _[method].apply(_, [this.attributes].concat(_.toArray(arguments)));
  };
});


//
//
// Override Backbone.sync
//

Dynamo._previousSync = Backbone.sync;

Dynamo.AuthenticatedSync = function (method, model, options) {
  // Default options, unless specified.
  options || (options = {});
  
  // Ensure appropriate session variables for authentication.
  options.beforeSend = function(jqXHR, settings) {
    settings.url = Dynamo.addSessionVarsToUrl(settings.url);
    if (settings.data) {
      var new_data = JSON.parse(settings.data);
      new_data.transmitted_at = (new Date()).toString();
      settings.data = JSON.stringify(new_data);
    };
  };

  return Dynamo._previousSync(method, model, options);
};

Backbone.sync = Dynamo.AuthenticatedSync

//
//
// Additional Sync Functions
//

ReadOnlySync = function (method, model, options) {
    console.log("Using ReadOnlySync", method, model, options);
    // Default options, unless specified.
    options || (options = {});
    switch(method) {
      case "create":
      case "update":
        throw new Error("ReadOnlySync prevents saving this model to the server.");
        break;
      case "read":
        return Backbone.sync("read", model, options);
        break;
      case "delete":
        throw new Error("ReadOnlySync prevents deleting this model from the server.");
        break;
      default:
        throw new Error("Unexpected value for argument, 'method': '"+method+"' passed to PsuedoSync");
    };
};

PseudoSync = function (method, model, options) {
    console.log("Using PsuedoSync; No actual save-to or read-from server.", method, model, options);
    // Default options, unless specified.
    options || (options = {});
    switch(method) {
      case "create":
      case "update":
        return {};
        break;
      case "read":
        alert('PseudoSync: read operation attempted');
        throw new Error("PsuedoSync mocks Backbone.sync's response from the server; it cannot read data");
        break;
      case "delete":
        console.warn("PsuedoSync: delete operation attempted; Not 100% what return value should be...")
        return {};
        break;
      default:
        throw new Error("PsuedoSync: Unexpected value for argument, 'method': '"+method+"'");
    };
};


// ************************************************
//
// Helper Vars and Functions
//
// ************************************************

Dynamo.s4 = function() {
  return Math.floor((1 + Math.random()) * 0x10000)
             .toString(16)
             .substring(1);
};

Dynamo.guid = function() {
  return Dynamo.s4() + Dynamo.s4() + '-' + Dynamo.s4() + '-' + Dynamo.s4() + '-' +
         Dynamo.s4() + '-' + Dynamo.s4() + Dynamo.s4() + Dynamo.s4();
}

//copied out of Backhand.js
Dynamo.addSessionVarsToUrl = function(url) {
  var new_url;
  var sessionId = Dynamo.session.get('SessionId') || "YO-IMA-SESSION-ID";

  new_url = addQueryVarToUrl("user_id", _.result(Dynamo, "AUTHENTICATING_USER_ID"), url);
  new_url = addQueryVarToUrl("session_id", sessionId, new_url);
  return new_url;
};

addQueryVarToUrl = function(name, value, url) {
  var new_url;
  new_url = url;
  if (new_url.search(new RegExp("(?:\\?|&)" + name + "=")) === -1) {
    if (new_url.indexOf("?") === -1) {
      new_url = new_url + "?";
    } else {
      new_url = new_url + "&";
    }
    new_url = new_url + ("" + name + "=" + value);
  }
  return new_url;
};

/**
 * convertFalses
 * A helper function that replaces
 * the string 'false' in an object with the value false
 * and returns the object. It doesn't create a copy; it changes the object itself.
 * the need for this function arises from needing to parse
 * objects contained within strings that Trireme may ship to the client.
 *
 * @param  {[object]} obj [any js object of any depth]
 * @return {[object]}     [the object with any strings 'false' replaced with the value false]
*/
convertFalses = function(str_obj_or_other) {
  if (str_obj_or_other === "false") { return false; };
  if ( _.isObject(str_obj_or_other) ) {
    _.each(str_obj_or_other, function(val, key) {
      str_obj_or_other[key] = convertFalses(val);
    });
  };
  return str_obj_or_other;
};

// Deprecated at this point, but may come back into favor
// Returns true if the 'core' of dynamo is stable, 
// (i.e., The Xelements Class we are using has been chosen)
// false otherwise.
Dynamo.isCoreStable = function() {
  if ( typeof(this.XelementClass) == "undefined" ) { return false };
  return true;
};

/**
 * JSONparseNested
 * A helper function that takes a string
 * which is presumably a JSON object that has then been
 * stringified an arbitrary number of times and then returns
 * the result of parsing the string until it is an object
 * @param  {[object]} stringified_json [a string which is, presumably at some level of escaping, a JSON object]
 * @return {[object]} [ the json object ]
*/
JSONparseNested = function(stringified_json) {

  //  undefined / null values become an empty object.
  if (stringified_json === null || typeof(stringified_json) === "undefined" ) { return {}; };

  var result = stringified_json;

  try {
    while ( _.isString(result) ) { result = JSON.parse(result); };
  }
  catch (e) {
    console.warn("JSONparseNested(): Error parsing string as possible_object: ")
    console.log(e);
    console.log("Instead, leaving string as is: ");
    console.log(result);
  };

  return result;

};


/**
 * stringToXelementType
 * A helper function that takes
 * a type and a string and attempts to convert it to a specified type
 * as is the case for XelementCMS content
 * i.e.
 *
 * @param  {string} type [a string of the type to convert]
 * @return {[object]}     [the object with any strings 'false' replaced with the value false]
*/
stringToXelementType = function(type, value) {
  try {
    switch(type) {
      case 'html':
      case 'string':
        if (value === null || typeof(value) === 'undefined') {
          return ""
        } else {
          return value;
        };
        break;
      case 'int':
        return parseInt(value);
        break;
      case 'Date':
        return new Date(value);
        break;
      case 'array':
      case 'xelementGuidArray':
      case 'json':
        try {
          return JSON.parse(value);
        }
        catch (error) {
           if (type == 'json') {
            return {}
           } else {
            return []
          };
        };
        break;
      case 'bool':
      case 'javascript':
        return eval(value);
        break;
      default:
        throw new Error("stringToXelementType(): unexpected type: '"+type+"' ");
    };
  }
  catch (error) {
    console.warn("error attempting to convert string '"+value+"' to type: '"+type+"'", error);
    return null;
  };
}

// stringToBoolean
// I would love to be able to write:
// Object.defineProperty(String.prototype, "to_bool", {
//     get : function() {
//         return (/^(true|1)$/i).test(this);
//     }
// });
// but this doesn't work in Firefox b/c of a bug in their Javascript engine:
// https://bugzilla.mozilla.org/show_bug.cgi?id=720760
// so instead:
Dynamo.strToBool = function(str) {
  if (str === true || str === false) {
    return str;
  };
  return (/^(true|1)$/i).test(str);
};

Dynamo.strToType = function(type, maybeString) {
  switch (type) {
    case "bool":
    case "boolean": 
      return Dynamo.strToBool(maybeString);
      break;
    case "date":
    case "Date": 
      return ( new Date(maybeString) );
      break;
    case "int": 
    case "integer": 
    case "number": 
      if ( _.isNumber(maybeString) ) { return maybeString }
      return parseInt(maybeString);
      break;
    case "array":
    case "object":
    case "json":
    case 'xelementGuidArray':
      if ( _.isArray(maybeString) ||  _.isObject(maybeString) ) { return maybeString }
      try {
        return JSON.parse(maybeString);
      }
      catch (error) {
         if (type == 'json') {
          return {}
         } else {
          return []
        }
      }      
      break;
    case "function":
      if ( _.isFunction(maybeString) ) { return maybeString }
      return (emaybeString(maybeString));
      break;
    case 'html':
    case 'string':
      try {
        return maybeString.toString();
      }
      catch (e) {
        console.warn("conversion to string failed for: "+maybeString);
        return "";  
      }        
      break;
    case 'javascript':
      return eval(maybeString);
      break;      
    default: 
      console.warn("type does not match any expected value! (type, val)", type, maybeString);
      return maybeString;
  }
};
