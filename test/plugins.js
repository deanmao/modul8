var fs        = require('fs')
  , zombie    = require('zombie')
  , assert    = require('assert')
  , path      = require('path')
  , modul8    = require('../')
  , utils     = require('../lib/utils')
  , dirify    = require('./dirify')
  , join      = path.join
  , dir       = __dirname
  , compile   = utils.makeCompiler();


var data = {
  a: {str: 'hello thar'}
, b: {coolObj: {}}
, c: 5
, d: [2, 3, "abc", {'wee': []}]
, e: {str2: 9 + 'abc'}
};

function PluginOne(name) {
  this.name = 'plug1';
}
PluginOne.prototype.data = function () {
  return data;
};
PluginOne.prototype.domain = function () {
  return join(dir, 'plugins', 'dom');
};

function PluginTwo(name) {
  this.name = 'plug2';
}
PluginTwo.prototype.data = function () {
  return JSON.stringify(data);
};

function generateApp() {
  dirify('plugins', {
    dom   : {
      'code1.js' : "module.exports = require('./code2');"
    , 'code2.js' : "module.exports = 160;"
    , 'code3.js' : "module.exports = 320;"
    }
  , main  : {
      'temp.js'  : "require('plug1::code1');"
    }
  });

  modul8(join(dir, 'plugins', 'main', 'temp.js'))
    .set('namespace', 'QQ')
    .set('logging', false)
    .use(new PluginOne())
    .use(new PluginTwo())
    .data(data)
      .add('crazy1', 'new Date()')
      .add('crazy2', '(function(){return new Date();})()')
      .add('crazy3', 'window')
    .compile(join(dir, 'output', 'plugins.js'));
}
generateApp();

exports["test require#plugins"] = function () {
  var browser = new zombie.Browser()
    , mainCode = compile(join(dir, 'output', 'plugins.js'));

  assert.isUndefined(browser.evaluate(mainCode), ".compile() result evaluates successfully");

  assert.isUndefined(browser.evaluate("QQ.require('plug1::code')"), "plug1 does not export code when not required");
  assert.isDefined(browser.evaluate("QQ.require('data::plug1')"), "plug1 always exports data");

  assert.includes(browser.evaluate("QQ.domains()"), 'plug1', "plug1 got exported as a domain");
  assert.equal(browser.evaluate("QQ.domains().indexOf('plug2')"), -1, "plug2 did not export a domain");
  assert.equal(browser.evaluate("QQ.require('plug1::code1')"), 160, "plug1::code1 is included as it is required");
  assert.equal(browser.evaluate("QQ.require('plug1::code2')"), 160, "plug1::code2 is included as it is required by a required module");
  assert.isUndefined(browser.evaluate("QQ.require('plug1::code3')"), "plug1::code3 is NOT included as it is NOT required");
  var testCount = 8;

  Object.keys(data).forEach(function (key) {
    var val = data[key];
    assert.ok(browser.evaluate("QQ.require('data::plug1')." + key), "require('data::plug1')." + key + " exists");
    assert.eql(browser.evaluate("QQ.require('data::plug1')." + key), data[key], "require('data::plug1')." + key + " is data['" + key + "']");
    assert.ok(browser.evaluate("QQ.require('data::plug2')." + key), "require('data::plug2')." + key + " exists");
    assert.eql(browser.evaluate("QQ.require('data::plug2')." + key), data[key], "require('data::plug2')." + key + " is data['" + key + "']");
    testCount += 4;
  });
  console.log('require#plugins - completed:', testCount);
};

exports["test require#data"] = function () {
  var browser = new zombie.Browser()
    , mainCode = compile(dir + '/output/plugins.js');
  assert.isUndefined(browser.evaluate(mainCode), ".compile() result evaluates successfully");
  assert.isDefined(browser.evaluate("QQ"), "global namespace is defined");
  assert.isDefined(browser.evaluate("QQ.require"), "require is globally accessible");
  assert.type(browser.evaluate("QQ.require"), 'function', "require is a function");
  assert.ok(browser.evaluate("QQ.require('data::crazy1')"), "require('data::crazy1') exists");
  assert.ok(browser.evaluate("QQ.require('data::crazy2')"), "require('data::crazy2') exists");
  assert.ok(browser.evaluate("QQ.require('data::crazy3')"), "require('data::crazy3') exists");
  assert.ok(browser.evaluate("QQ.require('data::crazy1').getDay"), "require('data::crazy1') is an instance of Date");
  assert.ok(browser.evaluate("QQ.require('data::crazy2').getDay"), "require('data::crazy2') is an instance of Date");
  assert.ok(browser.evaluate("QQ.require('data::crazy3').QQ"), "require('data::crazy3') returns window (found namespace)");
  testCount = 9;

  Object.keys(data).forEach(function (key) {
    var val = data[key];
    // viewing data
    assert.ok(browser.evaluate("QQ.require('data::" + key + "')"), "require('data::" + key + "') exists");
    assert.eql(browser.evaluate("QQ.require('data::" + key + "')"), data[key], "require('data::" + key + "') is data[" + key + "]");

    // crud interface tool
    browser.evaluate("var dataMod = QQ.data;");

    // creating data
    browser.evaluate("dataMod('newKey', 'arst')");
    assert.equal(browser.evaluate("QQ.require('data::newKey')"), 'arst', "can create new data key");

    // editing data
    assert.type(browser.evaluate("dataMod"), 'function', "M8::data is a requirable function");
    browser.evaluate("dataMod('" + key + "','hello')");
    assert.equal(browser.evaluate("QQ.require('data::" + key + "')"), 'hello', "can call data overriding method on data::" + key);

    // deleting data
    browser.evaluate("dataMod('" + key + "')");
    assert.equal(browser.evaluate("QQ.require('data::" + key + "')"), null, "successfully deleted data::" + key);

    testCount += 6;
  });

  console.log('require#data - completed:', testCount);
};
