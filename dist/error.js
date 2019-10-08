'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.BuildError = BuildError;

var _util = require('util');

function BuildError(message) {
  Error.captureStackTrace(this, this.constructor);
  this.name = this.constructor.name;
  this.message = message;
}

(0, _util.inherits)(BuildError, Error);