const {writeFile, encodeURIPath, plantUmlServerUrl, getFolderName} = require("../utils");
const path = require('path');

const buildTableOfContents = (tree) => {
    return '[[_TOC_]]';

    // return tree
    //     .map(item => `${'  '.repeat(item.level - 1)}* [${item.name}](#${encodeURIPath(item.name).replace(/%20/g, '-')})\n`)
    //     .join('');
}

const buildSection = (item, options) => {
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

    const buildLocalImageUrl = (item, pumlFile, options) =>
        encodeURIPath(path.join(
            '.',
            item.dir.replace(options.ROOT_FOLDER, ''),
            path.parse(pumlFile.dir).name + `.${options.DIAGRAM_FORMAT}`
        ))

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


module.exports = async (tree, options) => {

    let filePromises = [];

    const MD = [];
    //title
    MD.push(`# ${options.PROJECT_NAME}`);

    MD.push(buildTableOfContents(tree));

    MD.push('---')

    for (const item of tree) {
        MD.push(buildSection(item, options));
    }

    //write file to disk
    filePromises.push(writeFile(path.join(
        options.DIST_FOLDER,
        `${options.PROJECT_NAME}.md`
    ), MD.join('\n\n')));

    return Promise.all(filePromises);
}