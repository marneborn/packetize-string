/**
 * A simple demo function that outputs some text
 * @author Tom
 * @private
 *
 * @param {String} text The text that will be written to the output
 * @throws (String)
 * returns Boolean
 *
 * @example try {
 *    saySomething('Hello world!');
 * } catch(e) {
 *
 * }
 *
 * @see application.output
 * @since 1.0
 * @version 1.0.1<br>
 * - Added some more JSDoc tags for the demo
 */
function saySomething(text) {
  if (text == null || text.length == 0) {
    throw "Invalid input!"
  }
  application.output(text);
  return true;
}
