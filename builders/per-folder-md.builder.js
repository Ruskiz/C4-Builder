const {writeFile, encodeURIPath, plantUmlServerUrl, getFolderName} = require("../utils");
const path = require('path');

module.exports = async (tree, options, onProgress) => {
    let processedCount = 0;
    let totalCount = 0;

    let filePromises = [];
    for (const item of tree) {
        let name = getFolderName(item.dir, options.ROOT_FOLDER, options.HOMEPAGE_NAME);
        //title
        let MD = `# ${name}`;
        //bradcrumbs
        if (options.INCLUDE_BREADCRUMBS && name !== options.HOMEPAGE_NAME)
            MD += `\n\n\`${item.dir.replace(options.ROOT_FOLDER, '')}\``;
        //table of contents
        if (options.INCLUDE_TABLE_OF_CONTENTS) {
            let tableOfContents = '';
            for (const _item of tree) {
                let label = `${item.dir === _item.dir ? '**' : ''}${_item.name}${item.dir === _item.dir ? '**' : ''}`
                tableOfContents += `${'  '.repeat(_item.level - 1)}* [${label}](${encodeURIPath(path.join(
                    '/',
                    options.DIST_FOLDER,
                    _item.dir.replace(options.ROOT_FOLDER, ''),
                    `${options.MD_FILE_NAME}.md`
                ))})\n`;
            }
            MD += `\n\n${tableOfContents}\n---`;
        }
        //parent menu
        if (item.parent && options.INCLUDE_NAVIGATION) {
            let parentName = getFolderName(item.parent, options.ROOT_FOLDER, options.HOMEPAGE_NAME);
            MD += `\n\n[${parentName} (up)](${encodeURIPath(path.join(
                '/',
                options.DIST_FOLDER,
                item.parent.replace(options.ROOT_FOLDER, ''),
                `${options.MD_FILE_NAME}.md`
            ))})`;
        }

        //exclude files and folders prefixed with _
        let descendantsMenu = '';
        for (const file of item.descendants) {
            descendantsMenu += `\n\n- [${file}](${encodeURIPath(path.join(
                '/',
                options.DIST_FOLDER,
                item.dir.replace(options.ROOT_FOLDER, ''),
                file,
                `${options.MD_FILE_NAME}.md`
            ))})`;
        }
        //descendants menu
        if (descendantsMenu && options.INCLUDE_NAVIGATION)
            MD += `${descendantsMenu}`;
        //separator
        if (options.INCLUDE_NAVIGATION)
            MD += `\n\n---`;

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
                    path.dirname(pumlFile.dir),
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

        //write to disk
        totalCount++;
        filePromises.push(writeFile(path.join(
            options.DIST_FOLDER,
            item.dir.replace(options.ROOT_FOLDER, ''),
            `${options.MD_FILE_NAME}.md`
        ), MD).then(() => {
            processedCount++;
            if (onProgress)
                onProgress(processedCount, totalCount);
        }));
    }

    return Promise.all(filePromises);
}