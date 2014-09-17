'use strict';

try {
    eval("let __gteES6__ = 0;");
    try {
        module.exports = require('./lib/packetize-string.js');
    }
    catch ( e ) {
        console.log(e.stack);
        process.exit();
    }
}
catch (e) {
  throw new Error("ES6 is required; add --harmony");
}
