const {encodeURIPath, plantUmlServerUrl, getFolderName} = require("../../utils");
const path = require('path');

/**
 *
 * @param item
 * @param buildLocalImageUrl {function}
 * @param options
 * @returns {string}
 */
const buildSection = (item, buildLocalImageUrl, options) => {
    let name = getFolderName(item.dir, options.ROOT_FOLDER, options.HOMEPAGE_NAME);

    let MD = '';
    //title
    MD += `\n\n## ${name}`;

    if (name !== options.HOMEPAGE_NAME) {
        if (options.INCLUDE_BREADCRUMBS)
            MD += `\n\n\`${item.dir.replace(options.ROOT_FOLDER, '')}\``;
        MD += `\n\n[${options.HOMEPAGE_NAME}](#${encodeURIPath(options.PROJECT_NAME).replace(/%20/g, '-')})`;
    }

    //concatenate markdown files
    const appendText = () => {
        for (const mdFile of item.mdFiles) {
            MD += '\n\n';
            MD += mdFile;
        }
    };


    //add diagrams
    const appendImages = () => {
        for (const pumlFile of item.pumlFiles) {
            MD += '\n\n';
            const diagramUrl = !!options.GENERATE_LOCAL_IMAGES ?
                buildLocalImageUrl(item, pumlFile, options) : plantUmlServerUrl(pumlFile.content);

            const diagramTag = !options.INCLUDE_LINK_TO_DIAGRAM ? `![diagram](${diagramUrl})` : `[Go to ${path.parse(pumlFile.dir).name} diagram](${diagramUrl})`;

            MD += diagramTag;
        }
    };

    if (options.DIAGRAMS_ON_TOP) {
        appendImages();
        appendText();
    } else {
        appendText();
        appendImages();
    }
    return MD;
}
module.exports = {
    buildSection
}