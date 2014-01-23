ko.bindingHandlers.slider = {
  init: function (element, valueAccessor, allBindingsAccessor) {
    var options = allBindingsAccessor().sliderOptions || {};
    $(element).slider(options);
    ko.utils.registerEventHandler(element, "slidechange", function (event, ui) {
        var observable = valueAccessor();
        observable(ui.value);
    });
    ko.utils.registerEventHandler(element, "slide", function (event, ui) {
        var observable = valueAccessor();
        observable(ui.value);
    });
    ko.utils.domNodeDisposal.addDisposeCallback(element, function () {
        $(element).slider("destroy");
    });
  },
  update: function (element, valueAccessor) {
    var value = ko.utils.unwrapObservable(valueAccessor());
    if (isNaN(value)) value = 0;
    $(element).slider("value", value);
  }
};



// An Integreation of selectize
// https://github.com/brianreavis/selectize.js
ko.bindingHandlers.selectizeText = {
  init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
    var options = allBindingsAccessor().selectizeOptions || {};
    options.onChange = function(value) {
      var observable = valueAccessor();
      observable(value);
      viewModel;
      bindingContext;
    };
    $(element).selectize(options);
    ko.utils.domNodeDisposal.addDisposeCallback(element, function () {
        delete element.selectize;
    });
  }
  ,
  update: function (element, valueAccessor) {
    var observable = valueAccessor();
    element.selectize.setValue(observable());
  }
};

// This function exists in ko, but is minimized in the compiled version,
// so including it here so that below bindingHandler will work. 
ko.utils.emptyDomNode = function (domNode) {
                            while (domNode.firstChild) {
                                ko.removeNode(domNode.firstChild);
                            }
                        }

// An attempt to protect against basic Cross-Site Scripting Attacks
// http://dotnetfollower.com/wordpress/2013/02/knockout-js-htmlnoscript-binding/
ko.bindingHandlers.htmlNoScripts = {
    init: function () {
        // Prevent binding on the dynamically-injected HTML
        return { 'controlsDescendantBindings': true };
    },
    update: function (element, valueAccessor, allBindingsAccessor) {
        // First get the latest data that we're bound to
        var value = valueAccessor();
        // Next, whether or not the supplied model property is observable, get its current value
        var valueUnwrapped = ko.utils.unwrapObservable(value);
        // disable scripts
        var disarmedHtml = valueUnwrapped.replace(/<script(?=(\s|>))/i, '<script type="text/xml" ');
        // create a wrapping element
        var newSpan = document.createElement('span');
        // safely set internal html of the wrapping element
        newSpan.innerHTML = disarmedHtml;
        // clear the associated node from the previous content
        ko.utils.emptyDomNode(element);
        // add the sanitized html to the DOM
        element.appendChild(newSpan);
    }
};