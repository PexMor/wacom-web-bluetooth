# The Github pages

This folder contains static and rendered resource for the application.
Some of files stored in this directory are made unique by inserting a sha1 hash into their names so the webmanifest/web app can grab the relevant sources from the web and install them.

The source files are placed in the project root:

* `ble.js` - the main app
* `index.html` - the markdown description
* `desc.html` - the extended description
* `sw.js.frag` - template for `sw.js` processed by sed to include latest file version into cache.

