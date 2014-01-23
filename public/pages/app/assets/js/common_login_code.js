  function S4() {
   return (((1+Math.random())*0x10000)|0).toString(16).substring(1);
  };
  
  function guid() {
     return (S4()+S4()+"-"+S4()+"-"+S4()+"-"+S4()+"-"+S4()+S4()+S4());
  };

  function disable(selector) {
    $(selector).each(function() {
      $(this).attr("disabled", "disabled");
    });    
  };

  function enable(selector) {
    $(selector).each(function() {
      $(this).removeAttr('disabled');
    });
  };

  function defineOnSubmitHandler(successCb) {
   $('form#login').on("submit", function(e) {
      e.preventDefault();
      var formValues;
      $("div#flash").text("");
      disable('form#login button');
      disable("form#login input[type='submit']");
      $.ajax(Dynamo.TriremeURL+"/sessions", {
        type: "POST",
        dataType:"json",
        data: $("form#login").serialize(),
        success: successCb,
        error: function(jqXHR, textStatus, errorThrown) {
          $("div#flash").html("<div class='text-error'>Incorrect username or password.</div>");
        },
        complete: function() {
          enable('form#login button');
          enable("form#login input[type='submit']");
        }
      });
      
      return false;
    });    
 };