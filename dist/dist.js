
    (function(modules) {
      function require(id) {
        const [fn, mapping] = modules[id];

        function localRequire(name) {
          return require(mapping[name]);
        }

        const module = { exports : {} };

        // 递归require，依次得到依赖的exports结果
        fn(localRequire, module, module.exports);

        // 最终返回合并所有到 exports，并返回输出
        return module.exports;
      }

      require(0);
    })({
      0: [
        function (require, module, exports) {
          "use strict";

var _message = require("./message.js");

var _message2 = _interopRequireDefault(_message);

var _name = require("./name.js");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

console.log(_message2.default);
console.log(_name.name);
        },
        {"./message.js":1,"./name.js":2},
      ],
      1: [
        function (require, module, exports) {
          "use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _name = require("./name.js");

exports.default = "hello " + _name.name + "!";
        },
        {"./name.js":3},
      ],
      2: [
        function (require, module, exports) {
          "use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
var name = exports.name = 'world';
        },
        {},
      ],
      3: [
        function (require, module, exports) {
          "use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
var name = exports.name = 'world';
        },
        {},
      ],})
  