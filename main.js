var gui = require('nw.gui');

// Extend application menu for Mac OS
if (process.platform == "darwin") {
  var menu = new gui.Menu({ type: "menubar" });
  menu.createMacBuiltin && menu.createMacBuiltin(window.document.title);
  gui.Window.get().menu = menu;
}

gui.Window.get().on('close', function() {
  gui.App.quit();
});

document.addEventListener('DOMContentLoaded', function() {
  gui.Window.get().focus();
  gui.Window.get().show();
});
