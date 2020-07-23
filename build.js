#!/usr/bin/env node

const chalk = require('chalk');
const fs = require('fs');
const path = require('path');
const fsextra = require('fs-extra');

const {
    makeDirectory,
    readFile,
    plantumlVersions,
    getFolderName
} = require('./utils.js');

const generateCompleteMD = require('./builders/complete-md.builder');
const generateCompletePDF = require('./builders/complete-pdf.builder');
const generateAzureCompleteMD = require('./builders/azure-complete-md.builder');
const generateMD = require('./builders/azure-per-folder-md.builder');
const generatePDF = require('./builders/per-folder-pdf.builder');
const generateWebMD = require('./builders/docsify-md.builder');

const generateTree = async (dir, options) => {
    let tree = [];

    const build = async (dir, parent) => {
        let name = getFolderName(dir, options.ROOT_FOLDER, options.HOMEPAGE_NAME);
        let item = tree.find(x => x.dir === dir);
        if (!item) {
            item = {
                dir: dir,
                name: name,
                level: dir.split(path.sep).length,
                parent: parent,
                mdFiles: [],
                pumlFiles: [],
                descendants: []
            };
            tree.push(item);
        }

        let files = fs.readdirSync(dir).filter(x => x.charAt(0) !== '_');
        for (const file of files) {
            //if folder
            if (fs.statSync(path.join(dir, file)).isDirectory()) {
                item.descendants.push(file);
                //create corresponding dist folder
                if (options.GENERATE_WEBSITE || options.GENERATE_MD || options.GENERATE_PDF || options.GENERATE_LOCAL_IMAGES)
                    await makeDirectory(path.join(options.DIST_FOLDER, dir.replace(options.ROOT_FOLDER, ''), file));

                await build(path.join(dir, file), dir);
            }
        }

        const mdFiles = files.filter(x => path.extname(x).toLowerCase() === '.md');
        for (const mdFile of mdFiles) {
            const fileContents = await readFile(path.join(dir, mdFile));
            item.mdFiles.push(fileContents);
        }
        const pumlFiles = files.filter(x => path.extname(x).toLowerCase() === '.puml');
        for (const pumlFile of pumlFiles) {
            const fileContents = await readFile(path.join(dir, pumlFile));
            item.pumlFiles.push({ dir: pumlFile, content: fileContents });
        }

        //copy all other files
        const otherFiles = files.filter(x => ['.md', '.puml'].indexOf(path.extname(x).toLowerCase()) === -1);
        for (const otherFile of otherFiles) {
            if (fs.statSync(path.join(dir, otherFile)).isDirectory())
                continue;

            if (options.GENERATE_MD || options.GENERATE_PDF || options.GENERATE_WEBSITE)
                await fsextra.copy(path.join(dir, otherFile), path.join(options.DIST_FOLDER, dir.replace(options.ROOT_FOLDER, ''), otherFile));
            if (options.GENERATE_COMPLETE_PDF_FILE || options.GENERATE_COMPLETE_MD_FILE)
                await fsextra.copy(path.join(dir, otherFile), path.join(options.DIST_FOLDER, otherFile));
        }
    };

    await build(dir);

    return tree;
};

const generateImages = async (tree, options, onImageGenerated) => {
    let imagePromises = [];
    let totalImages = 0;
    let processedImages = 0;

    for (const item of tree) {
        let files = fs.readdirSync(item.dir).filter(x => x.charAt(0) !== '_');
        const pumlFiles = files.filter(x => path.extname(x).toLowerCase() === '.puml');
        for (const pumlFile of pumlFiles) {
            //write diagram as image
            let stream = fs.createWriteStream(
                path.join(
                    options.DIST_FOLDER,
                    item.dir.replace(options.ROOT_FOLDER, ''),
                    `${path.parse(pumlFile).name}.${options.DIAGRAM_FORMAT}`
                )
            );

            let ver = plantumlVersions.find(v => v.version === options.PLANTUML_VERSION);
            if (options.PLANTUML_VERSION === 'latest')
                ver = plantumlVersions.find(v => v.isLatest);
            if (!ver)
                throw new Error(`PlantUML version ${options.PLANTUML_VERSION} not supported`);

            process.env.PLANTUML_HOME = path.join(__dirname, 'vendor', ver.jar);
            const plantuml = require('node-plantuml');

            plantuml
                .generate(path.join(item.dir, pumlFile), { format: options.DIAGRAM_FORMAT, charset: options.CHARSET })
                .out
                .pipe(stream);

            totalImages++;

            imagePromises.push(new Promise(resolve => stream.on('finish', resolve)).then(() => {
                processedImages++;
                if (onImageGenerated)
                    onImageGenerated(processedImages, totalImages);
            }));
        }
    }

    return Promise.all(imagePromises);
};

const build = async (options) => {
    let start_date = new Date();

    //clear dist directory
    await fsextra.emptyDir(options.DIST_FOLDER);
    await makeDirectory(path.join(options.DIST_FOLDER));

    //actual build
    console.log(chalk.green(`\nbuilding documentation in ./${options.DIST_FOLDER}`));
    let tree = await generateTree(options.ROOT_FOLDER, options);
    console.log(chalk.blue(`parsed ${tree.length} folders`));
    if (options.GENERATE_LOCAL_IMAGES) {
        console.log(chalk.blue('generating images'));
        await generateImages(tree, options, (count, total) => {
            process.stdout.write(`processed ${count}/${total} images\r`);
        });
        console.log('');
    }
    if (options.GENERATE_MD) {
        console.log(chalk.blue('generating markdown files'));
        await generateMD(tree, options, (count, total) => {
            process.stdout.write(`processed ${count}/${total} files\r`);
        });
        console.log('');
    }
    if (options.GENERATE_WEBSITE) {
        console.log(chalk.blue('generating docsify site'));
        await generateWebMD(tree, options);
    }
    if (options.GENERATE_COMPLETE_MD_FILE) {
        console.log(chalk.blue('generating complete markdown file'));
        await generateCompleteMD(tree, options);
    }
    if (options.GENERATE_COMPLETE_PDF_FILE) {
        console.log(chalk.blue('generating complete pdf file'));
        await generateCompletePDF(tree, options);
    }
    if (options.GENERATE_PDF) {
        console.log(chalk.blue('generating pdf files'));
        await generatePDF(tree, options, (count, total) => {
            process.stdout.write(`processed ${count}/${total} files\r`);
        });
        console.log('');
    }

    if(options.GENERATE_AZURE_COMPLETE_MD_FILE){
        console.log(chalk.blue('generating complete md file for Azure'));
        await generateAzureCompleteMD(tree, options)
    }

    console.log(chalk.green(`built in ${(new Date() - start_date) / 1000} seconds`));
};
exports.build = build;
