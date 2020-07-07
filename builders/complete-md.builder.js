const {writeFile, plantUmlServerUrl, encodeURIPath} = require("../utils");
const path = require('path');

const getFolderName = (dir, root, homepage) => {
    return dir === root ? homepage : path.parse(dir).base;
};
const build = async (tree, options) => {

        let filePromises = [];

        //title
        let MD = `# ${options.PROJECT_NAME}`;
        //table of contents
        let tableOfContents = '';
        for (const item of tree)
            tableOfContents += `${'  '.repeat(item.level - 1)}* [${item.name}](#${encodeURIPath(item.name).replace(/%20/g, '-')})\n`;
        MD += `\n\n${tableOfContents}\n---`;

        for (const item of tree) {
            let name = getFolderName(item.dir, options.ROOT_FOLDER, options.HOMEPAGE_NAME);

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
                    let diagramUrl = encodeURIPath(path.join(
                        '.',
                        item.dir.replace(options.ROOT_FOLDER, ''),
                        path.parse(pumlFile.dir).name + `.${options.DIAGRAM_FORMAT}`
                    ));
                    if (!options.GENERATE_LOCAL_IMAGES)
                        diagramUrl = plantUmlServerUrl(pumlFile.content);

                    let diagramImage = `![diagram](${diagramUrl})`;
                    let diagramLink = `[Go to ${path.parse(pumlFile.dir).name} diagram](${diagramUrl})`;

                    if (!options.INCLUDE_LINK_TO_DIAGRAM) //img
                        MD += diagramImage;
                    else //link
                        MD += diagramLink;
                }
            };

            if (options.DIAGRAMS_ON_TOP) {
                appendImages();
                appendText();
            } else {
                appendText();
                appendImages();
            }
        }

        //write file to disk
        filePromises.push(writeFile(path.join(
            options.DIST_FOLDER,
            `${options.PROJECT_NAME}.md`
        ), MD));

        return Promise.all(filePromises);
    }
module.exports = build;
    