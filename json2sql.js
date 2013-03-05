JSON2SQL.prototype = {
    init: function(){
      'use strict';
      for(var i = 0; i < this.optionDefinitions.length; i++){
        var option = this.optionDefinitions[i];
        this.options[option.name] = option.default;
      }
    },
    optionDefinitions : 
    [
      {
        "name":"table_name_case",
       "description":"Letter case for all table names.",
       "values":["upper","lower"],
       "default":"upper"
      },
      {
        "name":"column_name_case",
       "description":"Letter case for all column names.",
       "values":["upper","lower"],
       "default":"lower"
      },
      {
        "name":"key_name_case",
       "description":"Letter case for all key names (primary, foreign, unique).",
       "values":["upper","lower"],
       "default":"lower"
      },
      {
        "name":"force_abbreviations",
       "description":"If true all names will have abbreviations regardless of length.",
       "values":[true, false],
       "default":false
      },
      {
        "name":"foreign_key_prefix",
       "description":"String to prefix all foreign keys with.",
       "values":[],
       "default":"fk"
      },
      {
        "name":"primary_key_prefix",
       "description":"String to prefix all primay keys with.",
       "values":[],
       "default":"pk"
      },
      {
        "name":"unique_key_prefix",
       "description":"String to prefix all unique keys with.",
       "values":[],
       "default":"uk"
      },
      {
        "name":"index_prefix",
       "description":"String to prefix all indexes with.",
       "values":[],
       "default":"ix"
      },
      {
        "name":"word_separator",
        "description":"Character(s) used to separate words in names, example: table_name <- '_' is the separator.",
        "values":[],
        "default":"_"
      },
      {
        "name":"index_foreign_keys",
       "description":"If true all columns referenced by a foreign key will be indexed.",
       "values":[true, false],
       "default":true //for performance
      },
      {
        "name":"max_name_length",
       "description":"Maximum number of characters a name can contain.",
       "values":[],
       "default":30
      }
    ],
    options : {},
    abbreviations : [],
    tableNames : [],
    debug : true,
    logFunc : null
};

/**
 * Log the provided object 
 */
JSON2SQL.prototype.log = function(obj){
  'use strict';
  if(this.debug){
    if(this.logFunc != null){
      this.logFunc(obj);
    }else{
      console.log(obj);
    }
  }
};

JSON2SQL.prototype.getOptions = function() {
    'use strict';
    return this.options;
};

JSON2SQL.prototype.setOptions = function(options) {
    'use strict';
    for(var name in this.options){
      if(options.hasOwnProperty(name)){
        if(this.debug){
          this.log(name + " : " + options[name]);
        }
        var value = options[name];
        if(this.isValidOptionValue(name, value)){
          this.options[name] = value;
        }else{
          throw "Value '"+value+"' is not valid for option '"+name+"'.";
        }
      }
    }
};

JSON2SQL.prototype.logOptions = function() {
    'use strict';
    for(var key in this.options){
      this.log(key + " : " + this.options[key]);
    }
};

JSON2SQL.prototype.describeOptions = function() {
  'use strict';
  this.log("##START OPTIONS##");
  for(var i = 0; i < this.optionDefinitions.length; i++){
    var option = this.optionDefinitions[i];
    this.log("------------------------");
    this.log("Name: "+option.name);
    this.log("Description: ");
    this.log("  "+option.description);
    if(option.values.length > 0){
      this.log("Values: " +option.values);
    }
    this.log("Default:" + option.default);
  }
  this.log("##END OPTIONS##");
};



JSON2SQL.prototype.isValidOptionValue = function(name, value) {
  'use strict';
  for(var i = 0; i < this.optionDefinitions.length; i++){
    var option = this.optionDefinitions[i];
    if(option.name === name && option.values.length > 0){
      for(var j = 0; j < option.values.length; j++){
        if(value === option.values[j]){
          return true;
        }
      }
    }
  }
  return false;
};

JSON2SQL.prototype.generateSQL = function(data){
  'use strict';
  this.loadOptions(data);
  this.loadAbbreviations(data);
  this.loadTableNames(data);
};

JSON2SQL.prototype.loadOptions = function(data){
  'use strict';
  var optionsKey = "options";
  if(data[optionsKey] === void 0){
    this.log("No custom options defined.");
  }else{
    this.setOptions(data[optionsKey]);
  }
};

JSON2SQL.prototype.loadAbbreviations = function(data){
  'use strict';
  var abbreviationsKey = "abbreviations";
  //check for abbreviations
  if(data[abbreviationsKey] === void 0){
    this.log("No abbreviations defined.");
  }else{
    var abbreviations = data[abbreviationsKey];
    for(var i = 0; i < abbreviations.length; i++){
      var abbr = abbreviations[i];
      for(var key in abbr){
        var value = abbr[key];
        if(this.isString(key) && this.isString(value)){
          this.abbreviations[key.toLowerCase()] = value.toLowerCase();
          if(this.debug){
            this.log(key.toLowerCase() + " : "+value.toLowerCase());
          }
        }else{
          throw "Abbreviations must be of type String at key: "+key+" with value: "+value;
        }
      }
    }
  }
};

JSON2SQL.prototype.loadTableNames = function(data){
  'use strict';
  var tables = data["tables"];
  if(tables === void 0){
    this.log("No tables defined.");
  }else{
    for(var i = 0; i < tables.length; i++){
      var table = tables[i];
      var name = this.tableCase(table["name"]);
      if(this.contains(this.tableNames, name)){
        throw "Duplicate table declaration: "+table["name"];
      }
      this.tableNames.push(this.tableCase(table["name"]));
    }
  }
  this.log(this.tableNames);
}

JSON2SQL.prototype.abbreviate = function(name){
  'use strict';
  var newName = '';
  var origName = name.toLowerCase();
  var max = this.options["max_name_length"];
  var forceAbbr = this.options["force_abbreviations"];
  if(origName.length > max || forceAbbr){
      var words = origName.split(wordSeparator);
      for(var i = 0; i < words.size(); i++){
          var word = words[i];
          if(this.abbreviations.indexOf(word) > -1){
              newName += abbreviations[word];
          }else{
              newName += word;
          }
          if(i < words.size-1){
              newName += '_';
          }
      }
      if(newName.length > 30){
          throw new NameLengthExceeds("The table, column, or key name exceeds "+max+" characters: "+name);
      }
  }else{
      newName = origName;
  }
  return newName;
};

JSON2SQL.prototype.contains = function(table, value){
  return table.indexOf(value) > -1;
};

JSON2SQL.prototype.tableCase = function(str){
  return this.toCase(str, this.options["table_name_case"]);
};

JSON2SQL.prototype.columnCase = function(str){
  return this.toCase(str, this.options["column_name_case"]);
};

JSON2SQL.prototype.keyCase = function(str){
  return this.toCase(str, this.options["key_name_case"]);
};

JSON2SQL.prototype.toCase = function(str, aCase){
  if(aCase === "upper"){
    return str.toUpperCase();
  }
  return str.toLowerCase();
};

JSON2SQL.prototype.isString = function(obj){
  return Object.prototype.toString.call(obj) == '[object String]';
};

function JSON2SQL(){
    this.init();
}