const {writeFile, encodeURIPath} = require("../utils");
const path = require('path');
const {buildSection} = require('./md-utils')

const buildTableOfContents = () => '[[_TOC_]]';

/**
 * Build image url related to the main target Markdown file from dist folder
 * @param item
 * @param pumlFile
 * @param options
 * @returns {string}
 */
const buildLocalImageUrl = (item, pumlFile, options) =>
    encodeURIPath(
        path.join(
            '.',
            item.dir.replace(options.ROOT_FOLDER, ''),
            path.parse(pumlFile.dir).name + `.${options.DIAGRAM_FORMAT}`
        ))

module.exports = async (tree, options) => {

    let filePromises = [];

    const MD = [];
    //title
    MD.push(`# ${options.PROJECT_NAME}`);

    MD.push(buildTableOfContents(tree));

    MD.push('---')

    for (const item of tree) {
        MD.push(buildSection(item, buildLocalImageUrl, options));
    }

    //write file to disk
    filePromises.push(
        writeFile(path.join(
            options.DIST_FOLDER,
            `${options.PROJECT_NAME}.md`
        ), MD.join('\n\n')));

    return Promise.all(filePromises);
}