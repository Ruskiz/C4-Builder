const {writeFile, encodeURIPath, plantUmlServerUrl, getFolderName} = require("../utils");
const docsifyTemplate = require('../docsify.template.js');

module.exports = async (tree, options) => {
    let filePromises = [];
    let docsifySideBar = '';

    for (const item of tree) {
        //sidebar
        docsifySideBar += `${'  '.repeat(item.level - 1)}* [${item.name}](${encodeURIPath(path.join(...path.join(item.dir).split(path.sep).splice(1), options.WEB_FILE_NAME))})\n`;
        let name = getFolderName(item.dir, options.ROOT_FOLDER, options.HOMEPAGE_NAME);

        //title
        let MD = `# ${name}`;

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
                else if (options.INCLUDE_LINK_TO_DIAGRAM && options.GENERATE_LOCAL_IMAGES)
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
        filePromises.push(writeFile(path.join(
            options.DIST_FOLDER,
            item.dir.replace(options.ROOT_FOLDER, ''),
            `${options.WEB_FILE_NAME}.md`
        ), MD));
    }

    //docsify homepage
    filePromises.push(writeFile(path.join(
        options.DIST_FOLDER,
        `index.html`
    ), docsifyTemplate({
        name: options.PROJECT_NAME,
        repo: options.REPO_NAME,
        loadSidebar: true,
        auto2top: true,
        homepage: `${options.WEB_FILE_NAME}.md`,
        plantuml: {
            skin: 'classic'
        },
        stylesheet: options.WEB_THEME
    })));

    //github pages preparation
    filePromises.push(writeFile(path.join(
        options.DIST_FOLDER,
        `.nojekyll`
    ), ''));

    //sidebar
    filePromises.push(writeFile(path.join(
        options.DIST_FOLDER,
        '_sidebar.md'
    ), docsifySideBar));

    return Promise.all(filePromises);
}