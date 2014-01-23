//
//  Dynamo.Core.Views.js
//
//  Dependencies:
//    - Dynamo.Core.js
//    - Dynamo.Core.Models.js


// ************************************************
// GLOBAL TEMPLATES
// ----------------
//
// Global templates are defined in templates.html
// and are loaded on Dynamo.initialize into a Global object, DIT
// (the acronym for the silly name, Dynamo Instant Templates);
//
// Each Dynamo view has a default template in templates.html
// for which the id of the template is the key in the DIT object.
//
// Instead of using the default template loaded into the DIT object
// from templates.html, users can pass in their own template as an option
// to a view.
// See Core.js and the loadTemplates function for deeper grokking.
// ************************************************

// ************************************************
//
// View Helper Vars and Functions
//
// ************************************************

renderInDialog = function(view, dialog_opts) {
  var $popup, opts;

  opts = {
    autoOpen: true,
    modal: true,
    width: "auto",
    height: "auto",
    position: { my: "right top", at: "right top" },

    close: function (beforeCloseEvent) {
      //Attempt cleanup / avoid mem leaks.
      view.trigger('close');
      view.remove()
      view = null;
    }
  };

  opts = _.extend(opts, dialog_opts);

  // Global Popup Container
  if ( $('div#popup_container').length == 0 ) {
    $('body').append('<div id="popup_container"><div>')
  };

  $popup = $('div#popup_container');
  $popup.empty();
  $popup.dialog(opts);
  $popup.append( view.$el );
  view.render();

  return $popup;
};


// Select the appropriate view class for a for a particular type of form input
viewClassForInputType = function (input_type) {
  switch( input_type ) {
    case "text": case "textarea":
      return Dynamo.TextInputView;
      break;
    case "radio": case "select": case "checkbox":
      return Dynamo.InputGroupView;
      break;
    case "range":
      return Dynamo.InputRangeView;
      break;
    case "slide": case "slider":
      return Dynamo.InputSliderView;
      break;
    default:
      throw "viewClassForInputType: No view class defined for input_type '"+input_type+"'";
      break;
  };
};

function HTMLizeJSON(obj) {
  html = "";
  _.each(obj, function(value, key) {
    if ( _.isObject(value) ) {
      html = html +
            "<div>"+
              "<span class='key'>"+key+"</span>" +
              "<span class='value'><div class='sub_object'>"+(HTMLizeJSON(value))+"</div></span></div>";
    }
    else if ( _.isArray(value) ) {
      html = html + "<div><span class='key'>"+key+"</span>"+"<span class='value'><div class='array'>"+(_.each( value, function(el) { return HTMLizeJSON(el)} ))+"</div></span></div>";
    }
    else {
      html = html + "<div><span class='key'>"+key+"</span>"+"<span class='value'>"+value+"</span></div>";
    }
  })
  return html;
}


// Fundamental Type Views
//

// showArrayView
// a view (simplified in comparison to Backbone.View),
// which will perform only the very core functions of rendering an Array (instead of a full Backbone.Model instance)
// requires the following options:
// container: DOM element string identifier, inside of which showArrayView will render;
// getArrayFn: function which, when called, will return the array to render
// elementTemplate: underscore.js template string which will be passed each array element successively
ShowArrayView = Dynamo.ShowArrayView = (function() {

  function showArrayView(options) {
    options = options || {};
    
    if (options.container) {
      
      this.container =      options.container || "<div></div>";
      this.$container =     $(options.container);

      this.el =             options.el || '<div class="array-view list-group"></div>';
      this.$container.prepend(this.el);
      this.$el =            $(options.container).find('.array-view:first');

    }
    else {
      this.el  = options.el || '<div class="array-view list-group"></div>';
      this.$el = $(this.el)
    }

    this.getArrayFn = options.getArrayFn;
    this.contentWhenEmpty = options.contentWhenEmpty;
    this.elementTemplate = options.elementTemplate;
    this.onElementClick = options.onElementClick;
    this.title = options.title;
  };

  showArrayView.prototype._elementTemplate = function(data, settings) {
    if (!this.compiled_template) {
      if (!this.elementTemplate) { throw new Error("should define Element Template for showArrayView") }
      this.compiled_template = _.template(this.elementTemplate);
    };
    return this.compiled_template(data, settings);
  }

  showArrayView.prototype.remove = function() {
    this.$el.remove();
  }

  showArrayView.prototype.render = function() {
    var fields;
    this.$el.empty();

    var elements = _.result(this, "getArrayFn");

    if (elements.length > 0) {
      _.each(elements, function(element) {
        this.$el.append( this._elementTemplate({item: element}) );
      }, this);
    } else {
      this.$el.html((this.contentWhenEmpty || "<div>None</div>"));
    }

    if (this.onElementClick) {
      this.$el.find('div.item').on('click', this.onElementClick);  
    };

    return this;

  };

  showArrayView.prototype.setElement = function(selectorOrElement) {
    this.$el = $(selectorOrElement);
  }

  return showArrayView

}) ();


/**************************************
//
//  InputViews
//
//  These views provide a way of displaying a particular type of individual form input,
//  or a more complex input such as a set of radio boxes / check boxes, or  a jquery slider, etc.
//  They then allow the updated value to be tied back to a model attribute.
//  On instantiation, two methods should be passed to an input view as the getter and setter of the
//  attribute to which they belong. these methods should be called 'getValue' and 'setValue'
//  Requirements:
//    Instances
//    Classes:
//      - viewClassName: All InputView classes must have their class name specified as a class property.
//          this aids in the abstraction away from any one particular type of input when viewing a question.
//
//      - optionsAttributes: InputViews can specify a set of attributes
//          needed in order for the InputView to function correctly.
//          These are the attributes that need to be a key-value
//          pair in a response model's attributes if the response model
//          is to render correctly using the InputView.
//
//      - canHaveResponseValues: A boolean specifying whether this InputView can (must?) accept
//          a discrete set of values as its reply.
//
**************************************/



// Dynamo.TextInputView
//  A general purpose way to create a text input
//  form field (whether single line or area)
//  whose value is tied to some Model attribute.
//  As part of its options, it expects:
//    a getter method - to get what the value of the text input should be on render
//    a setter method - called whenever there is a 'new value' event generated from the view.
//    updateOn - if set to 'keyup', it will call the setter method after each character typed.
//               By default, the setter method is only the text-field's 'change' event

// var someExternalModel = new Backbone.Model({});
// //stuff...
// var attrView = Dynamo.TextInputView({
//   responseType: "textarea",
//   getValue: function() {
//     return someExternalModel.get("someAttributeOfTheModel")
//   },
//   setValue: function(new_val) {
//     return someExternalModel.set({  someAttributeOfTheModel: new_val});
//   }
// });
// attrView.render();

Dynamo.TextInputView = Backbone.View.extend(
  //
  //instance properties
  //
  {
    tagName: 'div',
    attributes: {
      width: 'inherit',
      overflow: 'visible'
    },
    initialize: function() {
      _.bindAll(this);
      this.cid = _.uniqueId('TextInputView-');
      this.keyup_count = 0;
      this.updateOn = this.options.updateOn || 'change';
      this.closeOn  = this.options.closeOn;
      this.getValue = this.options.getValue;
      this.setValue = this.options.setValue;
    },
    formType: function() {
      if (!this._field_type) {
        switch(this.options.responseType) {
          case "area":
          case "textarea":  case "text-area":   case "text_area":
          case "textbox":   case "text-box":    case "text_box":
          case "multiline": case "multi-line":  case "multi_line":
            this._field_type = "textarea";
            break;
          case "line":
          case (void 0):      case '':            case null:
          case "textfield":   case "text-field":  case "text_field":
          case "textline":    case "text-line":   case "text_line":
          case "text":
            this._field_type =  "text";
            break;
          default:
            throw 'unhandled field_type "'+this.options.field_type+'"';
        };
      };
      return this._field_type
    },
    events: function() {
      var e = {
            "change textarea" : "setAttribute",
            "change input"    : "setAttribute",
            "keypress input"     : "resizeTextInput",
            "click button.close" : "remove"
      };
      switch(this.updateOn) {
        case 'key':
        case 'keyup':
        case 'keypress':
          e["keyup input"] = "setAttribute";
          e["keyup textarea"] = "setAttribute";
        break;
      };
      switch(this.closeOn) {
        case 'blur':
          e["blur textarea"] = "remove";
          e["blur input"] = "remove";
          break;
      };
      return e;
    },
    setAttribute: function(change_event) {
      console.log('in TextInputView-setAttribute' );
      this.setValue($(change_event.currentTarget).val());
    },
    resizeTextInput: function(e) {
      var $input = $(e.currentTarget);
          $input.attr('size', _.min([255, ($input.val().length+2)]));
    },
    render: function () {
      var html,
          tagAtts = {
            value:  this.getValue()
          };
          if (this.getValue()) {
            tagAtts['size'] = this.getValue().length + 2;
          };
      if (this.options.borderless) { tagAtts['style'] = 'border:0;'; };

      html = t.formInput(this.formType(), this.options.label, tagAtts);
      this.$el.html( html );
      return this;
    }
  },
  //
  //Class Properties
  //
  {
    viewClassName: "TextInputView",
    optionsAttributes: ["label", "responseType"],
    editableOptionsAttributes: ["label"],
    canHaveResponseValues: false
  }
);

// Dynamo.InputGroupView
//  Displays a button group tied to a model attribute.
//  Required:
//    responseType: 'radio', 'checkbox', or 'select'; determines what type
//  The value of the model attribute is set upon each change in selection.
Dynamo.InputGroupView = Backbone.View.extend(
  {
    initialize: function() {
      this.cid = _.uniqueId('InputGroupView-');
      this.getValue = this.options.getValue;
      this.setValue = this.options.setValue;
      this.groupType = this.options.responseType;
      this.groupOptions = this.options.responseValues || [{value: "value-1", label: "label-1" },{value: "value-2", label: "label-2" }]
      this.template = this.options.template || this.template;
      _.bindAll(this);
      // DO NOT BIND A MODEL CHANGE TO RENDER b/c change is reflected by the field changing by default in html anyway.
    },
    events: {
      "click div.label_and_input" : "setInput",
      "click input"               : "setInput",
      "change select"             : "setAttribute",
      "change input"              : "setAttribute"
    },
    setAttribute: function (event) {
      console.log('in Dynamo.InputGroupView-setAttribute cid:'+this.cid);
      this.setValue($(event.currentTarget).val());
    },
    setInput: function(event) {
      // This method sets the value by determing what type of input was clicked.
      // In the case of an input with the class 'radio' or 'checkbox' (from Twitter Bootstrapp) - which doesn't have the classes 'label_and_input' or 'hasSelectedInput'
      // then we just grab the val() of the event and set.
      // Otherwise, we stick to the 'original' functionality.
      if ($(event.currentTarget).hasClass('radio') || $(event.currentTarget).hasClass('checkbox') ) {
        // if input.radio or input.checkbox from TwitterBootstrap
        this.setValue( $(event.currentTarget).val() );
      } else {
        // Original functionality
        var $i = $('input', event.currentTarget);
        $i.attr( 'checked', !$i.is(':checked') );
        this.setValue( $i.val() );
        this.$el.find('div.label_and_input').removeClass('hasSelectedInput');
        this.$el.find('div.label_and_input:has(input:checked)').addClass('hasSelectedInput');
      };
    },
    _template: function(data, settings) {
      if (!this.compiled_template) {
        if (!this.template) {
          this.template = this.options.template || DIT["dynamo/core/input_group"];
        };
        this.compiled_template = _.template(this.template);
      };
      return this.compiled_template(data, settings);
    },
    render: function () {
      this.$el.html( this._template({
        id: this.cid,
        name: (this.options.name || (this.groupType+'-group_'+this.cid)),
        label: (this.options.label || ''),
        selected_value: (this.getValue() || ''),
        type: this.groupType,
        options: this.groupOptions
      }) );
      return this;
    }
  },
  //
  //Class Properties
  //
  {
    viewClassName: "InputGroupView",
    optionsAttributes: ["label", "responseType", "responseValues"],
    editableOptionsAttributes: ["label"],
    canHaveResponseValues: true
  }
);

// Dynamo.InputRangeView
//  Allows the user to choose
//  one value from a range of values
//  Required attributes:
//    min_value,
//    max_value,
//    initial_value,
//    step
//    format: (currently limited to 'buttons' and 'slider')
//  Optional attributes:
//    low_end_text,
//    high_end_text
//  The value of the model attribute is set upon
//  each change in the value as selected
//  by the user according to the display_format.
Dynamo.InputRangeView = Backbone.View.extend(
  {

    initialize: function() {
      _.bindAll(this);
      this.cid = _.uniqueId('InputSliderView-');
      this.getValue = this.options.getValue;
      this.setValue = this.options.setValue;

      this.initial_value = parseInt((this.options.initial_value || this.options.min_value || 0));
      this.min_value = parseInt(this.options.min_value || 0);
      this.max_value = parseInt(this.options.max_value || 100);
      this.step = parseInt(this.options.step || 1);
      this.format = this.options.format

      // DO NOT BIND A MODEL CHANGE TO RENDER
      // b/c change is reflected naturally by slider movement.
    },

    setAttribute: function (ui_value) {
      console.log('in Dynamo.InputSliderView-setAttribute cid:'+this.cid);
      context.setValue(ui_value);
      context.$el.find('div.current_value:first').html( ui_value );
    },

    render: function () {
      var html;

      //build html
      html =  this.showValueHTML(this.initial_value) +
              this.endpointsHTML(this.options.low_end_text, this.options.high_end_text) +
              this.displayTypeHTML(this.format, {
                  min_value: this.min_value,
                  max_value: this.max_value,
                  step: this.step
              });

      //insert html
      this.$el.html(html);

      //post-process html
      var self = this;
      switch(this.format) {
        case "buttons":
          $("span.range_buttons button", self.$el).click(function(e) {
            self.setAttribute( $(e.currentTarget).val() );
          });
          break;
        case "slider":
          self.instantiateSlider( self.$el.find("div.slider:first") );
          break;
        default:
          console.warn("No display format specified, defaulting to slider.");
          self.instantiateSlider( self.$el.find("div.slider:first") );
      };

      return this;
    },

    displayTypeHTML: function(format, atts) {

      switch(format) {
        case "buttons":
          return this.buttonsHTML(atts);
          break;
        case "slider":
          return this.sliderHTML();
        default:
          console.warn("No display format specified, defaulting to slider.");
          return this.sliderHTML();
      };

    },

    endpointsHTML: function(min_text, max_text) {
      return "" +
        "<div id='endpoints' style='width:80%; margin-left:10%; margin-right:10%;" +
                                    "font-size:0.9em;font-weight:bold;overflow:auto;'>" +
          "<div class='end_right' style='float:left;'>"+min_text+"</div>" +
          "<div class='end_left' style='float:right;'>"+max_text+"</div>" +
        "</div>"
    },

    instantiateSlider: function(selector) {
      selector.slider({
        value: this.initial_value,
        min: this.min_value,
        max: this.max_value,
        step: this.step,
        slide: function( event, ui ) {
          this.setAttribute(ui.value)
        }
      });
      $(this.el).find('.ui-slider-handle').height(70);
      $(this.el).find('h2').css('font-size', "1.8em");
      if ( _.isFunction( selector.addTouch ) ) { selector.addTouch() }; //Touchable on pads/phones.
    },

    showValueHTML: function(value) {
      return "<div class='current_value' " +
              "style='width:30%; height:34px; min-height:34px; margin:0 auto; " +
                     "text-align:center; font-size:1.5em; color:black;' >" +
          value +
        "</div>";
    },

    buttonsHTML: function(atts) {
      return "<div style='margin:10px auto; text-align:center;'>" + (
        _.chain(_.range(atts.min_value, (atts.max_value + atts.step ), atts.step))
          .map(function(val) {
            return "<span class='range_buttons' style='margin:10px auto;'>" +
                      "<button value='"+val+"'>"+val+"</button>"+
                    "</span>"
          })
          .reduce(function(memo, snippet){
            return memo + snippet;
          }, "")
          .value()
      ) + "</div>";
    },

    sliderHTML: function() {
      return "<div class='slider' style='width:80%;margin: 2em 10% 10px 10%;height:60px;'></div>"
    },

  },
  //
  //Class Properties
  //
  {
    viewClassName: "InputRangeView",

    optionsAttributes: [
      "format",
      "min_value",
      "max_value",
      "low_end_text",
      "high_end_text",
      "initial_value",
      "step"
    ],

    // these are the attributes that are editable
    // when creating a question with a response
    // with this type of view.
    editableOptionsAttributes: [
      "format",
      "min_value",
      "max_value",
      "low_end_text",
      "high_end_text",
      "initial_value",
      "step"
    ],

    // how a particular editable option
    // will be presented to the user.
    // the default format is a Text Input
    // there is a default set of view options
    // that can be found w/in the render function
    // of the Dynamo.Mantle.Questions.Views
    // editResponseView class.
    editableOptionsInputTypes: {
      "format" : [ 'select',
          {
            responseType: 'select',
            responseValues: [ { label: 'slider',  value: 'slider'  },
                            { label: 'buttons', value: 'buttons' }]
          }
      ]
    },

    canHaveResponseValues: false
  }
);



// Dynamo.InputSliderView
//  Displays a jquery slider tied to a model attribute.
//  Required options:
//    low_end_text,
//    high_end_text,
//    initial_value,
//    min_value,
//    max_value,
//    step
//  The value of the model attribute is set upon
//  each change in the value of the slider.
Dynamo.InputSliderView = Backbone.View.extend(
  {
    initialize: function() {
      _.bindAll(this);
      this.cid = _.uniqueId('InputSliderView-');
      this.getValue = this.options.getValue;
      this.setValue = this.options.setValue;

      this.initial_value = parseInt((this.options.initial_value || this.options.min_value || 0));
      this.min_value = parseInt(this.options.min_value || 0);
      this.max_value = parseInt(this.options.max_value || 100);
      this.step = parseInt(this.options.step || 1);

      // DO NOT BIND A MODEL CHANGE TO RENDER
      // b/c change is reflected naturally by slider movement.
    },
    setAttribute: function (ui_value) {
      console.log('in Dynamo.InputSliderView-setAttribute cid:'+this.cid);
      this.setValue(ui_value);
      this.$el.find('div.current_value:first').html( ui_value );
    },
    setAttributeFromJQueryUICb: function(event, ui) {
      this.setAttribute(ui.value)
    },
    _template: _.template( "" +
      "<div class='current_value' "+
            "style='width:30%; height:34px; min-height:34px; margin:0 auto; text-align:center; "+
            "font-size:1.5em; color:black;'>"+
          "(%= initial_value %)"+
      "</div>" +
      "<div id='endpoints' "+
            "style='width:80%;margin-left:10%;margin-right:10%;font-size:0.9em;"+
                  "font-weight:bold;overflow:auto;'>" +
        "<div class='end_right' style='float:left;'>(%= low_end_text %)</div>" +
        "<div class='end_left' style='float:right;'>(%= high_end_text %)</div>" +
      "</div>" +
      "<div class='slider' "+
            "style='width:80%;margin-left:10%;margin-right:10%; margin-top:2em; height:60px;'>"+
      "</div>" +
      "<div style='height:10px;'></div>"
    ),
    render: function () {

      var $slider;
      this.$el.html( this._template({
        initial_value: this.initial_value,
        low_end_text: this.options.low_end_text,
        high_end_text: this.options.high_end_text
      }));
      //make the slider;
      $slider = this.$el.find("div.slider:first");
      $slider.slider({
        value: this.initial_value,
        min: this.min_value,
        max: this.max_value,
        step: this.step,
        slide: this.setAttributeFromJQueryUICb
      });
      $(this.el).find('.ui-slider-handle').height(70);
      $(this.el).find('h2').css('font-size', "1.8em");

      //add touch support on pads and phones.
      _.isFunction( $slider.addTouch ) ? $slider.addTouch() : undefined;

      return this;
    }
  },
  //
  //Class Properties
  //
  {
    viewClassName: "InputSliderView",

    optionsAttributes: [
      "low_end_text",
      "high_end_text",
      "initial_value",
      "min_value",
      "max_value"
    ],
    editableOptionsAttributes: [
      "low_end_text",
      "high_end_text",
      "initial_value",
      "min_value",
      "max_value"
    ],

    canHaveResponseValues: false
  }
);


/**************************************************
//
// Aspect Views
//
// These views abstract away a particular type of commonality across any possible
// collection or model.
// e.g. the 'ChooseFromCollectionView' is a user interface
// that lets the user select one model out of a collection,
// regardless of what is contained within the collection
//
**************************************************/



//  Dynamo.ChooseFromCollectionView
//  expects:
//    - A Dynamo collection of Xelements
//  description:
//    In many circumstances w/in the UI, it may be necessary to select one model from a collection of models.
//    pass this view a collection of models, and it will trigger on itself a backbone event ('element:chosen')
//    when the user clicks on a particular model w/in the collection.  The chosen model will be available from
//    this.chosen_element
//
//  options:
//    - onChoose: callback function (passed the click event) that runs when a user selects an xelement.
//      Default behavior sets this.chosen_element to the chosen model and triggers an 'element:chosen'
//      event on the view.
//    - chooseOn: the attribute of the xelement that should be displayed for the user to choose from.
//      Defaults to 'title'
//    - modelHTML: function that returns what HTML should be displayed for an element. Defaults to
//      a span containing the value of the xelement's 'chooseOn' attribute.
//    - groupBy: a function or string that will group the choices for selection by the return value
//        of calling the function on each element in the collection or accessing that property of the element.
Dynamo.ChooseOneXelementFromCollectionView = Backbone.View.extend({
  initialize: function() {
    _.bindAll(this);
    this.checkedInputsCIDsArray = [this.options.checkedInputs] || [];
    this.chooseOn = (this.options.chooseOn ? this.options.chooseOn : 'title');
    if (this.options.onChoose) { this.chooseXelement = this.options.onChoose };
    if (this.options.modelHTML) { this.modelHTML = this.options.modelHTML };
  },
  events: {
    "click button.create_new" : "createNewXelement",
    "click .choose_element" : "chooseXelement"
  },
  createNewXelement: function(clickEvent) {
    var klass = Dynamo.typeToModelClass(clickEvent.currentTarget.dataset.xelement_type);
    this.chosen_element = new klass();
    this.trigger("element:chosen");
  },
  chooseXelement: function(clickEvent) {
    var id = clickEvent.currentTarget.dataset.cid;
    this.chosen_element = this.collection.get(id);
    this.trigger("element:chosen", this.chosen_element);
  },
  modelHTML: function(m) {
    var fieldValue;
    try {
      fieldValue = m.get_field_value(this.chooseOn);
    }
    catch (e) {
      console.warn("Caught exception trying to get field value (e, chooseOn):", e, this.chooseOn);
      fieldValue = _.result(this, chooseOn) || m.id;
    };
    return t.span( { class: "link" }, fieldValue );
  },
  checkedInput: function(m) {
    return _.contains(this.checkedInputsCIDsArray, m.cid)
  },
  _template: function(data, settings) {
    if (!this.compiled_template) {
      if (!this.template) {
        this.template = this.options.template || DIT["dynamo/core/choose_one_xelement"];
      };
      this.compiled_template = _.template(this.template)
    };

    return this.compiled_template(data, settings);
  },
  render: function() {
    var elements;
    if (this.options.groupBy) {
      elements = this.collection.chain().map(function(m) {
        var el = {
          id: m.id,
          cid: m.cid,
          html: this.modelHTML(m),
          checkedInput: this.checkedInput(m)
        };
        if (_.isString(this.options.groupBy) ) {
          el.groupBy = m[this.options.groupBy]
        } else {
          el.groupBy = this.options.groupBy(m);
        };
        return el;
      }, this).groupBy("groupBy").value();
    }
    else {
      elements = this.collection.map(function(m) {
        var el = {
          id: m.id,
          cid: m.cid,
          html: this.modelHTML(m),
          checkedInput: this.checkedInput(m)
        };
        return el;
      }, this);
    }
    this.$el.html(
      this._template({
        collection_name: (this.options.collection_name || this.collection.codeCollectionName || this.collection.prettyModelName()),
        elements: elements,
        groupBy: (!!this.options.groupBy),
        canChooseMany: (!!this.options.canChooseMany),
        canCreateNew: this.options.canCreateNew || false,
        xelement_type: this.options.xelement_type,
        element_pretty_name: this.options.element_pretty_name
      })
    );
    return this;
  },
  remove: function() {
    //attempt to make sure everything is deleted.
    this.$el.remove();
    this.stopListening();
    // delete(this.checkedInputsCIDsArray);
    // delete(this.chooseOn);
    // delete(this.options);

  }
})


// Dynamo.SaveableModelView
//  Any View which has models or data that the user can save
//  can inherit from this view which provides a set of functions
//  related to viewing the current save state,
//  or setting up periodic saving and triggering a save
SaveableModelView = Dynamo.SaveableModelView = Backbone.View.extend({

  initializeAsSaveable: function(saveableModel) {
    _.extend(this, Backbone.Events);
    this.saveableModel = saveableModel;
    this.saveableModel.initializeAsSaveable();
    this.saveableModel.on('save_status_change', this.renderSaveStatus);
    this.on('saveable:save_now', this.saveSaveableModel);
  },

  saveableEvents: {
    'focusin'  : "setUserBusy",
    'focusout' : "clearUserBusy"
  },

  // Assumes you have an elment in the view like so:
  // <[some_tag: div, span, etc?] class='save_status'></[some_tag]>
  renderSaveStatus: function() {
    this.$el.find('.save_status:first').removeClass(this.saveableModel.saveStates.join(' '));
    this.$el.find('.save_status:first').addClass(this.saveableModel.currentSaveState());
    this.$el.find('.save_status:first').html(this.saveableModel.currentSaveText());
  },

  saveSaveableModel: function() {
    this.saveableModel.save();
  },

  saveifUserNotBusy: function () {
    if ( !this.isUserBusy() ) { this.trigger('saveable:save_now') };
  },

  // saving / recurrent-saving functions
  startPeriodicModelSaving: function(interval_in_seconds) {
    if (!interval_in_seconds) { throw new Error("startPeriodicModelSaving() interval_in_seconds cannot be "+interval_in_seconds) }
    console.log("in startPeriodicModelSaving in view");
    if (!this._modelSavingActive) {
      console.log("currently model saving NOT Active");
      this.saveableModel.startPeriodicSaving(interval_in_seconds);
      this.on('remove', this.stopPeriodicModelSaving);
      this._modelSavingActive = true;
      console.log("Xel may suggest save at most every "+interval_in_seconds+" seconds.");
    }
  },

  stopPeriodicModelSaving: function() {
    console.log("in stopPeriodicModelSaving in view");
    this.saveableModel.stopPeriodicSaving();
    this._modelSavingActive = false;
  },

  // along with the saveableEvents hash defined above,
  // set a view property which answers the question:
  // "is the user focused on this view right now?"
  clearUserBusy: function () {
    this._userBusy = false;
  },

  isUserBusy: function () {
    return this._userBusy
  },

  setUserBusy: function () {
    this._userBusy = true;
  }

});


Dynamo.BaseUnitaryXelementView = Dynamo.SaveableModelView.extend({

  editTextFieldInPopup: function(field, click_event) {

    var self = this,
        popupView,
        $clicked_on = $(click_event.currentTarget);

    popupView = new Dynamo.TextInputView({
      responseType: 'line',
      updateOn: 'keypress',
      closeOn: 'blur',
      label: '',
      getValue: function() {
        return self.model.get_field_value(field);
      },
      setValue: function(new_value) {
        return self.model.set_field_value(field, new_value);
      }
    });

    $clicked_on.after(popupView.$el);
    popupView.render();

  },

  initializeAsUnitaryXelement: function() {
    // Adds methods related to saving
    this.initializeAsSaveable(this.model);
  },

  deleteModel: function() {
    this.model.destroy();
  },

  // initial_render convenience tracker functions
  initiallyRendered: function() { return (!!this._initialRender); },
  setInitialRender: function() { this._initialRender = true; },
  clearInitialRender: function() { this._initialRender = false; },
  completeRender: function() {
    if ( _.isEmpty(arguments) ) {
      this.clearInitialRender();
      return this.render();
    }
    // If arguments are not empty, then we assume it is being called after a 'sync' event.
    // The Three arguments would be: (model, resp, options).
    // The response will always return at least a new version_id and the received_at time (b/c
    // of the xelements schema and the Backbone.sync specification that the server return only
    // attributes changed by the server).
    // Since we would not have need to update the view in this case, only update it in other cases:
    if (arguments[1] && _.keys(arguments[1]).length > 2 ) {
      this.clearInitialRender();
      return this.render();
    };
  }

});


// Dynamo.ReorderChildrenView (rcw)
//  
// Reorders the children of an xelement, expected to be in the array field, 'required_xelement_ids',
// and to which it saves back in the correct order.
//
// On instantiation, rcw expects :
// 1) An Xelement Model object (assumed to have a required_xelement_ids field)
Dynamo.ReorderChildrenView = Backbone.View.extend({

  initialize: function() {
    _.bindAll(this);
    _.extend(this, Backbone.events)
  },

  events: {
    "click button.finish" : "finishReordering"
  },

  reorderChildren : function(event, ui) {
    var ids = _.map(this.$el.find("li.child"), function(child) { return $(child).data("el-id") });
    var evs = _.extend({}, Backbone.Events);
    this.model.set_field_value("required_xelement_ids", ids);
  },

  finishReordering: function() {
    this.model.save(null, {async : false });
    this.trigger("reorder:finished");
  },

  _template: function(data, settings) {

    if (!this.compiled_template) {
      if (!this.template) {
        this.template = this.options.template || DIT["dynamo/core/reorder_children"];
      };
      this.compiled_template = _.template(this.template)
    };

    return this.compiled_template(data, settings);
  },

  render: function() {
    var elements = _.map(this.model.required_xelements().toJSON(), function(el) { 
      return ({ id: el.guid, title: el.xel_data_values.title }) 
    });
    this.$el.html( this._template({ elements: elements })  );

    this.$el.find("ul.reorder").sortable({
      update: this.reorderChildren
    });

    return this;
  }

});


//Dynamo.ManageCollectionView (mcw)
//
//On instantiation, mcw expects :
//
//1) A collection
//2) either that:
//    a) All models in the collection each have:
//      - a 'viewClass' attribute which returns a Backbone View Class
//      - an 'editViewClass' attribute which returns a Backbone View Class
//    b) To pass in an apporpriate view class for 'viewClass' and/or 'editViewClass'
//
//3) That those View Classes can be instantiated w/
//   a model from the collection (and nothing else).
//
//4) That those View Classes can also be passed an option, 'position'
//   which is their index in the collection.
//

Dynamo.ManageCollectionView = Backbone.View.extend({

  initialize: function() {
    _.bindAll(this);
    this.start_content = this.options.start_content || '';
    this.end_content = this.options.end_content || '';
    this.display = this.options.display || { show: true };
    this.display.edit = this.display.edit || false;
    this.display.del = this.display.del || false;
    this.display.create = (this.display.create ? this.display.create :  this.display.edit);
    this.canAddExisting = !!this.options.enableAddExisting;
    this.collection.on("reset", this.render);
    this.collection.on("add", this.render);
    this.collection.on("remove", this.render);
  },

  events: function() {
    var e ={};
    e[("click button.add-new-"+this.collection.codeModelName())] = "addNew";
    e[("click button.add-existing-"+this.collection.codeModelName())] = "addExisting";
    e[("click button.delete."+this.collection.codeModelName())] = "removeElement";
    return e;
  },

  addNew: function(clickEvent) {

    if (this.options.addNewHandler) {
      return this.options.addNewHandler(clickEvent)
    };

    return this.addNewAtIndex( $(clickEvent.currentTarget).data("collection-index") );

  },

  addExisting: function(clickEvent) {

    if (this.options.enableAddExisting) {

      if (this.options.addExistingHandler) {
        return this.options.addExistingHandler( $(clickEvent.currentTarget).data("collection-index") )
      }
      return this.chooseExistingToAddAtIndex( $(clickEvent.currentTarget).data("collection-index") );

    };

  },

  //  Default implementation of addNewAtIndex;
  //  called by addNew if none other provided
  addNewAtIndex: function(element_index) {
    console.log('inserting '+ this.collection.prettyModelName()+' - at location: '+ element_index);
    this.collection.add({}, {at: element_index});
  },

  //  Default implementation of addExistingAtIndex;
  //  called by addExisting if none other provided
  addExistingAtIndex: function(element, element_index) {
    console.log('inserting '+ this.collection.prettyModelName(),
                "id:", element.id, 'Location: ', element_index);
    this.collection.add(element, { at: element_index });
  },

  //  getExistingAddablesCollection is an abstract method
  //  meant to be passed in as an option on instantiation or overridden
  //  getExistingAddablesCollection is called by 'chooseExistingToAddAtIndex',
  //  and should return either a Dynamo.Collection or
  //  A Backbone.Collection where:
  //    1)  it's models are the same model class accepted by ManageCollectionView's collection.
  //    2)  it responds to the property 'codeCollectionName', returning a string
  //    3)  it responds to the function 'prettyModelName', returning a string
  //
  //  Alternatively, you could perform more complicated logic
  //  by overriding the 'chooseExistingToAddAtIndex' or
  //  the subsequent call to 'onChoosingModelToAdd' methods to your own ends.
  getExistingAddablesCollection: function() {

    if (this.options.getExistingAddablesCollection) {
      return this.options.getExistingAddablesCollection()
    }

    throw new Error("" +
      "ManageCollectionView:getExistingAddablesCollection is an abstract method "+
      "which must be defined by the user or passed in on instantiation");

  },

  chooseExistingToAddAtIndex: function(element_index) {

    if (this.options.chooseExistingToAddAtIndex) {
      return this.options.chooseExistingToAddAtIndex(element_index, this);
    }

    var $popup,
        existingAddables = this.getExistingAddablesCollection();

    var chooseExistingViewOptions = {
        canCreateNew: false,
        xelement_type: null,
        element_pretty_name: null,
        collection_name: existingAddables.codeCollectionName,
        collection: existingAddables
      }

    if (this.options.chooseExistingViewOptions) {
      chooseExistingViewOptions = _.extend(chooseExistingViewOptions, this.options.chooseExistingViewOptions)
    }

    // Allow the user to choose a Question Group view
    this.chooseExistingModelView = new Dynamo.ChooseOneXelementFromCollectionView(chooseExistingViewOptions);
    this.chooseExistingModelView.on('element:chosen', function() {
      this.onChoosingModelToAdd(this.chooseExistingModelView.chosen_element, element_index);
    }, this);

    this.$popup = renderInDialog(this.chooseExistingModelView, {
      title: "Add a "+this.collection.prettyModelName()+" (in position "+(element_index+1)+")"
    });

  },

  onChoosingModelToAdd: function(chosen_element, element_index) {

    if (this.options.onChoosingModelToAdd) {
      return this.options.onChoosingModelToAdd(chosen_element, element_index, this)
    };

    if (this.$popup) { $popup.dialog("close"); }
    return this.addExistingAtIndex(chosen_element, element_index);

  },

  removeElement: function(clickEvent) {
    var element_index = clickEvent.currentTarget.dataset.collection_index;
    console.log('removing: '+ this.collection.prettyModelName()+' - at location: '+ element_index);
    var elToRemove = this.collection.at(element_index);
    this.collection.remove(elToRemove);
    if (elToRemove.destroy) { elToRemove.destroy(); }
  },

  _template: function(data, settings) {
    if (!this.compiled_template) {
      if (!this.template) {
        this.template = this.options.template || DIT["dynamo/core/manage_collection"];
      };
      this.compiled_template = _.template(this.template)
    };

    return this.compiled_template(data, settings);
  },

  _elementTemplate: function(data, settings) {
    if (!this.compiledElementTemplate) {
      if (!this.elementTemplate) {
        this.elementTemplate = this.options.elementTemplate || DIT["dynamo/core/manage_collection/element"];
      }
    };
    this.compiledElementTemplate = _.template(this.elementTemplate)

    return this.compiledElementTemplate(data, settings);
  },

  viewClassOr: function(model) {
    if (!!this.options.viewClass) { return this.options.viewClass }
    return model.viewClass();
  },

  editViewClassOr: function(model) {
    if (!!this.options.editViewClass) { return this.options.editViewClass }
    return model.editViewClass();
  },

  render: function() {
    var $elements,
        root_element,
        view_class,
        view_options,
        view;

    this.$el.html(this._template({
      start_content: this.start_content,
      element_code_name: this.collection.codeModelName(),
      element_pretty_name: this.collection.prettyModelName(),
      display: this.display,
      canAddExisting: this.canAddExisting,
      num_elements: this.collection.length,
      end_content: this.end_content
    }));

    $elements = this.$el.find('div.collection_widget:first > div.elements:first');

    this.collection.each(function(model, index) {

      $elements.append(
        this._elementTemplate({
          index: index,
          display: this.display,
          canAddExisting: this.canAddExisting,
          element_code_name: this.collection.codeModelName(),
          element_pretty_name: this.collection.prettyModelName()
        })
      );

      root_element = $elements.children('div.element').last();

      if (this.display.show) {
        view_class = this.viewClassOr(model);
        view_options = this.options.viewOpts || {};
        view_options = _.extend(view_options, {
          model: model,
          position: (index+1),
          user_id: (Dynamo.CurrentUser().id || "GUEST-USER-GUID"),
          group_id:  (Dynamo.CurrentUser().get("group_id") || "GUEST-GROUP-GUID"),
        });
        view = new view_class(view_options);
        view.setElement( root_element.find("div.show_container:first") );
        view.render();
      };

      if (this.display.edit) {
        view_class = this.editViewClassOr(model);
        view_options = this.options.editViewOpts || {};
        view_options = _.extend(view_options, {
          model: model,
          position: (index+1)
        });
        view = new view_class(view_options);
        view.setElement( root_element.find("form.edit_container:first") );
        view.render();
      };

    }, this);

    return this;
  }

});

Dynamo.ShowGroupView = Dynamo.BaseUnitaryXelementView.extend({

  initialize: function() {

    _.bindAll(this);
    this.cid = _.uniqueId('Dynamo.ShowGroupView-');
    this.subViews = [];
    this.position = this.options.position
    this.model.on("change",   this.render);
    this.model.on("destroy",  this.remove);

  },

  addSubView: function(view) {
    this.subViews.push(view);
  },

  attributes: function() {
    return {
      id: "group-"+this.model.cid,
      class: "group"
    }
  },

  remove: function() {
    this.$el.remove();
    this.removeSubViews();
  },

  removeSubViews: function() {
    _.each(this.subViews, function(sub_view) {
      sub_view.remove();
      sub_view = null;
    });
    this.subViews = [];
  },

  _template: function(data, settings) {
    if (!this.compiled_template) {
      if (!this.template) {
        this.template = this.options.template || templates.show_group;
      };
      this.compiled_template = _.template(this.template)
    };

    return this.compiled_template(data, settings);
  },

  render: function() {

    //render template
    var view_class, view;

    console.log('-> ShowGroupView render');

    this.$el.html( this._template({
        position: this.position,
        group: this.model.toJSON()
      })
    );

    if (!this.usersView) {
      var $groups = this.$el.find('div.groups:first');
      this.usersView = new Dynamo.ManageCollectionView({
        collection: this.model.users,
        enableAddExisting: true,
        getExistingAddablesCollection: this.options.existingUsers
      });
      $groups.append(this.usersView.$el)
    };

    this.usersView.render();

    return this;
  }
});

Dynamo.EditGroupView = Dynamo.BaseUnitaryXelementView.extend({

  initialize: function() {

    _.bindAll(this);
    this.cid = _.uniqueId('EditGroupView-');
    this.subViews = [];
    this.position = this.options.position
    this.model.on("change",   this.render);
    this.model.on("destroy",  this.remove);

  },

  events: function() {
    var e = {}
    e["click button.delete"] = "deleteModel";
    e["change input"] = "updateGroup";
    return e;
  },

  updateGroup: function() {
    var setObj = {};
    this.$el.find('input').each(function() {
      if ( $(this).attr('name') ) {
        setObj[ $(this).attr('name') ] = $(this).val();
      };
    });
    this.model.save(setObj, {async:false});
  },

  addSubView: function(view) {
    this.subViews.push(view);
  },

  attributes: function() {
    return {
      id: "group-"+this.model.cid,
      class: "group",
      "data-id": this.model.id
    }
  },

  remove: function() {
    this.$el.remove();
    this.removeSubViews();
  },

  removeSubViews: function() {
    _.each(this.subViews, function(sub_view) {
      sub_view.remove();
      sub_view = null;
    });
    this.subViews = [];
  },

  _template: function(data, settings) {
    if (!this.compiled_template) {
      if (!this.template) {
        this.template = this.options.template || templates.edit_group;
      };
      this.compiled_template = _.template(this.template)
    };

    return this.compiled_template(data, settings);
  },

  render: function() {

    //render template
    var view_class, view;

    this.$el.html( this._template({
        group: this.model.toFormValues(),
        position: this.position
      })
    );

    var $users = this.$el.find('div.users:first');
    if ( $users.length !== 0 ) {
      this.usersView = new Dynamo.ManageCollectionView({
        collection: this.model.users,
      });

      $users.append(this.usersView.$el)

      this.usersView.render();
    };

    return this;
  }
});

//
Dynamo.ShowXelementSimpleView =  Dynamo.BaseUnitaryXelementView.extend({

  initialize: function() {

    _.bindAll(this);
    this.cid = _.uniqueId('ShowXelementSimpleView-');
    this.position = this.options.position
    this.model.on("change",   this.render);
    this.model.on("destroy",  this.remove);
    this.atts_to_display = this.options.atts_to_display || []

  },

  attributes: function() {
    return {
      id: "xelement-"+this.model.cid,
      class: this.model.get_field_value("xelement_type"),
      "data-position": this.position
    }
  },

  _template: function(data, settings) {
    if (!this.compiled_template) {
      if (!this.template) {
        this.template = this.options.template || DIT["dynamo/xelements/show"];
      };
      this.compiled_template = _.template(this.template);
    };
    return this.compiled_template(data, settings);
  },

  render: function() {
    console.log('-> ShowXelementSimpleView#render');

    var view_class, view;
   

    var atts_values = { title: this.model.get_field_value("title") };

    _.each(this.atts_to_display, function(att) {
      atts_values[att] = this.model.get_field_value(att);
    }, this);

    this.$el.html( this._template({data: atts_values}) );

    return this;
  }

});


Dynamo.ShowUserView = Dynamo.BaseUnitaryXelementView.extend({

  initialize: function() {

    _.bindAll(this);
    this.cid = _.uniqueId('Dynamo.ShowUserView-');
    this.position = this.options.position
    this.model.on("change",   this.render);
    this.model.on("destroy",  this.remove);

  },

  attributes: function() {
    return {
      id: "user-"+this.model.cid,
      class: "user"
    }
  },

  _template: function(data, settings) {
    if (!this.compiled_template) {
      if (!this.template) { this.template = this.options.template || DIT["dynamo/users/show"]; }
      this.compiled_template = _.template(this.template);
    };
    return this.compiled_template(data, settings);
  },


  render: function() {
    console.log('in ShowUserView render');

    //render template
    var view_class, view;

    this.$el.html( this._template({
        position: this.position,
        user: this.model.toJSON()
      })
    );

    return this;
  }

});

//  The purpose of this view is to allow programming that still
//  uses backbone for what it is good at:
//  separating concerns related to a model and view,
//  and to allow continued use of backbone collections
//
//  But to then allow you to seemlessly use Knockout
//  at what it is good at: declarative binding of
//  dom elements to model attributes, with integrated dom manipulation.
ModelBackoutView = Dynamo.ModelBackoutView = Backbone.View.extend({

  initialize: function() {
    _.extend(this, Backbone.Events);
    _.bindAll(this);
    // Because Knockout will sync between model values & DOM elements,
    // no need to re-render on model change.
  },

  id: function() {
    return _.uniqueId();
  },

  // The function that returns the attributes from the backbone model
  // that need to be turned into knockoout viewModel keys.
  // You can:
  //  - let it use model.attributes
  //  - Pass in a custom function on initialize modelAttsFn, which will return
  //  this object, 
  //  - Add atts which may not be found in either through the 'lateAddAtts' option,
  //    which expects to be a function with key-value pairs for additional defaults.
  //    this is useful when the underlying model changes and old entries don't have keys
  //    for new attributes; w/out adding those atts to the object, knockout will raise
  //    an error.
  //  - the function also adds the id & cid to the final set of modelAtts that are
  //    created as attributes of the knockout viewModel. 
  modelAtts: function() {
    var atts;
    if (this.options.modelAttsFn) {
      atts = this.options.modelAttsFn(this.model);
    }
    else {
      atts = this.model.attributes;
    };
    return _.extend({}, this.options.lateAddAtts, atts, {id: this.model.id, cid: this.model.cid });
  },

  createKnockoutModel: function() {
    var modelAtts;
    //wipe away any previous model:
    this.knockoutModel = null;
    delete this.knockoutModel;

    this.knockoutModel = {};
    
    //in case you ever want/need to force a re-computation of a computed,
    //you can place a call to the value of this dummyObservable in the computed,
    //and then call self.knockoutModel.dummyObservable.notifySubscribers();
    //when you want to trigger a recomputation:
    this.knockoutModel.dummyObservable = ko.observable(null);

    this.knockoutModel.view = this;
    var view = this.knockoutModel.view;
    // view.remove = function() {
    //   delete this.knockoutModel;
    // }
    _.each(this.modelAtts(), function(value, attr_name) {

      // Ignore attributes which come from computedAtts,
      // as those will be handled separately.
      if ( !view.options.computedAtts || !view.options.computedAtts[attr_name]) {
        view.createKnockoutModelAttribute(attr_name, value)
        view.setBackboneAndKnockoutBindings(attr_name);
      };

    });

    if (view.options.computedAtts) {
      _.each(view.options.computedAtts, function(computeObj, attr_name) {

        if (!computeObj.owner) { computeObj.owner = view.knockoutModel };
        view.knockoutModel[attr_name] = ko.computed(computeObj);
        if (computeObj.write) {
          view.setBackboneAndKnockoutBindings(attr_name);
        };

      });
    };

    this.knockoutModel.save = this.triggerSave 
    this.knockoutModel.destroy = this.triggerDelete
  },

  createKnockoutModelAttribute: function(attr, value) {
    var self = this;
    //maybe in the future?
    if ( !_.isArray(value) &&
         !_.isDate(value) &&
          _.isObject(value) ) {
      throw new Error("Unhandled case: attribute '"+attr+"'\'s value is an object.")
    };

    // console.log("Attr, Value:", attr, value);

    if ( _.isDate(value) ) {
      this.knockoutModel[attr+"_year"] = ko.observable(value.getFullYear());
      this.knockoutModel[attr+"_month"] = ko.observable(value.getMonth());
      this.knockoutModel[attr+"_date"] = ko.observable(value.getDate());
      this.knockoutModel[attr+"_hour"] = ko.observable(value.getHours());
      this.knockoutModel[attr+"_minute"] = ko.observable(value.getMinutes());
      this.knockoutModel[attr] = ko.computed({
        read: function() {
          var s = this;
          return ( new Date(s[attr+"_year"](),
                            s[attr+"_month"](),
                            s[attr+"_date"](),
                            s[attr+"_hour"](),
                            s[attr+"_minute"]() )
                  );
        },
        write: function(new_time) {
          // Can the reference to self here be removed??
          self.knockoutModel[attr+"_year"](new_time.getFullYear());
          self.knockoutModel[attr+"_month"](new_time.getMonth());
          self.knockoutModel[attr+"_date"](new_time.getDate());
          self.knockoutModel[attr+"_hour"](new_time.getHours());
          self.knockoutModel[attr+"_minute"](new_time.getMinutes());
        },
        owner: this.knockoutModel
      });
      return this.knockoutModel[attr];
    };

    // An array will benefit from having available add and remove functions.
    if ( _.isArray(value) ) {

      // The default value of an element of the array can be
      // (and probably should) be passed in as an option.
      var defaultElValue = this.options.arrayDefaults[attr],

          //each element in the knockout array will be more
          //than just a singular value, in order to allow removal
          elConstructor = function(element_value) {
            return {
              value: ko.observable(element_value),
              remove: function() {
                self.knockoutModel[attr].remove(this)
              }
            }
          };

      // Define each element in the array to be composed of
      // an instance of the above constructor
      this.knockoutModel[attr] = ko.observableArray(
        _.map(value, function(el) { return new elConstructor(el) })
      );

      // Define an add element function for this attribute;
      this.knockoutModel[attr+"_addElement"] = function() {
        var newEl = new elConstructor(defaultElValue)
        self.knockoutModel[attr].push( newEl );

        //when this new element changes value,
        //notify subscribers of the array that the value of the array has changed.
        newEl.value.subscribe(function(newElementValue) {
          self.knockoutModel[attr].notifySubscribers(self.knockoutModel[attr]());
        });
      };

        //when any existing element changes value,
        //notify subscribers of the array that the value of the array has changed.
      _.each(this.knockoutModel[attr], function(el) {
        var s = this;
        //Mem leak?
        el.value.subscribe(function(newElementValue) {
          s.knockoutModel[attr].notifySubscribers(s.knockoutModel[attr]());
        });
      }, this);

      return this.knockoutModel[attr];
    };

    if (  _.isString(value) ||
          _.isFinite(value) ||
          _.isBoolean(value)
       ) {
      console.log("setting "+attr+" to "+value);
      this.knockoutModel[attr] = ko.observable(value);
      return this.knockoutModel[attr];
    };

    if ( _.isNull(value) ||
         _.isUndefined(value)
       ) {
      this.knockoutModel[attr] = ko.observable(false);
      return this.knockoutModel[attr];
    };

  }, // end createKnockoutModelAttribute

  setBackboneAndKnockoutBindings: function(attr_name) {
    //If any change is made to a model attribute (in backbone),
    //the knockout model needs to be updated accordingly.
    this.model.on('change:'+attr_name, function() { this.updateKnockoutModelAttribute(attr_name) }, this )

    //Any changes that knockout will make to the view,
    //We want to make to our backbone model.
    //HOWEVER, we cannot trigger a normal change event on the backbone model,
    //or we will enter an infinite loop due to the needed on-change
    //code above.
    //So, instead, we call set with {silent:true} and
    //trigger a different event on the backbone model - 'change:fromKnockout';
    var self = this;
    this.knockoutModel[attr_name].subscribe(function(newValueFromKnockout) {
      if (typeof(newValueFromKnockout) !== "undefined") {
        var set_obj = {};
        console.log("updating "+attr_name, newValueFromKnockout);

        if (_.isArray(newValueFromKnockout)) {
          // Array elements have been wrapped in an object
          // as detailed in the createKnockoutModelAttribute method.
          // in the transition back to backbone, we need to access the original value.
          set_obj[attr_name] =  _.compact(_.map(newValueFromKnockout, function(el) { return el.value() }));
        }
        else {
          set_obj[attr_name] = newValueFromKnockout;
        };

        self.model.set_field_values(set_obj, { silent:true });
        self.model.trigger("change:fromKnockout");
        self.model.trigger("change:fromKnockout:"+attr_name);
      };
    });
  },

  //a knockout Template is required to
  //be either passed into the view
  //or defined by the model.
  knockoutTemplate: function() {
    var template = this.options.knockoutTemplate || this.model.get("knockoutTemplate")
    if (template) {
      return template;
    } else {
      throw new Error("No knockout template available.");
    }
  },

  //use the correct Knockout method to make a change
  //to an attribute on the knockout model.
  updateKnockoutModelAttribute: function(attr, value) {
    if (typeof(value) == "undefined") {
      value = this.model.get_field_value(attr)
    };
    var observableFunction = this.knockoutModel[attr];
    if ( ko.isWriteableObservable(observableFunction) ) {
      observableFunction(value);
    }
    else {
      console.warn("tried to update non-writeable knockout attr: ", attr, value);
    };

  },

  //although rare, it is conceivable we may want to update
  //all Knockout Model attributes under certain conditions.
  updateKnockoutModel: function() {
    _.each(this.modelAtts(), function(val, attr) {
      self.updateKnockoutModelAttribute(key, val);
    }, this);
  },

  // Render function is greatly simplified
  // as the supplied template will do all the
  // heavy lifting!
  render: function() {
    this.$el.empty();
    this.$el.html( _.template(this.knockoutTemplate(), { cid: _.uniqueId() }) );
    var domEl = this.$el.children(":first").get(0);
    this.createKnockoutModel();
    ko.applyBindings(this.knockoutModel, domEl);
    this.trigger("rendered");
    return this;
  },

  // Override delegate events function
  // to use knockout
  delegateEvents: function() {
    // var el = this.$el.children(":first").get(0);
    // this.createKnockoutModel();
    // ko.applyBindings(this.knockoutModel, this.$el.get(0));
  },

  triggerSave: function() {
    this.trigger('model:save');
    return false
  },

  triggerDelete: function() {
    this.trigger('model:delete');
    return false
  }

});


// Abstract view for rendering an index view of a group-wide data set,
// Expects: 
//  - Expects to be subclassed with the modelViewClass attribute overwritten,
//    or have the modelViewClass be passed in on instantiation.
//  - The model passed in on instantion to have an 'all' method which returns a
//    collection of models to be rendered by the modelViewClass, as well as 'add' / 'remove'
//    methods. 
GroupWideDataIndexView = Dynamo.GroupWideDataIndexView = Backbone.View.extend({

  modelViewClass: function() {
    new Error("Abstract function, modelViewClass of GroupWideDataIndexView called. "+
              "Expected a ModelViewClass to be defined when sub-classing GroupWideDataIndexView.")
  },

  initialize: function() {
    this.modelViewClass = this.options.modelViewClass || this.modelViewClass;
    this.renderOrder = this.options.renderOrder || this.renderOrder;
    
    this.model.on("add", this.initialRender, this);
    this.model.on("remove", this.initialRender, this);
    _.result(this, "afterInitialize");
    _.result(this.options, "afterInitialize");

  },

  initialRender: function() {
    
    this.modelViews = null;
    this.modelViews = [];

    this.model.all().each(function(someModel) {
      this.modelViews.push( (new this.modelViewClass({ model: someModel })) );
    },this );

    this.$el.empty();
    _.each(this.modelViews, function(mView) {
      if (this.renderOrder === 'reverse') {
        this.$el.prepend(mView.render().$el);
      }
      else {
        this.$el.append(mView.render().$el);  
      };
    }, this);
    this.initiallyRendered = true;

  },

  render: function() {
  
    if (!this.initiallyRendered) {
      this.initialRender();
    }  
    else {
      _.invoke(this.modelViews, 'render');
    };

    return this;
  }

});

Dynamo.GroupWideDataByUserCollectionView = Backbone.View.extend({

  collectionViewClass: function() {
    new Error("Abstract function, collectionViewClass of GroupWideDataIndexView called. "+
              "Expected a ModelViewClass to be defined when sub-classing GroupWideDataIndexView.")
  },

  initialize: function() {

    this.collectionViewClass = this.options.collectionViewClass || this.collectionViewClass;
    this.renderOrder = this.options.renderOrder || this.renderOrder;
    
    this.model.on("add",    this.initialRender, this);
    this.model.on("remove", this.initialRender, this);
    _.result(this,          "afterInitialize");
    _.result(this.options,  "afterInitialize");

    return this;
  },

  initialRender: function() {

    this.collectionViews = null;
    this.collectionViews = [];

    _.each(this.model.collections, function(userCollection) {
      this.collectionViews.push( 
        (new this.collectionViewClass({ 
          collection: userCollection, 
          renderOrder: this.renderOrder 
        })) 
      );
    }, this);

    this.$el.empty();
    _.each(this.collectionViews, function(cView) {
      this.$el.append(cView.render().$el);  
    }, this);
    this.initiallyRendered = true;

  }, 

  render: function() {
  
    if (!this.initiallyRendered) {
      this.initialRender();
    }  
    else {
      _.invoke(this.collectionViews, 'render');
    };

    return this;
  }

});


GoalsView = Dynamo.GoalsView = Backbone.View.extend({

  className: "row-fluid",

  initialize: function() {
    _.bindAll(this);
    this.currentStatusToDisplay = "display-all";
    this.displayAllBtnClass = "";
    this.unansweredBtnClass = "";
    this.completedBtnClass = "";
    this.ignoredBtnClass = "";
    this.goals = this.options.goals;
    this.goalData = this.options.goalData;
  },

  events: {
    "click .display-all": "setToAll",
    "click .unanswered": "setToUnanswered",
    "click .completed": "setToCompleted",
    "click .ignored": "setToIgnored"
  },

  setToAll: function() {
    this.currentStatusToDisplay = "display-all";
    this.render();
  },
  setToUnanswered: function() {
    this.currentStatusToDisplay = "unanswered";
    this.render();
  },

  setToCompleted: function() {
    this.currentStatusToDisplay = "completed";
    this.render();
  },

  setToIgnored: function() {
    this.currentStatusToDisplay = "ignored";
    this.render();
  },

  template: function() {
    this.setButtonStatus();
    return _.template(''+
      '<div id="goals-accordion-header" class="row-fluid"><legend class="span11"><span class="legend-header">Goals</span>'+
      '<div class="btn-group pull-right">'+
        '<button data-status="unanswered" type="button" class="goals-btn btn unanswered '+this.unansweredBtnClass+'">Current</button>'+
        '<button class="btn dropdown-toggle" data-toggle="dropdown">'+
          '<span class="caret"></span>'+
        '</button>'+
        '<ul class="dropdown-menu">'+
          '<li><a data-status="display-all" type="button" class="goals-btn display-all '+this.displayAllBtnClass+'">All</a></li>'+
          '<li><a data-status="completed" type="button" class="goals-btn completed '+this.completedBtnClass+'" style="color:green;">Completed</a></li>'+
          '<li><a data-status="ignored" type="button" class="goals-btn ignored '+this.ignoredBtnClass+'" style="color:#b30000;">Ignored</a></li>'+
        '</ul>'+
      '</div>'+
      '</legend>'+
      '<div class="span1 caret-icons"><i class="icon-caret-right pull-right"></i></div></div>'+
      '<ul id="goals" class="accordion-body"></ul>');
  },

  // filterGoalData: function(clickEvent) {
  //   var target = clickEvent.currentTarget
  //   var status = $(target).data('status')
  //   console.log("status", status)
  //   this.currentStatusToDisplay = status
  //   this.render()
  // },

  goalSnippet: function(goalXEL, alertKlass, alertIcon) {
    var xelementID = goalXEL.id;
    var goalName = goalXEL.metacontent().name;
    var goalDescription = goalXEL.metacontent().description;
    return ""+
      "<li>"+
        "<div class=\"list-item span11 "+alertKlass+"\">" +
          "<div class=\"span1\"><i class=\""+alertIcon+" icon-color\"></i></div>" +
          "<div class=\"span9\">" +
            "<strong>" + goalName + "</strong> - "+goalDescription +
          "</div>" +
          "<div class=\"span2\"><button type=\"button\" class=\"btn set-activity-goal ignore btn-remove btn-mini\" data-dismiss=\"alert\" data-xelement-id=\""+xelementID+"\"><i class=\"icon-remove\"></i></button><button type=\"button\" class=\"btn set-activity-goal btn-ok btn-mini\" data-dismiss=\"alert\" data-xelement-id=\""+xelementID+"\"><i class=\"icon-ok set-activity-goal\" data-xelement-id=\""+xelementID+"\"></i></button></div>" +
        "</div>"+
        "<div class=\"clearfix\"></div>"+
      "</li>"
  },

  appendGoalData: function() {
    var ul = this.$el.find('ul#goals')
    ActivityCalGoals.each(function(goal_xel) {
      var relevantData = ActivityCalGoalData.find(function(ud) {
        return (ud.get("xelement_id") == goal_xel.id)
      });
      switch (this.currentStatusToDisplay) {
        case "unanswered":
          this.displayUnansweredGoals(relevantData, ul, this, goal_xel);
        break;
        case "completed":
          this.displayCompletedGoals(relevantData, ul, this, goal_xel);
        break;
        case "ignored":
          this.displayIgnoredGoals(relevantData, ul, this, goal_xel);
        break;
        case "display-all":
          this.displayUnansweredGoals(relevantData, ul, this, goal_xel);
          this.displayCompletedGoals(relevantData, ul, this, goal_xel);
          this.displayIgnoredGoals(relevantData, ul, this, goal_xel);
        break;
      };
    }, this);
    if (ul.find('li').length === 0) {
      ul.html(""+
        "<div class='span12' style='text-align:center;padding-top: 5px;'>"+
          "<strong>No Goals Exist</strong>"+
        "</div>"+
        "<div class='clearfix'></div>"
      );
    };
  },

  displayUnansweredGoals: function(relevantData, ul, view, goalXel) {
    if (!relevantData.id) {
      ul.append( view.goalSnippet(goalXel, "yellow-header", "icon-remove-sign") );
    }
  },

  displayCompletedGoals: function(relevantData, ul, view, goalXel) {
    if (relevantData.get_field_value('status') == "completed") {
      ul.append( view.goalSnippet(goalXel, "green-header", "icon-ok-sign"));
    };
    ul.find('.green-header button.btn-ok').hide();
  },

  displayIgnoredGoals: function(relevantData, ul, view, goalXel) {
    if (relevantData.get_field_value('status') == "ignored") {
      ul.append( view.goalSnippet(goalXel, "red-header", "icon-exclamation-sign") );
    };
    ul.find('.red-header button.btn-remove').hide();
  },

  placeGoalTooltips: function() {
    this.$el.find("i.icon-remove").tooltip({
      title: "Ignore Goal"
    });
    this.$el.find("i.icon-ok").tooltip({
      title: "Check if Completed"
    });
  },

  render: function() {
    this.$el.html(this.template())
    this.appendGoalData();
    this.setActivityGoalHandlers();
    this.placeGoalTooltips();
    return this
  },

  setButtonStatus: function(){
    this.displayAllBtnClass = "";
    this.unansweredBtnClass = "";
    this.completedBtnClass = "";
    this.ignoredBtnClass = "";

    switch (this.currentStatusToDisplay) {
      case "display-all":
        this.displayAllBtnClass = "active";
      break;
      case "unanswered":
        this.unansweredBtnClass = "active";
      break;
      case "completed":
        this.completedBtnClass = "active";
      break;
      case "ignored":
        this.ignoredBtnClass = "active";
      break;
    }
  },

  setActivityGoalHandlers: function() {
    var self = this;
    this.$el.find('.set-activity-goal').click(function(event) {

      var target = $(event.currentTarget);
      var xelementID = target.data('xelement-id')
      console.log("xelement", xelementID)

      var data = ActivityCalGoalData.find(function(goalData) {
        return (goalData.get("xelement_id") == xelementID)
      });

      if (target.hasClass('ignore')) {
        data.set_field('status', "string", "ignored")
      } else {
        data.set_field('status', "string", "completed")
      };

      data.save();

      console.log("status", data.get_field_value('status'))
      self.render()
    })

  }

  // Setup Thought Goals

  // ThoughtsToolGoals = new XelementCollection(XELEMENTS.filter(function(xel) {
  //   return (xel.get_field_value("title") == "Thought  Goal")
  // }));

  // ThoughtsToolGoalData = new DataCollection(null);

  // ThoughtsToolGoals.each(function(goal_xel) {
  //   var data;

  //   //Fetch any existing data on the server for this user and goal.
  //   var dc = new DataCollection(null, {
  //     xelement_id: goal_xel.id,
  //     user_id: Dynamo.CurrentUser().id,
  //     group_id: Dynamo.CurrentUser().get("group_id")
  //   });
  //   dc.fetch({async: false});

  //   if (dc.length > 0) {
  //     data = dc.first();
  //   }
  //   else {
  //     //if length is 0, then no data exists, create new object.
  //     data = new Dynamo.Data({
  //       server_url: Dynamo.TriremeURL,
  //       xelement_id: goal_xel.id,
  //       user_id: Dynamo.CurrentUser().id,
  //       group_id: Dynamo.CurrentUser().get("group_id")
  //     });
  //   };

  //   ThoughtsToolGoalData.add(data);
  //   //either way, it gets added to the collection of user data about calendar goals.
  // });

  // goalsView = new GoalsView({
  //   goals:  ThoughtsToolGoals,
  //   goalData: ThoughtsToolGoalData
  // });

});
