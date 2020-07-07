const {writeFile, encodeURIPath, plantUmlServerUrl, getFolderName} = require("../utils");
const markdownpdf = require("md-to-pdf").mdToPdf;
const fsextra = require('fs-extra');

module.exports = async (tree, options) => {
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
        //bradcrumbs
        if (name !== options.HOMEPAGE_NAME) {
            if (options.INCLUDE_BREADCRUMBS)
                MD += `\n\n\`${item.dir.replace(options.ROOT_FOLDER, '')}\``;
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
                    item.dir.replace(options.ROOT_FOLDER, ''),
                    path.parse(pumlFile.dir).name + `.${options.DIAGRAM_FORMAT}`
                ));
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
    }

    //write temp file
    await writeFile(path.join(
        options.DIST_FOLDER,
        `${options.PROJECT_NAME}_TEMP.md`
    ), MD);
    //convert to pdf
    await markdownpdf({
        path:
            './' + path.join(
            options.DIST_FOLDER,
            `${options.PROJECT_NAME}_TEMP.md`
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
            `${options.PROJECT_NAME}.pdf`
        )
    }).catch(console.error);

    // remove temp file
    await fsextra.remove(path.join(
        options.DIST_FOLDER,
        `${options.PROJECT_NAME}_TEMP.md`
    ));
}