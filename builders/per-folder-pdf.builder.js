const {writeFile, encodeURIPath, plantUmlServerUrl, getFolderName} = require("../utils");
const markdownpdf = require("md-to-pdf").mdToPdf;
const fsextra = require('fs-extra');
const path = require('path');

module.exports = async (tree, options, onProgress) => {
    let processedCount = 0;
    let totalCount = 0;

    let filePromises = [];
    for (const item of tree) {
        let name = getFolderName(item.dir, options.ROOT_FOLDER, options.HOMEPAGE_NAME);
        //title
        let MD = `# ${name}`;
        if (options.INCLUDE_BREADCRUMBS && name !== options.HOMEPAGE_NAME)
            MD += `\n\n\`${item.dir.replace(options.ROOT_FOLDER, '')}\``;

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
                let diagramUrl = encodeURIPath(path.parse(pumlFile.dir).name + `.${options.DIAGRAM_FORMAT}`);
                if (!options.GENERATE_LOCAL_IMAGES)
                    diagramUrl = plantUmlServerUrl(pumlFile.content);

                let diagramImage = `![diagram](${diagramUrl})`;

                MD += diagramImage;
            }
        };

        if (options.DIAGRAMS_ON_TOP) {
            appendImages();
            appendText();
        } else {
            appendText();
            appendImages();
        }

        totalCount++;
        //write temp file
        filePromises.push(writeFile(path.join(
            options.DIST_FOLDER,
            item.dir.replace(options.ROOT_FOLDER, ''),
            `${options.MD_FILE_NAME}_TEMP.md`
        ), MD).then(() => {
            return markdownpdf({
                path:
                    path.join(
                        options.DIST_FOLDER,
                        item.dir.replace(options.ROOT_FOLDER, ''),
                        `${options.MD_FILE_NAME}_TEMP.md`
                    )
            }, {
                stylesheet: [options.PDF_CSS],
                pdf_options: {
                    scale: 1,
                    displayHeaderFooter: false,
                    printBackground: true,
                    landscape: false,
                    pageRanges: '',
                    format: 'A4',
                    width: '',
                    height: '',
                    margin: {
                        top: '1.5cm',
                        right: '1cm',
                        bottom: '1cm',
                        left: '1cm'
                    }
                },
                dest: path.join(
                    options.DIST_FOLDER,
                    item.dir.replace(options.ROOT_FOLDER, ''),
                    `${name}.pdf`
                )
            }).catch(console.error);
        }).then(() => {
            //remove temp file
            fsextra.removeSync(path.join(
                options.DIST_FOLDER,
                item.dir.replace(options.ROOT_FOLDER, ''),
                `${options.MD_FILE_NAME}_TEMP.md`
            ));
        }).then(() => {
            processedCount++;
            if (onProgress)
                onProgress(processedCount, totalCount);
        }));
    }

    return Promise.all(filePromises);
}