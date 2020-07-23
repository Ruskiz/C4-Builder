const {buildSection} = require("./md-utils");

const {writeFile, encodeURIPath} = require("../utils");
const path = require('path');

/**
 * Build image url relative to the target Markdown file place
 * @param item
 * @param pumlFile
 * @param options
 * @returns {string}
 */
const buildLocalImageUrl = (item, pumlFile, options) =>
    encodeURIPath(
        path.join(
            item.level === 1 ? '.' : item.name,
            path.parse(pumlFile.dir).name + `.${options.DIAGRAM_FORMAT}`
        ))

module.exports = async (tree, options, onProgress) => {
    let processedCount = 0;
    let totalCount = tree.length;
    let filePromises = [];

    for (const item of tree) {
        const MD = (buildSection(item, buildLocalImageUrl, options));
        const pathToTargetMD =
            item.level === 1 ?
                path.join(
                    options.DIST_FOLDER,
                    item.dir.replace(options.ROOT_FOLDER, ''),
                    `${item.name}.md`)
                : path.join(
                options.DIST_FOLDER,
                item.parent.replace(options.ROOT_FOLDER, ''),
                `${item.name}.md`);

        //write to disk
        filePromises.push(
            writeFile(pathToTargetMD, MD)
                .then(() => {
                    processedCount++;
                    if (onProgress)
                        onProgress(processedCount, totalCount);
                }));
    }

    return Promise.all(filePromises);
}