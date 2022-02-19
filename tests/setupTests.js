const rimraf = require("rimraf");
const path = require("path");


// Ensure the cache is cleared after every test
global.afterEach(() => {
    rimraf.sync(
        `${path.resolve(__dirname, "../node_modules/.cache/web-video-loader/*")}`
    );
});
